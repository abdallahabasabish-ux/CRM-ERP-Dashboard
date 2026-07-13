/**
 * ======================================================
 * الملف: backend/google-apps-script/Code.gs
 * الوصف: نقطة الدخول الرئيسية لتطبيق Google Apps Script
 *         يدير معالجة الطلبات HTTP، التوجيه، المصادقة،
 *         والأمان الأساسي
 * الإصدار: 1.0.0
 * التاريخ: 2026-07-13
 * ======================================================
 */

// ============================================
//  1.  الثوابت والإعدادات العامة
// ============================================

const CONFIG = {
    // معرف ملف Google Sheets (يجب تعديله)
    SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID_HERE',
    
    // مفتاح JWT السري (يجب تغييره)
    JWT_SECRET: 'YOUR_JWT_SECRET_HERE',
    
    // مدة صلاحية التوكن (بالثواني)
    TOKEN_EXPIRY: 86400, // 24 ساعة
    
    // الحد الأقصى لعدد الطلبات في الدقيقة
    RATE_LIMIT: 60,
    
    // الإصدار
    VERSION: '1.0.0',
};

// ============================================
//  2.  دوال معالجة الطلبات الرئيسية
// ============================================

/**
 * معالجة طلبات GET
 * @param {Object} e - كائن الحدث
 * @returns {HtmlOutput|TextOutput} الاستجابة
 */
function doGet(e) {
    return handleRequest(e, 'GET');
}

/**
 * معالجة طلبات POST
 * @param {Object} e - كائن الحدث
 * @returns {TextOutput} الاستجابة
 */
function doPost(e) {
    return handleRequest(e, 'POST');
}

/**
 * معالجة طلبات PUT
 * @param {Object} e - كائن الحدث
 * @returns {TextOutput} الاستجابة
 */
function doPut(e) {
    return handleRequest(e, 'PUT');
}

/**
 * معالجة طلبات DELETE
 * @param {Object} e - كائن الحدث
 * @returns {TextOutput} الاستجابة
 */
function doDelete(e) {
    return handleRequest(e, 'DELETE');
}

/**
 * معالج الطلبات الرئيسي
 * @param {Object} e - كائن الحدث
 * @param {string} method - طريقة الطلب
 * @returns {TextOutput} الاستجابة
 */
function handleRequest(e, method) {
    try {
        // تسجيل الطلب
        logRequest(e, method);
        
        // التحقق من الحد الأقصى للطلبات (Rate Limiting)
        if (!checkRateLimit(e)) {
            return createResponse({ 
                success: false, 
                message: 'تم تجاوز الحد الأقصى للطلبات. يرجى المحاولة لاحقاً.' 
            }, 429);
        }
        
        // استخراج المسار من المعاملات
        const path = e.parameter.path || '';
        const params = e.parameter;
        
        // استخراج البيانات من الجسم (لـ POST, PUT)
        let body = {};
        if (method === 'POST' || method === 'PUT') {
            try {
                body = JSON.parse(e.postData?.contents || '{}');
            } catch (error) {
                body = {};
            }
        }
        
        // التحقق من المصادقة (ما عدا مسارات المصادقة)
        const publicPaths = ['/auth/login', '/auth/refresh'];
        const isPublic = publicPaths.some(p => path.startsWith(p));
        
        let user = null;
        if (!isPublic) {
            const authResult = authenticateRequest(e);
            if (!authResult.success) {
                return createResponse(authResult, 401);
            }
            user = authResult.user;
        }
        
        // توجيه الطلب إلى المعالج المناسب
        const result = routeRequest(path, method, params, body, user);
        
        // إرجاع الاستجابة
        return createResponse(result, result.statusCode || 200);
        
    } catch (error) {
        console.error('Request handler error:', error);
        return createResponse({
            success: false,
            message: 'حدث خطأ داخلي في الخادم',
            error: error.toString()
        }, 500);
    }
}

// ============================================
//  3.  دوال التوجيه (Routing)
// ============================================

/**
 * توجيه الطلب إلى المعالج المناسب
 */
function routeRequest(path, method, params, body, user) {
    // فصل المسار إلى أجزاء
    const parts = path.split('/').filter(p => p.length > 0);
    const resource = parts[0] || '';
    const id = parts[1] || null;
    const subResource = parts[2] || null;
    
    // بناء كائن الطلب
    const request = {
        path,
        method,
        params,
        body,
        user,
        resource,
        id,
        subResource,
    };
    
    // توجيه حسب المورد
    switch (resource) {
        case 'auth':
            return handleAuthRoutes(request);
        case 'users':
            return handleUsersRoutes(request);
        case 'customers':
            return handleCustomersRoutes(request);
        case 'employees':
            return handleEmployeesRoutes(request);
        case 'services':
            return handleServicesRoutes(request);
        case 'orders':
            return handleOrdersRoutes(request);
        case 'invoices':
            return handleInvoicesRoutes(request);
        case 'transactions':
            return handleTransactionsRoutes(request);
        case 'attendance':
            return handleAttendanceRoutes(request);
        case 'tasks':
            return handleTasksRoutes(request);
        case 'messages':
            return handleMessagesRoutes(request);
        case 'notifications':
            return handleNotificationsRoutes(request);
        case 'files':
            return handleFilesRoutes(request);
        case 'reports':
            return handleReportsRoutes(request);
        case 'settings':
            return handleSettingsRoutes(request);
        case 'logs':
            return handleLogsRoutes(request);
        case 'archive':
            return handleArchiveRoutes(request);
        case 'dashboard':
            return handleDashboardRoutes(request);
        case 'search':
            return handleSearchRoutes(request);
        default:
            return {
                success: false,
                message: 'المورد غير موجود',
                statusCode: 404
            };
    }
}

// ============================================
//  4.  دوال المصادقة (Authentication)
// ============================================

/**
 * التحقق من المصادقة
 */
function authenticateRequest(e) {
    try {
        // الحصول على التوكن من الرأس
        const authHeader = e.parameter.auth || e.headers?.Authorization || '';
        const token = authHeader.replace(/^Bearer\s+/i, '');
        
        if (!token) {
            return { success: false, message: 'مطلوب توكن المصادقة' };
        }
        
        // التحقق من التوكن
        const payload = verifyJWT(token);
        if (!payload) {
            return { success: false, message: 'توكن غير صالح أو منتهي الصلاحية' };
        }
        
        // الحصول على بيانات المستخدم
        const user = getUserById(payload.userId);
        if (!user) {
            return { success: false, message: 'المستخدم غير موجود' };
        }
        
        return { success: true, user };
        
    } catch (error) {
        console.error('Authentication error:', error);
        return { success: false, message: 'خطأ في المصادقة' };
    }
}

/**
 * تسجيل الدخول
 */
function handleLogin(request) {
    const { email, password } = request.body;
    
    if (!email || !password) {
        return {
            success: false,
            message: 'البريد الإلكتروني وكلمة المرور مطلوبان',
            statusCode: 400
        };
    }
    
    // البحث عن المستخدم
    const user = findUserByEmail(email);
    if (!user) {
        return {
            success: false,
            message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
            statusCode: 401
        };
    }
    
    // التحقق من كلمة المرور
    if (!verifyPassword(password, user.password_hash)) {
        return {
            success: false,
            message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
            statusCode: 401
        };
    }
    
    // إنشاء توكن
    const token = generateJWT({
        userId: user.id,
        email: user.email,
        role: user.role
    });
    
    // تحديث آخر تسجيل دخول
    updateLastLogin(user.id);
    
    return {
        success: true,
        data: {
            token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar || ''
            }
        }
    };
}

/**
 * التحقق من التوكن
 */
function handleVerify(request) {
    // تم التحقق بالفعل في middleware
    return {
        success: true,
        data: request.user
    };
}

/**
 * تسجيل الخروج
 */
function handleLogout(request) {
    // في حالة JWT، لا نحتاج إلى تسجيل خروج من جهة الخادم
    // فقط نقوم بإلغاء التوكن من جهة العميل
    return {
        success: true,
        message: 'تم تسجيل الخروج بنجاح'
    };
}

/**
 * تجديد التوكن
 */
function handleRefresh(request) {
    // تم التحقق بالفعل في middleware
    const user = request.user;
    const token = generateJWT({
        userId: user.id,
        email: user.email,
        role: user.role
    });
    
    return {
        success: true,
        data: { token }
    };
}

// ============================================
//  5.  دوال مساعدة للمصادقة (JWT)
// ============================================

/**
 * توليد JWT
 */
function generateJWT(payload) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const data = {
        ...payload,
        iat: now,
        exp: now + CONFIG.TOKEN_EXPIRY
    };
    
    const headerB64 = Utilities.base64Encode(JSON.stringify(header));
    const payloadB64 = Utilities.base64Encode(JSON.stringify(data));
    const signature = computeSignature(headerB64 + '.' + payloadB64);
    
    return headerB64 + '.' + payloadB64 + '.' + signature;
}

/**
 * التحقق من JWT
 */
function verifyJWT(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        
        const [headerB64, payloadB64, signature] = parts;
        const expectedSignature = computeSignature(headerB64 + '.' + payloadB64);
        
        if (signature !== expectedSignature) return null;
        
        const payload = JSON.parse(Utilities.base64Decode(payloadB64));
        const now = Math.floor(Date.now() / 1000);
        
        if (payload.exp && payload.exp < now) return null;
        
        return payload;
        
    } catch (error) {
        console.error('JWT verification error:', error);
        return null;
    }
}

/**
 * حساب التوقيع
 */
function computeSignature(data) {
    const secret = CONFIG.JWT_SECRET;
    const signature = Utilities.computeHmacSha256Signature(data, secret);
    return Utilities.base64Encode(signature);
}

// ============================================
//  6.  دوال مساعدة للمستخدمين
// ============================================

/**
 * البحث عن مستخدم بالبريد الإلكتروني
 */
function findUserByEmail(email) {
    const sheet = getSheet('Users');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const emailIndex = headers.indexOf('email');
    const idIndex = headers.indexOf('id');
    const nameIndex = headers.indexOf('name');
    const passwordIndex = headers.indexOf('password_hash');
    const roleIndex = headers.indexOf('role');
    const avatarIndex = headers.indexOf('avatar');
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[emailIndex] === email) {
            return {
                id: row[idIndex],
                name: row[nameIndex],
                email: row[emailIndex],
                password_hash: row[passwordIndex],
                role: row[roleIndex],
                avatar: row[avatarIndex] || ''
            };
        }
    }
    return null;
}

/**
 * الحصول على مستخدم بالمعرف
 */
function getUserById(id) {
    const sheet = getSheet('Users');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('id');
    const nameIndex = headers.indexOf('name');
    const emailIndex = headers.indexOf('email');
    const roleIndex = headers.indexOf('role');
    const avatarIndex = headers.indexOf('avatar');
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[idIndex] === id) {
            return {
                id: row[idIndex],
                name: row[nameIndex],
                email: row[emailIndex],
                role: row[roleIndex],
                avatar: row[avatarIndex] || ''
            };
        }
    }
    return null;
}

/**
 * تحديث آخر تسجيل دخول
 */
function updateLastLogin(userId) {
    const sheet = getSheet('Users');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('id');
    const lastLoginIndex = headers.indexOf('last_login');
    
    for (let i = 1; i < data.length; i++) {
        if (data[i][idIndex] === userId) {
            sheet.getRange(i + 1, lastLoginIndex + 1).setValue(new Date().toISOString());
            break;
        }
    }
}

/**
 * التحقق من كلمة المرور (بسيط، للتجربة)
 * في الإنتاج، استخدم bcrypt أو خوارزمية تشفير قوية
 */
function verifyPassword(input, hash) {
    // بسيط: مقارنة مباشرة (للتجربة فقط)
    // في الإنتاج، استخدم bcrypt أو ما شابه
    return input === hash;
}

// ============================================
//  7.  دوال مساعدة (Google Sheets)
// ============================================

/**
 * الحصول على ورقة عمل باسم معين
 */
function getSheet(sheetName) {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
        // إنشاء الورقة إذا لم تكن موجودة
        return ss.insertSheet(sheetName);
    }
    return sheet;
}

/**
 * الحصول على جميع البيانات من ورقة
 */
function getSheetData(sheetName) {
    const sheet = getSheet(sheetName);
    return sheet.getDataRange().getValues();
}

/**
 * إضافة صف جديد إلى ورقة
 */
function appendRow(sheetName, rowData) {
    const sheet = getSheet(sheetName);
    sheet.appendRow(rowData);
}

/**
 * تحديث صف في ورقة
 */
function updateRow(sheetName, rowIndex, rowData) {
    const sheet = getSheet(sheetName);
    const range = sheet.getRange(rowIndex, 1, 1, rowData.length);
    range.setValues([rowData]);
}

/**
 * حذف صف من ورقة
 */
function deleteRow(sheetName, rowIndex) {
    const sheet = getSheet(sheetName);
    sheet.deleteRow(rowIndex);
}

// ============================================
//  8.  دوال مساعدة (الاستجابة)
// ============================================

/**
 * إنشاء استجابة HTTP
 */
function createResponse(data, statusCode = 200) {
    const output = ContentService.createTextOutput(JSON.stringify(data));
    output.setMimeType(ContentService.MimeType.JSON);
    return output;
}

/**
 * تسجيل الطلب
 */
function logRequest(e, method) {
    const log = {
        timestamp: new Date().toISOString(),
        method: method,
        path: e.parameter.path || '',
        ip: e.parameter.ip || e.headers?.['X-Forwarded-For'] || 'unknown',
        userAgent: e.headers?.['User-Agent'] || 'unknown'
    };
    
    // تسجيل في Logs (اختياري)
    try {
        const sheet = getSheet('Logs');
        const headers = ['timestamp', 'method', 'path', 'ip', 'userAgent'];
        if (sheet.getLastRow() === 0) {
            sheet.appendRow(headers);
        }
        sheet.appendRow([log.timestamp, log.method, log.path, log.ip, log.userAgent]);
    } catch (error) {
        // تجاهل أخطاء التسجيل
    }
}

/**
 * التحقق من معدل الطلبات (Rate Limiting)
 */
function checkRateLimit(e) {
    // تنفيذ بسيط للتجربة
    // في الإنتاج، استخدم CacheService أو Memcache
    const ip = e.parameter.ip || e.headers?.['X-Forwarded-For'] || 'unknown';
    const cache = CacheService.getScriptCache();
    const key = `rate_${ip}`;
    const count = parseInt(cache.get(key) || '0');
    
    if (count >= CONFIG.RATE_LIMIT) {
        return false;
    }
    
    cache.put(key, count + 1, 60); // 60 ثانية
    return true;
}

// ============================================
//  9.  دوال مساعدة للتحقق من الصلاحيات
// ============================================

/**
 * التحقق من صلاحية المستخدم
 */
function checkPermission(user, permission) {
    if (!user) return false;
    if (user.role === 'admin') return true;
    
    // قائمة الصلاحيات حسب الدور
    const permissions = {
        'manager': ['view_dashboard', 'view_customers', 'view_orders', 'view_reports'],
        'employee': ['view_dashboard', 'view_customers', 'view_orders', 'view_tasks'],
        'accountant': ['view_dashboard', 'view_accounting', 'view_invoices', 'view_reports']
    };
    
    const userPermissions = permissions[user.role] || [];
    return userPermissions.includes(permission);
}

// ============================================
//  10.  دوال وهمية للمعالجات (سيتم تفصيلها في ملفات منفصلة)
// ============================================

// تم استدعاء هذه الدوال في routeRequest، سيتم تنفيذها في الملفات المنفصلة
// نضع دوال وهمية لمنع الأخطاء أثناء التطوير

function handleAuthRoutes(request) {
    const { resource, subResource, method } = request;
    if (resource !== 'auth') return { success: false, message: 'مورد غير صحيح' };
    
    switch (subResource || method) {
        case 'login':
            if (method === 'POST') return handleLogin(request);
            break;
        case 'verify':
            if (method === 'GET') return handleVerify(request);
            break;
        case 'logout':
            if (method === 'POST') return handleLogout(request);
            break;
        case 'refresh':
            if (method === 'POST') return handleRefresh(request);
            break;
    }
    
    return { success: false, message: 'نهاية غير صحيحة', statusCode: 404 };
}

function handleUsersRoutes(request) {
    return { success: false, message: 'قيد التطوير', statusCode: 501 };
}

function handleCustomersRoutes(request) {
    return { success: false, message: 'قيد التطوير', statusCode: 501 };
}

function handleEmployeesRoutes(request) {
    return { success: false, message: 'قيد التطوير', statusCode: 501 };
}

function handleServicesRoutes(request) {
    return { success: false, message: 'قيد التطوير', statusCode: 501 };
}

function handleOrdersRoutes(request) {
    return { success: false, message: 'قيد التطوير', statusCode: 501 };
}

function handleInvoicesRoutes(request) {
    return { success: false, message: 'قيد التطوير', statusCode: 501 };
}

function handleTransactionsRoutes(request) {
    return { success: false, message: 'قيد التطوير', statusCode: 501 };
}

function handleAttendanceRoutes(request) {
    return { success: false, message: 'قيد التطوير', statusCode: 501 };
}

function handleTasksRoutes(request) {
    return { success: false, message: 'قيد التطوير', statusCode: 501 };
}

function handleMessagesRoutes(request) {
    return { success: false, message: 'قيد التطوير', statusCode: 501 };
}

function handleNotificationsRoutes(request) {
    return { success: false, message: 'قيد التطوير', statusCode: 501 };
}

function handleFilesRoutes(request) {
    return { success: false, message: 'قيد التطوير', statusCode: 501 };
}

function handleReportsRoutes(request) {
    return { success: false, message: 'قيد التطوير', statusCode: 501 };
}

function handleSettingsRoutes(request) {
    return { success: false, message: 'قيد التطوير', statusCode: 501 };
}

function handleLogsRoutes(request) {
    return { success: false, message: 'قيد التطوير', statusCode: 501 };
}

function handleArchiveRoutes(request) {
    return { success: false, message: 'قيد التطوير', statusCode: 501 };
}

function handleDashboardRoutes(request) {
    return { success: false, message: 'قيد التطوير', statusCode: 501 };
}

function handleSearchRoutes(request) {
    return { success: false, message: 'قيد التطوير', statusCode: 501 };
}

// ============================================
//  11.  نهاية الملف
// ============================================
