/**
 * ======================================================
 * الملف: utils/theme.js
 * الوصف: إدارة الثيمات (الوضع الفاتح، الداكن، التلقائي)
 *         يشمل التبديل بين الثيمات، حفظ التفضيلات،
 *         الاستماع لتغييرات النظام، وتطبيق الثيم على الصفحة
 * الإصدار: 1.0.0
 * التاريخ: 2026-07-13
 * ======================================================
 */

import { getItem, setItem } from './storage.js';
import { STORAGE_KEYS } from './constants.js';

// ============================================
//  1.  الثوابت
// ============================================

const THEME = {
    LIGHT: 'light',
    DARK: 'dark',
    AUTO: 'auto',
};

const THEME_CLASSES = {
    [THEME.LIGHT]: 'light',
    [THEME.DARK]: 'dark',
    [THEME.AUTO]: '', // لا نضيف صنفاً عند استخدام التلقائي
};

const SYSTEM_THEME = {
    LIGHT: 'light',
    DARK: 'dark',
};

// ============================================
//  2.  دوال أساسية
// ============================================

/**
 * الحصول على ثيم النظام (من تفضيلات نظام التشغيل)
 * @returns {string} 'light' أو 'dark'
 */
export function getSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return SYSTEM_THEME.DARK;
    }
    return SYSTEM_THEME.LIGHT;
}

/**
 * الحصول على الثيم الحالي المخزن
 * @returns {string} 'light'، 'dark'، أو 'auto'
 */
export function getStoredTheme() {
    const theme = getItem(STORAGE_KEYS.THEME_PREFERENCE);
    if (theme && Object.values(THEME).includes(theme)) {
        return theme;
    }
    return THEME.AUTO;
}

/**
 * الحصول على الثيم الفعلي المطبق (بعد احتساب التلقائي)
 * @returns {string} 'light' أو 'dark'
 */
export function getCurrentTheme() {
    const stored = getStoredTheme();
    if (stored === THEME.AUTO) {
        return getSystemTheme();
    }
    return stored;
}

/**
 * تعيين الثيم وتطبيقه على الصفحة
 * @param {string} theme - 'light'، 'dark'، أو 'auto'
 * @param {boolean} save - حفظ التفضيل في localStorage (افتراضي: true)
 * @returns {string} الثيم الفعلي المطبق
 */
export function setTheme(theme, save = true) {
    if (!Object.values(THEME).includes(theme)) {
        console.warn(`Invalid theme: ${theme}. Using auto instead.`);
        theme = THEME.AUTO;
    }

    // حفظ التفضيل
    if (save) {
        setItem(STORAGE_KEYS.THEME_PREFERENCE, theme);
    }

    // تطبيق الثيم
    const htmlElement = document.documentElement;
    const actualTheme = theme === THEME.AUTO ? getSystemTheme() : theme;

    // إزالة جميع صنوف الثيمات
    Object.values(THEME_CLASSES).forEach(className => {
        if (className) {
            htmlElement.classList.remove(className);
        }
    });

    // إضافة الصنف المناسب
    if (theme === THEME.AUTO) {
        // في الوضع التلقائي، نطبق صنف النظام فقط
        if (actualTheme === THEME.DARK) {
            htmlElement.classList.add(THEME_CLASSES[THEME.DARK]);
        } else {
            htmlElement.classList.add(THEME_CLASSES[THEME.LIGHT]);
        }
        // نضيف صنفاً خاصاً للوضع التلقائي للاستخدام في CSS
        htmlElement.classList.add('auto-theme');
    } else {
        htmlElement.classList.add(THEME_CLASSES[theme]);
        htmlElement.classList.remove('auto-theme');
    }

    // تحديث لون شريط الحالة في الهواتف
    updateThemeColor(actualTheme);

    // إشعار بتغيير الثيم
    const event = new CustomEvent('themeChanged', {
        detail: {
            theme: theme,
            actualTheme: actualTheme,
        },
    });
    document.dispatchEvent(event);

    return actualTheme;
}

/**
 * تحديث لون شريط الحالة (meta theme-color)
 * @param {string} theme - 'light' أو 'dark'
 */
function updateThemeColor(theme) {
    const metaTag = document.querySelector('meta[name="theme-color"]');
    if (!metaTag) return;

    const colors = {
        [THEME.LIGHT]: '#ffffff',
        [THEME.DARK]: '#1e1e1e',
    };

    metaTag.content = colors[theme] || colors[THEME.LIGHT];
}

/**
 * تبديل الثيم (دوري: light -> dark -> auto)
 * @returns {string} الثيم الجديد
 */
export function toggleTheme() {
    const current = getStoredTheme();
    let next;

    switch (current) {
        case THEME.LIGHT:
            next = THEME.DARK;
            break;
        case THEME.DARK:
            next = THEME.AUTO;
            break;
        case THEME.AUTO:
        default:
            next = THEME.LIGHT;
            break;
    }

    setTheme(next);
    return next;
}

/**
 * تعيين الثيم الفاتح
 */
export function setLightTheme() {
    setTheme(THEME.LIGHT);
    return THEME.LIGHT;
}

/**
 * تعيين الثيم الداكن
 */
export function setDarkTheme() {
    setTheme(THEME.DARK);
    return THEME.DARK;
}

/**
 * تعيين الثيم التلقائي
 */
export function setAutoTheme() {
    setTheme(THEME.AUTO);
    return THEME.AUTO;
}

/**
 * تهيئة الثيم عند تحميل الصفحة
 * @param {string} defaultTheme - الثيم الافتراضي (اختياري)
 */
export function initTheme(defaultTheme = THEME.AUTO) {
    // التحقق من وجود تفضيل محفوظ
    let stored = getStoredTheme();

    // إذا لم يكن هناك تفضيل، استخدم الافتراضي
    if (!stored) {
        stored = defaultTheme;
    }

    // تطبيق الثيم
    setTheme(stored, true);

    // الاستماع لتغييرات تفضيلات النظام
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (e) => {
        const current = getStoredTheme();
        if (current === THEME.AUTO) {
            // إعادة تطبيق الثيم التلقائي
            setTheme(THEME.AUTO, false);
        }
    };

    // إضافة مستمع للتغييرات (مع التوافق مع المتصفحات القديمة)
    if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleSystemChange);
    } else if (mediaQuery.addListener) {
        mediaQuery.addListener(handleSystemChange);
    }

    // تخزين مرجع المستمع لاستخدامه في التنظيف
    window._themeMediaListener = handleSystemChange;

    console.log(`Theme initialized: ${getCurrentTheme()} (stored: ${stored})`);
}

/**
 * تنظيف مستمعي الثيم
 */
export function cleanupTheme() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = window._themeMediaListener;
    if (listener) {
        if (mediaQuery.removeEventListener) {
            mediaQuery.removeEventListener('change', listener);
        } else if (mediaQuery.removeListener) {
            mediaQuery.removeListener(listener);
        }
        delete window._themeMediaListener;
    }
}

/**
 * الحصول على تسمية الثيم الحالية (للعرض في الواجهة)
 * @param {string} theme - الثيم (اختياري، إذا لم يحدد يستخدم الثيم المخزن)
 * @returns {string} التسمية
 */
export function getThemeLabel(theme = null) {
    const current = theme || getStoredTheme();
    const labels = {
        [THEME.LIGHT]: 'فاتح',
        [THEME.DARK]: 'داكن',
        [THEME.AUTO]: 'تلقائي',
    };
    return labels[current] || 'تلقائي';
}

/**
 * الحصول على أيقونة الثيم الحالية
 * @param {string} theme - الثيم (اختياري، إذا لم يحدد يستخدم الثيم المخزن)
 * @returns {string} الأيقونة (رمز إيموجي)
 */
export function getThemeIcon(theme = null) {
    const current = theme || getStoredTheme();
    const icons = {
        [THEME.LIGHT]: '☀️',
        [THEME.DARK]: '🌙',
        [THEME.AUTO]: '🔄',
    };
    return icons[current] || '🔄';
}

/**
 * التحقق من أن الثيم الحالي هو داكن
 * @returns {boolean}
 */
export function isDarkMode() {
    return getCurrentTheme() === THEME.DARK;
}

/**
 * التحقق من أن الثيم الحالي هو فاتح
 * @returns {boolean}
 */
export function isLightMode() {
    return getCurrentTheme() === THEME.LIGHT;
}

/**
 * التحقق من أن الثيم الحالي هو تلقائي
 * @returns {boolean}
 */
export function isAutoMode() {
    return getStoredTheme() === THEME.AUTO;
}

// ============================================
//  3.  تصدير API
// ============================================

export const theme = {
    // الثوابت
    THEME,
    SYSTEM_THEME,

    // دوال أساسية
    getSystemTheme,
    getStoredTheme,
    getCurrentTheme,
    setTheme,
    toggleTheme,
    setLightTheme,
    setDarkTheme,
    setAutoTheme,
    initTheme,
    cleanupTheme,

    // دوال مساعدة
    getThemeLabel,
    getThemeIcon,
    isDarkMode,
    isLightMode,
    isAutoMode,
};

// تصدير افتراضي
export default theme;

// ============================================
//  4.  تهيئة تلقائية (إذا تم تحميل الملف مباشرة)
// ============================================

// في حالة استخدام الملف كـ module، سيتم استدعاء init من app.js
// لكن نضيف دالة تهيئة يمكن استدعاؤها من الخارج

// ============================================
//  5.  نهاية الملف
// ============================================
