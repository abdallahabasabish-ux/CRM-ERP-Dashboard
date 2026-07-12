/**
 * ======================================================
 * الملف: utils/router.js
 * الوصف: مدير التوجيه (Router) للتطبيق
 *         يعتمد على نظام التوجيه بالتجزئة (hash-based routing)
 *         يدعم التحميل الكسول للصفحات، حماية المسارات،
 *         معلمات URL، والأحداث
 * الإصدار: 1.0.0
 * التاريخ: 2026-07-12
 * ======================================================
 */

import { getItem } from './storage.js';
import { STORAGE_KEYS, ROLES, PERMISSIONS, ROLE_PERMISSIONS } from './constants.js';
import { debounce } from './helpers.js';

// ============================================
//  1.  تعريف المسارات (Routes)
// ============================================

/**
 * تعريف المسارات: كل مسار يحتوي على:
 * - path: مسار URL (باستخدام التجزئة)
 * - title: عنوان الصفحة
 * - component: مسار ملف HTML الخاص بالصفحة
 * - script: مسار ملف JavaScript الخاص بالصفحة (اختياري)
 * - roles: الأدوار المسموح لها بالوصول (اختياري، إذا لم يتم تحديده فالكل مسموح)
 * - permissions: الصلاحيات المطلوبة (اختياري)
 * - redirect: إعادة توجيه (اختياري)
 * - children: مسارات فرعية (اختياري)
 */
const routes = [
    {
        path: '/login',
        title: 'تسجيل الدخول',
        component: 'pages/login/login.html',
        script: 'pages/login/login.js',
        public: true,
    },
    {
        path: '/dashboard',
        title: 'لوحة التحكم',
        component: 'pages/dashboard/dashboard.html',
        script: 'pages/dashboard/dashboard.js',
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE, ROLES.ACCOUNTANT],
    },
    {
        path: '/customers',
        title: 'العملاء',
        component: 'pages/customers/customers.html',
        script: 'pages/customers/customers.js',
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT],
        permissions: [PERMISSIONS.VIEW_CUSTOMERS],
    },
    {
        path: '/customer/:id',
        title: 'تفاصيل العميل',
        component: 'pages/customer/customer.html',
        script: 'pages/customer/customer.js',
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT],
        permissions: [PERMISSIONS.VIEW_CUSTOMERS],
    },
    {
        path: '/orders',
        title: 'الطلبات',
        component: 'pages/orders/orders.html',
        script: 'pages/orders/orders.js',
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT],
        permissions: [PERMISSIONS.VIEW_ORDERS],
    },
    {
        path: '/order/:id',
        title: 'تفاصيل الطلب',
        component: 'pages/order/order.html',
        script: 'pages/order/order.js',
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT],
        permissions: [PERMISSIONS.VIEW_ORDERS],
    },
    {
        path: '/services',
        title: 'الخدمات',
        component: 'pages/services/services.html',
        script: 'pages/services/services.js',
        roles: [ROLES.ADMIN, ROLES.MANAGER],
    },
    {
        path: '/employees',
        title: 'الموظفين',
        component: 'pages/employees/employees.html',
        script: 'pages/employees/employees.js',
        roles: [ROLES.ADMIN, ROLES.MANAGER],
        permissions: [PERMISSIONS.VIEW_EMPLOYEES],
    },
    {
        path: '/attendance',
        title: 'الحضور والانصراف',
        component: 'pages/attendance/attendance.html',
        script: 'pages/attendance/attendance.js',
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE],
        permissions: [PERMISSIONS.VIEW_ATTENDANCE],
    },
    {
        path: '/tasks',
        title: 'المهام',
        component: 'pages/tasks/tasks.html',
        script: 'pages/tasks/tasks.js',
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE],
        permissions: [PERMISSIONS.VIEW_TASKS],
    },
    {
        path: '/accounting',
        title: 'المحاسبة',
        component: 'pages/accounting/accounting.html',
        script: 'pages/accounting/accounting.js',
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT],
        permissions: [PERMISSIONS.VIEW_ACCOUNTING],
    },
    {
        path: '/invoices',
        title: 'الفواتير',
        component: 'pages/invoices/invoices.html',
        script: 'pages/invoices/invoices.js',
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT],
        permissions: [PERMISSIONS.VIEW_INVOICES],
    },
    {
        path: '/reports',
        title: 'التقارير',
        component: 'pages/reports/reports.html',
        script: 'pages/reports/reports.js',
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT],
        permissions: [PERMISSIONS.VIEW_REPORTS],
    },
    {
        path: '/notifications',
        title: 'الإشعارات',
        component: 'pages/notifications/notifications.html',
        script: 'pages/notifications/notifications.js',
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE, ROLES.ACCOUNTANT],
        permissions: [PERMISSIONS.VIEW_NOTIFICATIONS],
    },
    {
        path: '/messages',
        title: 'الرسائل',
        component: 'pages/messages/messages.html',
        script: 'pages/messages/messages.js',
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE, ROLES.ACCOUNTANT],
        permissions: [PERMISSIONS.VIEW_MESSAGES],
    },
    {
        path: '/files',
        title: 'الملفات',
        component: 'pages/files/files.html',
        script: 'pages/files/files.js',
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE, ROLES.ACCOUNTANT],
        permissions: [PERMISSIONS.VIEW_FILES],
    },
    {
        path: '/settings',
        title: 'الإعدادات',
        component: 'pages/settings/settings.html',
        script: 'pages/settings/settings.js',
        roles: [ROLES.ADMIN],
        permissions: [PERMISSIONS.VIEW_SETTINGS],
    },
    {
        path: '/profile',
        title: 'الملف الشخصي',
        component: 'pages/profile/profile.html',
        script: 'pages/profile/profile.js',
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE, ROLES.ACCOUNTANT],
    },
    {
        path: '/search',
        title: 'البحث',
        component: 'pages/search/search.html',
        script: 'pages/search/search.js',
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE, ROLES.ACCOUNTANT],
    },
    {
        path: '/archive',
        title: 'الأرشيف',
        component: 'pages/archive/archive.html',
        script: 'pages/archive/archive.js',
        roles: [ROLES.ADMIN, ROLES.MANAGER],
        permissions: [PERMISSIONS.VIEW_ARCHIVE],
    },
    {
        path: '/logs',
        title: 'سجل النشاطات',
        component: 'pages/logs/logs.html',
        script: 'pages/logs/logs.js',
        roles: [ROLES.ADMIN, ROLES.MANAGER],
        permissions: [PERMISSIONS.VIEW_LOGS],
    },
    {
        path: '/backup',
        title: 'النسخ الاحتياطي',
        component: 'pages/backup/backup.html',
        script: 'pages/backup/backup.js',
        roles: [ROLES.ADMIN],
        permissions: [PERMISSIONS.CREATE_BACKUP, PERMISSIONS.RESTORE_BACKUP],
    },
    {
        path: '/system-monitor',
        title: 'مراقبة النظام',
        component: 'pages/system-monitor/system-monitor.html',
        script: 'pages/system-monitor/system-monitor.js',
        roles: [ROLES.ADMIN],
    },
    {
        path: '/support',
        title: 'الدعم',
        component: 'pages/support/support.html',
        script: 'pages/support/support.js',
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE, ROLES.ACCOUNTANT],
    },
    {
        path: '/help',
        title: 'مركز المساعدة',
        component: 'pages/help/help.html',
        script: 'pages/help/help.js',
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE, ROLES.ACCOUNTANT],
    },
    {
        path: '/',
        title: 'لوحة التحكم',
        redirect: '/dashboard',
    },
    {
        path: '/404',
        title: 'الصفحة غير موجودة',
        component: 'pages/404/404.html',
        public: true,
    },
];

// ============================================
//  2.  فئة Router
// ============================================

class Router {
    constructor(options = {}) {
        this.routes = options.routes || routes;
        this.container = options.container || '#page-container';
        this.defaultRoute = options.defaultRoute || '/dashboard';
        this.notFoundRoute = options.notFoundRoute || '/404';
        this.currentRoute = null;
        this.currentParams = {};
        this.previousRoute = null;
        this.listeners = [];
        this.isLoading = false;
        this.loadedScripts = new Set();

        // ربط الأحداث
        this.handleHashChange = this.handleHashChange.bind(this);
        this.handlePopState = this.handlePopState.bind(this);

        // بدء الاستماع
        this.init();
    }

    /**
     * تهيئة الموجه
     */
    init() {
        window.addEventListener('hashchange', this.handleHashChange);
        window.addEventListener('popstate', this.handlePopState);

        // التحقق من وجود تجزئة في الرابط
        if (!window.location.hash) {
            // تعيين التجزئة الافتراضية
            window.location.hash = this.defaultRoute;
        } else {
            // معالجة المسار الحالي
            this.resolveRoute(window.location.hash);
        }
    }

    /**
     * معالجة تغيير التجزئة
     */
    handleHashChange(event) {
        const hash = window.location.hash;
        this.resolveRoute(hash);
    }

    /**
     * معالجة حدث popstate
     */
    handlePopState(event) {
        const hash = window.location.hash;
        this.resolveRoute(hash);
    }

    /**
     * حل المسار من التجزئة
     * @param {string} hash - التجزئة (مثل: #/dashboard)
     */
    resolveRoute(hash) {
        // إزالة # من بداية النص
        let path = hash.replace(/^#/, '');
        if (!path || path === '/') {
            path = this.defaultRoute;
        }

        // البحث عن المسار المطابق
        const route = this.findRoute(path);

        if (route) {
            // استخراج المعاملات (params)
            const params = this.extractParams(route, path);

            // التحقق من الصلاحيات
            if (!this.checkAccess(route)) {
                this.redirectTo('/dashboard');
                return;
            }

            // معالجة إعادة التوجيه
            if (route.redirect) {
                this.redirectTo(route.redirect);
                return;
            }

            // تحميل الصفحة
            this.loadPage(route, params);
        } else {
            // صفحة غير موجودة
            this.loadPage(this.findRoute(this.notFoundRoute));
        }
    }

    /**
     * البحث عن مسار مطابق
     * @param {string} path - المسار
     * @returns {Object|null} المسار المطابق
     */
    findRoute(path) {
        // البحث المطابق التام
        const exactMatch = this.routes.find(route => route.path === path);
        if (exactMatch) return exactMatch;

        // البحث باستخدام الأنماط (مثل: /customer/:id)
        for (const route of this.routes) {
            const routePattern = this.routeToRegex(route.path);
            if (routePattern.test(path)) {
                return route;
            }
        }

        return null;
    }

    /**
     * تحويل المسار إلى تعبير منتظم
     * @param {string} routePath - مسار القاعدة (مثل: /customer/:id)
     * @returns {RegExp} التعبير المنتظم
     */
    routeToRegex(routePath) {
        const pattern = routePath.replace(/\//g, '\\/').replace(/:\w+/g, '([^\\/]+)');
        return new RegExp(`^${pattern}$`);
    }

    /**
     * استخراج المعاملات من المسار
     * @param {Object} route - كائن المسار
     * @param {string} path - المسار الفعلي
     * @returns {Object} المعاملات
     */
    extractParams(route, path) {
        const params = {};
        const routeParts = route.path.split('/');
        const pathParts = path.split('/');

        routeParts.forEach((part, index) => {
            if (part.startsWith(':')) {
                const key = part.slice(1);
                params[key] = pathParts[index] || '';
            }
        });

        return params;
    }

    /**
     * التحقق من صلاحية الوصول
     * @param {Object} route - كائن المسار
     * @returns {boolean} true إذا كان مسموحاً
     */
    checkAccess(route) {
        // الصفحات العامة
        if (route.public) return true;

        // الحصول على بيانات المستخدم الحالي
        const user = getItem(STORAGE_KEYS.USER_DATA);
        if (!user) {
            this.redirectTo('/login');
            return false;
        }

        const userRole = user.role || ROLES.EMPLOYEE;

        // التحقق من الأدوار
        if (route.roles && !route.roles.includes(userRole)) {
            return false;
        }

        // التحقق من الصلاحيات
        if (route.permissions) {
            const userPermissions = ROLE_PERMISSIONS[userRole] || [];
            const hasAll = route.permissions.every(p => userPermissions.includes(p));
            if (!hasAll) return false;
        }

        return true;
    }

    /**
     * إعادة توجيه إلى مسار آخر
     * @param {string} path - المسار الجديد
     */
    redirectTo(path) {
        if (window.location.hash === `#${path}`) {
            this.resolveRoute(`#${path}`);
        } else {
            window.location.hash = path;
        }
    }

    /**
     * تحميل الصفحة
     * @param {Object} route - كائن المسار
     * @param {Object} params - المعاملات
     */
    async loadPage(route, params = {}) {
        if (!route || !route.component) {
            route = this.findRoute(this.notFoundRoute);
            if (!route) return;
        }

        // تجنب إعادة تحميل الصفحة نفسها
        if (this.currentRoute === route.path && !route.forceReload) {
            // تحديث المعاملات فقط
            this.currentParams = params;
            this.updatePageTitle(route.title);
            this.emit('routeChange', { route, params });
            return;
        }

        this.isLoading = true;
        this.previousRoute = this.currentRoute;
        this.currentRoute = route.path;
        this.currentParams = params;

        try {
            // عرض مؤشر التحميل
            this.showLoader();

            // تحميل ملف HTML
            const html = await this.fetchComponent(route.component);

            // تحميل ملف JavaScript الخاص بالصفحة (إن وجد)
            if (route.script && !this.loadedScripts.has(route.script)) {
                await this.loadScript(route.script);
                this.loadedScripts.add(route.script);
            }

            // إدراج HTML في الحاوية
            const container = document.querySelector(this.container);
            if (container) {
                container.innerHTML = html;
            }

            // تحديث عنوان الصفحة
            this.updatePageTitle(route.title);

            // تحديث القائمة الجانبية (تحديد العنصر النشط)
            this.updateActiveNav(route.path);

            // إشعار بتغيير المسار
            this.emit('routeLoaded', { route, params });

            // إزالة مؤشر التحميل
            this.hideLoader();

            // تنفيذ أي منطق إضافي للصفحة (إذا كانت الصفحة توفر دالة init)
            if (window.pageInit && typeof window.pageInit === 'function') {
                await window.pageInit(params);
            }

            this.isLoading = false;

        } catch (error) {
            console.error('Error loading page:', error);
            this.hideLoader();
            this.showError('حدث خطأ أثناء تحميل الصفحة. يرجى المحاولة مرة أخرى.');
            this.isLoading = false;
        }
    }

    /**
     * جلب مكون HTML
     * @param {string} path - مسار الملف
     * @returns {Promise<string>} محتوى HTML
     */
    async fetchComponent(path) {
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to load component: ${path} (${response.status})`);
            }
            return await response.text();
        } catch (error) {
            console.error('Fetch component error:', error);
            // محاولة تحميل صفحة 404
            if (path !== this.findRoute(this.notFoundRoute)?.component) {
                const notFound = this.findRoute(this.notFoundRoute);
                if (notFound) {
                    return this.fetchComponent(notFound.component);
                }
            }
            throw error;
        }
    }

    /**
     * تحميل ملف JavaScript
     * @param {string} path - مسار الملف
     * @returns {Promise<void>}
     */
    loadScript(path) {
        return new Promise((resolve, reject) => {
            // التحقق من وجود السكريبت مسبقاً
            const existingScript = document.querySelector(`script[src="${path}"]`);
            if (existingScript) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = path;
            script.type = 'module';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script: ${path}`));
            document.body.appendChild(script);
        });
    }

    /**
     * تحديث عنوان الصفحة
     * @param {string} title - العنوان
     */
    updatePageTitle(title) {
        document.title = title ? `${title} | نظام ERP + CRM` : 'نظام ERP + CRM';
    }

    /**
     * تحديث القائمة الجانبية (تحديد العنصر النشط)
     * @param {string} path - المسار الحالي
     */
    updateActiveNav(path) {
        const links = document.querySelectorAll('.sidebar .menu-link');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href === `#${path}` || href === `#${path}/`) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    /**
     * عرض مؤشر التحميل
     */
    showLoader() {
        const container = document.querySelector(this.container);
        if (container) {
            // إضافة مؤشر تحميل مؤقت
            const loader = document.createElement('div');
            loader.className = 'loader-overlay';
            loader.id = 'page-loader';
            loader.innerHTML = `<div class="loader"></div>`;
            // إزالة أي مؤشر سابق
            const existing = document.getElementById('page-loader');
            if (existing) existing.remove();
            container.appendChild(loader);
        }
    }

    /**
     * إخفاء مؤشر التحميل
     */
    hideLoader() {
        const loader = document.getElementById('page-loader');
        if (loader) {
            loader.remove();
        }
    }

    /**
     * عرض رسالة خطأ
     * @param {string} message - رسالة الخطأ
     */
    showError(message) {
        const container = document.querySelector(this.container);
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger" style="margin: var(--spacing-5);">
                    <div class="alert-icon">⚠️</div>
                    <div class="alert-content">
                        <div class="alert-title">خطأ</div>
                        <p>${message}</p>
                    </div>
                </div>
            `;
        }
        // استخدام التوسيت لعرض الخطأ أيضاً
        const toast = document.createElement('div');
        toast.className = 'toast toast-error';
        toast.innerHTML = `
            <span class="toast-icon">❌</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close">&times;</button>
        `;
        document.querySelector('.toast-container')?.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    }

    /**
     * التنقل إلى مسار معين (برمجياً)
     * @param {string} path - المسار
     * @param {Object} params - المعاملات (اختياري)
     */
    navigate(path, params = {}) {
        // بناء الرابط مع المعاملات
        let url = path;
        if (Object.keys(params).length > 0) {
            const queryString = new URLSearchParams(params).toString();
            url += `?${queryString}`;
        }
        window.location.hash = url;
    }

    /**
     * الحصول على المسار الحالي
     * @returns {string} المسار الحالي
     */
    getCurrentPath() {
        return this.currentRoute || '/';
    }

    /**
     * الحصول على المعاملات الحالية
     * @returns {Object} المعاملات
     */
    getCurrentParams() {
        return this.currentParams || {};
    }

    /**
     * الحصول على المسار السابق
     * @returns {string} المسار السابق
     */
    getPreviousPath() {
        return this.previousRoute || '/';
    }

    /**
     * إضافة مستمع لأحداث الموجه
     * @param {string} event - اسم الحدث ('routeChange', 'routeLoaded')
     * @param {Function} callback - الدالة
     */
    on(event, callback) {
        this.listeners.push({ event, callback });
    }

    /**
     * إزالة مستمع
     * @param {string} event - اسم الحدث
     * @param {Function} callback - الدالة
     */
    off(event, callback) {
        this.listeners = this.listeners.filter(l => !(l.event === event && l.callback === callback));
    }

    /**
     * إطلاق حدث
     * @param {string} event - اسم الحدث
     * @param {*} data - البيانات
     */
    emit(event, data) {
        this.listeners.forEach(listener => {
            if (listener.event === event) {
                try {
                    listener.callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            }
        });
    }

    /**
     * إعادة تحميل الصفحة الحالية
     */
    reload() {
        const hash = window.location.hash;
        if (hash) {
            this.resolveRoute(hash);
        } else {
            this.redirectTo(this.defaultRoute);
        }
    }

    /**
     * تنظيف الموارد (استدعاء عند إزالة الموجه)
     */
    destroy() {
        window.removeEventListener('hashchange', this.handleHashChange);
        window.removeEventListener('popstate', this.handlePopState);
        this.listeners = [];
        this.loadedScripts.clear();
    }
}

// ============================================
//  3.  وظيفة مساعدة لإنشاء كائن Router مفرد (Singleton)
// ============================================

let routerInstance = null;

/**
 * الحصول على كائن Router (Singleton)
 * @param {Object} options - خيارات التهيئة
 * @returns {Router} كائن Router
 */
export function getRouter(options = {}) {
    if (!routerInstance) {
        routerInstance = new Router(options);
    }
    return routerInstance;
}

/**
 * التنقل إلى مسار معين
 * @param {string} path - المسار
 * @param {Object} params - المعاملات (اختياري)
 */
export function navigateTo(path, params = {}) {
    const router = getRouter();
    router.navigate(path, params);
}

/**
 * الحصول على المسار الحالي
 * @returns {string} المسار الحالي
 */
export function getCurrentRoute() {
    const router = getRouter();
    return router.getCurrentPath();
}

/**
 * الحصول على المعاملات الحالية
 * @returns {Object} المعاملات
 */
export function getCurrentParams() {
    const router = getRouter();
    return router.getCurrentParams();
}

/**
 * إعادة تحميل الصفحة الحالية
 */
export function reloadPage() {
    const router = getRouter();
    router.reload();
}

// ============================================
//  4.  تصدير الكل
// ============================================

export const router = {
    Router,
    getRouter,
    navigateTo,
    getCurrentRoute,
    getCurrentParams,
    reloadPage,
};

// تصدير افتراضي
export default router;

// ============================================
//  5.  نهاية الملف
// ============================================
