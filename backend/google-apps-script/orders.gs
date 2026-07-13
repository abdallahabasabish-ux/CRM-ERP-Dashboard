/**
 * ======================================================
 * الملف: backend/google-apps-script/orders.gs
 * الوصف: دوال إدارة الطلبات (CRUD)
 *         تشمل إنشاء، قراءة، تحديث، حذف الطلبات،
 *         إدارة عناصر الطلب، تحديث الحالة،
 *         إضافة التعليقات، المرفقات، والجدول الزمني
 * الإصدار: 1.0.0
 * التاريخ: 2026-07-13
 * ======================================================
 */

// ============================================
//  1.  دوال الحصول على الطلبات (Read)
// ============================================

/**
 * الحصول على جميع الطلبات مع دعم التصفية والترتيب
 * @param {Object} request - كائن الطلب
 * @returns {Object} قائمة الطلبات
 */
function handleGetOrders(request) {
    // التحقق من الصلاحية
    if (!checkPermission(request.user, 'view_orders')) {
        return {
            success: false,
            message: 'ليس لديك صلاحية لعرض الطلبات',
            statusCode: 403
        };
    }
    
    // استخراج معاملات التصفية
    const { 
        page = 1, 
        limit = 20, 
        search = '', 
        sort = 'created_at', 
        order = 'desc',
        status = '',
        priority = '',
        customer_id = '',
        employee_id = '',
        service_id = '',
        from_date = '',
        to_date = ''
    } = request.params;
    
    // الحصول على جميع الطلبات
    let orders = getAllOrders();
    
    // تطبيق البحث
    if (search) {
        const query = search.toLowerCase().trim();
        orders = orders.filter(order => {
            const orderNumber = order.order_number || '';
            const customerName = getCustomerName(order.customer_id) || '';
            return orderNumber.toLowerCase().includes(query) ||
                   customerName.toLowerCase().includes(query);
        });
    }
    
    // تطبيق التصفية حسب الحالة
    if (status) {
        orders = orders.filter(o => o.status === status);
    }
    
    // تطبيق التصفية حسب الأولوية
    if (priority) {
        orders = orders.filter(o => o.priority === priority);
    }
    
    // تطبيق التصفية حسب العميل
    if (customer_id) {
        orders = orders.filter(o => o.customer_id === customer_id);
    }
    
    // تطبيق التصفية حسب الموظف
    if (employee_id) {
        orders = orders.filter(o => o.employee_id === employee_id);
    }
    
    // تطبيق التصفية حسب الخدمة
    if (service_id) {
        orders = orders.filter(o => o.service_id === service_id);
    }
    
    // تطبيق التصفية حسب التاريخ
    if (from_date) {
        const from = new Date(from_date);
        orders = orders.filter(o => new Date(o.created_at) >= from);
    }
    if (to_date) {
        const to = new Date(to_date);
        orders = orders.filter(o => new Date(o.created_at) <= to);
    }
    
    // ترتيب النتائج
    orders = sortOrders(orders, sort, order);
    
    // حساب إجمالي العدد
    const total = orders.length;
    
    // تطبيق الترقيم (Pagination)
    const start = (parseInt(page) - 1) * parseInt(limit);
    const end = start + parseInt(limit);
    const paginated = orders.slice(start, end);
    
    // إضافة تفاصيل إضافية لكل طلب
    const result = paginated.map(order => {
        const customer = getCustomerById(order.customer_id);
        const employee = getEmployeeById(order.employee_id);
        const items = getOrderItems(order.id);
        const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.total || 0), 0);
        
        return {
            ...order,
            customer_name: customer ? customer.name : '',
            employee_name: employee ? employee.name : '',
            items_count: items.length,
            total_amount: totalAmount,
            paid_amount: parseFloat(order.paid || 0)
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
 * الحصول على طلب بالمعرف
 * @param {Object} request - كائن الطلب
 * @returns {Object} بيانات الطلب مع التفاصيل الكاملة
 */
function handleGetOrder(request) {
    const orderId = request.id;
    if (!orderId) {
        return {
            success: false,
            message: 'معرف الطلب مطلوب',
            statusCode: 400
        };
    }
    
    // التحقق من الصلاحية
    if (!checkPermission(request.user, 'view_orders')) {
        return {
            success: false,
            message: 'ليس لديك صلاحية لعرض الطلب',
            statusCode: 403
        };
    }
    
    const order = getOrderById(orderId);
    if (!order) {
        return {
            success: false,
            message: 'الطلب غير موجود',
            statusCode: 404
        };
    }
    
    // الحصول على التفاصيل الكاملة
    const customer = getCustomerById(order.customer_id);
    const employee = getEmployeeById(order.employee_id);
    const items = getOrderItems(orderId);
    const invoice = getOrderInvoice(orderId);
    const files = getOrderFiles(orderId);
    const timeline = getOrderTimeline(orderId);
    const comments = getOrderComments(orderId);
    const payments = getOrderPayments(orderId);
    
    // حساب الإجماليات
    const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.total || 0), 0);
    const paidAmount = parseFloat(order.paid || 0);
    const remainingAmount = totalAmount - paidAmount;
    
    return {
        success: true,
        data: {
            ...order,
            customer: customer,
            employee: employee,
            items: items,
            invoice: invoice,
            files: files,
            timeline: timeline,
            comments: comments,
            payments: payments,
            summary: {
                total_amount: totalAmount,
                paid_amount: paidAmount,
                remaining_amount: remainingAmount,
                items_count: items.length
            }
        }
    };
}

// ============================================
//  2.  دوال إنشاء الطلبات (Create)
// ============================================

/**
 * إنشاء طلب جديد
 * @param {Object} request - كائن الطلب
 * @returns {Object} بيانات الطلب الجديد
 */
function handleCreateOrder(request) {
    // التحقق من الصلاحية
    if (!checkPermission(request.user, 'create_order')) {
        return {
            success: false,
            message: 'ليس لديك صلاحية لإضافة طلبات',
            statusCode: 403
        };
    }
    
    const { 
        customer_id,
        employee_id,
        service_id,
        status = 'new',
        priority = 'medium',
        delivery_date,
        notes = '',
        items = [],
        paid = 0
    } = request.body;
    
    // التحقق من المدخلات المطلوبة
    if (!customer_id) {
        return {
            success: false,
            message: 'معرف العميل مطلوب',
            statusCode: 400
        };
    }
    
    // التحقق من وجود العميل
    const customer = getCustomerById(customer_id);
    if (!customer) {
        return {
            success: false,
            message: 'العميل غير موجود',
            statusCode: 404
        };
    }
    
    // التحقق من وجود الموظف (إذا تم توفيره)
    if (employee_id) {
        const employee = getEmployeeById(employee_id);
        if (!employee) {
            return {
                success: false,
                message: 'الموظف غير موجود',
                statusCode: 404
            };
        }
    }
    
    // التحقق من وجود الخدمة (إذا تم توفيرها)
    if (service_id) {
        const service = getServiceById(service_id);
        if (!service) {
            return {
                success: false,
                message: 'الخدمة غير موجودة',
                statusCode: 404
            };
        }
    }
    
    // التحقق من وجود عناصر الطلب
    if (!items || items.length === 0) {
        return {
            success: false,
            message: 'يجب إضافة خدمة واحدة على الأقل للطلب',
            statusCode: 400
        };
    }
    
    // إنشاء الطلب
    const orderId = generateId();
    const orderNumber = generateOrderNumber();
    const now = new Date().toISOString();
    
    // حساب الإجمالي من العناصر
    let total = 0;
    items.forEach(item => {
        const price = parseFloat(item.price) || 0;
        const quantity = parseFloat(item.quantity) || 1;
        const itemTotal = price * quantity;
        total += itemTotal;
        item.total = itemTotal;
    });
    
    const orderData = {
        id: orderId,
        order_number: orderNumber,
        customer_id: customer_id,
        employee_id: employee_id || '',
        service_id: service_id || '',
        status: status,
        priority: priority,
        created_date: now,
        delivery_date: delivery_date || '',
        total: total,
        paid: parseFloat(paid) || 0,
        notes: notes || '',
        qr_code: generateQRCode(orderNumber),
        created_at: now,
        updated_at: now,
        created_by: request.user.id
    };
    
    // حفظ الطلب في قاعدة البيانات
    saveOrder(orderData);
    
    // حفظ عناصر الطلب
    items.forEach(item => {
        const itemData = {
            id: generateId(),
            order_id: orderId,
            service_id: item.service_id || '',
            quantity: parseFloat(item.quantity) || 1,
            price: parseFloat(item.price) || 0,
            total: parseFloat(item.total) || 0,
            notes: item.notes || '',
            created_at: now
        };
        saveOrderItem(itemData);
    });
    
    // تحديث رصيد العميل (إذا كان هناك دفعة)
    if (parseFloat(paid) > 0) {
        updateCustomerBalance(customer_id, parseFloat(paid));
    }
    
    // تسجيل الحدث في الجدول الزمني
    addOrderTimelineEvent(orderId, 'created', 'تم إنشاء الطلب', request.user.id);
    
    // تسجيل إجراء المستخدم
    logUserAction(request.user.id, 'create_order', 'تم إنشاء طلب جديد: ' + orderNumber);
    
    // إرسال إشعار
    sendOrderNotification(orderId, 'created');
    
    return {
        success: true,
        data: {
            ...orderData,
            items: items
        },
        message: 'تم إنشاء الطلب بنجاح'
    };
}

// ============================================
//  3.  دوال تحديث الطلبات (Update)
// ============================================

/**
 * تحديث طلب
 * @param {Object} request - كائن الطلب
 * @returns {Object} بيانات الطلب المحدث
 */
function handleUpdateOrder(request) {
    const orderId = request.id;
    if (!orderId) {
        return {
            success: false,
            message: 'معرف الطلب مطلوب',
            statusCode: 400
        };
    }
    
    // التحقق من الصلاحية
    if (!checkPermission(request.user, 'edit_order')) {
        return {
            success: false,
            message: 'ليس لديك صلاحية لتعديل الطلب',
            statusCode: 403
        };
    }
    
    const order = getOrderById(orderId);
    if (!order) {
        return {
            success: false,
            message: 'الطلب غير موجود',
            statusCode: 404
        };
    }
    
    const { 
        customer_id,
        employee_id,
        service_id,
        status,
        priority,
        delivery_date,
        notes,
        paid
    } = request.body;
    
    // التحقق من وجود العميل (إذا تم تحديثه)
    if (customer_id && customer_id !== order.customer_id) {
        const customer = getCustomerById(customer_id);
        if (!customer) {
            return {
                success: false,
                message: 'العميل غير موجود',
                statusCode: 404
            };
        }
        order.customer_id = customer_id;
    }
    
    // تحديث البيانات
    if (employee_id !== undefined) {
        if (employee_id) {
            const employee = getEmployeeById(employee_id);
            if (!employee) {
                return {
                    success: false,
                    message: 'الموظف غير موجود',
                    statusCode: 404
                };
            }
        }
        order.employee_id = employee_id;
    }
    
    if (service_id !== undefined) {
        if (service_id) {
            const service = getServiceById(service_id);
            if (!service) {
                return {
                    success: false,
                    message: 'الخدمة غير موجودة',
                    statusCode: 404
                };
            }
        }
        order.service_id = service_id;
    }
    
    if (status !== undefined) order.status = status;
    if (priority !== undefined) order.priority = priority;
    if (delivery_date !== undefined) order.delivery_date = delivery_date;
    if (notes !== undefined) order.notes = notes;
    
    // تحديث المدفوع
    if (paid !== undefined && parseFloat(paid) !== parseFloat(order.paid)) {
        const diff = parseFloat(paid) - parseFloat(order.paid || 0);
        if (diff > 0) {
            updateCustomerBalance(order.customer_id, diff);
        } else if (diff < 0) {
            updateCustomerBalance(order.customer_id, diff);
        }
        order.paid = parseFloat(paid);
    }
    
    order.updated_at = new Date().toISOString();
    
    // حفظ التغييرات
    updateOrder(order);
    
    // تسجيل الحدث في الجدول الزمني (إذا تغيرت الحالة)
    if (status !== undefined && status !== order.status) {
        addOrderTimelineEvent(orderId, 'status_changed', 'تم تغيير الحالة إلى: ' + status, request.user.id);
    }
    
    // تسجيل إجراء المستخدم
    logUserAction(request.user.id, 'update_order', 'تم تحديث طلب: ' + order.order_number);
    
    return {
        success: true,
        data: order,
        message: 'تم تحديث الطلب بنجاح'
    };
}

/**
 * تحديث حالة الطلب
 * @param {Object} request - كائن الطلب
 * @returns {Object} استجابة نجاح
 */
function handleUpdateOrderStatus(request) {
    const orderId = request.id;
    if (!orderId) {
        return {
            success: false,
            message: 'معرف الطلب مطلوب',
            statusCode: 400
        };
    }
    
    // التحقق من الصلاحية
    if (!checkPermission(request.user, 'update_order_status')) {
        return {
            success: false,
            message: 'ليس لديك صلاحية لتحديث حالة الطلب',
            statusCode: 403
        };
    }
    
    const { status } = request.body;
    if (!status) {
        return {
            success: false,
            message: 'الحالة الجديدة مطلوبة',
            statusCode: 400
        };
    }
    
    // التحقق من صحة الحالة
    const validStatuses = ['new', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return {
            success: false,
            message: 'حالة غير صحيحة. الحالات المتاحة: ' + validStatuses.join(', '),
            statusCode: 400
        };
    }
    
    const order = getOrderById(orderId);
    if (!order) {
        return {
            success: false,
            message: 'الطلب غير موجود',
            statusCode: 404
        };
    }
    
    const oldStatus = order.status;
    order.status = status;
    order.updated_at = new Date().toISOString();
    
    updateOrder(order);
    
    // تسجيل الحدث في الجدول الزمني
    addOrderTimelineEvent(orderId, 'status_changed', 'تم تغيير الحالة من ' + oldStatus + ' إلى ' + status, request.user.id);
    
    // إذا اكتمل الطلب، تحديث إحصائيات العميل
    if (status === 'completed' && oldStatus !== 'completed') {
        // تحديث تقييم العميل تلقائياً (اختياري)
        // إرسال إشعار إكمال الطلب
        sendOrderNotification(orderId, 'completed');
    }
    
    // تسجيل إجراء المستخدم
    logUserAction(request.user.id, 'update_order_status', 'تم تحديث حالة طلب ' + order.order_number + ' إلى ' + status);
    
    return {
        success: true,
        data: {
            id: order.id,
            status: order.status,
            updated_at: order.updated_at
        },
        message: 'تم تحديث حالة الطلب بنجاح'
    };
}

// ============================================
//  4.  دوال حذف الطلبات (Delete)
// ============================================

/**
 * حذف طلب (نقل إلى الأرشيف)
 * @param {Object} request - كائن الطلب
 * @returns {Object} استجابة نجاح
 */
function handleDeleteOrder(request) {
    const orderId = request.id;
    if (!orderId) {
        return {
            success: false,
            message: 'معرف الطلب مطلوب',
            statusCode: 400
        };
    }
    
    // التحقق من الصلاحية
    if (!checkPermission(request.user, 'delete_order')) {
        return {
            success: false,
            message: 'ليس لديك صلاحية لحذف الطلبات',
            statusCode: 403
        };
    }
    
    const order = getOrderById(orderId);
    if (!order) {
        return {
            success: false,
            message: 'الطلب غير موجود',
            statusCode: 404
        };
    }
    
    // التحقق من وجود فاتورة مرتبطة
    const invoice = getOrderInvoice(orderId);
    if (invoice) {
        return {
            success: false,
            message: 'لا يمكن حذف الطلب لأنه مرتبط بفاتورة. قم بحذف الفاتورة أولاً.',
            statusCode: 409
        };
    }
    
    // نقل إلى الأرشيف
    archiveOrder(order);
    
    // حذف عناصر الطلب
    deleteOrderItems(orderId);
    
    // حذف من الجدول الرئيسي
    deleteOrder(orderId);
    
    // تسجيل الحدث
    logUserAction(request.user.id, 'delete_order', 'تم حذف طلب: ' + order.order_number);
    
    return {
        success: true,
        message: 'تم حذف الطلب بنجاح'
    };
}

// ============================================
//  5.  دوال إدارة عناصر الطلب (Order Items)
// ============================================

/**
 * إضافة عنصر إلى الطلب
 * @param {Object} request - كائن الطلب
 * @returns {Object} بيانات العنصر الجديد
 */
function handleAddOrderItem(request) {
    const orderId = request.id;
    if (!orderId) {
        return {
            success: false,
            message: 'معرف الطلب مطلوب',
            statusCode: 400
        };
    }
    
    // التحقق من الصلاحية
    if (!checkPermission(request.user, 'edit_order')) {
        return {
            success: false,
            message: 'ليس لديك صلاحية لتعديل الطلب',
            statusCode: 403
        };
    }
    
    const order = getOrderById(orderId);
    if (!order) {
        return {
            success: false,
            message: 'الطلب غير موجود',
            statusCode: 404
        };
    }
    
    const { service_id, quantity, price, notes } = request.body;
    
    if (!service_id) {
        return {
            success: false,
            message: 'معرف الخدمة مطلوب',
            statusCode: 400
        };
    }
    
    // التحقق من وجود الخدمة
    const service = getServiceById(service_id);
    if (!service) {
        return {
            success: false,
            message: 'الخدمة غير موجودة',
            statusCode: 404
        };
    }
    
    const itemPrice = parseFloat(price) || parseFloat(service.price) || 0;
    const itemQuantity = parseFloat(quantity) || 1;
    const total = itemPrice * itemQuantity;
    
    const itemData = {
        id: generateId(),
        order_id: orderId,
        service_id: service_id,
        quantity: itemQuantity,
        price: itemPrice,
        total: total,
        notes: notes || '',
        created_at: new Date().toISOString()
    };
    
    saveOrderItem(itemData);
    
    // تحديث إجمالي الطلب
    updateOrderTotal(orderId);
    
    // تسجيل الحدث
    logUserAction(request.user.id, 'add_order_item', 'تم إضافة خدمة إلى طلب ' + order.order_number);
    
    return {
        success: true,
        data: itemData,
        message: 'تم إضافة العنصر بنجاح'
    };
}

/**
 * حذف عنصر من الطلب
 * @param {Object} request - كائن الطلب
 * @returns {Object} استجابة نجاح
 */
function handleDeleteOrderItem(request) {
    const orderId = request.id;
    const itemId = request.subResource;
    
    if (!orderId || !itemId) {
        return {
            success: false,
            message: 'معرف الطلب والعنصر مطلوبان',
            statusCode: 400
        };
    }
    
    // التحقق من الصلاحية
    if (!checkPermission(request.user, 'edit_order')) {
        return {
            success: false,
            message: 'ليس لديك صلاحية لتعديل الطلب',
            statusCode: 403
        };
    }
    
    const order = getOrderById(orderId);
    if (!order) {
        return {
            success: false,
            message: 'الطلب غير موجود',
            statusCode: 404
        };
    }
    
    const item = getOrderItemById(itemId);
    if (!item || item.order_id !== orderId) {
        return {
            success: false,
            message: 'العنصر غير موجود في هذا الطلب',
            statusCode: 404
        };
    }
    
    deleteOrderItem(itemId);
    
    // تحديث إجمالي الطلب
    updateOrderTotal(orderId);
    
    // تسجيل الحدث
    logUserAction(request.user.id, 'delete_order_item', 'تم حذف خدمة من طلب ' + order.order_number);
    
    return {
        success: true,
        message: 'تم حذف العنصر بنجاح'
    };
}

// ============================================
//  6.  دوال إدارة التعليقات (Comments)
// ============================================

/**
 * إضافة تعليق على الطلب
 * @param {Object} request - كائن الطلب
 * @returns {Object} بيانات التعليق الجديد
 */
function handleAddOrderComment(request) {
    const orderId = request.id;
    if (!orderId) {
        return {
            success: false,
            message: 'معرف الطلب مطلوب',
            statusCode: 400
        };
    }
    
    // التحقق من الصلاحية
    if (!checkPermission(request.user, 'view_orders')) {
        return {
            success: false,
            message: 'ليس لديك صلاحية للتعليق على الطلب',
            statusCode: 403
        };
    }
    
    const order = getOrderById(orderId);
    if (!order) {
        return {
            success: false,
            message: 'الطلب غير موجود',
            statusCode: 404
        };
    }
    
    const { comment } = request.body;
    if (!comment) {
        return {
            success: false,
            message: 'نص التعليق مطلوب',
            statusCode: 400
        };
    }
    
    const commentData = {
        id: generateId(),
        order_id: orderId,
        user_id: request.user.id,
        comment: comment.trim(),
        created_at: new Date().toISOString()
    };
    
    saveOrderComment(commentData);
    
    // تسجيل الحدث في الجدول الزمني
    addOrderTimelineEvent(orderId, 'comment', 'تم إضافة تعليق', request.user.id);
    
    return {
        success: true,
        data: commentData,
        message: 'تم إضافة التعليق بنجاح'
    };
}

// ============================================
//  7.  دوال مساعدة لقاعدة البيانات (Orders)
// ============================================

/**
 * الحصول على جميع الطلبات
 */
function getAllOrders() {
    const sheet = getSheet('Orders');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const orders = [];
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const order = {};
        headers.forEach((header, index) => {
            order[header] = row[index] || '';
        });
        orders.push(order);
    }
    return orders;
}

/**
 * الحصول على طلب بالمعرف
 */
function getOrderById(id) {
    const sheet = getSheet('Orders');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('id');
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[idIndex] === id) {
            const order = {};
            headers.forEach((header, index) => {
                order[header] = row[index] || '';
            });
            return order;
        }
    }
    return null;
}

/**
 * حفظ طلب جديد
 */
function saveOrder(orderData) {
    const sheet = getSheet('Orders');
    const headers = ['id', 'order_number', 'customer_id', 'employee_id', 'service_id', 'status', 'priority', 'created_date', 'delivery_date', 'total', 'paid', 'notes', 'qr_code', 'created_at', 'updated_at', 'created_by'];
    
    if (sheet.getLastRow() === 0) {
        sheet.appendRow(headers);
    }
    
    const row = headers.map(header => orderData[header] || '');
    sheet.appendRow(row);
}

/**
 * تحديث طلب
 */
function updateOrder(order) {
    const sheet = getSheet('Orders');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('id');
    
    for (let i = 1; i < data.length; i++) {
        if (data[i][idIndex] === order.id) {
            const row = headers.map(header => order[header] || '');
            sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
            break;
        }
    }
}

/**
 * حذف طلب
 */
function deleteOrder(orderId) {
    const sheet = getSheet('Orders');
    const data = sheet.getDataRange().getValues();
    const idIndex = data[0].indexOf('id');
    
    for (let i = 1; i < data.length; i++) {
        if (data[i][idIndex] === orderId) {
            sheet.deleteRow(i + 1);
            break;
        }
    }
}

/**
 * أرشفة طلب
 */
function archiveOrder(order) {
    const sheet = getSheet('Archive');
    const headers = ['original_table', 'original_id', 'data', 'archived_at', 'archived_by'];
    
    if (sheet.getLastRow() === 0) {
        sheet.appendRow(headers);
    }
    
    sheet.appendRow([
        'Orders',
        order.id,
        JSON.stringify(order),
        new Date().toISOString(),
        ''
    ]);
}

/**
 * توليد رقم طلب فريد
 */
function generateOrderNumber() {
    const sheet = getSheet('Orders');
    const data = sheet.getDataRange().getValues();
    const orderNumberIndex = data[0]?.indexOf('order_number') || -1;
    
    let maxNumber = 0;
    for (let i = 1; i < data.length; i++) {
        const num = parseInt(data[i][orderNumberIndex]?.replace(/[^0-9]/g, '') || '0');
        if (num > maxNumber) maxNumber = num;
    }
    
    const nextNumber = maxNumber + 1;
    return 'ORD-' + String(nextNumber).padStart(5, '0');
}

// ============================================
//  8.  دوال مساعدة لعناصر الطلب (Order Items)
// ============================================

/**
 * الحصول على عناصر الطلب
 */
function getOrderItems(orderId) {
    const sheet = getSheet('OrderItems');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const orderIdIndex = headers.indexOf('order_id');
    const results = [];
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[orderIdIndex] === orderId) {
            const item = {};
            headers.forEach((header, index) => {
                item[header] = row[index] || '';
            });
            results.push(item);
        }
    }
    return results;
}

/**
 * الحصول على عنصر طلب بالمعرف
 */
function getOrderItemById(itemId) {
    const sheet = getSheet('OrderItems');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('id');
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[idIndex] === itemId) {
            const item = {};
            headers.forEach((header, index) => {
                item[header] = row[index] || '';
            });
            return item;
        }
    }
    return null;
}

/**
 * حفظ عنصر طلب
 */
function saveOrderItem(itemData) {
    const sheet = getSheet('OrderItems');
    const headers = ['id', 'order_id', 'service_id', 'quantity', 'price', 'total', 'notes', 'created_at'];
    
    if (sheet.getLastRow() === 0) {
        sheet.appendRow(headers);
    }
    
    const row = headers.map(header => itemData[header] || '');
    sheet.appendRow(row);
}

/**
 * حذف عنصر طلب
 */
function deleteOrderItem(itemId) {
    const sheet = getSheet('OrderItems');
    const data = sheet.getDataRange().getValues();
    const idIndex = data[0].indexOf('id');
    
    for (let i = 1; i < data.length; i++) {
        if (data[i][idIndex] === itemId) {
            sheet.deleteRow(i + 1);
            break;
        }
    }
}

/**
 * حذف جميع عناصر الطلب
 */
function deleteOrderItems(orderId) {
    const sheet = getSheet('OrderItems');
    const data = sheet.getDataRange().getValues();
    const orderIdIndex = data[0].indexOf('order_id');
    
    // جمع صفوف للحذف (من الأسفل إلى الأعلى)
    const rowsToDelete = [];
    for (let i = data.length - 1; i >= 1; i--) {
        if (data[i][orderIdIndex] === orderId) {
            rowsToDelete.push(i + 1);
        }
    }
    
    rowsToDelete.forEach(rowIndex => {
        sheet.deleteRow(rowIndex);
    });
}

/**
 * تحديث إجمالي الطلب
 */
function updateOrderTotal(orderId) {
    const items = getOrderItems(orderId);
    const total = items.reduce((sum, item) => sum + parseFloat(item.total || 0), 0);
    
    const order = getOrderById(orderId);
    if (order) {
        order.total = total;
        order.updated_at = new Date().toISOString();
        updateOrder(order);
    }
}

// ============================================
//  9.  دوال مساعدة للجدول الزمني (Timeline)
// ============================================

/**
 * إضافة حدث في الجدول الزمني للطلب
 */
function addOrderTimelineEvent(orderId, type, description, userId) {
    const sheet = getSheet('OrderTimeline');
    const headers = ['id', 'order_id', 'type', 'description', 'user_id', 'created_at'];
    
    if (sheet.getLastRow() === 0) {
        sheet.appendRow(headers);
    }
    
    sheet.appendRow([
        generateId(),
        orderId,
        type,
        description,
        userId || '',
        new Date().toISOString()
    ]);
}

/**
 * الحصول على الجدول الزمني للطلب
 */
function getOrderTimeline(orderId) {
    const sheet = getSheet('OrderTimeline');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const orderIdIndex = headers.indexOf('order_id');
    const results = [];
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[orderIdIndex] === orderId) {
            const event = {};
            headers.forEach((header, index) => {
                event[header] = row[index] || '';
            });
            // إضافة اسم المستخدم
            if (event.user_id) {
                const user = getUserById(event.user_id);
                event.user_name = user ? user.name : '';
            }
            results.push(event);
        }
    }
    
    // ترتيب حسب التاريخ (الأقدم أولاً)
    results.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    return results;
}

// ============================================
//  10.  دوال مساعدة للتعليقات
// ============================================

/**
 * حفظ تعليق
 */
function saveOrderComment(commentData) {
    const sheet = getSheet('OrderComments');
    const headers = ['id', 'order_id', 'user_id', 'comment', 'created_at'];
    
    if (sheet.getLastRow() === 0) {
        sheet.appendRow(headers);
    }
    
    const row = headers.map(header => commentData[header] || '');
    sheet.appendRow(row);
}

/**
 * الحصول على تعليقات الطلب
 */
function getOrderComments(orderId) {
    const sheet = getSheet('OrderComments');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const orderIdIndex = headers.indexOf('order_id');
    const results = [];
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[orderIdIndex] === orderId) {
            const comment = {};
            headers.forEach((header, index) => {
                comment[header] = row[index] || '';
            });
            // إضافة اسم المستخدم
            if (comment.user_id) {
                const user = getUserById(comment.user_id);
                comment.user_name = user ? user.name : '';
            }
            results.push(comment);
        }
    }
    
    // ترتيب حسب التاريخ (الأحدث أولاً)
    results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return results;
}

// ============================================
//  11.  دوال مساعدة للفواتير والمدفوعات
// ============================================

/**
 * الحصول على فاتورة الطلب
 */
function getOrderInvoice(orderId) {
    const sheet = getSheet('Invoices');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const orderIdIndex = headers.indexOf('order_id');
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[orderIdIndex] === orderId) {
            const invoice = {};
            headers.forEach((header, index) => {
                invoice[header] = row[index] || '';
            });
            return invoice;
        }
    }
    return null;
}

/**
 * الحصول على مدفوعات الطلب
 */
function getOrderPayments(orderId) {
    const sheet = getSheet('Transactions');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const relatedIdIndex = headers.indexOf('related_id');
    const results = [];
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[relatedIdIndex] === orderId && row[headers.indexOf('type')] === 'income') {
            const payment = {};
            headers.forEach((header, index) => {
                payment[header] = row[index] || '';
            });
            results.push(payment);
        }
    }
    return results;
}

// ============================================
//  12.  دوال مساعدة للترتيب والتصفية
// ============================================

/**
 * ترتيب الطلبات
 */
function sortOrders(orders, sortKey, order) {
    const validKeys = ['order_number', 'status', 'priority', 'created_date', 'delivery_date', 'total', 'paid'];
    if (!validKeys.includes(sortKey)) {
        sortKey = 'created_date';
    }
    
    const direction = order === 'desc' ? -1 : 1;
    
    return orders.sort((a, b) => {
        let valA = a[sortKey] || '';
        let valB = b[sortKey] || '';
        
        // تحويل الأرقام إلى أرقام
        if (sortKey === 'total' || sortKey === 'paid') {
            valA = parseFloat(valA) || 0;
            valB = parseFloat(valB) || 0;
        }
        
        // تحويل التواريخ
        if (sortKey === 'created_date' || sortKey === 'delivery_date') {
            valA = new Date(valA);
            valB = new Date(valB);
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
//  13.  دوال مساعدة للعملاء والموظفين والخدمات
// ============================================

/**
 * الحصول على اسم العميل
 */
function getCustomerName(customerId) {
    if (!customerId) return '';
    const customer = getCustomerById(customerId);
    return customer ? customer.name : '';
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
 * تحديث رصيد العميل
 */
function updateCustomerBalance(customerId, amount) {
    const customer = getCustomerById(customerId);
    if (!customer) return;
    
    customer.balance = parseFloat(customer.balance || 0) + parseFloat(amount);
    customer.updated_at = new Date().toISOString();
    updateCustomer(customer);
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
 * الحصول على موظف بالمعرف
 */
function getEmployeeById(id) {
    const sheet = getSheet('Employees');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('id');
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[idIndex] === id) {
            const employee = {};
            headers.forEach((header, index) => {
                employee[header] = row[index] || '';
            });
            // الحصول على اسم المستخدم المرتبط
            if (employee.user_id) {
                const user = getUserById(employee.user_id);
                employee.name = user ? user.name : '';
            }
            return employee;
        }
    }
    return null;
}

/**
 * الحصول على خدمة بالمعرف
 */
function getServiceById(id) {
    const sheet = getSheet('Services');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('id');
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[idIndex] === id) {
            const service = {};
            headers.forEach((header, index) => {
                service[header] = row[index] || '';
            });
            return service;
        }
    }
    return null;
}

/**
 * الحصول على ملفات الطلب
 */
function getOrderFiles(orderId) {
    const sheet = getSheet('Files');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const parentIdIndex = headers.indexOf('parent_id');
    const parentTypeIndex = headers.indexOf('parent_type');
    const results = [];
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[parentIdIndex] === orderId && row[parentTypeIndex] === 'order') {
            const file = {};
            headers.forEach((header, index) => {
                file[header] = row[index] || '';
            });
            results.push(file);
        }
    }
    return results;
}

// ============================================
//  14.  دوال مساعدة للإشعارات
// ============================================

/**
 * إرسال إشعار للطلب
 */
function sendOrderNotification(orderId, eventType) {
    try {
        const order = getOrderById(orderId);
        if (!order) return;
        
        const customer = getCustomerById(order.customer_id);
        const user = getUserById(order.created_by || '');
        
        let message = '';
        switch (eventType) {
            case 'created':
                message = 'تم إنشاء طلب جديد #' + order.order_number;
                break;
            case 'completed':
                message = 'تم إكمال الطلب #' + order.order_number;
                break;
            case 'status_changed':
                message = 'تم تحديث حالة الطلب #' + order.order_number + ' إلى ' + order.status;
                break;
            default:
                message = 'تحديث على الطلب #' + order.order_number;
        }
        
        // حفظ الإشعار
        const sheet = getSheet('Notifications');
        const headers = ['id', 'user_id', 'type', 'message', 'link', 'read', 'created_at'];
        
        if (sheet.getLastRow() === 0) {
            sheet.appendRow(headers);
        }
        
        sheet.appendRow([
            generateId(),
            order.created_by || '',
            'order',
            message,
            '#/order/' + orderId,
            false,
            new Date().toISOString()
        ]);
        
    } catch (error) {
        // تجاهل أخطاء الإشعارات
        console.error('Notification error:', error);
    }
}

// ============================================
//  15.  دوال مساعدة متنوعة
// ============================================

/**
 * توليد معرف فريد
 */
function generateId() {
    return Utilities.getUuid();
}

/**
 * توليد رمز QR (بسيط للتجربة)
 */
function generateQRCode(data) {
    return 'QR:' + data;
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

// ============================================
//  16.  نهاية الملف
// ============================================
