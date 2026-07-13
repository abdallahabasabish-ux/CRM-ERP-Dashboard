/**
 * ======================================================
 * الملف: backend/google-apps-script/auth.gs
 * الوصف: دوال المصادقة وإدارة المستخدمين
 *         تشمل تسجيل الدخول، التحقق، تجديد التوكن،
 *         إدارة المستخدمين (CRUD)، والتحقق من الصلاحيات
 * الإصدار: 1.0.0
 * التاريخ: 2026-07-13
 * ======================================================
 */

// ============================================
//  1.  دوال المصادقة (Authentication)
// ============================================

/**
 * تسجيل الدخول
 * @param {Object} request - كائن الطلب
 * @returns {Object} استجابة تحتوي على التوكن وبيانات المستخدم
 */
function handleLogin(request) {
    const { email, password } = request.body;
    
    // التحقق من المدخلات
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
        // تسجيل محاولة فاشلة
        logFailedAttempt(email, request.ip);
        return {
            success: false,
            message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
            statusCode: 401
        };
    }
    
    // التحقق من حالة الحساب
    if (user.is_active === false) {
        return {
            success: false,
            message: 'الحساب غير نشط. يرجى التواصل مع المسؤول.',
            statusCode: 403
        };
    }
    
    // إنشاء التوكن
    const token = generateJWT({
        userId: user.id,
        email: user.email,
        role: user.role
    });
    
    // تحديث آخر تسجيل دخول
    updateLastLogin(user.id);
    
    // تسجيل نجاح الدخول
    logSuccessfulLogin(user.id, request.ip);
    
    return {
        success: true,
        data: {
            token: token,
            expires_in: CONFIG.TOKEN_EXPIRY,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar || '',
                department: user.department || '',
                phone: user.phone || ''
            }
        }
    };
}

/**
 * التحقق من التوكن
 * @param {Object} request - كائن الطلب
 * @returns {Object} بيانات المستخدم إذا كان التوكن صالحاً
 */
function handleVerify(request) {
    // تم التحقق بالفعل في middleware
    const user = request.user;
    return {
        success: true,
        data: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar || '',
            department: user.department || '',
            phone: user.phone || ''
        }
    };
}

/**
 * تسجيل الخروج
 * @param {Object} request - كائن الطلب
 * @returns {Object} استجابة نجاح
 */
function handleLogout(request) {
    // في حالة JWT، لا نحتاج إلى تسجيل خروج من جهة الخادم
    // يمكن إضافة التوكن إلى قائمة سوداء (اختياري)
    return {
        success: true,
        message: 'تم تسجيل الخروج بنجاح'
    };
}

/**
 * تجديد التوكن
 * @param {Object} request - كائن الطلب
 * @returns {Object} توكن جديد
 */
function handleRefresh(request) {
    const user = request.user;
    const token = generateJWT({
        userId: user.id,
        email: user.email,
        role: user.role
    });
    
    return {
        success: true,
        data: {
            token: token,
            expires_in: CONFIG.TOKEN_EXPIRY
        }
    };
}

/**
 * تغيير كلمة المرور
 * @param {Object} request - كائن الطلب
 * @returns {Object} استجابة نجاح أو فشل
 */
function handleChangePassword(request) {
    const user = request.user;
    const { old_password, new_password, confirm_password } = request.body;
    
    // التحقق من المدخلات
    if (!old_password || !new_password || !confirm_password) {
        return {
            success: false,
            message: 'جميع الحقول مطلوبة',
            statusCode: 400
        };
    }
    
    if (new_password !== confirm_password) {
        return {
            success: false,
            message: 'كلمة المرور الجديدة وتأكيدها غير متطابقين',
            statusCode: 400
        };
    }
    
    if (new_password.length < 6) {
        return {
            success: false,
            message: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل',
            statusCode: 400
        };
    }
    
    // الحصول على المستخدم الحالي
    const currentUser = getUserById(user.id);
    if (!currentUser) {
        return {
            success: false,
            message: 'المستخدم غير موجود',
            statusCode: 404
        };
    }
    
    // التحقق من كلمة المرور القديمة
    if (!verifyPassword(old_password, currentUser.password_hash)) {
        return {
            success: false,
            message: 'كلمة المرور القديمة غير صحيحة',
            statusCode: 401
        };
    }
    
    // تحديث كلمة المرور
    const hashedPassword = hashPassword(new_password);
    updatePassword(user.id, hashedPassword);
    
    // تسجيل الحدث
    logUserAction(user.id, 'change_password', 'تم تغيير كلمة المرور');
    
    return {
        success: true,
        message: 'تم تغيير كلمة المرور بنجاح'
    };
}

// ============================================
//  2.  دوال إدارة المستخدمين (CRUD)
// ============================================

/**
 * الحصول على جميع المستخدمين
 * @param {Object} request - كائن الطلب
 * @returns {Object} قائمة المستخدمين
 */
function handleGetUsers(request) {
    // التحقق من الصلاحية (مدير أو مسؤول فقط)
    if (!checkPermission(request.user, 'view_users')) {
        return {
            success: false,
            message: 'ليس لديك صلاحية لعرض المستخدمين',
            statusCode: 403
        };
    }
    
    const users = getAllUsers();
    return {
        success: true,
        data: users.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department || '',
            phone: user.phone || '',
            avatar: user.avatar || '',
            is_active: user.is_active,
            last_login: user.last_login || '',
            created_at: user.created_at || ''
        }))
    };
}

/**
 * الحصول على مستخدم بالمعرف
 * @param {Object} request - كائن الطلب
 * @returns {Object} بيانات المستخدم
 */
function handleGetUser(request) {
    const userId = request.id;
    if (!userId) {
        return {
            success: false,
            message: 'معرف المستخدم مطلوب',
            statusCode: 400
        };
    }
    
    // التحقق من الصلاحية (نفسه أو مدير/مسؤول)
    if (request.user.id !== userId && !checkPermission(request.user, 'view_users')) {
        return {
            success: false,
            message: 'ليس لديك صلاحية لعرض هذا المستخدم',
            statusCode: 403
        };
    }
    
    const user = getUserById(userId);
    if (!user) {
        return {
            success: false,
            message: 'المستخدم غير موجود',
            statusCode: 404
        };
    }
    
    return {
        success: true,
        data: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department || '',
            phone: user.phone || '',
            avatar: user.avatar || '',
            is_active: user.is_active,
            last_login: user.last_login || '',
            created_at: user.created_at || ''
        }
    };
}

/**
 * إنشاء مستخدم جديد
 * @param {Object} request - كائن الطلب
 * @returns {Object} بيانات المستخدم الجديد
 */
function handleCreateUser(request) {
    // التحقق من الصلاحية (مدير أو مسؤول فقط)
    if (!checkPermission(request.user, 'create_user')) {
        return {
            success: false,
            message: 'ليس لديك صلاحية لإضافة مستخدمين',
            statusCode: 403
        };
    }
    
    const { name, email, password, role, department, phone, avatar } = request.body;
    
    // التحقق من المدخلات
    if (!name || !email || !password || !role) {
        return {
            success: false,
            message: 'الاسم، البريد الإلكتروني، كلمة المرور، والدور مطلوبون',
            statusCode: 400
        };
    }
    
    // التحقق من صحة البريد الإلكتروني
    if (!isValidEmail(email)) {
        return {
            success: false,
            message: 'البريد الإلكتروني غير صحيح',
            statusCode: 400
        };
    }
    
    // التحقق من عدم وجود البريد مسبقاً
    if (findUserByEmail(email)) {
        return {
            success: false,
            message: 'البريد الإلكتروني مستخدم بالفعل',
            statusCode: 409
        };
    }
    
    // التحقق من صحة الدور
    const validRoles = ['admin', 'manager', 'employee', 'accountant'];
    if (!validRoles.includes(role)) {
        return {
            success: false,
            message: 'دور غير صحيح. الأدوار المتاحة: ' + validRoles.join(', '),
            statusCode: 400
        };
    }
    
    // إنشاء المستخدم
    const userId = generateId();
    const hashedPassword = hashPassword(password);
    const now = new Date().toISOString();
    
    const userData = {
        id: userId,
        name: name,
        email: email,
        password_hash: hashedPassword,
        role: role,
        department: department || '',
        phone: phone || '',
        avatar: avatar || '',
        is_active: true,
        created_at: now,
        updated_at: now,
        last_login: ''
    };
    
    // حفظ في قاعدة البيانات
    saveUser(userData);
    
    // تسجيل الحدث
    logUserAction(request.user.id, 'create_user', 'تم إنشاء مستخدم جديد: ' + email);
    
    return {
        success: true,
        data: {
            id: userId,
            name: name,
            email: email,
            role: role,
            department: department || '',
            phone: phone || '',
            avatar: avatar || '',
            created_at: now
        },
        message: 'تم إنشاء المستخدم بنجاح'
    };
}

/**
 * تحديث مستخدم
 * @param {Object} request - كائن الطلب
 * @returns {Object} بيانات المستخدم المحدث
 */
function handleUpdateUser(request) {
    const userId = request.id;
    if (!userId) {
        return {
            success: false,
            message: 'معرف المستخدم مطلوب',
            statusCode: 400
        };
    }
    
    // التحقق من الصلاحية (نفسه أو مدير/مسؤول)
    if (request.user.id !== userId && !checkPermission(request.user, 'edit_user')) {
        return {
            success: false,
            message: 'ليس لديك صلاحية لتعديل هذا المستخدم',
            statusCode: 403
        };
    }
    
    const user = getUserById(userId);
    if (!user) {
        return {
            success: false,
            message: 'المستخدم غير موجود',
            statusCode: 404
        };
    }
    
    const { name, email, role, department, phone, avatar, is_active } = request.body;
    
    // تحديث البيانات
    if (name) user.name = name;
    if (email && email !== user.email) {
        // التحقق من صحة البريد الجديد
        if (!isValidEmail(email)) {
            return {
                success: false,
                message: 'البريد الإلكتروني غير صحيح',
                statusCode: 400
            };
        }
        // التحقق من عدم استخدام البريد من قبل مستخدم آخر
        const existingUser = findUserByEmail(email);
        if (existingUser && existingUser.id !== userId) {
            return {
                success: false,
                message: 'البريد الإلكتروني مستخدم بالفعل',
                statusCode: 409
            };
        }
        user.email = email;
    }
    if (role && checkPermission(request.user, 'edit_user')) {
        const validRoles = ['admin', 'manager', 'employee', 'accountant'];
        if (!validRoles.includes(role)) {
            return {
                success: false,
                message: 'دور غير صحيح',
                statusCode: 400
            };
        }
        user.role = role;
    }
    if (department !== undefined) user.department = department;
    if (phone !== undefined) user.phone = phone;
    if (avatar !== undefined) user.avatar = avatar;
    if (is_active !== undefined && checkPermission(request.user, 'edit_user')) {
        user.is_active = is_active;
    }
    user.updated_at = new Date().toISOString();
    
    // حفظ التغييرات
    updateUser(user);
    
    // تسجيل الحدث
    logUserAction(request.user.id, 'update_user', 'تم تحديث مستخدم: ' + user.email);
    
    return {
        success: true,
        data: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department || '',
            phone: user.phone || '',
            avatar: user.avatar || '',
            is_active: user.is_active,
            updated_at: user.updated_at
        },
        message: 'تم تحديث المستخدم بنجاح'
    };
}

/**
 * حذف مستخدم
 * @param {Object} request - كائن الطلب
 * @returns {Object} استجابة نجاح
 */
function handleDeleteUser(request) {
    const userId = request.id;
    if (!userId) {
        return {
            success: false,
            message: 'معرف المستخدم مطلوب',
            statusCode: 400
        };
    }
    
    // التحقق من الصلاحية (مدير أو مسؤول فقط)
    if (!checkPermission(request.user, 'delete_user')) {
        return {
            success: false,
            message: 'ليس لديك صلاحية لحذف المستخدمين',
            statusCode: 403
        };
    }
    
    // منع حذف الذات
    if (request.user.id === userId) {
        return {
            success: false,
            message: 'لا يمكنك حذف حسابك الخاص',
            statusCode: 400
        };
    }
    
    const user = getUserById(userId);
    if (!user) {
        return {
            success: false,
            message: 'المستخدم غير موجود',
            statusCode: 404
        };
    }
    
    // حذف المستخدم
    deleteUser(userId);
    
    // تسجيل الحدث
    logUserAction(request.user.id, 'delete_user', 'تم حذف مستخدم: ' + user.email);
    
    return {
        success: true,
        message: 'تم حذف المستخدم بنجاح'
    };
}

// ============================================
//  3.  دوال مساعدة لقاعدة البيانات (Users)
// ============================================

/**
 * الحصول على جميع المستخدمين
 */
function getAllUsers() {
    const sheet = getSheet('Users');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const users = [];
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const user = {};
        headers.forEach((header, index) => {
            user[header] = row[index] || '';
        });
        users.push(user);
    }
    return users;
}

/**
 * البحث عن مستخدم بالبريد الإلكتروني
 */
function findUserByEmail(email) {
    const sheet = getSheet('Users');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const emailIndex = headers.indexOf('email');
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[emailIndex] === email) {
            const user = {};
            headers.forEach((header, index) => {
                user[header] = row[index] || '';
            });
            return user;
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
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[idIndex] === id) {
            const user = {};
            headers.forEach((header, index) => {
                user[header] = row[index] || '';
            });
            return user;
        }
    }
    return null;
}

/**
 * حفظ مستخدم جديد
 */
function saveUser(userData) {
    const sheet = getSheet('Users');
    const headers = ['id', 'name', 'email', 'password_hash', 'role', 'department', 'phone', 'avatar', 'is_active', 'created_at', 'updated_at', 'last_login'];
    
    // إذا كانت الورقة فارغة، أضف الرؤوس
    if (sheet.getLastRow() === 0) {
        sheet.appendRow(headers);
    }
    
    const row = headers.map(header => userData[header] || '');
    sheet.appendRow(row);
}

/**
 * تحديث مستخدم
 */
function updateUser(user) {
    const sheet = getSheet('Users');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('id');
    
    for (let i = 1; i < data.length; i++) {
        if (data[i][idIndex] === user.id) {
            const row = headers.map(header => user[header] || '');
            sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
            break;
        }
    }
}

/**
 * تحديث كلمة المرور
 */
function updatePassword(userId, hashedPassword) {
    const sheet = getSheet('Users');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('id');
    const passwordIndex = headers.indexOf('password_hash');
    const updatedIndex = headers.indexOf('updated_at');
    
    for (let i = 1; i < data.length; i++) {
        if (data[i][idIndex] === userId) {
            const now = new Date().toISOString();
            sheet.getRange(i + 1, passwordIndex + 1).setValue(hashedPassword);
            if (updatedIndex !== -1) {
                sheet.getRange(i + 1, updatedIndex + 1).setValue(now);
            }
            break;
        }
    }
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
 * حذف مستخدم
 */
function deleteUser(userId) {
    const sheet = getSheet('Users');
    const data = sheet.getDataRange().getValues();
    const idIndex = data[0].indexOf('id');
    
    for (let i = 1; i < data.length; i++) {
        if (data[i][idIndex] === userId) {
            sheet.deleteRow(i + 1);
            break;
        }
    }
}

// ============================================
//  4.  دوال مساعدة للتشفير والأمان
// ============================================

/**
 * توليد معرف فريد (UUID)
 */
function generateId() {
    return Utilities.getUuid();
}

/**
 * تشفير كلمة المرور (بسيط، للتجربة)
 * في الإنتاج، استخدم bcrypt أو SHA-256 مع ملح
 */
function hashPassword(password) {
    // استخدام SHA-256 للتشفير (بسيط)
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
    return Utilities.base64Encode(digest);
}

/**
 * التحقق من كلمة المرور
 */
function verifyPassword(input, hash) {
    // مقارنة التشفير
    const inputHash = hashPassword(input);
    return inputHash === hash;
}

/**
 * التحقق من صحة البريد الإلكتروني
 */
function isValidEmail(email) {
    const pattern = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    return pattern.test(email);
}

// ============================================
//  5.  دوال مساعدة للتسجيل والمراقبة
// ============================================

/**
 * تسجيل محاولة فاشلة
 */
function logFailedAttempt(email, ip) {
    try {
        const sheet = getSheet('Logs');
        const headers = ['timestamp', 'type', 'email', 'ip', 'user_agent'];
        if (sheet.getLastRow() === 0) {
            sheet.appendRow(headers);
        }
        sheet.appendRow([
            new Date().toISOString(),
            'failed_login',
            email,
            ip || 'unknown',
            ''
        ]);
    } catch (error) {
        // تجاهل أخطاء التسجيل
    }
}

/**
 * تسجيل نجاح الدخول
 */
function logSuccessfulLogin(userId, ip) {
    try {
        const sheet = getSheet('Logs');
        const headers = ['timestamp', 'type', 'user_id', 'ip', 'user_agent'];
        if (sheet.getLastRow() === 0) {
            sheet.appendRow(headers);
        }
        sheet.appendRow([
            new Date().toISOString(),
            'successful_login',
            userId,
            ip || 'unknown',
            ''
        ]);
    } catch (error) {
        // تجاهل أخطاء التسجيل
    }
}

/**
 * تسجيل إجراء مستخدم
 */
function logUserAction(userId, action, details) {
    try {
        const sheet = getSheet('AuditLogs');
        const headers = ['timestamp', 'user_id', 'action', 'details', 'ip'];
        if (sheet.getLastRow() === 0) {
            sheet.appendRow(headers);
        }
        sheet.appendRow([
            new Date().toISOString(),
            userId,
            action,
            details,
            ''
        ]);
    } catch (error) {
        // تجاهل أخطاء التسجيل
    }
}

// ============================================
//  6.  دوال التحقق من الصلاحيات (Permissions)
// ============================================

/**
 * التحقق من صلاحية المستخدم
 */
function checkPermission(user, permission) {
    if (!user) return false;
    if (user.role === 'admin') return true;
    
    // قائمة الصلاحيات حسب الدور
    const permissions = {
        'manager': [
            'view_users', 'view_dashboard', 'view_customers', 'view_orders',
            'view_reports', 'view_employees', 'view_tasks', 'view_attendance',
            'view_invoices', 'view_accounting'
        ],
        'employee': [
            'view_dashboard', 'view_customers', 'view_orders', 'view_tasks',
            'view_attendance', 'view_messages', 'view_notifications'
        ],
        'accountant': [
            'view_dashboard', 'view_accounting', 'view_invoices', 'view_reports',
            'view_customers', 'view_orders'
        ]
    };
    
    const userPermissions = permissions[user.role] || [];
    return userPermissions.includes(permission);
}

// ============================================
//  7.  دوال JWT (مكررة من Code.gs للتأكد)
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
//  8.  نهاية الملف
// ============================================
