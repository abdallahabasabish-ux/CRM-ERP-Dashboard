/**
 * ======================================================
 * الملف: components/modal/modal.js
 * الوصف: مكون النوافذ المنبثقة (Modal)
 *         يدير إنشاء وعرض وإخفاء النوافذ المنبثقة
 *         بأنواع مختلفة (تأكيد، تنبيه، نموذج، مخصص)
 *         مع دعم للرسوم المتحركة، لوحة المفاتيح،
 *         والتركيز التلقائي
 * الإصدار: 1.0.0
 * التاريخ: 2026-07-12
 * ======================================================
 */

import { createElement, removeElement, addClass, removeClass, toggleClass } from '../../utils/helpers.js';

// ============================================
//  1.  الثوابت والإعدادات الافتراضية
// ============================================

const DEFAULT_ANIMATION_DURATION = 300; // مللي ثانية

const BUTTON_TYPES = {
    PRIMARY: 'primary',
    SECONDARY: 'secondary',
    SUCCESS: 'success',
    DANGER: 'danger',
    WARNING: 'warning',
};

const BUTTON_LABELS = {
    [BUTTON_TYPES.PRIMARY]: 'تأكيد',
    [BUTTON_TYPES.SECONDARY]: 'إلغاء',
    [BUTTON_TYPES.SUCCESS]: 'نعم',
    [BUTTON_TYPES.DANGER]: 'حذف',
    [BUTTON_TYPES.WARNING]: 'تحذير',
};

// ============================================
//  2.  حالة المكون (State)
// ============================================

let modalContainer = null;
let activeModals = [];
let modalIdCounter = 0;
let isInitialized = false;
let focusableElements = [];
let lastFocusedElement = null;

// ============================================
//  3.  دوال التهيئة
// ============================================

/**
 * تهيئة حاوية النوافذ المنبثقة
 */
function initContainer() {
    if (isInitialized && modalContainer) return;

    let container = document.getElementById('modal-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'modal-container';
        container.className = 'modal-container';
        document.body.appendChild(container);
    }

    modalContainer = container;
    isInitialized = true;

    // مستمع لأحداث لوحة المفاتيح
    document.addEventListener('keydown', handleKeydown);
}

/**
 * الحصول على حاوية النوافذ المنبثقة
 * @returns {HTMLElement} حاوية النوافذ المنبثقة
 */
function getContainer() {
    if (!isInitialized || !modalContainer) {
        initContainer();
    }
    return modalContainer;
}

// ============================================
//  4.  دوال إنشاء النوافذ المنبثقة
// ============================================

/**
 * إنشاء عنصر النافذة المنبثقة
 * @param {Object} options - خيارات النافذة
 * @returns {Object} { modal, overlay, content, id }
 */
function createModalElement(options) {
    const {
        id,
        title = '',
        content = '',
        size = 'md', // sm, md, lg, xl, full
        type = 'default', // default, confirm, alert, prompt, custom
        showClose = true,
        closeOnOverlay = true,
        closeOnEscape = true,
        focusOnOpen = true,
        animation = true,
        buttons = [],
        onOpen = null,
        onClose = null,
        onConfirm = null,
        onCancel = null,
        className = '',
        data = {},
    } = options;

    // إنشاء الخلفية المعتمة (Overlay)
    const overlay = createElement('div', {
        className: `modal-overlay${animation ? '' : ' no-animation'}`,
        'data-modal-id': id,
    });

    // إنشاء النافذة
    const modal = createElement('div', {
        className: `modal modal-${size}${className ? ' ' + className : ''}`,
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': `modal-title-${id}`,
        'data-modal-id': id,
    });

    // رأس النافذة
    const header = createElement('div', {
        className: 'modal-header',
    });

    if (title) {
        const titleEl = createElement('h2', {
            className: 'modal-title',
            id: `modal-title-${id}`,
            textContent: title,
        });
        header.appendChild(titleEl);
    }

    if (showClose) {
        const closeBtn = createElement('button', {
            className: 'modal-close',
            textContent: '✕',
            'aria-label': 'إغلاق',
            onClick: () => closeModal(id),
        });
        header.appendChild(closeBtn);
    }

    modal.appendChild(header);

    // جسم النافذة
    const body = createElement('div', {
        className: 'modal-body',
    });

    if (typeof content === 'string') {
        body.innerHTML = content;
    } else if (content instanceof HTMLElement) {
        body.appendChild(content);
    } else if (Array.isArray(content)) {
        content.forEach(el => {
            if (el instanceof HTMLElement) {
                body.appendChild(el);
            } else {
                body.appendChild(document.createTextNode(String(el)));
            }
        });
    } else if (content) {
        body.textContent = String(content);
    }

    modal.appendChild(body);

    // تذييل النافذة (الأزرار)
    const footer = createElement('div', {
        className: 'modal-footer',
    });

    if (buttons && buttons.length > 0) {
        buttons.forEach(btnConfig => {
            const btn = createButton(btnConfig, id);
            footer.appendChild(btn);
        });
    } else if (type === 'confirm') {
        // أزرار افتراضية للتأكيد
        const confirmBtn = createButton({
            label: 'تأكيد',
            type: BUTTON_TYPES.PRIMARY,
            onClick: () => {
                if (onConfirm) onConfirm();
                closeModal(id);
            },
        }, id);
        footer.appendChild(confirmBtn);

        const cancelBtn = createButton({
            label: 'إلغاء',
            type: BUTTON_TYPES.SECONDARY,
            onClick: () => {
                if (onCancel) onCancel();
                closeModal(id);
            },
        }, id);
        footer.appendChild(cancelBtn);
    } else if (type === 'alert') {
        const okBtn = createButton({
            label: 'حسناً',
            type: BUTTON_TYPES.PRIMARY,
            onClick: () => closeModal(id),
        }, id);
        footer.appendChild(okBtn);
    }

    if (footer.children.length > 0) {
        modal.appendChild(footer);
    }

    overlay.appendChild(modal);

    // تخزين البيانات
    modal.dataset.modalData = JSON.stringify(data);

    return {
        id,
        overlay,
        modal,
        body,
        footer,
        header,
        elements: {
            overlay,
            modal,
            body,
            footer,
            header,
        },
    };
}

/**
 * إنشاء زر للنافذة المنبثقة
 * @param {Object} config - تكوين الزر
 * @param {number} modalId - معرف النافذة
 * @returns {HTMLElement} عنصر الزر
 */
function createButton(config, modalId) {
    const {
        label = '',
        type = BUTTON_TYPES.SECONDARY,
        onClick = null,
        className = '',
        disabled = false,
        id = null,
    } = config;

    const btn = createElement('button', {
        className: `btn btn-${type}${className ? ' ' + className : ''}`,
        textContent: label || BUTTON_LABELS[type] || type,
        disabled,
        id: id || `modal-btn-${modalId}-${Date.now()}`,
        onClick: (e) => {
            if (onClick) {
                onClick(e);
            }
        },
        type: 'button',
    });

    return btn;
}

// ============================================
//  5.  دوال العرض والإخفاء
// ============================================

/**
 * عرض نافذة منبثقة
 * @param {Object} options - خيارات النافذة
 * @returns {number} معرف النافذة
 */
export function showModal(options = {}) {
    // تهيئة الحاوية
    const container = getContainer();

    // إنشاء معرف فريد
    const id = ++modalIdCounter;

    // إعداد الخيارات
    const modalOptions = {
        id,
        title: options.title || '',
        content: options.content || '',
        size: options.size || 'md',
        type: options.type || 'default',
        showClose: options.showClose !== undefined ? options.showClose : true,
        closeOnOverlay: options.closeOnOverlay !== undefined ? options.closeOnOverlay : true,
        closeOnEscape: options.closeOnEscape !== undefined ? options.closeOnEscape : true,
        focusOnOpen: options.focusOnOpen !== undefined ? options.focusOnOpen : true,
        animation: options.animation !== undefined ? options.animation : true,
        buttons: options.buttons || [],
        onOpen: options.onOpen || null,
        onClose: options.onClose || null,
        onConfirm: options.onConfirm || null,
        onCancel: options.onCancel || null,
        className: options.className || '',
        data: options.data || {},
    };

    // إنشاء عناصر النافذة
    const { overlay, modal, elements } = createModalElement(modalOptions);

    // إضافة النافذة إلى الحاوية
    container.appendChild(overlay);

    // حفظ النافذة في القائمة النشطة
    activeModals.push(id);

    // حفظ آخر عنصر تم التركيز عليه
    lastFocusedElement = document.activeElement;

    // منع تمرير الصفحة الخلفية
    document.body.style.overflow = 'hidden';

    // عرض النافذة مع رسوم متحركة
    if (modalOptions.animation) {
        requestAnimationFrame(() => {
            addClass(overlay, 'show');
            setTimeout(() => {
                addClass(modal, 'show');
                // التركيز على النافذة
                if (modalOptions.focusOnOpen) {
                    focusModal(id);
                }
                // استدعاء onOpen
                if (modalOptions.onOpen) {
                    modalOptions.onOpen(elements);
                }
            }, 50);
        });
    } else {
        addClass(overlay, 'show');
        addClass(modal, 'show');
        if (modalOptions.focusOnOpen) {
            focusModal(id);
        }
        if (modalOptions.onOpen) {
            modalOptions.onOpen(elements);
        }
    }

    // حفظ مراجع العناصر في النافذة
    window._modals = window._modals || {};
    window._modals[id] = {
        id,
        overlay,
        modal,
        elements,
        options: modalOptions,
    };

    return id;
}

/**
 * إغلاق نافذة منبثقة
 * @param {number} id - معرف النافذة
 * @param {boolean} immediate - إغلاق فوري دون رسوم متحركة
 */
export function closeModal(id, immediate = false) {
    const modalData = window._modals?.[id];
    if (!modalData) return;

    const { overlay, modal, options } = modalData;

    // استدعاء onClose
    if (options.onClose) {
        options.onClose(modalData.elements);
    }

    if (immediate) {
        // إزالة فورية
        removeElement(overlay);
        activeModals = activeModals.filter(mid => mid !== id);
        delete window._modals[id];

        // استعادة التركيز
        restoreFocus();

        // استعادة التمرير
        if (activeModals.length === 0) {
            document.body.style.overflow = '';
        }
    } else {
        // إزالة مع رسوم متحركة
        removeClass(modal, 'show');
        setTimeout(() => {
            removeClass(overlay, 'show');
            setTimeout(() => {
                removeElement(overlay);
                activeModals = activeModals.filter(mid => mid !== id);
                delete window._modals[id];

                // استعادة التركيز
                restoreFocus();

                // استعادة التمرير
                if (activeModals.length === 0) {
                    document.body.style.overflow = '';
                }
            }, DEFAULT_ANIMATION_DURATION);
        }, 150);
    }
}

/**
 * إغلاق جميع النوافذ المنبثقة
 * @param {boolean} immediate - إغلاق فوري
 */
export function closeAllModals(immediate = false) {
    const ids = [...activeModals];
    ids.forEach(id => {
        closeModal(id, immediate);
    });
}

/**
 * التركيز على نافذة منبثقة
 * @param {number} id - معرف النافذة
 */
function focusModal(id) {
    const modalData = window._modals?.[id];
    if (!modalData) return;

    const { modal, elements } = modalData;

    // جمع العناصر القابلة للتركيز
    const focusable = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusable.length > 0) {
        // التركيز على أول عنصر قابل للتركيز
        focusable[0].focus();
    } else {
        // التركيز على النافذة نفسها
        modal.focus();
    }
}

/**
 * استعادة التركيز إلى العنصر السابق
 */
function restoreFocus() {
    if (lastFocusedElement && document.body.contains(lastFocusedElement)) {
        lastFocusedElement.focus();
    }
    lastFocusedElement = null;
}

// ============================================
//  6.  معالجات الأحداث (Event Handlers)
// ============================================

/**
 * معالج أحداث لوحة المفاتيح
 */
function handleKeydown(e) {
    if (e.key === 'Escape' && activeModals.length > 0) {
        const lastId = activeModals[activeModals.length - 1];
        const modalData = window._modals?.[lastId];
        if (modalData && modalData.options.closeOnEscape) {
            e.preventDefault();
            closeModal(lastId);
        }
    }

    // منع Tab من الخروج من النافذة
    if (e.key === 'Tab' && activeModals.length > 0) {
        const lastId = activeModals[activeModals.length - 1];
        const modalData = window._modals?.[lastId];
        if (modalData) {
            const { modal } = modalData;
            const focusable = modal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusable.length > 0) {
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                const isShift = e.shiftKey;
                const target = e.target;

                if (isShift && target === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!isShift && target === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        }
    }
}

/**
 * معالج النقر على الخلفية المعتمة
 */
function handleOverlayClick(e) {
    if (e.target.classList.contains('modal-overlay')) {
        const modalId = parseInt(e.target.dataset.modalId);
        if (modalId) {
            const modalData = window._modals?.[modalId];
            if (modalData && modalData.options.closeOnOverlay) {
                closeModal(modalId);
            }
        }
    }
}

// ============================================
//  7.  دوال مساعدة لأنواع النوافذ
// ============================================

/**
 * عرض نافذة تأكيد
 * @param {string} message - الرسالة
 * @param {Object} options - خيارات إضافية
 * @returns {Promise<boolean>} Promise يعيد true عند التأكيد
 */
export function confirmModal(message, options = {}) {
    return new Promise((resolve) => {
        const id = showModal({
            title: options.title || 'تأكيد',
            content: message,
            type: 'confirm',
            size: options.size || 'sm',
            closeOnOverlay: false,
            onConfirm: () => resolve(true),
            onCancel: () => resolve(false),
            onClose: () => resolve(false),
            ...options,
        });
    });
}

/**
 * عرض نافذة تنبيه
 * @param {string} message - الرسالة
 * @param {Object} options - خيارات إضافية
 * @returns {Promise<void>} Promise عند الإغلاق
 */
export function alertModal(message, options = {}) {
    return new Promise((resolve) => {
        showModal({
            title: options.title || 'تنبيه',
            content: message,
            type: 'alert',
            size: options.size || 'sm',
            closeOnOverlay: false,
            onClose: () => resolve(),
            ...options,
        });
    });
}

/**
 * عرض نافذة إدخال (Prompt)
 * @param {string} message - الرسالة
 * @param {Object} options - خيارات إضافية
 * @returns {Promise<string|null>} Promise يعيد القيمة المدخلة أو null
 */
export function promptModal(message, options = {}) {
    return new Promise((resolve) => {
        const inputId = `prompt-input-${Date.now()}`;
        const defaultValue = options.defaultValue || '';
        const placeholder = options.placeholder || '';
        const inputType = options.inputType || 'text';

        const input = createElement('input', {
            type: inputType,
            id: inputId,
            className: 'form-control',
            value: defaultValue,
            placeholder: placeholder,
            autofocus: true,
        });

        const content = createElement('div', {}, [
            createElement('p', { textContent: message }),
            input,
        ]);

        showModal({
            title: options.title || 'إدخال',
            content,
            type: 'custom',
            size: options.size || 'sm',
            closeOnOverlay: false,
            buttons: [
                {
                    label: 'تأكيد',
                    type: BUTTON_TYPES.PRIMARY,
                    onClick: () => {
                        const value = document.getElementById(inputId)?.value || '';
                        resolve(value);
                    },
                },
                {
                    label: 'إلغاء',
                    type: BUTTON_TYPES.SECONDARY,
                    onClick: () => resolve(null),
                },
            ],
            onClose: () => resolve(null),
            ...options,
        });
    });
}

/**
 * عرض نافذة مخصصة
 * @param {Object} options - خيارات النافذة
 * @returns {number} معرف النافذة
 */
export function customModal(options) {
    return showModal({
        type: 'custom',
        ...options,
    });
}

// ============================================
//  8.  دوال التهيئة والتنظيف
// ============================================

/**
 * تهيئة نظام النوافذ المنبثقة
 */
export function initModal() {
    initContainer();
    // ربط مستمع النقر على الخلفية المعتمة
    document.addEventListener('click', handleOverlayClick);
    console.log('Modal component initialized successfully');
}

/**
 * تنظيف نظام النوافذ المنبثقة
 */
export function destroyModal() {
    closeAllModals(true);
    if (modalContainer) {
        removeElement(modalContainer);
        modalContainer = null;
    }
    activeModals = [];
    isInitialized = false;
    document.removeEventListener('keydown', handleKeydown);
    document.removeEventListener('click', handleOverlayClick);
    window._modals = {};
    console.log('Modal component destroyed');
}

// ============================================
//  9.  API عام للمكون
// ============================================

export const modal = {
    show: showModal,
    close: closeModal,
    closeAll: closeAllModals,
    confirm: confirmModal,
    alert: alertModal,
    prompt: promptModal,
    custom: customModal,
    init: initModal,
    destroy: destroyModal,
    getActiveModals: () => [...activeModals],
    getModalData: (id) => window._modals?.[id],
};

// تصدير افتراضي
export default modal;

// ============================================
//  10. تهيئة تلقائية عند تحميل الوحدة
// ============================================

// سيتم استدعاء init من app.js، لذلك لا نقوم بتهيئة تلقائية هنا

// ============================================
//  11. نهاية الملف
// ============================================
