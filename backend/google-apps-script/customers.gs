/**
 * ======================================================
 * الملف: backend/google-apps-script/customers.gs
 * الوصف: دوال إدارة العملاء (CRUD)
 *         تشمل إنشاء، قراءة، تحديث، حذف العملاء،
 *         البحث، التصفية، وإدارة العلاقات مع الطلبات
 * الإصدار: 1.0.0
 * التاريخ: 2026-07-13
 * ======================================================
 */

// ============================================
//  1.  دوال الحصول على العملاء (Read)
// ============================================

/**
 * الحصول على جميع العملاء مع دعم التصفية والترتيب
 * @param {Object} request - كائن الطلب
 * @returns {Object} قائمة العملاء
 */
function handleGetCustomers(request) {
    // التحقق من الصلاحية
    if (!checkPermission(request.user, 'view_customers')) {
        return {
            success: false,
            message: 'ليس لديك صلاحية لعرض العملاء',
            statusCode: 403
        };
    }
    
    // استخراج معاملات التصفية
    const { 
        page = 1, 
        limit = 20, 
        search = '', 
        sort = 'name', 
        order = 'asc',
        status = '',
        min_balance = '',
        max_balance = '',
        from_date = '',
        to_date = ''
    } = request.params;
    
    // الحصول على جميع العملاء
    let customers = getAllCustomers();
    
    // تطبيق البحث
    if (search) {
        const query = search.toLowerCase().trim();
        customers = customers.filter(customer => {
            return customer.name.toLowerCase().includes(query) ||
                   customer.email.toLowerCase().includes(query) ||
                   customer.phone.includes(query) ||
                   (customer.address && customer.address.toLowerCase().includes(query));
        });
    }
    
    // تطبيق التصفية حسب الحالة (نشط/غير نشط)
    if (status) {
        const isActive = status === 'active';
        customers = customers.filter(c => c.is_active === isActive);
    }
    
    // تطبيق التصفية حسب الرصيد
    if (min_balance) {
        const min = parseFloat(min_balance);
        customers = customers.filter(c => parseFloat(c.balance || 0) >= min);
    }
    if (max_balance) {
        const max = parseFloat(max_balance);
        customers = customers.filter(c => parseFloat(c.balance || 0) <= max);
    }
    
    // تطبيق التصفية حسب التاريخ
    if (from_date) {
        const from = new Date(from_date);
        customers = customers.filter(c => new Date(c.created_at) >= from);
    }
    if (to_date) {
        const to = new Date(to_date);
        customers = customers.filter(c => new Date(c.created_at) <= to);
    }
    
    // ترتيب النتائج
    customers = sortCustomers(customers, sort, order);
    
    // حساب إجمالي العدد
    const total = customers.length;
    
    // تطبيق الترقيم (Pagination)
    const start = (parseInt(page) - 1) * parseInt(limit);
    const end = start + parseInt(limit);
    const paginated = customers.slice(start, end);
    
    // إضافة إحصائيات إضافية لكل عميل
    const result = paginated.map(customer => {
        const stats = getCustomerStats(customer.id);
        return {
            ...customer,
            orders_count: stats.orders_count || 0,
            total_spent: stats.total_spent || 0,
            last_order: stats.last_order || null
        };
    });
    
    return {
        success: true,
        data: result,
        total: total,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil(total / parseInt(limit))
    };
}

/**
 * الحصول على عميل بالمعرف
 * @param {Object} request - كائن الطلب
 * @returns {Object} بيانات العميل مع تفاصيل إضافية
 */
function handleGetCustomer(request) {
    const customerId = request.id;
    if (!customerId) {
        return {
            success: false,
            message: 'معرف العميل مطلوب',
            statusCode: 400
        };
    }
    
    // التحقق من الصلاحية
    if (!checkPermission(request.user, 'view_customers')) {
        return {
            success: false,
            message: 'ليس لديك صلاحية لعرض العميل',
            statusCode: 403
        };
    }
    
    const customer = getCustomerById(customerId);
    if (!customer) {
        return {
            success: false,
            message: 'العميل غير موجود',
            statusCode: 404
        };
    }
    
    // الحصول على تفاصيل إضافية
    const stats = getCustomerStats(customerId);
    const orders = getCustomerOrders(customerId);
    const invoices = getCustomerInvoices(customerId);
    const files = getCustomerFiles(customerId);
    const timeline = getCustomerTimeline(customerId);
    
    return {
        success: true,
        data: {
            ...customer,
            stats: stats,
            orders: orders,
            invoices: invoices,
            files: files,
            timeline: timeline
        }
    };
}

// ============================================
//  2.  دوال إنشاء العملاء (Create)
// ============================================

/**
 * إنشاء عميل جديد
 * @param {Object} request - كائن الطلب
 * @returns {Object} بيانات العميل الجديد
 */
function handleCreateCustomer(request) {
    // التحقق من الصلاحية
    if (!checkPermission(request.user, 'create_customer')) {
        return {
            success: false,
            message: 'ليس لديك صلاحية لإضافة عملاء',
            statusCode: 403
        };
    }
    
    const { 
        name, 
        phone, 
        email, 
        address, 
        notes, 
        avatar,
        balance = 0,
        rating = 0
    } = request.body;
    
    // التحقق من المدخلات المطلوبة
    if (!name) {
        return {
            success: false,
            message: 'اسم العميل مطلوب',
            statusCode: 400
        };
    }
    
    if (!phone) {
        return {
            success: false,
            message: 'رقم الهاتف مطلوب',
            statusCode: 400
        };
    }
    
    // التحقق من صحة البريد الإلكتروني (إذا تم توفيره)
    if (email && !isValidEmail(email)) {
        return {
            success: false,
            message: 'البريد الإلكتروني غير صحيح',
            statusCode: 400
        };
    }
    
    // التحقق من عدم وجود العميل بنفس البريد أو الهاتف
    const existingByEmail = email ? findCustomerByEmail(email) : null;
    if (existingByEmail) {
        return {
            success: false,
            message: 'يوجد عميل مسجل بهذا البريد الإلكتروني',
            statusCode: 409
        };
    }
    
    const existingByPhone = findCustomerByPhone(phone);
    if (existingByPhone) {
        return {
            success: false,
            message: 'يوجد عميل مسجل بهذا رقم الهاتف',
            statusCode: 409
        };
    }
    
    // إنشاء العميل
    const customerId = generateId();
    const now = new Date().toISOString();
    
    const customerData = {
        id: customerId,
        name: name.trim(),
        phone: phone.trim(),
        email: email ? email.trim() : '',
        address: address || '',
        notes: notes || '',
        avatar: avatar || '',
        balance: parseFloat(balance) || 0,
        rating: parseFloat(rating) || 0,
        is_active: true,
        created_at: now,
        updated_at: now,
        created_by: request.user.id
    };
    
    // حفظ في قاعدة البيانات
    saveCustomer(customerData);
    
    // تسجيل الحدث
    logUserAction(request.user.id, 'create_customer', 'تم إنشاء عميل جديد: ' + customerData.name);
    
    return {
        success: true,
        data: customerData,
        message: 'تم إنشاء العميل بنجاح'
    };
}

// ============================================
//  3.  دوال تحديث العملاء (Update)
// ============================================

/**
 * تحديث عميل
 * @param {Object} request - كائن الطلب
 * @returns {Object} بيانات العميل المحدث
 */
function handleUpdateCustomer(request) {
    const customerId = request.id;
    if (!customerId) {
        return {
            success: false,
            message: 'معرف العميل مطلوب',
            statusCode: 400
        };
    }
    
    // التحقق من الصلاحية
    if (!checkPermission(request.user, 'edit_customer')) {
        return {
            success: false,
            message: 'ليس لديك صلاحية لتعديل العميل',
            statusCode: 403
        };
    }
    
    const customer = getCustomerById(customerId);
    if (!customer) {
        return {
            success: false,
            message: 'العميل غير موجود',
            statusCode: 404
        };
    }
    
    const { 
        name, 
        phone, 
        email, 
        address, 
        notes, 
        avatar,
        balance,
        rating,
        is_active
    } = request.body;
    
    // تحديث البيانات
    if (name) customer.name = name.trim();
    if (phone) customer.phone = phone.trim();
    if (email !== undefined) {
        if (email && !isValidEmail(email)) {
            return {
                success: false,
                message: 'البريد الإلكتروني غير صحيح',
                statusCode: 400
            };
        }
        // التحقق من عدم استخدام البريد من قبل عميل آخر
        if (email) {
            const existing = findCustomerByEmail(email);
            if (existing && existing.id !== customerId) {
                return {
                    success: false,
                    message: 'البريد الإلكتروني مستخدم من قبل عميل آخر',
                    statusCode: 409
                };
            }
        }
        customer.email = email ? email.trim() : '';
    }
    if (phone && phone !== customer.phone) {
        // التحقق من عدم استخدام الهاتف من قبل عميل آخر
        const existing = findCustomerByPhone(phone);
        if (existing && existing.id !== customerId) {
            return {
                success: false,
                message: 'رقم الهاتف مستخدم من قبل عميل آخر',
                statusCode: 409
            };
        }
        customer.phone = phone.trim();
    }
    if (address !== undefined) customer.address = address;
    if (notes !== undefined) customer.notes = notes;
    if (avatar !== undefined) customer.avatar = avatar;
    if (balance !== undefined) customer.balance = parseFloat(balance) || 0;
    if (rating !== undefined) customer.rating = parseFloat(rating) || 0;
    if (is_active !== undefined) customer.is_active = is_active;
    
    customer.updated_at = new Date().toISOString();
    
    // حفظ التغييرات
    updateCustomer(customer);
    
    // تسجيل الحدث
    logUserAction(request.user.id, 'update_customer', 'تم تحديث عميل: ' + customer.name);
    
    return {
        success: true,
        data: customer,
        message: 'تم تحديث العميل بنجاح'
    };
}

// ============================================
//  4.  دوال حذف العملاء (Delete)
// ============================================

/**
 * حذف عميل (نقل إلى الأرشيف)
 * @param {Object} request - كائن الطلب
 * @returns {Object} استجابة نجاح
 */
function handleDeleteCustomer(request) {
    const customerId = request.id;
    if (!customerId) {
        return {
            success: false,
            message: 'معرف العميل مطلوب',
            statusCode: 400
        };
    }
    
    // التحقق من الصلاحية
    if (!checkPermission(request.user, 'delete_customer')) {
        return {
            success: false,
            message: 'ليس لديك صلاحية لحذف العملاء',
            statusCode: 403
        };
    }
    
    const customer = getCustomerById(customerId);
    if (!customer) {
        return {
            success: false,
            message: 'العميل غير موجود',
            statusCode: 404
        };
    }
    
    // التحقق من وجود طلبات مرتبطة بالعميل
    const orders = getCustomerOrdersCount(customerId);
    if (orders > 0) {
        return {
            success: false,
            message: 'لا يمكن حذف العميل لأنه مرتبط بـ ' + orders + ' طلب. قم بأرشفة الطلبات أولاً.',
            statusCode: 409
        };
    }
    
    // نقل إلى الأرشيف
    archiveCustomer(customer);
    
    // حذف من الجدول الرئيسي
    deleteCustomer(customerId);
    
    // تسجيل الحدث
    logUserAction(request.user.id, 'delete_customer', 'تم حذف عميل: ' + customer.name);
    
    return {
        success: true,
        message: 'تم حذف العميل بنجاح'
    };
}

// ============================================
//  5.  دوال مساعدة لقاعدة البيانات (Customers)
// ============================================

/**
 * الحصول على جميع العملاء
 */
function getAllCustomers() {
    const sheet = getSheet('Customers');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const customers = [];
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const customer = {};
        headers.forEach((header, index) => {
            customer[header] = row[index] || '';
        });
        customers.push(customer);
    }
    return customers;
}

/**
 * الحصول على عميل بالمعرف
 */
function getCustomerById(id) {
    const sheet = getSheet('Customers');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('id');
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[idIndex] === id) {
            const customer = {};
            headers.forEach((header, index) => {
                customer[header] = row[index] || '';
            });
            return customer;
        }
    }
    return null;
}

/**
 * البحث عن عميل بالبريد الإلكتروني
 */
function findCustomerByEmail(email) {
    const sheet = getSheet('Customers');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const emailIndex = headers.indexOf('email');
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[emailIndex] === email) {
            const customer = {};
            headers.forEach((header, index) => {
                customer[header] = row[index] || '';
            });
            return customer;
        }
    }
    return null;
}

/**
 * البحث عن عميل برقم الهاتف
 */
function findCustomerByPhone(phone) {
    const sheet = getSheet('Customers');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const phoneIndex = headers.indexOf('phone');
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[phoneIndex] === phone) {
            const customer = {};
            headers.forEach((header, index) => {
                customer[header] = row[index] || '';
            });
            return customer;
        }
    }
    return null;
}

/**
 * حفظ عميل جديد
 */
function saveCustomer(customerData) {
    const sheet = getSheet('Customers');
    const headers = ['id', 'name', 'phone', 'email', 'address', 'notes', 'avatar', 'balance', 'rating', 'is_active', 'created_at', 'updated_at', 'created_by'];
    
    if (sheet.getLastRow() === 0) {
        sheet.appendRow(headers);
    }
    
    const row = headers.map(header => customerData[header] || '');
    sheet.appendRow(row);
}

/**
 * تحديث عميل
 */
function updateCustomer(customer) {
    const sheet = getSheet('Customers');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('id');
    
    for (let i = 1; i < data.length; i++) {
        if (data[i][idIndex] === customer.id) {
            const row = headers.map(header => customer[header] || '');
            sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
            break;
        }
    }
}

/**
 * حذف عميل
 */
function deleteCustomer(customerId) {
    const sheet = getSheet('Customers');
    const data = sheet.getDataRange().getValues();
    const idIndex = data[0].indexOf('id');
    
    for (let i = 1; i < data.length; i++) {
        if (data[i][idIndex] === customerId) {
            sheet.deleteRow(i + 1);
            break;
        }
    }
}

/**
 * أرشفة عميل
 */
function archiveCustomer(customer) {
    const sheet = getSheet('Archive');
    const headers = ['original_table', 'original_id', 'data', 'archived_at', 'archived_by'];
    
    if (sheet.getLastRow() === 0) {
        sheet.appendRow(headers);
    }
    
    sheet.appendRow([
        'Customers',
        customer.id,
        JSON.stringify(customer),
        new Date().toISOString(),
        ''
    ]);
}

// ============================================
//  6.  دوال مساعدة للإحصائيات والتفاصيل
// ============================================

/**
 * الحصول على إحصائيات العميل
 */
function getCustomerStats(customerId) {
    const orders = getCustomerOrders(customerId);
    const total = orders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
    
    return {
        orders_count: orders.length,
        total_spent: total,
        last_order: orders.length > 0 ? orders[0].created_at : null
    };
}

/**
 * الحصول على طلبات العميل
 */
function getCustomerOrders(customerId) {
    const sheet = getSheet('Orders');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const customerIdIndex = headers.indexOf('customer_id');
    const results = [];
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[customerIdIndex] === customerId) {
            const order = {};
            headers.forEach((header, index) => {
                order[header] = row[index] || '';
            });
            results.push(order);
        }
    }
    
    // ترتيب حسب التاريخ (الأحدث أولاً)
    results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return results;
}

/**
 * الحصول على عدد طلبات العميل
 */
function getCustomerOrdersCount(customerId) {
    const orders = getCustomerOrders(customerId);
    return orders.length;
}

/**
 * الحصول على فواتير العميل
 */
function getCustomerInvoices(customerId) {
    // الحصول على طلبات العميل أولاً
    const orders = getCustomerOrders(customerId);
    const orderIds = orders.map(o => o.id);
    
    if (orderIds.length === 0) return [];
    
    const sheet = getSheet('Invoices');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const orderIdIndex = headers.indexOf('order_id');
    const results = [];
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (orderIds.includes(row[orderIdIndex])) {
            const invoice = {};
            headers.forEach((header, index) => {
                invoice[header] = row[index] || '';
            });
            results.push(invoice);
        }
    }
    
    return results;
}

/**
 * الحصول على ملفات العميل
 */
function getCustomerFiles(customerId) {
    const sheet = getSheet('Files');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const parentIdIndex = headers.indexOf('parent_id');
    const parentTypeIndex = headers.indexOf('parent_type');
    const results = [];
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[parentIdIndex] === customerId && row[parentTypeIndex] === 'customer') {
            const file = {};
            headers.forEach((header, index) => {
                file[header] = row[index] || '';
            });
            results.push(file);
        }
    }
    
    return results;
}

/**
 * الحصول على الجدول الزمني للعميل
 */
function getCustomerTimeline(customerId) {
    const timeline = [];
    
    // إضافة أحداث من الطلبات
    const orders = getCustomerOrders(customerId);
    orders.forEach(order => {
        timeline.push({
            type: 'order',
            title: 'طلب #' + (order.order_number || order.id),
            description: 'قيمة: ' + (order.total || 0) + ' ر.س، الحالة: ' + (order.status || ''),
            timestamp: order.created_at || new Date().toISOString(),
            icon: '📋'
        });
    });
    
    // إضافة أحداث من الفواتير
    const invoices = getCustomerInvoices(customerId);
    invoices.forEach(invoice => {
        timeline.push({
            type: 'invoice',
            title: 'فاتورة #' + (invoice.invoice_number || invoice.id),
            description: 'المبلغ: ' + (invoice.total || 0) + ' ر.س، الحالة: ' + (invoice.status || ''),
            timestamp: invoice.created_at || new Date().toISOString(),
            icon: '🧾'
        });
    });
    
    // ترتيب حسب التاريخ (الأحدث أولاً)
    timeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return timeline;
}

// ============================================
//  7.  دوال مساعدة للترتيب والتصفية
// ============================================

/**
 * ترتيب العملاء
 */
function sortCustomers(customers, sortKey, order) {
    const validKeys = ['name', 'email', 'phone', 'balance', 'rating', 'created_at'];
    if (!validKeys.includes(sortKey)) {
        sortKey = 'name';
    }
    
    const direction = order === 'desc' ? -1 : 1;
    
    return customers.sort((a, b) => {
        let valA = a[sortKey] || '';
        let valB = b[sortKey] || '';
        
        // تحويل الأرقام إلى أرقام
        if (sortKey === 'balance' || sortKey === 'rating') {
            valA = parseFloat(valA) || 0;
            valB = parseFloat(valB) || 0;
        }
        
        if (typeof valA === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }
        
        if (valA < valB) return -1 * direction;
        if (valA > valB) return 1 * direction;
        return 0;
    });
}

// ============================================
//  8.  دوال مساعدة للتحقق من الصحة
// ============================================

/**
 * التحقق من صحة البريد الإلكتروني
 */
function isValidEmail(email) {
    const pattern = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    return pattern.test(email);
}

/**
 * توليد معرف فريد
 */
function generateId() {
    return Utilities.getUuid();
}

// ============================================
//  9.  دوال مساعدة للتسجيل
// ============================================

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
//  10.  نهاية الملف
// ============================================
