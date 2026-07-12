/**
 * ======================================================
 * الملف: utils/api.js
 * الوصف: طبقة الاتصال بالـ API عبر fetch
 *         يدعم المصادقة، إعادة المحاولة، التخزين المؤقت،
 *         معالجة الأخطاء، والمزامنة غير المتصلة
 * الإصدار: 1.0.0
 * التاريخ: 2026-07-12
 * ======================================================
 */

import { API_BASE_URL, API_ENDPOINTS, API_CONFIG, STORAGE_KEYS } from './constants.js';
import { getItem, setItem, removeItem } from './storage.js';
import { generateId, formatDate, debounce } from './helpers.js';

// ============================================
//  1.  إدارة المصادقة (Authentication)
// ============================================

let authToken = null;
let tokenExpiry = null;
let refreshPromise = null;

/**
 * الحصول على رمز المصادقة من التخزين المحلي
 */
export function getAuthToken() {
    if (!authToken) {
        authToken = getItem(STORAGE_KEYS.AUTH_TOKEN);
    }
    return authToken;
}

/**
 * تعيين رمز المصادقة وحفظه في التخزين المحلي
 */
export function setAuthToken(token, expiry = null) {
    authToken = token;
    if (token) {
        setItem(STORAGE_KEYS.AUTH_TOKEN, token);
        if (expiry) {
            tokenExpiry = expiry;
        }
    } else {
        removeItem(STORAGE_KEYS.AUTH_TOKEN);
        tokenExpiry = null;
    }
}

/**
 * التحقق من صلاحية الرمز
 */
export function isTokenValid() {
    if (!authToken) return false;
    if (tokenExpiry) {
        return Date.now() < tokenExpiry;
    }
    return true;
}

/**
 * تسجيل الدخول
 */
export async function login(email, password) {
    try {
        const response = await request(API_ENDPOINTS.AUTH_LOGIN, {
            method: 'POST',
            body: JSON.stringify({ email, password }),
            skipAuth: true,
        });

        if (response.success && response.data) {
            const { token, user, expires_in } = response.data;
            const expiry = expires_in ? Date.now() + expires_in * 1000 : null;
            setAuthToken(token, expiry);
            setItem(STORAGE_KEYS.USER_DATA, user);
            return { success: true, user };
        }

        return { success: false, message: response.message || 'فشل تسجيل الدخول' };
    } catch (error) {
        return { success: false, message: error.message || 'حدث خطأ أثناء تسجيل الدخول' };
    }
}

/**
 * تسجيل الخروج
 */
export async function logout() {
    try {
        await request(API_ENDPOINTS.AUTH_LOGOUT, {
            method: 'POST',
            skipAuth: false,
        });
    } catch (error) {
        // تجاهل الأخطاء أثناء تسجيل الخروج
        console.warn('Logout error:', error);
    } finally {
        setAuthToken(null);
        removeItem(STORAGE_KEYS.USER_DATA);
        // مسح جميع البيانات المخزنة مؤقتاً
        clearCache();
    }
}

/**
 * التحقق من الجلسة الحالية
 */
export async function verifySession() {
    if (!isTokenValid()) {
        return { valid: false };
    }

    try {
        const response = await request(API_ENDPOINTS.AUTH_VERIFY, {
            method: 'GET',
            skipAuth: false,
        });
        return { valid: response.success, user: response.data };
    } catch (error) {
        return { valid: false };
    }
}

/**
 * تجديد الرمز (Refresh Token)
 */
export async function refreshToken() {
    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = (async () => {
        try {
            const response = await request(API_ENDPOINTS.AUTH_REFRESH, {
                method: 'POST',
                skipAuth: false,
            });

            if (response.success && response.data?.token) {
                const { token, expires_in } = response.data;
                const expiry = expires_in ? Date.now() + expires_in * 1000 : null;
                setAuthToken(token, expiry);
                return { success: true, token };
            }

            setAuthToken(null);
            return { success: false };
        } catch (error) {
            setAuthToken(null);
            return { success: false };
        } finally {
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

// ============================================
//  2.  وظيفة الطلب الأساسية (Core Request)
// ============================================

/**
 * قائمة انتظار الطلبات المعلقة في وضع عدم الاتصال
 */
let offlineQueue = getItem(STORAGE_KEYS.OFFLINE_QUEUE) || [];

/**
 * حفظ الطلبات في قائمة الانتظار غير المتصلة
 */
function addToOfflineQueue(endpoint, options, data) {
    const queueItem = {
        id: generateId(),
        endpoint,
        options: { ...options, body: options.body ? JSON.parse(options.body) : null },
        data,
        timestamp: Date.now(),
        attempts: 0,
    };
    offlineQueue.push(queueItem);
    setItem(STORAGE_KEYS.OFFLINE_QUEUE, offlineQueue);
}

/**
 * مسح قائمة انتظار الطلبات غير المتصلة بعد المزامنة
 */
export function clearOfflineQueue() {
    offlineQueue = [];
    setItem(STORAGE_KEYS.OFFLINE_QUEUE, offlineQueue);
}

/**
 * مزامنة الطلبات المعلقة مع الخادم
 */
export async function syncOfflineQueue() {
    if (offlineQueue.length === 0) return { success: true, synced: 0 };

    let synced = 0;
    const failed = [];

    for (const item of offlineQueue) {
        try {
            const response = await request(item.endpoint, {
                ...item.options,
                body: item.options.body ? JSON.stringify(item.options.body) : undefined,
                skipAuth: false,
                retry: false,
            });

            if (response.success) {
                synced++;
            } else {
                failed.push(item);
            }
        } catch (error) {
            failed.push(item);
        }
    }

    // تحديث قائمة الانتظار بالفاشلين فقط
    offlineQueue = failed;
    setItem(STORAGE_KEYS.OFFLINE_QUEUE, offlineQueue);

    return { success: true, synced, failed: failed.length };
}

/**
 * الطلب الأساسي مع إعادة المحاولة ومعالجة الأخطاء
 */
async function request(endpoint, options = {}) {
    const {
        method = 'GET',
        headers = {},
        body = null,
        skipAuth = false,
        retry = true,
        retryAttempts = API_CONFIG.RETRY_ATTEMPTS,
        retryDelay = API_CONFIG.RETRY_DELAY,
        timeout = API_CONFIG.TIMEOUT,
        cache = false,
        cacheDuration = API_CONFIG.CACHE_DURATION,
    } = options;

    // التحقق من الاتصال بالإنترنت
    if (!navigator.onLine && !skipAuth) {
        // حفظ الطلب في قائمة الانتظار
        addToOfflineQueue(endpoint, options, body);
        throw new Error('أنت غير متصل بالإنترنت. سيتم مزامنة الطلب تلقائياً عند استعادة الاتصال.');
    }

    // التحقق من المصادقة
    const token = getAuthToken();
    if (!skipAuth && !token) {
        throw new Error('غير مصرح به. يرجى تسجيل الدخول.');
    }

    // بناء الرابط الكامل
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

    // إعداد الرؤوس
    const requestHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers,
    };

    if (!skipAuth && token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    // إعداد خيارات الطلب
    const requestOptions = {
        method,
        headers: requestHeaders,
        credentials: 'include',
    };

    if (body) {
        requestOptions.body = body;
    }

    // التحقق من التخزين المؤقت (للطلبات GET فقط)
    const cacheKey = cache ? `${method}:${url}:${body || ''}` : null;
    if (cache && method === 'GET') {
        const cached = getCache(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < cacheDuration) {
            return cached.data;
        }
    }

    // تنفيذ الطلب مع إعادة المحاولة
    let lastError = null;
    let attempts = 0;

    while (attempts <= (retry ? retryAttempts : 0)) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const response = await fetch(url, {
                ...requestOptions,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            // معالجة رموز الاستجابة
            if (response.status === 401) {
                // محاولة تجديد الرمز
                if (!skipAuth && !options._refreshing) {
                    const refreshResult = await refreshToken();
                    if (refreshResult.success) {
                        // إعادة المحاولة مع الرمز الجديد
                        const newOptions = { ...options, _refreshing: true };
                        return request(endpoint, newOptions);
                    }
                }
                throw new Error('انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.');
            }

            if (response.status === 403) {
                throw new Error('ليس لديك صلاحية لهذا الإجراء.');
            }

            if (response.status === 404) {
                throw new Error('العنصر المطلوب غير موجود.');
            }

            if (response.status === 429) {
                // معدل الطلبات مرتفع جداً
                const retryAfter = parseInt(response.headers.get('Retry-After') || '5') * 1000;
                await new Promise(resolve => setTimeout(resolve, retryAfter));
                continue;
            }

            // قراءة البيانات
            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            if (!response.ok) {
                throw new Error(data.message || data || `HTTP ${response.status}: ${response.statusText}`);
            }

            // تخزين النتيجة في الكاش (للطلبات GET)
            if (cache && method === 'GET') {
                setCache(cacheKey, data);
            }

            return data;

        } catch (error) {
            lastError = error;

            // إذا كان الخطأ بسبب انقطاع الشبكة
            if (error.name === 'AbortError' || error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
                if (attempts < (retry ? retryAttempts : 0)) {
                    await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempts)));
                    attempts++;
                    continue;
                }
                // حفظ الطلب في قائمة الانتظار
                if (!skipAuth) {
                    addToOfflineQueue(endpoint, options, body);
                }
                throw new Error('فشل الاتصال بالخادم. سيتم حفظ الطلب للمزامنة لاحقاً.');
            }

            if (attempts < (retry ? retryAttempts : 0) && retry) {
                await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempts)));
                attempts++;
                continue;
            }

            throw error;
        }
    }

    throw lastError || new Error('فشل الطلب بعد عدة محاولات.');
}

// ============================================
//  3.  التخزين المؤقت (Cache)
// ============================================

const cacheStore = getItem('erp_api_cache') || {};

function getCache(key) {
    if (!key) return null;
    return cacheStore[key] || null;
}

function setCache(key, data) {
    if (!key) return;
    cacheStore[key] = {
        data,
        timestamp: Date.now(),
    };
    setItem('erp_api_cache', cacheStore);
}

function clearCache() {
    Object.keys(cacheStore).forEach(key => delete cacheStore[key]);
    setItem('erp_api_cache', cacheStore);
}

// ============================================
//  4.  دوال مساعدة للطلبات (CRUD)
// ============================================

/**
 * طلب GET
 */
export async function get(endpoint, options = {}) {
    return request(endpoint, { ...options, method: 'GET' });
}

/**
 * طلب POST
 */
export async function post(endpoint, data, options = {}) {
    return request(endpoint, {
        ...options,
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * طلب PUT
 */
export async function put(endpoint, data, options = {}) {
    return request(endpoint, {
        ...options,
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

/**
 * طلب PATCH
 */
export async function patch(endpoint, data, options = {}) {
    return request(endpoint, {
        ...options,
        method: 'PATCH',
        body: JSON.stringify(data),
    });
}

/**
 * طلب DELETE
 */
export async function del(endpoint, options = {}) {
    return request(endpoint, { ...options, method: 'DELETE' });
}

/**
 * رفع ملف (FormData)
 */
export async function uploadFile(endpoint, file, metadata = {}, options = {}) {
    const formData = new FormData();
    formData.append('file', file);

    Object.keys(metadata).forEach(key => {
        if (metadata[key] !== undefined && metadata[key] !== null) {
            formData.append(key, typeof metadata[key] === 'object' ? JSON.stringify(metadata[key]) : String(metadata[key]));
        }
    });

    // إزالة Content-Type لـ FormData (يتم تعيينه تلقائياً)
    const headers = options.headers || {};
    delete headers['Content-Type'];

    return request(endpoint, {
        ...options,
        method: 'POST',
        body: formData,
        headers,
        skipAuth: false,
    });
}

/**
 * تنزيل ملف (يُعيد Blob)
 */
export async function downloadFile(endpoint, options = {}) {
    const token = getAuthToken();
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            ...(options.headers || {}),
        },
        credentials: 'include',
    });

    if (!response.ok) {
        let errorMsg = `HTTP ${response.status}: ${response.statusText}`;
        try {
            const data = await response.json();
            if (data.message) errorMsg = data.message;
        } catch (e) {
            // تجاهل
        }
        throw new Error(errorMsg);
    }

    return response.blob();
}

// ============================================
//  5.  دوال خاصة بكل كيان (Entity-Specific)
//    باستخدام نقاط النهاية من constants.js
// ============================================

/**
 * المصادقة
 */
export const authApi = {
    login: (email, password) => login(email, password),
    logout: () => logout(),
    verify: () => verifySession(),
    refresh: () => refreshToken(),
};

/**
 * المستخدمين
 */
export const usersApi = {
    getAll: (params) => get(API_ENDPOINTS.USERS, { cache: true, ...params }),
    getById: (id) => get(API_ENDPOINTS.USER(id), { cache: true }),
    create: (data) => post(API_ENDPOINTS.USERS, data),
    update: (id, data) => put(API_ENDPOINTS.USER(id), data),
    delete: (id) => del(API_ENDPOINTS.USER(id)),
};

/**
 * العملاء
 */
export const customersApi = {
    getAll: (params) => get(API_ENDPOINTS.CUSTOMERS, { cache: true, ...params }),
    getById: (id) => get(API_ENDPOINTS.CUSTOMER(id), { cache: true }),
    create: (data) => post(API_ENDPOINTS.CUSTOMERS, data),
    update: (id, data) => put(API_ENDPOINTS.CUSTOMER(id), data),
    delete: (id) => del(API_ENDPOINTS.CUSTOMER(id)),
    getOrders: (id) => get(API_ENDPOINTS.CUSTOMER_ORDERS(id)),
    getFiles: (id) => get(API_ENDPOINTS.CUSTOMER_FILES(id)),
};

/**
 * الموظفين
 */
export const employeesApi = {
    getAll: (params) => get(API_ENDPOINTS.EMPLOYEES, { cache: true, ...params }),
    getById: (id) => get(API_ENDPOINTS.EMPLOYEE(id), { cache: true }),
    create: (data) => post(API_ENDPOINTS.EMPLOYEES, data),
    update: (id, data) => put(API_ENDPOINTS.EMPLOYEE(id), data),
    delete: (id) => del(API_ENDPOINTS.EMPLOYEE(id)),
    getAttendance: (id) => get(API_ENDPOINTS.EMPLOYEE_ATTENDANCE(id)),
    getTasks: (id) => get(API_ENDPOINTS.EMPLOYEE_TASKS(id)),
};

/**
 * الخدمات
 */
export const servicesApi = {
    getAll: (params) => get(API_ENDPOINTS.SERVICES, { cache: true, ...params }),
    getById: (id) => get(API_ENDPOINTS.SERVICE(id), { cache: true }),
    create: (data) => post(API_ENDPOINTS.SERVICES, data),
    update: (id, data) => put(API_ENDPOINTS.SERVICE(id), data),
    delete: (id) => del(API_ENDPOINTS.SERVICE(id)),
};

/**
 * الطلبات
 */
export const ordersApi = {
    getAll: (params) => get(API_ENDPOINTS.ORDERS, { cache: true, ...params }),
    getById: (id) => get(API_ENDPOINTS.ORDER(id), { cache: true }),
    create: (data) => post(API_ENDPOINTS.ORDERS, data),
    update: (id, data) => put(API_ENDPOINTS.ORDER(id), data),
    delete: (id) => del(API_ENDPOINTS.ORDER(id)),
    updateStatus: (id, status) => put(API_ENDPOINTS.ORDER_STATUS(id), { status }),
    getItems: (id) => get(API_ENDPOINTS.ORDER_ITEMS(id)),
    getInvoice: (id) => get(API_ENDPOINTS.ORDER_INVOICE(id)),
    getFiles: (id) => get(API_ENDPOINTS.ORDER_FILES(id)),
    getTimeline: (id) => get(API_ENDPOINTS.ORDER_TIMELINE(id)),
    addComment: (id, comment) => post(API_ENDPOINTS.ORDER_COMMENTS(id), { comment }),
};

/**
 * الفواتير
 */
export const invoicesApi = {
    getAll: (params) => get(API_ENDPOINTS.INVOICES, { cache: true, ...params }),
    getById: (id) => get(API_ENDPOINTS.INVOICE(id), { cache: true }),
    create: (data) => post(API_ENDPOINTS.INVOICES, data),
    update: (id, data) => put(API_ENDPOINTS.INVOICE(id), data),
    delete: (id) => del(API_ENDPOINTS.INVOICE(id)),
    pay: (id, paymentData) => post(API_ENDPOINTS.INVOICE_PAY(id), paymentData),
    download: (id) => downloadFile(API_ENDPOINTS.INVOICE_DOWNLOAD(id)),
};

/**
 * المعاملات
 */
export const transactionsApi = {
    getAll: (params) => get(API_ENDPOINTS.TRANSACTIONS, { cache: true, ...params }),
    getById: (id) => get(API_ENDPOINTS.TRANSACTION(id), { cache: true }),
    create: (data) => post(API_ENDPOINTS.TRANSACTIONS, data),
    update: (id, data) => put(API_ENDPOINTS.TRANSACTION(id), data),
    delete: (id) => del(API_ENDPOINTS.TRANSACTION(id)),
};

/**
 * الحضور
 */
export const attendanceApi = {
    getAll: (params) => get(API_ENDPOINTS.ATTENDANCE, { cache: true, ...params }),
    getById: (id) => get(API_ENDPOINTS.ATTENDANCE_RECORD(id), { cache: true }),
    create: (data) => post(API_ENDPOINTS.ATTENDANCE, data),
    update: (id, data) => put(API_ENDPOINTS.ATTENDANCE_RECORD(id), data),
    delete: (id) => del(API_ENDPOINTS.ATTENDANCE_RECORD(id)),
    getSummary: (params) => get(API_ENDPOINTS.ATTENDANCE_SUMMARY, { cache: true, ...params }),
};

/**
 * المهام
 */
export const tasksApi = {
    getAll: (params) => get(API_ENDPOINTS.TASKS, { cache: true, ...params }),
    getById: (id) => get(API_ENDPOINTS.TASK(id), { cache: true }),
    create: (data) => post(API_ENDPOINTS.TASKS, data),
    update: (id, data) => put(API_ENDPOINTS.TASK(id), data),
    delete: (id) => del(API_ENDPOINTS.TASK(id)),
    updateStatus: (id, status) => put(API_ENDPOINTS.TASK_STATUS(id), { status }),
    getKanban: () => get(API_ENDPOINTS.TASK_KANBAN, { cache: true }),
};

/**
 * الرسائل
 */
export const messagesApi = {
    getAll: (params) => get(API_ENDPOINTS.MESSAGES, { cache: true, ...params }),
    getById: (id) => get(API_ENDPOINTS.MESSAGE(id), { cache: true }),
    create: (data) => post(API_ENDPOINTS.MESSAGES, data),
    delete: (id) => del(API_ENDPOINTS.MESSAGE(id)),
    getConversation: (userId) => get(API_ENDPOINTS.MESSAGES_CONVERSATION(userId)),
};

/**
 * الإشعارات
 */
export const notificationsApi = {
    getAll: (params) => get(API_ENDPOINTS.NOTIFICATIONS, { cache: true, ...params }),
    getById: (id) => get(API_ENDPOINTS.NOTIFICATION(id), { cache: true }),
    markRead: (id) => put(API_ENDPOINTS.NOTIFICATION(id), { read: true }),
    markAllRead: () => post(API_ENDPOINTS.NOTIFICATIONS_READ_ALL),
    delete: (id) => del(API_ENDPOINTS.NOTIFICATION(id)),
};

/**
 * الملفات
 */
export const filesApi = {
    getAll: (params) => get(API_ENDPOINTS.FILES, { cache: true, ...params }),
    getById: (id) => get(API_ENDPOINTS.FILE(id), { cache: true }),
    upload: (file, metadata) => uploadFile(API_ENDPOINTS.FILES, file, metadata),
    delete: (id) => del(API_ENDPOINTS.FILE(id)),
    download: (id) => downloadFile(API_ENDPOINTS.FILE_DOWNLOAD(id)),
};

/**
 * التقارير
 */
export const reportsApi = {
    getReport: (type, params) => get(API_ENDPOINTS.REPORT(type), { cache: true, ...params }),
    getAllTypes: () => get(API_ENDPOINTS.REPORTS, { cache: true }),
};

/**
 * الإعدادات
 */
export const settingsApi = {
    getAll: () => get(API_ENDPOINTS.SETTINGS, { cache: true }),
    getByKey: (key) => get(API_ENDPOINTS.SETTING(key), { cache: true }),
    update: (key, value) => put(API_ENDPOINTS.SETTING(key), { value }),
    updateMany: (data) => put(API_ENDPOINTS.SETTINGS, data),
};

/**
 * سجل النشاطات
 */
export const logsApi = {
    getAll: (params) => get(API_ENDPOINTS.LOGS, { cache: true, ...params }),
};

/**
 * الأرشيف
 */
export const archiveApi = {
    getAll: (params) => get(API_ENDPOINTS.ARCHIVE, { cache: true, ...params }),
    getById: (id) => get(API_ENDPOINTS.ARCHIVE_ITEM(id)),
    archive: (data) => post(API_ENDPOINTS.ARCHIVE, data),
    restore: (id) => post(API_ENDPOINTS.ARCHIVE_RESTORE(id)),
};

/**
 * لوحة التحكم
 */
export const dashboardApi = {
    getSummary: () => get(API_ENDPOINTS.DASHBOARD_SUMMARY, { cache: true }),
    getCharts: () => get(API_ENDPOINTS.DASHBOARD_CHARTS, { cache: true }),
    getRecent: () => get(API_ENDPOINTS.DASHBOARD_RECENT, { cache: true }),
    getActivities: () => get(API_ENDPOINTS.DASHBOARD_ACTIVITIES, { cache: true }),
};

/**
 * البحث العام
 */
export const searchApi = {
    search: (query) => get(API_ENDPOINTS.SEARCH, { params: { q: query }, cache: false }),
};

/**
 * المساعدة والدعم
 */
export const supportApi = {
    getHelpTopics: () => get(API_ENDPOINTS.HELP, { cache: true }),
    sendSupportMessage: (data) => post(API_ENDPOINTS.SUPPORT, data),
};

// ============================================
//  6.  تصدير جميع الوحدات ككائن واحد
// ============================================

export const api = {
    // الأساسيات
    request,
    get,
    post,
    put,
    patch,
    delete: del,
    uploadFile,
    downloadFile,
    syncOfflineQueue,
    clearOfflineQueue,
    getAuthToken,
    setAuthToken,
    isTokenValid,
    verifySession,
    refreshToken,
    clearCache,

    // الكيانات
    auth: authApi,
    users: usersApi,
    customers: customersApi,
    employees: employeesApi,
    services: servicesApi,
    orders: ordersApi,
    invoices: invoicesApi,
    transactions: transactionsApi,
    attendance: attendanceApi,
    tasks: tasksApi,
    messages: messagesApi,
    notifications: notificationsApi,
    files: filesApi,
    reports: reportsApi,
    settings: settingsApi,
    logs: logsApi,
    archive: archiveApi,
    dashboard: dashboardApi,
    search: searchApi,
    support: supportApi,
};

// تصدير api كافتراضي
export default api;

// ============================================
//  7.  نهاية الملف
// ============================================
