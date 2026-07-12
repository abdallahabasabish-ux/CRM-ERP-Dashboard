/**
 * ======================================================
 * الملف: utils/theme.js
 * الوصف: إدارة السمات (الثيمات) في التطبيق
 *         يدعم الوضع الفاتح، الداكن، والتلقائي
 *         مع حفظ تفضيلات المستخدم وتطبيقها تلقائياً
 * الإصدار: 1.0.0
 * التاريخ: 2026-07-12
 * ======================================================
 */

import { getItem, setItem } from './storage.js';
import { STORAGE_KEYS } from './constants.js';
import { debounce } from './helpers.js';

// ============================================
//  1.  الثوابت
// ============================================

const THEMES = {
    LIGHT: 'light',
    DARK: 'dark',
    AUTO: 'auto',
};

const THEME_ATTRIBUTE = 'data-theme';
const THEME_CLASSES = {
    [THEMES.LIGHT]: 'light',
    [THEMES.DARK]: 'dark',
    [THEMES.AUTO]: '',
};

const DEFAULT_THEME = THEMES.AUTO;

// ============================================
//  2.  إدارة السمات
// ============================================

/**
 * الحصول على السمة الحالية من التخزين
 * @returns {string} السمة الحالية ('light', 'dark', 'auto')
 */
export function getStoredTheme() {
    const theme = getItem(STORAGE_KEYS.THEME_PREFERENCE);
    if (theme && Object.values(THEMES).includes(theme)) {
        return theme;
    }
    return DEFAULT_THEME;
}

/**
 * حفظ السمة في التخزين
 * @param {string} theme - السمة ('light', 'dark', 'auto')
 * @returns {boolean} نجاح العملية
 */
export function setStoredTheme(theme) {
    if (!Object.values(THEMES).includes(theme)) {
        console.warn(`Invalid theme: ${theme}`);
        return false;
    }
    return setItem(STORAGE_KEYS.THEME_PREFERENCE, theme);
}

/**
 * الحصول على السمة الفعلية المطبقة (بعد حل auto)
 * @returns {string} السمة الفعلية ('light' أو 'dark')
 */
export function getActualTheme() {
    const stored = getStoredTheme();
    if (stored === THEMES.AUTO) {
        return getSystemTheme();
    }
    return stored;
}

/**
 * الحصول على سمة النظام
 * @returns {string} 'light' أو 'dark'
 */
export function getSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return THEMES.DARK;
    }
    return THEMES.LIGHT;
}

/**
 * تطبيق السمة على الصفحة
 * @param {string} theme - السمة المطلوبة ('light', 'dark', 'auto')
 * @param {boolean} save - حفظ التفضيل (افتراضي: true)
 */
export function applyTheme(theme, save = true) {
    const actualTheme = theme === THEMES.AUTO ? getSystemTheme() : theme;

    // تطبيق السمة على عنصر html
    const html = document.documentElement;
    html.classList.remove('light', 'dark');

    if (theme === THEMES.AUTO) {
        // في الوضع التلقائي، نضيف الصنف بناءً على سمة النظام
        html.classList.add(actualTheme);
        // نضيف سمة البيانات لتحديد الوضع التلقائي
        html.setAttribute(THEME_ATTRIBUTE, THEMES.AUTO);
    } else {
        html.classList.add(theme);
        html.setAttribute(THEME_ATTRIBUTE, theme);
    }

    // تحديث متغيرات CSS للسمة
    document.documentElement.style.setProperty('--theme-mode', actualTheme);

    // تحديث لون شريط المتصفح (theme-color)
    updateThemeColor(actualTheme);

    // حفظ التفضيل
    if (save) {
        setStoredTheme(theme);
    }

    // إطلاق حدث تغيير السمة
    const event = new CustomEvent('themeChange', {
        detail: { theme, actualTheme },
    });
    document.dispatchEvent(event);

    return { theme, actualTheme };
}

/**
 * تحديث لون شريط المتصفح (theme-color)
 * @param {string} theme - السمة الفعلية ('light' أو 'dark')
 */
function updateThemeColor(theme) {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        const color = theme === THEMES.DARK ? '#1e1e1e' : '#ffffff';
        metaThemeColor.setAttribute('content', color);
    }
}

/**
 * تبديل السمة بين الفاتح والداكن (مع تجاهل الوضع التلقائي)
 * @returns {string} السمة الجديدة
 */
export function toggleTheme() {
    const current = getStoredTheme();
    let newTheme;

    if (current === THEMES.AUTO) {
        // إذا كان تلقائياً، ننتقل إلى السمة المعاكسة للنظام
        const system = getSystemTheme();
        newTheme = system === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
    } else {
        newTheme = current === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
    }

    applyTheme(newTheme);
    return newTheme;
}

/**
 * تعيين السمة إلى تلقائي
 */
export function setAutoTheme() {
    applyTheme(THEMES.AUTO);
    return THEMES.AUTO;
}

/**
 * تعيين السمة إلى فاتح
 */
export function setLightTheme() {
    applyTheme(THEMES.LIGHT);
    return THEMES.LIGHT;
}

/**
 * تعيين السمة إلى داكن
 */
export function setDarkTheme() {
    applyTheme(THEMES.DARK);
    return THEMES.DARK;
}

/**
 * مراقبة تغييرات سمة النظام والتحديث تلقائياً (في الوضع التلقائي)
 * @param {boolean} autoUpdate - تفعيل التحديث التلقائي (افتراضي: true)
 */
export function watchSystemTheme(autoUpdate = true) {
    if (!window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e) => {
        const stored = getStoredTheme();
        if (stored === THEMES.AUTO && autoUpdate) {
            const newTheme = e.matches ? THEMES.DARK : THEMES.LIGHT;
            applyTheme(THEMES.AUTO, false);
            // إطلاق حدث إضافي للتغيير التلقائي
            const event = new CustomEvent('systemThemeChange', {
                detail: { theme: newTheme },
            });
            document.dispatchEvent(event);
        }
    };

    // إزالة المستمع القديم إذا كان موجوداً
    if (window._systemThemeListener) {
        try {
            mediaQuery.removeEventListener('change', window._systemThemeListener);
        } catch (e) {
            // تجاهل
        }
    }

    window._systemThemeListener = handleChange;
    mediaQuery.addEventListener('change', handleChange);

    // تطبيق السمة الحالية إذا كانت تلقائية
    const stored = getStoredTheme();
    if (stored === THEMES.AUTO) {
        applyTheme(THEMES.AUTO, false);
    }
}

/**
 * تهيئة السمة عند تحميل التطبيق
 * @param {Object} options - خيارات التهيئة
 * @param {boolean} options.watchSystem - مراقبة تغييرات النظام (افتراضي: true)
 * @param {boolean} options.applyNow - تطبيق السمة فوراً (افتراضي: true)
 */
export function initTheme(options = {}) {
    const { watchSystem = true, applyNow = true } = options;

    const stored = getStoredTheme();

    if (applyNow) {
        applyTheme(stored, false);
    }

    if (watchSystem) {
        watchSystemTheme(true);
    }

    // إضافة مستمع للتغييرات اليدوية عبر localStorage (للمزامنة بين النوافذ)
    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEYS.THEME_PREFERENCE && e.newValue) {
            const newTheme = e.newValue;
            if (Object.values(THEMES).includes(newTheme)) {
                applyTheme(newTheme, false);
            }
        }
    });

    // إضافة مستمع للتغييرات على سمة النظام
    document.addEventListener('systemThemeChange', (e) => {
        // تحديث اللون فقط دون تغيير السمة المخزنة
        updateThemeColor(e.detail.theme);
    });

    console.log(`Theme initialized: ${stored} (actual: ${getActualTheme()})`);
}

// ============================================
//  3.  دوال مساعدة للواجهة
// ============================================

/**
 * الحصول على النص المناسب لعنصر تبديل السمة
 * @param {string} theme - السمة الحالية
 * @returns {string} النص المعروض
 */
export function getThemeToggleText(theme) {
    const actual = theme === THEMES.AUTO ? getSystemTheme() : theme;
    if (theme === THEMES.AUTO) {
        return `تلقائي (${actual === THEMES.LIGHT ? 'فاتح' : 'داكن'})`;
    }
    return actual === THEMES.LIGHT ? 'فاتح' : 'داكن';
}

/**
 * الحصول على أيقونة مناسبة للسمة الحالية
 * @param {string} theme - السمة الحالية
 * @returns {string} رمز الأيقونة (نصي)
 */
export function getThemeIcon(theme) {
    const actual = theme === THEMES.AUTO ? getSystemTheme() : theme;
    if (theme === THEMES.AUTO) {
        return '🌓';
    }
    return actual === THEMES.LIGHT ? '☀️' : '🌙';
}

/**
 * تحديث عناصر واجهة المستخدم المتعلقة بالسمة
 * @param {HTMLElement} toggleBtn - زر التبديل
 * @param {HTMLElement} toggleText - نص الزر (اختياري)
 */
export function updateThemeUI(toggleBtn, toggleText = null) {
    const current = getStoredTheme();
    const actual = getActualTheme();

    if (toggleBtn) {
        // تحديث أيقونة الزر
        const icon = toggleBtn.querySelector('.theme-icon');
        if (icon) {
            icon.textContent = getThemeIcon(current);
        }

        // تحديث title
        const title = current === THEMES.AUTO ? 'الوضع التلقائي' : (actual === THEMES.LIGHT ? 'الوضع الفاتح' : 'الوضع الليلي');
        toggleBtn.setAttribute('title', title);

        // إضافة الصنف النشط
        toggleBtn.classList.toggle('active', current !== THEMES.AUTO);
    }

    if (toggleText) {
        toggleText.textContent = getThemeToggleText(current);
    }
}

// ============================================
//  4.  تصدير الوظائف
// ============================================

export const theme = {
    THEMES,
    DEFAULT_THEME,

    getStoredTheme,
    setStoredTheme,
    getActualTheme,
    getSystemTheme,
    applyTheme,
    toggleTheme,
    setAutoTheme,
    setLightTheme,
    setDarkTheme,
    watchSystemTheme,
    initTheme,

    getThemeToggleText,
    getThemeIcon,
    updateThemeUI,
};

// تصدير افتراضي
export default theme;

// ============================================
//  5.  التهيئة التلقائية عند تحميل الملف
// ============================================

// تهيئة السمة تلقائياً عند تحميل الوحدة
// (سيتم استدعاؤها عند استيراد الملف)
if (typeof document !== 'undefined') {
    // انتظار تحميل DOM بالكامل
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initTheme();
        });
    } else {
        initTheme();
    }
}

// ============================================
//  6.  نهاية الملف
// ============================================
