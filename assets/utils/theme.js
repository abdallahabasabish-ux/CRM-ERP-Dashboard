/**
 * ======================================================
 * الملف: utils/theme.js
 * الوصف: إدارة السمات (الثيمات) للتطبيق
 *         يدعم الوضع الفاتح، الداكن، والتلقائي
 *         مع حفظ التفضيلات في LocalStorage
 * الإصدار: 1.0.0
 * التاريخ: 2026-07-12
 * ======================================================
 */

import { getItem, setItem } from './storage.js';
import { STORAGE_KEYS } from './constants.js';

// ============================================
//  1.  الثوابت
// ============================================

const THEMES = {
    LIGHT: 'light',
    DARK: 'dark',
    AUTO: 'auto',
};

const THEME_ATTRIBUTE = 'data-theme';
const DARK_CLASS = 'dark';
const LIGHT_CLASS = 'light';

// ============================================
//  2.  حالة السمة الحالية
// ============================================

let currentTheme = THEMES.AUTO;
let currentMode = THEMES.LIGHT; // الوضع الفعلي (light أو dark)
let listeners = [];
let isInitialized = false;

// ============================================
//  3.  الدوال الأساسية
// ============================================

/**
 * الحصول على السمة المفضلة من التخزين المحلي
 * @returns {string} السمة المفضلة ('light', 'dark', 'auto')
 */
function getStoredTheme() {
    return getItem(STORAGE_KEYS.THEME_PREFERENCE, THEMES.AUTO);
}

/**
 * حفظ السمة المفضلة في التخزين المحلي
 * @param {string} theme - السمة ('light', 'dark', 'auto')
 */
function storeTheme(theme) {
    setItem(STORAGE_KEYS.THEME_PREFERENCE, theme);
}

/**
 * التحقق من تفضيل النظام (الوضع الداكن)
 * @returns {boolean} true إذا كان النظام في الوضع الداكن
 */
function getSystemPreference() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * تحديد الوضع الفعلي بناءً على السمة المختارة
 * @param {string} theme - السمة ('light', 'dark', 'auto')
 * @returns {string} الوضع الفعلي ('light' أو 'dark')
 */
function resolveMode(theme) {
    if (theme === THEMES.AUTO) {
        return getSystemPreference() ? THEMES.DARK : THEMES.LIGHT;
    }
    return theme;
}

/**
 * تطبيق السمة على عنصر HTML
 * @param {string} mode - الوضع الفعلي ('light' أو 'dark')
 */
function applyTheme(mode) {
    const html = document.documentElement;

    // إزالة جميع أصناف السمات
    html.classList.remove(DARK_CLASS, LIGHT_CLASS);

    // إضافة الصنف المناسب
    if (mode === THEMES.DARK) {
        html.classList.add(DARK_CLASS);
        html.setAttribute(THEME_ATTRIBUTE, THEMES.DARK);
    } else {
        html.classList.add(LIGHT_CLASS);
        html.setAttribute(THEME_ATTRIBUTE, THEMES.LIGHT);
    }

    // تحديث لون شريط الحالة في المتصفحات المحمولة
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        const color = mode === THEMES.DARK ? '#1e1e1e' : '#ffffff';
        metaThemeColor.setAttribute('content', color);
    }

    // تحديث المتغيرات العامة
    currentMode = mode;
}

/**
 * تهيئة مدير السمات
 */
export function initTheme() {
    if (isInitialized) return;

    // استرجاع السمة المخزنة
    const storedTheme = getStoredTheme();
    currentTheme = storedTheme;

    // تطبيق السمة
    const mode = resolveMode(currentTheme);
    applyTheme(mode);

    // الاستماع لتغييرات تفضيل النظام
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
        if (currentTheme === THEMES.AUTO) {
            const newMode = e.matches ? THEMES.DARK : THEMES.LIGHT;
            applyTheme(newMode);
            notifyListeners(currentTheme, newMode);
        }
    });

    isInitialized = true;
}

/**
 * الحصول على السمة الحالية
 * @returns {string} السمة الحالية ('light', 'dark', 'auto')
 */
export function getTheme() {
    return currentTheme;
}

/**
 * الحصول على الوضع الفعلي الحالي
 * @returns {string} الوضع الفعلي ('light' أو 'dark')
 */
export function getCurrentMode() {
    return currentMode;
}

/**
 * تعيين سمة جديدة
 * @param {string} theme - السمة ('light', 'dark', 'auto')
 */
export function setTheme(theme) {
    if (!Object.values(THEMES).includes(theme)) {
        console.warn(`Invalid theme: ${theme}. Using auto.`);
        theme = THEMES.AUTO;
    }

    currentTheme = theme;
    storeTheme(theme);

    const mode = resolveMode(theme);
    applyTheme(mode);

    notifyListeners(theme, mode);
}

/**
 * تبديل الوضع (بين الفاتح والداكن)
 * @returns {string} السمة الجديدة
 */
export function toggleTheme() {
    let newTheme;
    if (currentTheme === THEMES.LIGHT) {
        newTheme = THEMES.DARK;
    } else if (currentTheme === THEMES.DARK) {
        newTheme = THEMES.LIGHT;
    } else {
        // إذا كان auto، ننتقل إلى الوضع المعاكس للوضع الحالي
        newTheme = currentMode === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
    }
    setTheme(newTheme);
    return newTheme;
}

/**
 * التحقق مما إذا كان الوضع الداكن مفعلاً
 * @returns {boolean} true إذا كان الوضع الداكن
 */
export function isDarkMode() {
    return currentMode === THEMES.DARK;
}

/**
 * التحقق مما إذا كان الوضع الفاتح مفعلاً
 * @returns {boolean} true إذا كان الوضع الفاتح
 */
export function isLightMode() {
    return currentMode === THEMES.LIGHT;
}

/**
 * التحقق مما إذا كانت السمة تلقائية
 * @returns {boolean} true إذا كانت تلقائية
 */
export function isAutoMode() {
    return currentTheme === THEMES.AUTO;
}

/**
 * الحصول على اسم السمة الحالية (للعرض)
 * @returns {string} اسم السمة
 */
export function getThemeLabel() {
    const labels = {
        [THEMES.LIGHT]: 'فاتح',
        [THEMES.DARK]: 'داكن',
        [THEMES.AUTO]: 'تلقائي',
    };
    return labels[currentTheme] || 'تلقائي';
}

/**
 * الحصول على اسم الوضع الحالي (للعرض)
 * @returns {string} اسم الوضع
 */
export function getModeLabel() {
    const labels = {
        [THEMES.LIGHT]: 'الوضع الفاتح',
        [THEMES.DARK]: 'الوضع الداكن',
    };
    return labels[currentMode] || 'الوضع الفاتح';
}

/**
 * الحصول على أيقونة السمة الحالية
 * @returns {string} رمز SVG أو اسم الأيقونة
 */
export function getThemeIcon() {
    if (currentTheme === THEMES.AUTO) {
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>`;
    }
    if (currentTheme === THEMES.DARK) {
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>`;
    }
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/>
        <line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>`;
}

// ============================================
//  4.  نظام الإشعارات (Listeners)
// ============================================

/**
 * إضافة مستمع لتغييرات السمة
 * @param {Function} callback - دالة تستقبل (theme, mode)
 */
export function onThemeChange(callback) {
    if (typeof callback === 'function') {
        listeners.push(callback);
    }
}

/**
 * إزالة مستمع
 * @param {Function} callback - الدالة المراد إزالتها
 */
export function offThemeChange(callback) {
    listeners = listeners.filter(fn => fn !== callback);
}

/**
 * إشعار المستمعين بتغيير السمة
 * @param {string} theme - السمة الجديدة
 * @param {string} mode - الوضع الفعلي الجديد
 */
function notifyListeners(theme, mode) {
    listeners.forEach(fn => {
        try {
            fn(theme, mode);
        } catch (error) {
            console.error('Error in theme change listener:', error);
        }
    });
}

// ============================================
//  5.  دوال مساعدة للواجهة
// ============================================

/**
 * إنشاء زر تبديل السمة (مع أيقونة ديناميكية)
 * @param {Object} options - خيارات الزر
 * @returns {HTMLButtonElement} زر التبديل
 */
export function createThemeToggleButton(options = {}) {
    const { showLabel = true, className = 'theme-toggle' } = options;

    const button = document.createElement('button');
    button.className = `btn btn-secondary btn-icon ${className}`;
    button.setAttribute('aria-label', 'تبديل السمة');
    button.innerHTML = `
        <span class="theme-icon">${getThemeIcon()}</span>
        ${showLabel ? `<span class="theme-label">${getThemeLabel()}</span>` : ''}
    `;

    button.addEventListener('click', () => {
        const newTheme = toggleTheme();
        // تحديث الزر
        const icon = button.querySelector('.theme-icon');
        const label = button.querySelector('.theme-label');
        if (icon) icon.innerHTML = getThemeIcon();
        if (label) label.textContent = getThemeLabel();
    });

    // تحديث الزر عند تغيير السمة من مكان آخر
    onThemeChange((theme, mode) => {
        const icon = button.querySelector('.theme-icon');
        const label = button.querySelector('.theme-label');
        if (icon) icon.innerHTML = getThemeIcon();
        if (label) label.textContent = getThemeLabel();
    });

    return button;
}

/**
 * إنشاء قائمة خيارات السمة (مع ثلاث خيارات)
 * @param {Object} options - خيارات القائمة
 * @returns {HTMLDivElement} عنصر القائمة
 */
export function createThemeOptions(options = {}) {
    const { className = 'theme-options' } = options;

    const container = document.createElement('div');
    container.className = className;

    const themes = [
        { value: THEMES.LIGHT, label: 'فاتح', icon: '☀️' },
        { value: THEMES.DARK, label: 'داكن', icon: '🌙' },
        { value: THEMES.AUTO, label: 'تلقائي', icon: '🔄' },
    ];

    themes.forEach(({ value, label, icon }) => {
        const option = document.createElement('button');
        option.className = `theme-option ${currentTheme === value ? 'active' : ''}`;
        option.innerHTML = `
            <span class="theme-option-icon">${icon}</span>
            <span class="theme-option-label">${label}</span>
            ${currentTheme === value ? '<span class="theme-option-check">✓</span>' : ''}
        `;
        option.addEventListener('click', () => {
            setTheme(value);
            // تحديث الحالة النشطة
            container.querySelectorAll('.theme-option').forEach(el => el.classList.remove('active'));
            option.classList.add('active');
            // تحديث علامة الاختيار
            container.querySelectorAll('.theme-option-check').forEach(el => el.remove());
            option.querySelector('.theme-option-label').insertAdjacentHTML('afterend', '<span class="theme-option-check">✓</span>');
        });
        container.appendChild(option);
    });

    // تحديث عند تغيير السمة من مكان آخر
    onThemeChange((theme) => {
        container.querySelectorAll('.theme-option').forEach(el => {
            el.classList.toggle('active', el.dataset.theme === theme);
        });
    });

    return container;
}

/**
 * الحصول على ألوان السمة الحالية (للاستخدام في الرسوم البيانية أو المكونات)
 * @returns {Object} كائن يحتوي على الألوان الأساسية
 */
export function getThemeColors() {
    const isDark = isDarkMode();
    return {
        background: isDark ? '#1e1e1e' : '#ffffff',
        card: isDark ? '#2a2a2a' : '#ffffff',
        text: isDark ? '#e8e8e8' : '#1a1a1a',
        textSecondary: isDark ? '#a0a0a0' : '#6b6b6b',
        border: isDark ? '#3a3a3a' : '#e0e0e0',
        primary: isDark ? '#4a8cf7' : '#2d7ff9',
        success: isDark ? '#4caf8a' : '#36b37e',
        warning: isDark ? '#f5b82e' : '#ffab00',
        danger: isDark ? '#f55a4a' : '#ff5630',
        shadow: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.08)',
    };
}

// ============================================
//  6.  التصدير
// ============================================

export const theme = {
    THEMES,
    init: initTheme,
    getTheme,
    getCurrentMode,
    setTheme,
    toggleTheme,
    isDarkMode,
    isLightMode,
    isAutoMode,
    getThemeLabel,
    getModeLabel,
    getThemeIcon,
    onThemeChange,
    offThemeChange,
    createThemeToggleButton,
    createThemeOptions,
    getThemeColors,
};

// تصدير افتراضي
export default theme;

// ============================================
//  7.  تهيئة تلقائية (اختياري)
// ============================================

// إذا تم تحميل هذا الملف كـ ES Module، يمكن تهيئة السمة تلقائياً
// ولكن الأفضل أن يتم استدعاؤها من التطبيق الرئيسي
// initTheme();

// ============================================
//  8.  نهاية الملف
// ============================================
