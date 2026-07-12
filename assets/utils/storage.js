/**
 * ======================================================
 * الملف: utils/storage.js
 * الوصف: إدارة التخزين المحلي (LocalStorage، SessionStorage، IndexedDB)
 *         للتخزين المؤقت، البيانات غير المتصلة، والجلسات
 * الإصدار: 1.0.0
 * التاريخ: 2026-07-12
 * ======================================================
 */

// ============================================
//  1.  LocalStorage و SessionStorage
// ============================================

/**
 * حفظ عنصر في LocalStorage
 * @param {string} key - المفتاح
 * @param {*} value - القيمة (يتم تحويلها إلى JSON)
 * @returns {boolean} نجاح العملية
 */
export function setItem(key, value) {
    try {
        const serialized = JSON.stringify(value);
        localStorage.setItem(key, serialized);
        return true;
    } catch (error) {
        console.error(`Error setting item "${key}" in localStorage:`, error);
        return false;
    }
}

/**
 * استرجاع عنصر من LocalStorage
 * @param {string} key - المفتاح
 * @param {*} defaultValue - القيمة الافتراضية في حال عدم وجود العنصر
 * @returns {*} القيمة أو القيمة الافتراضية
 */
export function getItem(key, defaultValue = null) {
    try {
        const value = localStorage.getItem(key);
        if (value === null || value === undefined) {
            return defaultValue;
        }
        return JSON.parse(value);
    } catch (error) {
        console.error(`Error getting item "${key}" from localStorage:`, error);
        return defaultValue;
    }
}

/**
 * حذف عنصر من LocalStorage
 * @param {string} key - المفتاح
 * @returns {boolean} نجاح العملية
 */
export function removeItem(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error(`Error removing item "${key}" from localStorage:`, error);
        return false;
    }
}

/**
 * مسح جميع عناصر LocalStorage
 * @returns {boolean} نجاح العملية
 */
export function clearStorage() {
    try {
        localStorage.clear();
        return true;
    } catch (error) {
        console.error('Error clearing localStorage:', error);
        return false;
    }
}

/**
 * حفظ عنصر في SessionStorage
 * @param {string} key - المفتاح
 * @param {*} value - القيمة (يتم تحويلها إلى JSON)
 * @returns {boolean} نجاح العملية
 */
export function setSessionItem(key, value) {
    try {
        const serialized = JSON.stringify(value);
        sessionStorage.setItem(key, serialized);
        return true;
    } catch (error) {
        console.error(`Error setting item "${key}" in sessionStorage:`, error);
        return false;
    }
}

/**
 * استرجاع عنصر من SessionStorage
 * @param {string} key - المفتاح
 * @param {*} defaultValue - القيمة الافتراضية في حال عدم وجود العنصر
 * @returns {*} القيمة أو القيمة الافتراضية
 */
export function getSessionItem(key, defaultValue = null) {
    try {
        const value = sessionStorage.getItem(key);
        if (value === null || value === undefined) {
            return defaultValue;
        }
        return JSON.parse(value);
    } catch (error) {
        console.error(`Error getting item "${key}" from sessionStorage:`, error);
        return defaultValue;
    }
}

/**
 * حذف عنصر من SessionStorage
 * @param {string} key - المفتاح
 * @returns {boolean} نجاح العملية
 */
export function removeSessionItem(key) {
    try {
        sessionStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error(`Error removing item "${key}" from sessionStorage:`, error);
        return false;
    }
}

/**
 * مسح جميع عناصر SessionStorage
 * @returns {boolean} نجاح العملية
 */
export function clearSessionStorage() {
    try {
        sessionStorage.clear();
        return true;
    } catch (error) {
        console.error('Error clearing sessionStorage:', error);
        return false;
    }
}

// ============================================
//  2.  IndexedDB Manager
// ============================================

const DB_NAME = 'ErpCrmDB';
const DB_VERSION = 1;

let dbInstance = null;

/**
 * الحصول على كائن قاعدة البيانات
 * @returns {Promise<IDBDatabase>}
 */
export function getDB() {
    return new Promise((resolve, reject) => {
        if (dbInstance) {
            resolve(dbInstance);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            const oldVersion = event.oldVersion;

            // قائمة مخازن الكائنات
            const stores = [
                'users', 'customers', 'employees', 'services',
                'orders', 'orderItems', 'invoices', 'invoiceItems',
                'transactions', 'attendance', 'tasks', 'messages',
                'notifications', 'files', 'logs', 'settings',
                'archive', 'offlineQueue', 'cache'
            ];

            stores.forEach(storeName => {
                if (!db.objectStoreNames.contains(storeName)) {
                    const store = db.createObjectStore(storeName, { keyPath: 'id' });
                    // إنشاء فهارس للبحث السريع
                    store.createIndex('by_created_at', 'created_at', { unique: false });
                    store.createIndex('by_updated_at', 'updated_at', { unique: false });
                    // فهارس إضافية حسب الكيان
                    if (['customers', 'employees', 'users'].includes(storeName)) {
                        store.createIndex('by_name', 'name', { unique: false });
                        store.createIndex('by_email', 'email', { unique: false });
                    }
                    if (storeName === 'orders') {
                        store.createIndex('by_customer_id', 'customer_id', { unique: false });
                        store.createIndex('by_employee_id', 'employee_id', { unique: false });
                        store.createIndex('by_status', 'status', { unique: false });
                        store.createIndex('by_order_number', 'order_number', { unique: true });
                    }
                    if (storeName === 'tasks') {
                        store.createIndex('by_assigned_to', 'assigned_to', { unique: false });
                        store.createIndex('by_status', 'status', { unique: false });
                    }
                    if (storeName === 'attendance') {
                        store.createIndex('by_employee_id', 'employee_id', { unique: false });
                        store.createIndex('by_date', 'date', { unique: false });
                    }
                    if (storeName === 'messages') {
                        store.createIndex('by_sender_id', 'sender_id', { unique: false });
                        store.createIndex('by_receiver_id', 'receiver_id', { unique: false });
                    }
                    if (storeName === 'notifications') {
                        store.createIndex('by_user_id', 'user_id', { unique: false });
                        store.createIndex('by_read', 'read', { unique: false });
                    }
                    if (storeName === 'files') {
                        store.createIndex('by_parent_type', 'parent_type', { unique: false });
                        store.createIndex('by_parent_id', 'parent_id', { unique: false });
                    }
                    if (storeName === 'transactions') {
                        store.createIndex('by_type', 'type', { unique: false });
                        store.createIndex('by_date', 'date', { unique: false });
                    }
                    if (storeName === 'invoices') {
                        store.createIndex('by_order_id', 'order_id', { unique: false });
                        store.createIndex('by_status', 'status', { unique: false });
                    }
                    if (storeName === 'cache') {
                        store.createIndex('by_key', 'key', { unique: true });
                    }
                }
            });
        };

        request.onsuccess = (event) => {
            dbInstance = event.target.result;
            resolve(dbInstance);
        };

        request.onerror = (event) => {
            reject(new Error(`Failed to open IndexedDB: ${event.target.error}`));
        };
    });
}

/**
 * تنفيذ معاملة على IndexedDB
 * @param {string|string[]} storeNames - اسم/أسماء المخزن
 * @param {string} mode - وضع المعاملة ('readonly' أو 'readwrite')
 * @param {Function} callback - دالة تتلقى المعاملة والمخازن
 * @returns {Promise<any>}
 */
async function executeTransaction(storeNames, mode, callback) {
    const db = await getDB();
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(names, mode);
        const stores = {};
        names.forEach(name => {
            stores[name] = transaction.objectStore(name);
        });

        transaction.oncomplete = () => {
            resolve();
        };

        transaction.onerror = (event) => {
            reject(new Error(`Transaction failed: ${event.target.error}`));
        };

        try {
            const result = callback(transaction, stores);
            if (result !== undefined) {
                resolve(result);
            }
        } catch (error) {
            reject(error);
        }
    });
}

// ============================================
//  3.  IndexedDB CRUD عمليات
// ============================================

/**
 * إضافة أو تحديث عنصر في IndexedDB
 * @param {string} storeName - اسم المخزن
 * @param {Object} data - البيانات
 * @returns {Promise<any>}
 */
export async function dbPut(storeName, data) {
    if (!data.id) {
        throw new Error('Data must have an "id" property');
    }

    const result = await executeTransaction(storeName, 'readwrite', (transaction, stores) => {
        const store = stores[storeName];
        return new Promise((resolve, reject) => {
            const request = store.put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error(`Failed to put data in ${storeName}: ${request.error}`));
        });
    });

    return result;
}

/**
 * إضافة عناصر متعددة في IndexedDB
 * @param {string} storeName - اسم المخزن
 * @param {Object[]} items - قائمة البيانات
 * @returns {Promise<void>}
 */
export async function dbPutMany(storeName, items) {
    if (!items || items.length === 0) return;

    await executeTransaction(storeName, 'readwrite', (transaction, stores) => {
        const store = stores[storeName];
        return new Promise((resolve, reject) => {
            let completed = 0;
            let hasError = false;

            items.forEach(item => {
                if (!item.id) {
                    reject(new Error('Each item must have an "id" property'));
                    return;
                }
                const request = store.put(item);
                request.onsuccess = () => {
                    completed++;
                    if (completed === items.length && !hasError) {
                        resolve();
                    }
                };
                request.onerror = () => {
                    hasError = true;
                    reject(new Error(`Failed to put data in ${storeName}: ${request.error}`));
                };
            });
        });
    });
}

/**
 * استرجاع عنصر من IndexedDB
 * @param {string} storeName - اسم المخزن
 * @param {string} id - المعرف
 * @returns {Promise<Object|null>}
 */
export async function dbGet(storeName, id) {
    const result = await executeTransaction(storeName, 'readonly', (transaction, stores) => {
        const store = stores[storeName];
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(new Error(`Failed to get data from ${storeName}: ${request.error}`));
        });
    });

    return result;
}

/**
 * استرجاع جميع عناصر من IndexedDB
 * @param {string} storeName - اسم المخزن
 * @param {Object} options - خيارات (filter, sort, limit)
 * @returns {Promise<Object[]>}
 */
export async function dbGetAll(storeName, options = {}) {
    const { filter, sortBy, sortOrder = 'asc', limit, offset = 0 } = options;

    let items = await executeTransaction(storeName, 'readonly', (transaction, stores) => {
        const store = stores[storeName];
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(new Error(`Failed to get all data from ${storeName}: ${request.error}`));
        });
    });

    // تطبيق الفلتر
    if (filter && typeof filter === 'function') {
        items = items.filter(filter);
    }

    // تطبيق الترتيب
    if (sortBy) {
        items.sort((a, b) => {
            const valA = a[sortBy];
            const valB = b[sortBy];
            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }

    // تطبيق الحد والإزاحة
    if (offset > 0) {
        items = items.slice(offset);
    }
    if (limit > 0) {
        items = items.slice(0, limit);
    }

    return items;
}

/**
 * استرجاع عناصر من IndexedDB باستخدام فهرس
 * @param {string} storeName - اسم المخزن
 * @param {string} indexName - اسم الفهرس
 * @param {*} value - القيمة المطلوبة
 * @returns {Promise<Object[]>}
 */
export async function dbGetByIndex(storeName, indexName, value) {
    const result = await executeTransaction(storeName, 'readonly', (transaction, stores) => {
        const store = stores[storeName];
        const index = store.index(indexName);
        return new Promise((resolve, reject) => {
            const request = index.getAll(value);
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(new Error(`Failed to get data by index from ${storeName}: ${request.error}`));
        });
    });

    return result;
}

/**
 * حذف عنصر من IndexedDB
 * @param {string} storeName - اسم المخزن
 * @param {string} id - المعرف
 * @returns {Promise<void>}
 */
export async function dbDelete(storeName, id) {
    await executeTransaction(storeName, 'readwrite', (transaction, stores) => {
        const store = stores[storeName];
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error(`Failed to delete data from ${storeName}: ${request.error}`));
        });
    });
}

/**
 * حذف عناصر متعددة من IndexedDB
 * @param {string} storeName - اسم المخزن
 * @param {string[]} ids - قائمة المعرفات
 * @returns {Promise<void>}
 */
export async function dbDeleteMany(storeName, ids) {
    if (!ids || ids.length === 0) return;

    await executeTransaction(storeName, 'readwrite', (transaction, stores) => {
        const store = stores[storeName];
        return new Promise((resolve, reject) => {
            let completed = 0;
            let hasError = false;

            ids.forEach(id => {
                const request = store.delete(id);
                request.onsuccess = () => {
                    completed++;
                    if (completed === ids.length && !hasError) {
                        resolve();
                    }
                };
                request.onerror = () => {
                    hasError = true;
                    reject(new Error(`Failed to delete data from ${storeName}: ${request.error}`));
                };
            });
        });
    });
}

/**
 * مسح جميع العناصر من مخزن IndexedDB
 * @param {string} storeName - اسم المخزن
 * @returns {Promise<void>}
 */
export async function dbClear(storeName) {
    await executeTransaction(storeName, 'readwrite', (transaction, stores) => {
        const store = stores[storeName];
        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error(`Failed to clear ${storeName}: ${request.error}`));
        });
    });
}

/**
 * الحصول على عدد العناصر في مخزن IndexedDB
 * @param {string} storeName - اسم المخزن
 * @returns {Promise<number>}
 */
export async function dbCount(storeName) {
    const result = await executeTransaction(storeName, 'readonly', (transaction, stores) => {
        const store = stores[storeName];
        return new Promise((resolve, reject) => {
            const request = store.count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error(`Failed to count data in ${storeName}: ${request.error}`));
        });
    });

    return result;
}

// ============================================
//  4.  ذاكرة التخزين المؤقت (Cache) - IndexedDB
// ============================================

/**
 * حفظ بيانات في الكاش
 * @param {string} key - مفتاح الكاش
 * @param {*} data - البيانات
 * @param {number} ttl - مدة الصلاحية بالمللي ثانية (افتراضي: 5 دقائق)
 * @returns {Promise<void>}
 */
export async function cacheSet(key, data, ttl = 5 * 60 * 1000) {
    const cacheItem = {
        id: key,
        key,
        data,
        created_at: Date.now(),
        expires_at: Date.now() + ttl,
    };
    await dbPut('cache', cacheItem);
}

/**
 * استرجاع بيانات من الكاش
 * @param {string} key - مفتاح الكاش
 * @returns {Promise<*>} البيانات أو null إذا انتهت الصلاحية أو غير موجودة
 */
export async function cacheGet(key) {
    const item = await dbGet('cache', key);
    if (!item) return null;
    if (Date.now() > item.expires_at) {
        await dbDelete('cache', key);
        return null;
    }
    return item.data;
}

/**
 * حذف عنصر من الكاش
 * @param {string} key - مفتاح الكاش
 * @returns {Promise<void>}
 */
export async function cacheDelete(key) {
    await dbDelete('cache', key);
}

/**
 * مسح الكاش بالكامل
 * @returns {Promise<void>}
 */
export async function cacheClear() {
    await dbClear('cache');
}

/**
 * تنظيف الكاش من العناصر منتهية الصلاحية
 * @returns {Promise<number>} عدد العناصر المحذوفة
 */
export async function cacheCleanup() {
    const allItems = await dbGetAll('cache');
    let deletedCount = 0;
    for (const item of allItems) {
        if (Date.now() > item.expires_at) {
            await dbDelete('cache', item.id);
            deletedCount++;
        }
    }
    return deletedCount;
}

// ============================================
//  5.  قائمة انتظار غير متصل (Offline Queue) - IndexedDB
// ============================================

/**
 * إضافة طلب إلى قائمة انتظار غير متصل
 * @param {Object} request - الطلب (endpoint, method, body, headers, timestamp)
 * @returns {Promise<string>} معرف الطلب
 */
export async function queueAdd(request) {
    const id = `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const queueItem = {
        id,
        ...request,
        attempts: 0,
        status: 'pending', // pending, processing, completed, failed
        created_at: Date.now(),
    };
    await dbPut('offlineQueue', queueItem);
    return id;
}

/**
 * الحصول على جميع الطلبات المعلقة
 * @returns {Promise<Object[]>}
 */
export async function queueGetPending() {
    const all = await dbGetAll('offlineQueue');
    return all.filter(item => item.status === 'pending' || item.status === 'processing');
}

/**
 * تحديث حالة طلب في قائمة الانتظار
 * @param {string} id - معرف الطلب
 * @param {string} status - الحالة الجديدة
 * @param {Object} result - نتيجة الطلب (اختياري)
 * @returns {Promise<void>}
 */
export async function queueUpdate(id, status, result = null) {
    const item = await dbGet('offlineQueue', id);
    if (!item) return;
    item.status = status;
    item.attempts = (item.attempts || 0) + 1;
    item.last_attempt = Date.now();
    if (result) {
        item.result = result;
    }
    if (status === 'completed' || status === 'failed') {
        item.completed_at = Date.now();
    }
    await dbPut('offlineQueue', item);
}

/**
 * حذف طلب من قائمة الانتظار
 * @param {string} id - معرف الطلب
 * @returns {Promise<void>}
 */
export async function queueRemove(id) {
    await dbDelete('offlineQueue', id);
}

/**
 * تنظيف قائمة الانتظار (حذف المكتملة والفاشلة القديمة)
 * @param {number} maxAge - الحد الأقصى للعمر بالمللي ثانية (افتراضي: 7 أيام)
 * @returns {Promise<number>} عدد العناصر المحذوفة
 */
export async function queueCleanup(maxAge = 7 * 24 * 60 * 60 * 1000) {
    const all = await dbGetAll('offlineQueue');
    const now = Date.now();
    let deletedCount = 0;
    for (const item of all) {
        if (item.status === 'completed' || item.status === 'failed') {
            if (now - (item.completed_at || item.created_at) > maxAge) {
                await dbDelete('offlineQueue', item.id);
                deletedCount++;
            }
        }
    }
    return deletedCount;
}

// ============================================
//  6.  تصدير جميع الوظائف
// ============================================

export const storage = {
    // LocalStorage
    setItem,
    getItem,
    removeItem,
    clearStorage,

    // SessionStorage
    setSessionItem,
    getSessionItem,
    removeSessionItem,
    clearSessionStorage,

    // IndexedDB
    getDB,
    dbPut,
    dbPutMany,
    dbGet,
    dbGetAll,
    dbGetByIndex,
    dbDelete,
    dbDeleteMany,
    dbClear,
    dbCount,

    // Cache
    cacheSet,
    cacheGet,
    cacheDelete,
    cacheClear,
    cacheCleanup,

    // Offline Queue
    queueAdd,
    queueGetPending,
    queueUpdate,
    queueRemove,
    queueCleanup,
};

// تصدير storage كافتراضي
export default storage;

// ============================================
//  7.  نهاية الملف
// ============================================
