/**
 * ======================================================
 * الملف: components/loader/loader.js
 * الوصف: مكون مؤشرات التحميل (Loader)
 *         يدير عرض وإخفاء مؤشرات التحميل بأنواع مختلفة
 *         (دائري، خطي، نقاط، مخصص) مع دعم للتحكم في
 *         الحجم، اللون، الموقع، والرسوم المتحركة
 * الإصدار: 1.0.0
 * التاريخ: 2026-07-12
 * ======================================================
 */

import { createElement, removeElement, addClass, removeClass, toggleClass } from '../../utils/helpers.js';

// ============================================
//  1.  الثوابت والإعدادات الافتراضية
// ============================================

const DEFAULT_LOADER_TYPES = {
    SPINNER: 'spinner',      // دائري يدور
    LINE: 'line',            // خطي متحرك
    DOTS: 'dots',            // نقاط متحركة
    PULSE: 'pulse',          // نبض
    CUSTOM: 'custom',        // مخصص
};

const DEFAULT_SIZE = {
    SMALL: 'sm',
    MEDIUM: 'md',
    LARGE: 'lg',
    XLARGE: 'xl',
};

const SIZE_MAP = {
    [DEFAULT_SIZE.SMALL]: { width: '20px', height: '20px', borderWidth: '2px' },
    [DEFAULT_SIZE.MEDIUM]: { width: '32px', height: '32px', borderWidth: '3px' },
    [DEFAULT_SIZE.LARGE]: { width: '48px', height: '48px', borderWidth: '4px' },
    [DEFAULT_SIZE.XLARGE]: { width: '64px', height: '64px', borderWidth: '5px' },
};

const DEFAULT_COLORS = {
    primary: 'var(--color-primary)',
    secondary: 'var(--text-secondary)',
    success: 'var(--color-success)',
    danger: 'var(--color-danger)',
    warning: 'var(--color-warning)',
    info: 'var(--color-info)',
    white: '#ffffff',
};

// ============================================
//  2.  حالة المكون (State)
// ============================================

let loaderContainer = null;
let activeLoaders = [];
let loaderIdCounter = 0;
let isInitialized = false;
let globalLoaderCount = 0;

// ============================================
//  3.  دوال التهيئة
// ============================================

/**
 * تهيئة حاوية المؤشرات
 */
function initContainer() {
    if (isInitialized && loaderContainer) return;

    let container = document.getElementById('loader-container');
    if (!container) {
        container = createElement('div', {
            id: 'loader-container',
            className: 'loader-container',
            style: {
                position: 'fixed',
                top: '0',
                left: '0',
                right: '0',
                bottom: '0',
                pointerEvents: 'none',
                zIndex: '9999',
            },
        });
        document.body.appendChild(container);
    }

    loaderContainer = container;
    isInitialized = true;
}

/**
 * الحصول على حاوية المؤشرات
 * @returns {HTMLElement} حاوية المؤشرات
 */
function getContainer() {
    if (!isInitialized || !loaderContainer) {
        initContainer();
    }
    return loaderContainer;
}

// ============================================
//  4.  دوال إنشاء المؤشرات
// ============================================

/**
 * إنشاء مؤشر تحميل دائري (Spinner)
 */
function createSpinner(options) {
    const { size = DEFAULT_SIZE.MEDIUM, color = DEFAULT_COLORS.primary, className = '' } = options;
    const sizeConfig = SIZE_MAP[size] || SIZE_MAP[DEFAULT_SIZE.MEDIUM];

    return createElement('div', {
        className: `loader spinner ${className}`,
        style: {
            width: sizeConfig.width,
            height: sizeConfig.height,
            borderWidth: sizeConfig.borderWidth,
            borderColor: 'var(--border-color)',
            borderTopColor: color,
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'spin 0.8s linear infinite',
        },
    });
}

/**
 * إنشاء مؤشر تحميل خطي (Line)
 */
function createLineLoader(options) {
    const { size = DEFAULT_SIZE.MEDIUM, color = DEFAULT_COLORS.primary, className = '' } = options;
    const height = size === DEFAULT_SIZE.SMALL ? '2px' :
                   size === DEFAULT_SIZE.LARGE ? '6px' :
                   size === DEFAULT_SIZE.XLARGE ? '8px' : '4px';

    const container = createElement('div', {
        className: `loader-line ${className}`,
        style: {
            width: '100%',
            height: height,
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-full)',
            overflow: 'hidden',
            position: 'relative',
        },
    });

    const progress = createElement('div', {
        className: 'loader-line-progress',
        style: {
            width: '0%',
            height: '100%',
            backgroundColor: color,
            borderRadius: 'var(--radius-full)',
            animation: 'loaderLineProgress 1.5s ease-in-out infinite',
            position: 'absolute',
            top: '0',
            left: '0',
        },
    });

    container.appendChild(progress);

    // إضافة تعريفات الرسوم المتحركة إذا لم تكن موجودة
    addLineAnimation();

    return container;
}

/**
 * إضافة تعريفات الرسوم المتحركة للخطي
 */
function addLineAnimation() {
    if (document.getElementById('loader-line-style')) return;

    const style = createElement('style', {
        id: 'loader-line-style',
        textContent: `
            @keyframes loaderLineProgress {
                0% { width: 0%; left: 0%; }
                50% { width: 100%; left: 0%; }
                100% { width: 0%; left: 100%; }
            }
        `,
    });
    document.head.appendChild(style);
}

/**
 * إنشاء مؤشر تحميل نقاط (Dots)
 */
function createDotsLoader(options) {
    const { size = DEFAULT_SIZE.MEDIUM, color = DEFAULT_COLORS.primary, className = '' } = options;
    const dotSize = size === DEFAULT_SIZE.SMALL ? '6px' :
                    size === DEFAULT_SIZE.LARGE ? '14px' :
                    size === DEFAULT_SIZE.XLARGE ? '18px' : '10px';
    const gap = size === DEFAULT_SIZE.SMALL ? '4px' : '8px';

    const container = createElement('div', {
        className: `loader-dots ${className}`,
        style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: gap,
        },
    });

    for (let i = 0; i < 3; i++) {
        const dot = createElement('div', {
            className: 'loader-dot',
            style: {
                width: dotSize,
                height: dotSize,
                borderRadius: '50%',
                backgroundColor: color,
                animation: `loaderDotBounce 1.4s ease-in-out ${i * 0.16}s infinite both`,
            },
        });
        container.appendChild(dot);
    }

    // إضافة تعريفات الرسوم المتحركة
    addDotsAnimation();

    return container;
}

/**
 * إضافة تعريفات الرسوم المتحركة للنقاط
 */
function addDotsAnimation() {
    if (document.getElementById('loader-dots-style')) return;

    const style = createElement('style', {
        id: 'loader-dots-style',
        textContent: `
            @keyframes loaderDotBounce {
                0%, 80%, 100% { transform: scale(0); }
                40% { transform: scale(1); }
            }
        `,
    });
    document.head.appendChild(style);
}

/**
 * إنشاء مؤشر تحميل نبض (Pulse)
 */
function createPulseLoader(options) {
    const { size = DEFAULT_SIZE.MEDIUM, color = DEFAULT_COLORS.primary, className = '' } = options;
    const sizeConfig = SIZE_MAP[size] || SIZE_MAP[DEFAULT_SIZE.MEDIUM];

    return createElement('div', {
        className: `loader-pulse ${className}`,
        style: {
            width: sizeConfig.width,
            height: sizeConfig.height,
            borderRadius: '50%',
            backgroundColor: color,
            animation: 'loaderPulse 1.5s ease-in-out infinite',
            opacity: '0.6',
        },
    });
}

/**
 * إضافة تعريفات الرسوم المتحركة للنبض
 */
function addPulseAnimation() {
    if (document.getElementById('loader-pulse-style')) return;

    const style = createElement('style', {
        id: 'loader-pulse-style',
        textContent: `
            @keyframes loaderPulse {
                0%, 100% { transform: scale(0.8); opacity: 0.6; }
                50% { transform: scale(1.2); opacity: 1; }
            }
        `,
    });
    document.head.appendChild(style);
}

/**
 * إنشاء مؤشر تحميل مخصص
 */
function createCustomLoader(options) {
    const { content, className = '' } = options;
    const container = createElement('div', {
        className: `loader-custom ${className}`,
    });

    if (typeof content === 'string') {
        container.innerHTML = content;
    } else if (content instanceof HTMLElement) {
        container.appendChild(content);
    } else if (content) {
        container.textContent = String(content);
    }

    return container;
}

// ============================================
//  5.  دوال العرض والإخفاء
// ============================================

/**
 * عرض مؤشر تحميل
 * @param {Object} options - خيارات المؤشر
 * @returns {string} معرف المؤشر
 */
export function showLoader(options = {}) {
    const container = getContainer();

    const {
        type = DEFAULT_LOADER_TYPES.SPINNER,
        size = DEFAULT_SIZE.MEDIUM,
        color = DEFAULT_COLORS.primary,
        message = '',
        overlay = false,
        overlayColor = 'rgba(0, 0, 0, 0.4)',
        target = null, // عنصر محدد لوضع المؤشر بداخله
        position = 'center', // center, top-left, top-right, bottom-left, bottom-right
        className = '',
        content = null,
        duration = 0, // 0 = غير محدود
        onShow = null,
        onHide = null,
        id = null,
    } = options;

    // إنشاء معرف فريد
    const loaderId = id || `loader-${++loaderIdCounter}`;

    // إنشاء عنصر المؤشر
    let loaderElement;
    switch (type) {
        case DEFAULT_LOADER_TYPES.SPINNER:
            loaderElement = createSpinner({ size, color, className });
            break;
        case DEFAULT_LOADER_TYPES.LINE:
            loaderElement = createLineLoader({ size, color, className });
            break;
        case DEFAULT_LOADER_TYPES.DOTS:
            loaderElement = createDotsLoader({ size, color, className });
            break;
        case DEFAULT_LOADER_TYPES.PULSE:
            loaderElement = createPulseLoader({ size, color, className });
            break;
        case DEFAULT_LOADER_TYPES.CUSTOM:
            loaderElement = createCustomLoader({ content, className });
            break;
        default:
            loaderElement = createSpinner({ size, color, className });
    }

    // إضافة الرسالة
    if (message) {
        const messageEl = createElement('div', {
            className: 'loader-message',
            textContent: message,
            style: {
                marginTop: '12px',
                fontSize: 'var(--font-sm)',
                color: 'var(--text-secondary)',
                textAlign: 'center',
            },
        });
        const wrapper = createElement('div', {
            className: 'loader-wrapper',
            style: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
            },
        });
        wrapper.appendChild(loaderElement);
        wrapper.appendChild(messageEl);
        loaderElement = wrapper;
    }

    // إنشاء الحاوية النهائية
    let finalContainer;
    let overlayElement = null;

    if (overlay) {
        // إنشاء خلفية معتمة
        overlayElement = createElement('div', {
            className: 'loader-overlay',
            style: {
                position: 'fixed',
                top: '0',
                left: '0',
                right: '0',
                bottom: '0',
                backgroundColor: overlayColor,
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: '10000',
                pointerEvents: 'auto',
            },
            'data-loader-id': loaderId,
        });

        // إضافة زر إغلاق اختياري
        if (options.showClose) {
            const closeBtn = createElement('button', {
                className: 'loader-close-btn',
                textContent: '✕',
                style: {
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    fontSize: '18px',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.2s',
                },
                onClick: () => hideLoader(loaderId),
            });
            overlayElement.appendChild(closeBtn);
        }

        const contentWrapper = createElement('div', {
            className: 'loader-content',
            style: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
            },
        });
        contentWrapper.appendChild(loaderElement);
        overlayElement.appendChild(contentWrapper);

        finalContainer = overlayElement;
    } else if (target) {
        // وضع المؤشر داخل عنصر محدد
        const targetEl = typeof target === 'string' ? document.querySelector(target) : target;
        if (targetEl) {
            // إضافة نمط relative للعنصر إذا لم يكن موجوداً
            if (getComputedStyle(targetEl).position === 'static') {
                targetEl.style.position = 'relative';
            }

            // إنشاء حاوية داخلية
            const innerContainer = createElement('div', {
                className: 'loader-inner',
                style: {
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    right: '0',
                    bottom: '0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255,255,255,0.5)',
                    borderRadius: 'inherit',
                    zIndex: '100',
                    pointerEvents: 'auto',
                },
                'data-loader-id': loaderId,
            });
            innerContainer.appendChild(loaderElement);
            targetEl.appendChild(innerContainer);
            finalContainer = innerContainer;
        } else {
            // إذا لم يتم العثور على الهدف، نضعه في الحاوية العامة
            finalContainer = createElement('div', {
                className: 'loader-wrapper',
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                },
                'data-loader-id': loaderId,
            });
            finalContainer.appendChild(loaderElement);
            container.appendChild(finalContainer);
        }
    } else {
        // وضع المؤشر في الحاوية العامة
        const wrapper = createElement('div', {
            className: 'loader-wrapper',
            style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                pointerEvents: 'auto',
            },
            'data-loader-id': loaderId,
        });

        // تحديد الموقع
        if (position === 'top-left') {
            wrapper.style.position = 'fixed';
            wrapper.style.top = '20px';
            wrapper.style.left = '20px';
            wrapper.style.zIndex = '10001';
        } else if (position === 'top-right') {
            wrapper.style.position = 'fixed';
            wrapper.style.top = '20px';
            wrapper.style.right = '20px';
            wrapper.style.zIndex = '10001';
        } else if (position === 'bottom-left') {
            wrapper.style.position = 'fixed';
            wrapper.style.bottom = '20px';
            wrapper.style.left = '20px';
            wrapper.style.zIndex = '10001';
        } else if (position === 'bottom-right') {
            wrapper.style.position = 'fixed';
            wrapper.style.bottom = '20px';
            wrapper.style.right = '20px';
            wrapper.style.zIndex = '10001';
        } else {
            // center - نضعه في منتصف الشاشة
            wrapper.style.position = 'fixed';
            wrapper.style.top = '50%';
            wrapper.style.left = '50%';
            wrapper.style.transform = 'translate(-50%, -50%)';
            wrapper.style.zIndex = '10001';
        }

        wrapper.appendChild(loaderElement);
        container.appendChild(wrapper);
        finalContainer = wrapper;
    }

    // حفظ بيانات المؤشر
    const loaderData = {
        id: loaderId,
        element: finalContainer,
        overlay: overlayElement,
        target: target,
        duration: duration,
        onShow: onShow,
        onHide: onHide,
        timer: null,
        timestamp: Date.now(),
    };

    // تخزين في القائمة النشطة
    activeLoaders.push(loaderData);

    // تحديث عدد المؤشرات العامة
    if (overlay) {
        globalLoaderCount++;
        document.body.style.overflow = 'hidden';
    }

    // استدعاء onShow
    if (onShow) {
        onShow(loaderElement);
    }

    // تعيين مؤقت للإزالة التلقائية
    if (duration > 0) {
        loaderData.timer = setTimeout(() => {
            hideLoader(loaderId);
        }, duration);
    }

    // إذا كان مؤشر عام، نضيف class للجسم
    if (overlay && globalLoaderCount === 1) {
        addClass(document.body, 'has-loader-overlay');
    }

    return loaderId;
}

/**
 * إخفاء مؤشر تحميل
 * @param {string} id - معرف المؤشر
 * @param {boolean} immediate - إخفاء فوري دون رسوم متحركة
 */
export function hideLoader(id, immediate = false) {
    const index = activeLoaders.findIndex(l => l.id === id);
    if (index === -1) return;

    const loaderData = activeLoaders[index];

    // إلغاء المؤقت
    if (loaderData.timer) {
        clearTimeout(loaderData.timer);
    }

    // استدعاء onHide
    if (loaderData.onHide) {
        loaderData.onHide(loaderData.element);
    }

    if (immediate) {
        // إزالة فورية
        removeElement(loaderData.element);
        activeLoaders.splice(index, 1);

        // تحديث حالة الجسم
        if (loaderData.overlay) {
            globalLoaderCount--;
            if (globalLoaderCount <= 0) {
                document.body.style.overflow = '';
                removeClass(document.body, 'has-loader-overlay');
                globalLoaderCount = 0;
            }
        }
    } else {
        // إزالة مع رسوم متحركة
        const element = loaderData.element;
        if (element) {
            addClass(element, 'fade-out');
            setTimeout(() => {
                removeElement(element);
                activeLoaders.splice(index, 1);
                // تحديث حالة الجسم
                if (loaderData.overlay) {
                    globalLoaderCount--;
                    if (globalLoaderCount <= 0) {
                        document.body.style.overflow = '';
                        removeClass(document.body, 'has-loader-overlay');
                        globalLoaderCount = 0;
                    }
                }
            }, 300);
        } else {
            activeLoaders.splice(index, 1);
        }
    }
}

/**
 * إخفاء جميع المؤشرات
 * @param {boolean} immediate - إخفاء فوري
 */
export function hideAllLoaders(immediate = false) {
    const ids = activeLoaders.map(l => l.id);
    ids.forEach(id => {
        hideLoader(id, immediate);
    });
}

/**
 * التحقق من وجود مؤشر تحميل نشط
 * @param {string} id - معرف المؤشر (اختياري)
 * @returns {boolean} true إذا كان نشطاً
 */
export function isLoaderActive(id = null) {
    if (id) {
        return activeLoaders.some(l => l.id === id);
    }
    return activeLoaders.length > 0;
}

/**
 * الحصول على جميع المؤشرات النشطة
 * @returns {Array} قائمة المؤشرات النشطة
 */
export function getActiveLoaders() {
    return [...activeLoaders];
}

// ============================================
//  6.  دوال مساعدة لأنواع المؤشرات
// ============================================

/**
 * عرض مؤشر تحميل دائري
 * @param {Object} options - خيارات المؤشر
 * @returns {string} معرف المؤشر
 */
export function showSpinner(options = {}) {
    return showLoader({
        type: DEFAULT_LOADER_TYPES.SPINNER,
        ...options,
    });
}

/**
 * عرض مؤشر تحميل خطي
 * @param {Object} options - خيارات المؤشر
 * @returns {string} معرف المؤشر
 */
export function showLineLoader(options = {}) {
    return showLoader({
        type: DEFAULT_LOADER_TYPES.LINE,
        ...options,
    });
}

/**
 * عرض مؤشر تحميل نقاط
 * @param {Object} options - خيارات المؤشر
 * @returns {string} معرف المؤشر
 */
export function showDotsLoader(options = {}) {
    return showLoader({
        type: DEFAULT_LOADER_TYPES.DOTS,
        ...options,
    });
}

/**
 * عرض مؤشر تحميل نبض
 * @param {Object} options - خيارات المؤشر
 * @returns {string} معرف المؤشر
 */
export function showPulseLoader(options = {}) {
    return showLoader({
        type: DEFAULT_LOADER_TYPES.PULSE,
        ...options,
    });
}

/**
 * عرض مؤشر تحميل عام (يغطي الشاشة بالكامل)
 * @param {string} message - رسالة التحميل
 * @param {Object} options - خيارات إضافية
 * @returns {string} معرف المؤشر
 */
export function showGlobalLoader(message = 'جاري التحميل...', options = {}) {
    return showLoader({
        overlay: true,
        message: message,
        size: DEFAULT_SIZE.LARGE,
        ...options,
    });
}

/**
 * إخفاء المؤشر العام
 */
export function hideGlobalLoader() {
    // العثور على آخر مؤشر عام وإخفائه
    const loaders = activeLoaders.filter(l => l.overlay);
    if (loaders.length > 0) {
        const lastLoader = loaders[loaders.length - 1];
        hideLoader(lastLoader.id);
    }
}

// ============================================
//  7.  دوال التهيئة والتنظيف
// ============================================

/**
 * تهيئة نظام المؤشرات
 */
export function initLoader() {
    initContainer();
    console.log('Loader component initialized successfully');
}

/**
 * تنظيف نظام المؤشرات
 */
export function destroyLoader() {
    hideAllLoaders(true);
    if (loaderContainer) {
        removeElement(loaderContainer);
        loaderContainer = null;
    }
    activeLoaders = [];
    isInitialized = false;
    globalLoaderCount = 0;
    document.body.style.overflow = '';
    removeClass(document.body, 'has-loader-overlay');
    console.log('Loader component destroyed');
}

// ============================================
//  8.  API عام للمكون
// ============================================

export const loader = {
    show: showLoader,
    hide: hideLoader,
    hideAll: hideAllLoaders,
    isActive: isLoaderActive,
    getActive: getActiveLoaders,
    spinner: showSpinner,
    line: showLineLoader,
    dots: showDotsLoader,
    pulse: showPulseLoader,
    global: showGlobalLoader,
    hideGlobal: hideGlobalLoader,
    init: initLoader,
    destroy: destroyLoader,
};

// تصدير افتراضي
export default loader;

// ============================================
//  9.  إضافة تعريفات الرسوم المتحركة الأساسية
// ============================================

// إضافة تعريفات spin إذا لم تكن موجودة
if (!document.getElementById('loader-spin-style')) {
    const spinStyle = createElement('style', {
        id: 'loader-spin-style',
        textContent: `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            .fade-out {
                opacity: 0 !important;
                transition: opacity 0.3s ease;
            }
            .loader-wrapper.fade-out,
            .loader-overlay.fade-out,
            .loader-inner.fade-out {
                opacity: 0 !important;
                transition: opacity 0.3s ease;
            }
            .loader-container {
                pointer-events: none;
            }
            .loader-container .loader-wrapper {
                pointer-events: auto;
            }
            .loader-container .loader-overlay {
                pointer-events: auto;
            }
            body.has-loader-overlay {
                overflow: hidden !important;
            }
        `,
    });
    document.head.appendChild(spinStyle);
}

// ============================================
//  10. تهيئة تلقائية عند تحميل الوحدة
// ============================================

// سيتم استدعاء init من app.js، لذلك لا نقوم بتهيئة تلقائية هنا

// ============================================
//  11. نهاية الملف
// ============================================
