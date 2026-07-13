/**
 * ======================================================
 * الملف: components/toast/toast.js
 * الوصف: مكون الإشعارات المنبثقة (Toast)
 *         يدير عرض الإشعارات بأنواع مختلفة (نجاح، خطأ،
 *         تحذير، معلومات)، مع إزالة تلقائية، ودعم الأيقونات،
 *         وتخصيص المدة والموقع
 * الإصدار: 1.0.0
 * التاريخ: 2026-07-12
 * ======================================================
 */

import { createElement, removeElement, addClass, removeClass } from '../../utils/helpers.js';

// ============================================
//  1.  الثوابت والإعدادات الافتراضية
// ============================================

const DEFAULT_DURATION = 4000; // 4 ثوانٍ
const DEFAULT_POSITION = 'bottom-right';
const MAX_TOASTS = 5;

const ICONS = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
};

const COLORS = {
    success: 'var(--color-success)',
    error: 'var(--color-danger)',
    warning: 'var(--color-warning)',
    info: 'var(--color-info)',
};

// ============================================
//  2.  حالة المكون (State)
// ============================================

let toastContainer = null;
let activeToasts = [];
let toastIdCounter = 0;
let isInitialized = false;

// ============================================
//  3.  دوال التهيئة
// ============================================

/**
 * تهيئة حاوية الإشعارات
 */
function initContainer() {
    if (isInitialized && toastContainer) return;

    // البحث عن حاوية موجودة
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    toastContainer = container;
    isInitialized = true;
}

/**
 * الحصول على حاوية الإشعارات
 * @returns {HTMLElement} حاوية الإشعارات
 */
function getContainer() {
    if (!isInitialized || !toastContainer) {
        initContainer();
    }
    return toastContainer;
}

// ============================================
//  4.  دوال إنشاء وإدارة الإشعارات
// ============================================

/**
 * إنشاء عنصر الإشعار
 * @param {Object} options - خيارات الإشعار
 * @returns {HTMLElement} عنصر الإشعار
 */
function createToastElement(options) {
    const {
        id,
        message,
        type = 'info',
        duration = DEFAULT_DURATION,
        icon = null,
        title = null,
        actions = null,
        onClose = null,
        onClick = null,
    } = options;

    // تحديد الأيقونة
    const toastIcon = icon || ICONS[type] || ICONS.info;

    // إنشاء العنصر
    const toast = createElement('div', {
        className: `toast toast-${type}`,
        id: `toast-${id}`,
        role: 'alert',
        'aria-live': 'polite',
    });

    // الأيقونة
    const iconEl = createElement('span', {
        className: 'toast-icon',
        textContent: toastIcon,
    });
    toast.appendChild(iconEl);

    // المحتوى
    const contentEl = createElement('div', {
        className: 'toast-content',
    });

    // العنوان (اختياري)
    if (title) {
        const titleEl = createElement('div', {
            className: 'toast-title',
            textContent: title,
        });
        contentEl.appendChild(titleEl);
    }

    // الرسالة
    const messageEl = createElement('div', {
        className: 'toast-message',
        textContent: message,
    });
    contentEl.appendChild(messageEl);

    toast.appendChild(contentEl);

    // الأزرار (اختياري)
    if (actions && Array.isArray(actions) && actions.length > 0) {
        const actionsEl = createElement('div', {
            className: 'toast-actions',
        });
        actions.forEach(action => {
            const btn = createElement('button', {
                className: `btn btn-sm ${action.className || 'btn-secondary'}`,
                textContent: action.label,
                onClick: (e) => {
                    e.stopPropagation();
                    if (action.handler) {
                        action.handler();
                    }
                    if (action.closeOnClick !== false) {
                        closeToast(id);
                    }
                },
            });
            actionsEl.appendChild(btn);
        });
        toast.appendChild(actionsEl);
    }

    // زر الإغلاق
    const closeBtn = createElement('button', {
        className: 'toast-close',
        textContent: '✕',
        'aria-label': 'إغلاق الإشعار',
        onClick: (e) => {
            e.stopPropagation();
            if (onClose) {
                onClose();
            }
            closeToast(id);
        },
    });
    toast.appendChild(closeBtn);

    // مستمع النقر على الإشعار
    if (onClick) {
        toast.addEventListener('click', (e) => {
            if (e.target.closest('.toast-close') || e.target.closest('.toast-actions')) {
                return;
            }
            onClick();
        });
        toast.style.cursor = 'pointer';
    }

    return toast;
}

/**
 * عرض إشعار جديد
 * @param {Object} options - خيارات الإشعار
 * @returns {number} معرف الإشعار
 */
export function showToast(options) {
    // تهيئة الحاوية إذا لم تكن موجودة
    const container = getContainer();

    // إنشاء معرف فريد
    const id = ++toastIdCounter;

    // إعداد الخيارات
    const toastOptions = {
        id,
        message: options.message || 'إشعار',
        type: options.type || 'info',
        duration: options.duration !== undefined ? options.duration : DEFAULT_DURATION,
        icon: options.icon || null,
        title: options.title || null,
        actions: options.actions || null,
        onClose: options.onClose || null,
        onClick: options.onClick || null,
    };

    // إنشاء عنصر الإشعار
    const toastEl = createToastElement(toastOptions);

    // إضافة إلى الحاوية
    container.appendChild(toastEl);

    // إضافة إلى القائمة النشطة
    activeToasts.push(id);

    // تطبيق الرسوم المتحركة
    setTimeout(() => {
        addClass(toastEl, 'show');
    }, 10);

    // إزالة تلقائية بعد المدة
    if (toastOptions.duration > 0) {
        const timeoutId = setTimeout(() => {
            closeToast(id);
        }, toastOptions.duration);
        // تخزين timeoutId في العنصر لإمكانية إلغائه
        toastEl.dataset.timeoutId = timeoutId;
    }

    // إدارة الحد الأقصى للإشعارات
    manageToastLimit();

    return id;
}

/**
 * إغلاق إشعار معين
 * @param {number} id - معرف الإشعار
 * @param {boolean} immediate - إغلاق فوري دون رسوم متحركة
 */
export function closeToast(id, immediate = false) {
    const toastEl = document.getElementById(`toast-${id}`);
    if (!toastEl) return;

    // إلغاء المؤقت التلقائي
    if (toastEl.dataset.timeoutId) {
        clearTimeout(parseInt(toastEl.dataset.timeoutId));
        delete toastEl.dataset.timeoutId;
    }

    if (immediate) {
        // إزالة فورية
        removeElement(toastEl);
        activeToasts = activeToasts.filter(tid => tid !== id);
    } else {
        // إزالة مع رسوم متحركة
        removeClass(toastEl, 'show');
        setTimeout(() => {
            removeElement(toastEl);
            activeToasts = activeToasts.filter(tid => tid !== id);
        }, 300);
    }
}

/**
 * إغلاق جميع الإشعارات
 * @param {boolean} immediate - إغلاق فوري
 */
export function closeAllToasts(immediate = false) {
    const ids = [...activeToasts];
    ids.forEach(id => {
        closeToast(id, immediate);
    });
}

/**
 * إدارة الحد الأقصى للإشعارات (إزالة الأقدم عند تجاوز الحد)
 */
function manageToastLimit() {
    while (activeToasts.length > MAX_TOASTS) {
        const oldestId = activeToasts[0];
        closeToast(oldestId, true);
    }
}

// ============================================
//  5.  دوال مساعدة لأنواع الإشعارات
// ============================================

/**
 * عرض إشعار نجاح
 * @param {string} message - الرسالة
 * @param {Object} options - خيارات إضافية
 * @returns {number} معرف الإشعار
 */
export function toastSuccess(message, options = {}) {
    return showToast({
        message,
        type: 'success',
        ...options,
    });
}

/**
 * عرض إشعار خطأ
 * @param {string} message - الرسالة
 * @param {Object} options - خيارات إضافية
 * @returns {number} معرف الإشعار
 */
export function toastError(message, options = {}) {
    return showToast({
        message,
        type: 'error',
        duration: 5000,
        ...options,
    });
}

/**
 * عرض إشعار تحذير
 * @param {string} message - الرسالة
 * @param {Object} options - خيارات إضافية
 * @returns {number} معرف الإشعار
 */
export function toastWarning(message, options = {}) {
    return showToast({
        message,
        type: 'warning',
        ...options,
    });
}

/**
 * عرض إشعار معلومات
 * @param {string} message - الرسالة
 * @param {Object} options - خيارات إضافية
 * @returns {number} معرف الإشعار
 */
export function toastInfo(message, options = {}) {
    return showToast({
        message,
        type: 'info',
        ...options,
    });
}

/**
 * عرض إشعار مخصص
 * @param {string} message - الرسالة
 * @param {Object} options - خيارات إضافية
 * @returns {number} معرف الإشعار
 */
export function toastCustom(message, options = {}) {
    return showToast({
        message,
        type: options.type || 'info',
        ...options,
    });
}

// ============================================
//  6.  دوال التهيئة والتنظيف
// ============================================

/**
 * تهيئة نظام الإشعارات
 */
export function initToast() {
    initContainer();
    console.log('Toast component initialized successfully');
}

/**
 * تنظيف نظام الإشعارات
 */
export function destroyToast() {
    closeAllToasts(true);
    if (toastContainer) {
        removeElement(toastContainer);
        toastContainer = null;
    }
    activeToasts = [];
    isInitialized = false;
    console.log('Toast component destroyed');
}

// ============================================
//  7.  API عام للمكون
// ============================================

export const toast = {
    show: showToast,
    success: toastSuccess,
    error: toastError,
    warning: toastWarning,
    info: toastInfo,
    custom: toastCustom,
    close: closeToast,
    closeAll: closeAllToasts,
    init: initToast,
    destroy: destroyToast,
};

// تصدير افتراضي
export default toast;

// ============================================
//  8.  تهيئة تلقائية عند تحميل الوحدة
// ============================================

// سيتم استدعاء init من app.js، لذلك لا نقوم بتهيئة تلقائية هنا

// ============================================
//  9.  نهاية الملف
// ============================================
