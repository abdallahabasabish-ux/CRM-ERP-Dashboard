/**
 * ======================================================
 * الملف: js/app.js
 * الوصف: المدير الرئيسي للتطبيق (Application Manager)
 *         يقوم بتهيئة جميع المكونات، إدارة الحالة العامة،
 *         التعامل مع التوجيه، المصادقة، الأحداث العامة،
 *         والإعدادات الأولية
 * الإصدار: 1.0.0
 * التاريخ: 2026-07-13
 * ======================================================
 */

import { getItem, setItem } from '../utils/storage.js';
import { STORAGE_KEYS } from '../utils/constants.js';
import { getRouter, navigateTo } from '../utils/router.js';
import { initTheme, getCurrentTheme } from '../utils/theme.js';
import { api } from '../utils/api.js';
import { toast } from '../components/toast/toast.js';
import { modal } from '../components/modal/modal.js';
import { loader } from '../components/loader/loader.js';
import { initNavbar, navbar } from '../components/navbar/navbar.js';
import { initSidebar, sidebar } from '../components/sidebar/sidebar.js';
import { initToast } from '../components/toast/toast.js';
import { initModal } from '../components/modal/modal.js';
import { initLoader } from '../components/loader/loader.js';
import { initCards } from '../components/cards/cards.js';
import { initTimeline } from '../components/timeline/timeline.js';
import { initCalendar } from '../components/calendar/calendar.js';
import { initKanban } from '../components/kanban/kanban.js';
import { initCharts } from '../components/charts/charts.js';
import { initSearch } from '../components/search/search.js';

// ============================================
//  1.  حالة التطبيق العامة (App State)
// ============================================

const AppState = {
    user: null,
    isAuthenticated: false,
    isInitialized: false,
    isOnline: navigator.onLine,
    theme: getCurrentTheme(),
    language: 'ar',
    notifications: [],
    unreadCount: 0,
    settings: {},
    isLoading: false,
    error: null,
};

// ============================================
//  2.  مستمعو الأحداث (Event Listeners)
// ============================================

/**
 * تهيئة مستمعي الأحداث العامة
 */
function initEventListeners() {
    // حالة الاتصال بالإنترنت
    window.addEventListener('online', () => {
        AppState.isOnline = true;
        toast.success('تم استعادة الاتصال بالإنترنت');
        // مزامنة قائمة الانتظار غير المتصلة
        api.syncOfflineQueue().then(result => {
            if (result.synced > 0) {
                toast.success(`تمت مزامنة ${result.synced} عملية أثناء عدم الاتصال`);
            }
        }).catch(error => {
            console.warn('Sync error:', error);
        });
    });

    window.addEventListener('offline', () => {
        AppState.isOnline = false;
        toast.warning('انقطع الاتصال بالإنترنت. سيتم حفظ التغييرات محلياً.');
    });

    // تغيير الثيم
    document.addEventListener('themeChanged', (e) => {
        AppState.theme = e.detail.actualTheme;
        // تحديث أي مكونات تحتاج إلى معرفة تغيير الثيم
        console.log('Theme changed:', e.detail);
    });

    // أحداث التوجيه
    const router = getRouter();
    router.on('routeLoaded', (data) => {
        // تحديث القائمة الجانبية
        sidebar.setActive(data.route?.path || getCurrentRoute());
        // إغلاق القوائم المفتوحة
        // يمكن إضافة منطق إضافي هنا
    });

    router.on('routeChange', (data) => {
        // إغلاق أي مودالات مفتوحة
        modal.closeAll(true);
        // إخفاء أي مؤشرات تحميل
        loader.hideAll(true);
    });

    // أحداث لوحة المفاتيح العامة
    document.addEventListener('keydown', (e) => {
        // Ctrl+Shift+L لتسجيل الخروج السريع (للمطورين)
        if (e.ctrlKey && e.shiftKey && e.key === 'L') {
            e.preventDefault();
            if (AppState.isAuthenticated) {
                handleLogout();
            }
        }
    });

    // منع إعادة تحميل الصفحة عند النقر على روابط # 
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href^="#"]');
        if (link && link.getAttribute('href') !== '#') {
            e.preventDefault();
            const path = link.getAttribute('href').replace('#', '');
            if (path) {
                navigateTo(path);
            }
        }
    });
}

// ============================================
//  3.  دوال المصادقة (Authentication)
// ============================================

/**
 * التحقق من المصادقة عند بدء التطبيق
 */
async function checkAuthentication() {
    const token = api.getAuthToken();
    if (!token) {
        AppState.isAuthenticated = false;
        AppState.user = null;
        return false;
    }

    try {
        const response = await api.auth.verify();
        if (response.valid && response.user) {
            AppState.isAuthenticated = true;
            AppState.user = response.user;
            setItem(STORAGE_KEYS.USER_DATA, response.user);
            return true;
        } else {
            // الرمز غير صالح
            api.setAuthToken(null);
            AppState.isAuthenticated = false;
            AppState.user = null;
            return false;
        }
    } catch (error) {
        console.warn('Auth verification failed:', error);
        // محاولة تجديد الرمز
        try {
            const refreshResult = await api.auth.refresh();
            if (refreshResult.success) {
                const user = getItem(STORAGE_KEYS.USER_DATA);
                if (user) {
                    AppState.isAuthenticated = true;
                    AppState.user = user;
                    return true;
                }
            }
        } catch (refreshError) {
            console.warn('Refresh failed:', refreshError);
        }

        api.setAuthToken(null);
        AppState.isAuthenticated = false;
        AppState.user = null;
        return false;
    }
}

/**
 * تسجيل الدخول
 */
async function handleLogin(email, password) {
    AppState.isLoading = true;
    showGlobalLoader('جاري تسجيل الدخول...');

    try {
        const result = await api.auth.login(email, password);
        if (result.success) {
            AppState.isAuthenticated = true;
            AppState.user = result.user;
            toast.success('تم تسجيل الدخول بنجاح');
            // تحديث مكونات الواجهة
            navbar.setUser(result.user);
            sidebar.updateMenuForRole(result.user.role);
            // التوجيه إلى لوحة التحكم
            navigateTo('/dashboard');
            return { success: true };
        } else {
            toast.error(result.message || 'فشل تسجيل الدخول');
            return { success: false, message: result.message };
        }
    } catch (error) {
        toast.error(error.message || 'حدث خطأ أثناء تسجيل الدخول');
        return { success: false, message: error.message };
    } finally {
        AppState.isLoading = false;
        hideGlobalLoader();
    }
}

/**
 * تسجيل الخروج
 */
async function handleLogout() {
    // تأكيد تسجيل الخروج
    const confirmed = await modal.confirm('هل أنت متأكد من تسجيل الخروج؟', {
        title: 'تسجيل الخروج',
    });

    if (!confirmed) return;

    AppState.isLoading = true;
    showGlobalLoader('جاري تسجيل الخروج...');

    try {
        await api.auth.logout();
        AppState.isAuthenticated = false;
        AppState.user = null;
        toast.success('تم تسجيل الخروج بنجاح');
        // تنظيف البيانات
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER_DATA);
        // التوجيه إلى صفحة تسجيل الدخول
        navigateTo('/login');
    } catch (error) {
        console.warn('Logout error:', error);
        // حتى في حالة الخطأ، نقوم بتنظيف الجلسة محلياً
        AppState.isAuthenticated = false;
        AppState.user = null;
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER_DATA);
        navigateTo('/login');
    } finally {
        AppState.isLoading = false;
        hideGlobalLoader();
    }
}

// ============================================
//  4.  دوال التحميل (Loaders)
// ============================================

let globalLoaderId = null;

/**
 * عرض مؤشر تحميل عام
 */
function showGlobalLoader(message = 'جاري التحميل...') {
    globalLoaderId = loader.global(message, {
        size: 'lg',
        overlay: true,
    });
}

/**
 * إخفاء مؤشر التحميل العام
 */
function hideGlobalLoader() {
    if (globalLoaderId) {
        loader.hide(globalLoaderId);
        globalLoaderId = null;
    }
}

// ============================================
//  5.  تهيئة المكونات (Components Initialization)
// ============================================

/**
 * تهيئة جميع مكونات التطبيق
 */
async function initComponents() {
    try {
        // تهيئة المكونات الأساسية
        initToast();
        initModal();
        initLoader();
        initCards();
        initTimeline();
        initCalendar();
        initKanban();
        initCharts();
        initSearch();

        // تهيئة الشريط العلوي والقائمة الجانبية
        await initNavbar();
        await initSidebar();

        // تحديث المكونات بناءً على حالة المصادقة
        if (AppState.isAuthenticated && AppState.user) {
            navbar.setUser(AppState.user);
            sidebar.updateMenuForRole(AppState.user.role);
        }

        console.log('All components initialized successfully');
    } catch (error) {
        console.error('Failed to initialize components:', error);
        toast.error('حدث خطأ أثناء تهيئة التطبيق');
    }
}

// ============================================
//  6.  توجيه الصفحات (Routing)
// ============================================

/**
 * إعداد التوجيه وحماية المسارات
 */
function setupRouting() {
    const router = getRouter();

    // إضافة حماية للمسارات
    const originalResolve = router.resolveRoute.bind(router);
    router.resolveRoute = function(hash) {
        // إذا لم يكن المستخدم مصادقاً والمسار ليس عاماً
        const path = hash.replace(/^#/, '') || '/dashboard';
        const route = this.findRoute(path);

        // الصفحات العامة (لا تحتاج مصادقة)
        const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password'];
        const isPublic = route?.public || publicPaths.some(p => path.startsWith(p));

        if (!AppState.isAuthenticated && !isPublic) {
            // إعادة توجيه إلى صفحة تسجيل الدخول
            navigateTo('/login');
            return;
        }

        if (AppState.isAuthenticated && isPublic) {
            // إذا كان المستخدم مصادقاً ويحاول الوصول إلى صفحة عامة
            navigateTo('/dashboard');
            return;
        }

        // تنفيذ التوجيه الأصلي
        originalResolve(hash);
    };

    // تعيين التوجيه الافتراضي
    router.defaultRoute = '/dashboard';
    router.notFoundRoute = '/404';

    console.log('Routing configured successfully');
}

// ============================================
//  7.  تحميل الإعدادات (Settings)
// ============================================

/**
 * تحميل إعدادات التطبيق من الخادم أو التخزين المحلي
 */
async function loadSettings() {
    try {
        // محاولة تحميل الإعدادات من الخادم
        const response = await api.settings.getAll();
        if (response.success && response.data) {
            AppState.settings = response.data;
            // تطبيق الإعدادات
            applySettings(response.data);
        } else {
            // استخدام الإعدادات المخزنة محلياً
            const localSettings = getItem('erp_settings');
            if (localSettings) {
                AppState.settings = localSettings;
                applySettings(localSettings);
            }
        }
    } catch (error) {
        console.warn('Failed to load settings:', error);
        // استخدام الإعدادات المخزنة محلياً
        const localSettings = getItem('erp_settings');
        if (localSettings) {
            AppState.settings = localSettings;
            applySettings(localSettings);
        }
    }
}

/**
 * تطبيق الإعدادات على التطبيق
 */
function applySettings(settings) {
    if (!settings) return;

    // تطبيق الثيم
    if (settings.theme) {
        const { setTheme } = require('../utils/theme.js');
        setTheme(settings.theme);
    }

    // تطبيق اللغة
    if (settings.language) {
        AppState.language = settings.language;
        // يمكن إضافة منطق لتغيير اللغة هنا
    }

    // تطبيق إعدادات الإشعارات
    if (settings.notifications_enabled !== undefined) {
        // تفعيل/تعطيل الإشعارات
    }

    console.log('Settings applied successfully');
}

// ============================================
//  8.  الوظيفة الرئيسية (Main Function)
// ============================================

/**
 * الوظيفة الرئيسية لبدء التطبيق
 */
export async function initApp() {
    try {
        console.log('🚀 Starting ERP + CRM Application...');

        // 1. تهيئة الثيم
        initTheme();

        // 2. تهيئة المستمعات العامة
        initEventListeners();

        // 3. تهيئة المكونات
        await initComponents();

        // 4. التحقق من المصادقة
        const isAuthenticated = await checkAuthentication();

        // 5. إعداد التوجيه
        setupRouting();

        // 6. تحميل الإعدادات (إذا كان المستخدم مصادقاً)
        if (isAuthenticated) {
            await loadSettings();
            // تحديث واجهة المستخدم
            if (AppState.user) {
                navbar.setUser(AppState.user);
                sidebar.updateMenuForRole(AppState.user.role);
            }
        }

        // 7. معالجة التوجيه الأولي
        const initialHash = window.location.hash || '#/dashboard';
        const router = getRouter();
        router.resolveRoute(initialHash);

        // 8. تحديث حالة التطبيق
        AppState.isInitialized = true;

        // 9. مزامنة قائمة الانتظار غير المتصلة (إذا كان هناك اتصال)
        if (AppState.isOnline) {
            api.syncOfflineQueue().then(result => {
                if (result.synced > 0) {
                    toast.success(`تمت مزامنة ${result.synced} عملية`);
                }
            }).catch(error => {
                console.warn('Initial sync error:', error);
            });
        }

        console.log('✅ Application initialized successfully!');
        console.log(`   - User: ${AppState.user?.name || 'Guest'}`);
        console.log(`   - Theme: ${AppState.theme}`);
        console.log(`   - Online: ${AppState.isOnline}`);

        // إطلاق حدث تهيئة التطبيق
        const event = new CustomEvent('appReady', {
            detail: {
                user: AppState.user,
                theme: AppState.theme,
                isOnline: AppState.isOnline,
            },
        });
        document.dispatchEvent(event);

    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        toast.error('حدث خطأ أثناء تهيئة التطبيق. يرجى تحديث الصفحة.');
        // محاولة عرض واجهة بديلة
        showFallbackUI();
    }
}

/**
 * عرض واجهة بديلة في حالة فشل التهيئة
 */
function showFallbackUI() {
    const container = document.querySelector('#page-container');
    if (container) {
        container.innerHTML = `
            <div class="alert alert-danger" style="margin: var(--spacing-5);">
                <div class="alert-icon">⚠️</div>
                <div class="alert-content">
                    <div class="alert-title">تعذر تهيئة التطبيق</div>
                    <p>حدث خطأ أثناء تهيئة التطبيق. يرجى تحديث الصفحة أو الاتصال بالدعم.</p>
                    <button class="btn btn-primary" onclick="location.reload()" style="margin-top: var(--spacing-3);">
                        تحديث الصفحة
                    </button>
                </div>
            </div>
        `;
    }
}

// ============================================
//  9.  API عام للتطبيق
// ============================================

export const app = {
    state: AppState,
    init: initApp,
    login: handleLogin,
    logout: handleLogout,
    showLoader: showGlobalLoader,
    hideLoader: hideGlobalLoader,
    getSettings: () => ({ ...AppState.settings }),
    updateSettings: async (settings) => {
        try {
            const response = await api.settings.updateMany(settings);
            if (response.success) {
                AppState.settings = { ...AppState.settings, ...settings };
                setItem('erp_settings', AppState.settings);
                applySettings(settings);
                toast.success('تم تحديث الإعدادات بنجاح');
                return { success: true };
            }
            return { success: false, message: response.message };
        } catch (error) {
            toast.error('حدث خطأ أثناء تحديث الإعدادات');
            return { success: false, message: error.message };
        }
    },
};

// ============================================
//  10.  بدء التطبيق تلقائياً
// ============================================

// إذا تم تحميل الملف كـ script مباشر (غير module)
if (typeof window !== 'undefined' && !window._appStarted) {
    window._appStarted = true;
    // انتظار تحميل DOM بالكامل
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        // إذا كان DOM جاهزاً بالفعل
        setTimeout(initApp, 0);
    }
}

// تصدير initApp كدالة رئيسية
export default app;

// ============================================
//  11.  نهاية الملف
// ============================================
