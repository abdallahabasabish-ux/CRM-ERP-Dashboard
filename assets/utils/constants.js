/**
 * ======================================================
 * الملف: utils/constants.js
 * الوصف: يحتوي على جميع الثوابت المستخدمة في التطبيق
 *         (أسماء الجداول، نقاط API، المفاتيح، الإعدادات،
 *         الصلاحيات، الحالات، الأولويات، التصنيفات، إلخ)
 * الإصدار: 1.0.0
 * التاريخ: 2026-07-12
 * ======================================================
 */

// ============================================
//  1.  الثوابت العامة للتطبيق
// ============================================

export const APP_NAME = 'نظام ERP + CRM';
export const APP_VERSION = '1.0.0';
export const APP_DESCRIPTION = 'نظام متكامل لإدارة الأعمال';
export const DEFAULT_LANGUAGE = 'ar';
export const DIRECTION = 'rtl';

// ============================================
//  2.  عناوين API (نقاط النهاية)
// ============================================

// يجب تعديل هذا الرابط عند النشر ليشير إلى Web App الخاص بـ Google Apps Script
export const API_BASE_URL = 'https://script.google.com/macros/s/你的WebAppID/exec';

export const API_ENDPOINTS = {
    // المصادقة
    AUTH_LOGIN: '/api/auth/login',
    AUTH_LOGOUT: '/api/auth/logout',
    AUTH_VERIFY: '/api/auth/verify',
    AUTH_REFRESH: '/api/auth/refresh',

    // المستخدمين
    USERS: '/api/users',
    USER: (id) => `/api/users/${id}`,

    // العملاء
    CUSTOMERS: '/api/customers',
    CUSTOMER: (id) => `/api/customers/${id}`,
    CUSTOMER_ORDERS: (id) => `/api/customers/${id}/orders`,
    CUSTOMER_FILES: (id) => `/api/customers/${id}/files`,

    // الموظفين
    EMPLOYEES: '/api/employees',
    EMPLOYEE: (id) => `/api/employees/${id}`,
    EMPLOYEE_ATTENDANCE: (id) => `/api/employees/${id}/attendance`,
    EMPLOYEE_TASKS: (id) => `/api/employees/${id}/tasks`,

    // الخدمات
    SERVICES: '/api/services',
    SERVICE: (id) => `/api/services/${id}`,

    // الطلبات
    ORDERS: '/api/orders',
    ORDER: (id) => `/api/orders/${id}`,
    ORDER_STATUS: (id) => `/api/orders/${id}/status`,
    ORDER_ITEMS: (id) => `/api/orders/${id}/items`,
    ORDER_INVOICE: (id) => `/api/orders/${id}/invoice`,
    ORDER_FILES: (id) => `/api/orders/${id}/files`,
    ORDER_TIMELINE: (id) => `/api/orders/${id}/timeline`,
    ORDER_COMMENTS: (id) => `/api/orders/${id}/comments`,

    // الفواتير
    INVOICES: '/api/invoices',
    INVOICE: (id) => `/api/invoices/${id}`,
    INVOICE_PAY: (id) => `/api/invoices/${id}/pay`,
    INVOICE_DOWNLOAD: (id) => `/api/invoices/${id}/download`,

    // المعاملات
    TRANSACTIONS: '/api/transactions',
    TRANSACTION: (id) => `/api/transactions/${id}`,

    // الحضور
    ATTENDANCE: '/api/attendance',
    ATTENDANCE_RECORD: (id) => `/api/attendance/${id}`,
    ATTENDANCE_SUMMARY: '/api/attendance/summary',

    // المهام
    TASKS: '/api/tasks',
    TASK: (id) => `/api/tasks/${id}`,
    TASK_STATUS: (id) => `/api/tasks/${id}/status`,
    TASK_KANBAN: '/api/tasks/kanban',

    // الرسائل
    MESSAGES: '/api/messages',
    MESSAGE: (id) => `/api/messages/${id}`,
    MESSAGES_CONVERSATION: (userId) => `/api/messages/conversation/${userId}`,

    // الإشعارات
    NOTIFICATIONS: '/api/notifications',
    NOTIFICATION: (id) => `/api/notifications/${id}`,
    NOTIFICATIONS_READ_ALL: '/api/notifications/read-all',

    // الملفات
    FILES: '/api/files',
    FILE: (id) => `/api/files/${id}`,
    FILE_DOWNLOAD: (id) => `/api/files/${id}/download`,

    // التقارير
    REPORTS: '/api/reports',
    REPORT: (type) => `/api/reports/${type}`,

    // الإعدادات
    SETTINGS: '/api/settings',
    SETTING: (key) => `/api/settings/${key}`,

    // سجل النشاطات
    LOGS: '/api/logs',

    // الأرشيف
    ARCHIVE: '/api/archive',
    ARCHIVE_ITEM: (id) => `/api/archive/${id}`,
    ARCHIVE_RESTORE: (id) => `/api/archive/${id}/restore`,

    // لوحة التحكم
    DASHBOARD_SUMMARY: '/api/dashboard/summary',
    DASHBOARD_CHARTS: '/api/dashboard/charts',
    DASHBOARD_RECENT: '/api/dashboard/recent',
    DASHBOARD_ACTIVITIES: '/api/dashboard/activities',

    // البحث العام
    SEARCH: '/api/search',

    // المساعدة والدعم
    HELP: '/api/help',
    SUPPORT: '/api/support',
};

// ============================================
//  3.  مفاتيح التخزين المحلي (LocalStorage / IndexedDB)
// ============================================

export const STORAGE_KEYS = {
    AUTH_TOKEN: 'erp_auth_token',
    USER_DATA: 'erp_user_data',
    THEME_PREFERENCE: 'erp_theme_preference',
    SIDEBAR_STATE: 'erp_sidebar_state',
    LANGUAGE: 'erp_language',
    NOTIFICATIONS_LAST_READ: 'erp_notifications_last_read',
    OFFLINE_QUEUE: 'erp_offline_queue',
    SYNC_STATUS: 'erp_sync_status',
};

// ============================================
//  4.  أسماء جداول Google Sheets
// ============================================

export const SHEET_NAMES = {
    USERS: 'Users',
    CUSTOMERS: 'Customers',
    EMPLOYEES: 'Employees',
    SERVICES: 'Services',
    ORDERS: 'Orders',
    ORDER_ITEMS: 'OrderItems',
    INVOICES: 'Invoices',
    INVOICE_ITEMS: 'InvoiceItems',
    TRANSACTIONS: 'Transactions',
    ATTENDANCE: 'Attendance',
    TASKS: 'Tasks',
    MESSAGES: 'Messages',
    NOTIFICATIONS: 'Notifications',
    FILES: 'Files',
    LOGS: 'Logs',
    SETTINGS: 'Settings',
    ARCHIVE: 'Archive',
};

// ============================================
//  5.  أدوار المستخدم والصلاحيات
// ============================================

export const ROLES = {
    ADMIN: 'admin',
    MANAGER: 'manager',
    EMPLOYEE: 'employee',
    ACCOUNTANT: 'accountant',
};

export const PERMISSIONS = {
    // الصلاحيات العامة
    VIEW_DASHBOARD: 'view_dashboard',
    VIEW_REPORTS: 'view_reports',
    EXPORT_REPORTS: 'export_reports',

    // العملاء
    VIEW_CUSTOMERS: 'view_customers',
    CREATE_CUSTOMER: 'create_customer',
    EDIT_CUSTOMER: 'edit_customer',
    DELETE_CUSTOMER: 'delete_customer',

    // الطلبات
    VIEW_ORDERS: 'view_orders',
    CREATE_ORDER: 'create_order',
    EDIT_ORDER: 'edit_order',
    DELETE_ORDER: 'delete_order',
    UPDATE_ORDER_STATUS: 'update_order_status',

    // الموظفين
    VIEW_EMPLOYEES: 'view_employees',
    CREATE_EMPLOYEE: 'create_employee',
    EDIT_EMPLOYEE: 'edit_employee',
    DELETE_EMPLOYEE: 'delete_employee',

    // الحضور
    VIEW_ATTENDANCE: 'view_attendance',
    CREATE_ATTENDANCE: 'create_attendance',
    EDIT_ATTENDANCE: 'edit_attendance',

    // المهام
    VIEW_TASKS: 'view_tasks',
    CREATE_TASK: 'create_task',
    EDIT_TASK: 'edit_task',
    DELETE_TASK: 'delete_task',
    ASSIGN_TASK: 'assign_task',

    // المحاسبة
    VIEW_ACCOUNTING: 'view_accounting',
    CREATE_TRANSACTION: 'create_transaction',
    EDIT_TRANSACTION: 'edit_transaction',
    DELETE_TRANSACTION: 'delete_transaction',

    // الفواتير
    VIEW_INVOICES: 'view_invoices',
    CREATE_INVOICE: 'create_invoice',
    EDIT_INVOICE: 'edit_invoice',
    DELETE_INVOICE: 'delete_invoice',
    PAY_INVOICE: 'pay_invoice',

    // الملفات
    VIEW_FILES: 'view_files',
    UPLOAD_FILE: 'upload_file',
    DELETE_FILE: 'delete_file',

    // الرسائل
    VIEW_MESSAGES: 'view_messages',
    SEND_MESSAGE: 'send_message',
    DELETE_MESSAGE: 'delete_message',

    // الإشعارات
    VIEW_NOTIFICATIONS: 'view_notifications',
    MARK_NOTIFICATIONS_READ: 'mark_notifications_read',

    // الإعدادات
    VIEW_SETTINGS: 'view_settings',
    EDIT_SETTINGS: 'edit_settings',

    // الأرشيف والنسخ الاحتياطي
    VIEW_ARCHIVE: 'view_archive',
    RESTORE_ARCHIVE: 'restore_archive',
    CREATE_BACKUP: 'create_backup',
    RESTORE_BACKUP: 'restore_backup',

    // سجل النشاطات
    VIEW_LOGS: 'view_logs',

    // إدارة المستخدمين
    VIEW_USERS: 'view_users',
    CREATE_USER: 'create_user',
    EDIT_USER: 'edit_user',
    DELETE_USER: 'delete_user',
};

// تعيين الصلاحيات لكل دور
export const ROLE_PERMISSIONS = {
    [ROLES.ADMIN]: Object.values(PERMISSIONS),

    [ROLES.MANAGER]: [
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.VIEW_REPORTS,
        PERMISSIONS.EXPORT_REPORTS,
        PERMISSIONS.VIEW_CUSTOMERS,
        PERMISSIONS.CREATE_CUSTOMER,
        PERMISSIONS.EDIT_CUSTOMER,
        PERMISSIONS.VIEW_ORDERS,
        PERMISSIONS.CREATE_ORDER,
        PERMISSIONS.EDIT_ORDER,
        PERMISSIONS.UPDATE_ORDER_STATUS,
        PERMISSIONS.VIEW_EMPLOYEES,
        PERMISSIONS.VIEW_ATTENDANCE,
        PERMISSIONS.VIEW_TASKS,
        PERMISSIONS.CREATE_TASK,
        PERMISSIONS.EDIT_TASK,
        PERMISSIONS.ASSIGN_TASK,
        PERMISSIONS.VIEW_ACCOUNTING,
        PERMISSIONS.VIEW_INVOICES,
        PERMISSIONS.CREATE_INVOICE,
        PERMISSIONS.VIEW_FILES,
        PERMISSIONS.UPLOAD_FILE,
        PERMISSIONS.VIEW_MESSAGES,
        PERMISSIONS.SEND_MESSAGE,
        PERMISSIONS.VIEW_NOTIFICATIONS,
        PERMISSIONS.MARK_NOTIFICATIONS_READ,
        PERMISSIONS.VIEW_LOGS,
    ],

    [ROLES.EMPLOYEE]: [
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.VIEW_CUSTOMERS,
        PERMISSIONS.VIEW_ORDERS,
        PERMISSIONS.VIEW_TASKS,
        PERMISSIONS.VIEW_ATTENDANCE,
        PERMISSIONS.CREATE_ATTENDANCE,
        PERMISSIONS.VIEW_FILES,
        PERMISSIONS.UPLOAD_FILE,
        PERMISSIONS.VIEW_MESSAGES,
        PERMISSIONS.SEND_MESSAGE,
        PERMISSIONS.VIEW_NOTIFICATIONS,
        PERMISSIONS.MARK_NOTIFICATIONS_READ,
    ],

    [ROLES.ACCOUNTANT]: [
        PERMISSIONS.VIEW_DASHBOARD,
        PERMISSIONS.VIEW_REPORTS,
        PERMISSIONS.EXPORT_REPORTS,
        PERMISSIONS.VIEW_CUSTOMERS,
        PERMISSIONS.VIEW_ORDERS,
        PERMISSIONS.VIEW_ACCOUNTING,
        PERMISSIONS.CREATE_TRANSACTION,
        PERMISSIONS.EDIT_TRANSACTION,
        PERMISSIONS.VIEW_INVOICES,
        PERMISSIONS.CREATE_INVOICE,
        PERMISSIONS.EDIT_INVOICE,
        PERMISSIONS.PAY_INVOICE,
        PERMISSIONS.VIEW_FILES,
        PERMISSIONS.VIEW_MESSAGES,
        PERMISSIONS.VIEW_NOTIFICATIONS,
        PERMISSIONS.MARK_NOTIFICATIONS_READ,
        PERMISSIONS.VIEW_LOGS,
    ],
};

// ============================================
//  6.  حالات الطلبات والمهام والأولوية
// ============================================

export const ORDER_STATUS = {
    NEW: 'new',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
};

export const ORDER_STATUS_LABELS = {
    [ORDER_STATUS.NEW]: 'جديد',
    [ORDER_STATUS.IN_PROGRESS]: 'قيد التنفيذ',
    [ORDER_STATUS.COMPLETED]: 'مكتمل',
    [ORDER_STATUS.CANCELLED]: 'ملغي',
};

export const ORDER_STATUS_COLORS = {
    [ORDER_STATUS.NEW]: 'status-new',
    [ORDER_STATUS.IN_PROGRESS]: 'status-in-progress',
    [ORDER_STATUS.COMPLETED]: 'status-completed',
    [ORDER_STATUS.CANCELLED]: 'status-cancelled',
};

export const PRIORITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent',
};

export const PRIORITY_LABELS = {
    [PRIORITY.LOW]: 'منخفضة',
    [PRIORITY.MEDIUM]: 'متوسطة',
    [PRIORITY.HIGH]: 'عالية',
    [PRIORITY.URGENT]: 'عاجلة',
};

export const PRIORITY_COLORS = {
    [PRIORITY.LOW]: 'priority-low',
    [PRIORITY.MEDIUM]: 'priority-medium',
    [PRIORITY.HIGH]: 'priority-high',
    [PRIORITY.URGENT]: 'priority-high', // نفس اللون عالي
};

export const TASK_STATUS = {
    OPEN: 'open',
    IN_PROGRESS: 'in_progress',
    DONE: 'done',
};

export const TASK_STATUS_LABELS = {
    [TASK_STATUS.OPEN]: 'مفتوحة',
    [TASK_STATUS.IN_PROGRESS]: 'قيد التنفيذ',
    [TASK_STATUS.DONE]: 'منتهية',
};

export const TASK_STATUS_COLORS = {
    [TASK_STATUS.OPEN]: 'status-new',
    [TASK_STATUS.IN_PROGRESS]: 'status-in-progress',
    [TASK_STATUS.DONE]: 'status-completed',
};

export const INVOICE_STATUS = {
    PAID: 'paid',
    UNPAID: 'unpaid',
    PARTIALLY_PAID: 'partially_paid',
};

export const INVOICE_STATUS_LABELS = {
    [INVOICE_STATUS.PAID]: 'مدفوعة',
    [INVOICE_STATUS.UNPAID]: 'غير مدفوعة',
    [INVOICE_STATUS.PARTIALLY_PAID]: 'مدفوعة جزئياً',
};

export const INVOICE_STATUS_COLORS = {
    [INVOICE_STATUS.PAID]: 'status-completed',
    [INVOICE_STATUS.UNPAID]: 'status-cancelled',
    [INVOICE_STATUS.PARTIALLY_PAID]: 'status-in-progress',
};

export const ATTENDANCE_STATUS = {
    PRESENT: 'present',
    ABSENT: 'absent',
    LATE: 'late',
    EXCUSED: 'excused',
};

export const ATTENDANCE_STATUS_LABELS = {
    [ATTENDANCE_STATUS.PRESENT]: 'حاضر',
    [ATTENDANCE_STATUS.ABSENT]: 'غائب',
    [ATTENDANCE_STATUS.LATE]: 'متأخر',
    [ATTENDANCE_STATUS.EXCUSED]: 'معذور',
};

export const TRANSACTION_TYPES = {
    INCOME: 'income',
    EXPENSE: 'expense',
};

export const TRANSACTION_TYPE_LABELS = {
    [TRANSACTION_TYPES.INCOME]: 'إيراد',
    [TRANSACTION_TYPES.EXPENSE]: 'مصروف',
};

export const TRANSACTION_CATEGORIES = {
    // للإيرادات
    INCOME_CATEGORIES: ['مبيعات', 'خدمات', 'استثمارات', 'أخرى'],
    // للمصروفات
    EXPENSE_CATEGORIES: ['رواتب', 'إيجار', 'مرافق', 'مشتريات', 'صيانة', 'تسويق', 'نقل', 'أخرى'],
};

// ============================================
//  7.  إعدادات النظام الافتراضية
// ============================================

export const DEFAULT_SETTINGS = {
    company_name: 'شركتي',
    company_logo: '',
    timezone: 'Asia/Riyadh',
    date_format: 'YYYY-MM-DD',
    currency: 'SAR',
    currency_symbol: 'ر.س',
    language: 'ar',
    theme: 'auto', // 'light', 'dark', 'auto'
    notifications_enabled: true,
    notification_sound: true,
    email_notifications: false,
    push_notifications: false,
    attendance_check_in_required: true,
    attendance_auto_checkout: false,
    attendance_work_hours: 8,
    task_default_priority: PRIORITY.MEDIUM,
    order_default_status: ORDER_STATUS.NEW,
    invoice_due_days: 14,
    tax_rate: 0.15,
    backup_auto_enabled: false,
    backup_auto_frequency: 'weekly', // 'daily', 'weekly', 'monthly'
};

// ============================================
//  8.  الرسائل والتنبيهات
// ============================================

export const MESSAGES = {
    // عام
    LOADING: 'جاري التحميل...',
    SAVING: 'جاري الحفظ...',
    DELETING: 'جاري الحذف...',
    SUCCESS: 'تمت العملية بنجاح',
    ERROR: 'حدث خطأ، يرجى المحاولة مرة أخرى',
    CONFIRM_DELETE: 'هل أنت متأكد من حذف هذا العنصر؟',
    CONFIRM_ARCHIVE: 'هل أنت متأكد من أرشفة هذا العنصر؟',
    NO_DATA: 'لا توجد بيانات',
    NO_RESULTS: 'لا توجد نتائج',
    REQUIRED_FIELD: 'هذا الحقل مطلوب',
    INVALID_EMAIL: 'البريد الإلكتروني غير صحيح',
    INVALID_PHONE: 'رقم الهاتف غير صحيح',
    PASSWORD_MISMATCH: 'كلمة المرور غير متطابقة',
    SESSION_EXPIRED: 'انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى',
    UNAUTHORIZED: 'غير مصرح لك بهذا الإجراء',
    FORBIDDEN: 'ليس لديك صلاحية لهذا الإجراء',
    NOT_FOUND: 'العنصر غير موجود',

    // المصادقة
    LOGIN_SUCCESS: 'تم تسجيل الدخول بنجاح',
    LOGIN_ERROR: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    LOGOUT_SUCCESS: 'تم تسجيل الخروج بنجاح',
    REGISTER_SUCCESS: 'تم إنشاء الحساب بنجاح',

    // العملاء
    CUSTOMER_CREATED: 'تم إنشاء العميل بنجاح',
    CUSTOMER_UPDATED: 'تم تحديث العميل بنجاح',
    CUSTOMER_DELETED: 'تم حذف العميل بنجاح',

    // الطلبات
    ORDER_CREATED: 'تم إنشاء الطلب بنجاح',
    ORDER_UPDATED: 'تم تحديث الطلب بنجاح',
    ORDER_DELETED: 'تم حذف الطلب بنجاح',
    ORDER_STATUS_UPDATED: 'تم تحديث حالة الطلب',

    // المهام
    TASK_CREATED: 'تم إنشاء المهمة بنجاح',
    TASK_UPDATED: 'تم تحديث المهمة بنجاح',
    TASK_DELETED: 'تم حذف المهمة بنجاح',
    TASK_STATUS_UPDATED: 'تم تحديث حالة المهمة',

    // الفواتير
    INVOICE_CREATED: 'تم إنشاء الفاتورة بنجاح',
    INVOICE_UPDATED: 'تم تحديث الفاتورة بنجاح',
    INVOICE_DELETED: 'تم حذف الفاتورة بنجاح',
    INVOICE_PAID: 'تم تسجيل الدفع بنجاح',

    // الملفات
    FILE_UPLOADED: 'تم رفع الملف بنجاح',
    FILE_DELETED: 'تم حذف الملف بنجاح',
    FILE_DOWNLOADED: 'جاري تحميل الملف...',
};

// ============================================
//  9.  إعدادات التطبيق (PWA، الأداء، إلخ)
// ============================================

export const PWA_CONFIG = {
    CACHE_NAME: 'erp-crm-v1',
    CACHE_URLS: [
        '/',
        '/index.html',
        '/offline.html',
        '/assets/css/main.css',
        '/assets/css/theme.css',
        '/assets/css/components.css',
        '/assets/css/responsive.css',
        '/assets/js/app.js',
        '/assets/icons/logo.svg',
        '/assets/icons/favicon.svg',
        '/assets/images/default-avatar.png',
    ],
    OFFLINE_PAGE: '/offline.html',
    INSTALL_PROMPT_DELAY: 3000, // مللي ثانية
};

export const API_CONFIG = {
    TIMEOUT: 30000, // 30 ثانية
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 ثانية
    CACHE_DURATION: 5 * 60 * 1000, // 5 دقائق
    MAX_CONCURRENT_REQUESTS: 5,
};

export const APP_CONFIG = {
    ITEMS_PER_PAGE: 20,
    MAX_RECENT_ITEMS: 10,
    SEARCH_DEBOUNCE: 300, // مللي ثانية
    TOAST_DURATION: 4000, // مللي ثانية
    AUTO_SAVE_DELAY: 500, // مللي ثانية
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10 ميجابايت
    ALLOWED_FILE_TYPES: ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
};

// ============================================
//  10. نهاية الملف
// ============================================
