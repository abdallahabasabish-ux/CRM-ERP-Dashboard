/**
 * ======================================================
 * الملف: components/sidebar/sidebar.js
 * الوصف: مكون القائمة الجانبية (Sidebar)
 *         يدير عرض القائمة، التنقل، حالة التصغير،
 *         التحديد النشط، والتفاعلات مع التوجيه
 * الإصدار: 1.0.0
 * التاريخ: 2026-07-12
 * ======================================================
 */

import { getItem, setItem } from '../../utils/storage.js';
import { STORAGE_KEYS, ROLES, ROLE_PERMISSIONS } from '../../utils/constants.js';
import { getRouter, navigateTo, getCurrentRoute } from '../../utils/router.js';
import { addClass, removeClass, toggleClass, getValue, setValue } from '../../utils/helpers.js';

// ============================================
//  1.  تعريف هيكل القائمة (Menu Structure)
// ============================================

const MENU_ITEMS = [
    {
        id: 'dashboard',
        label: 'لوحة التحكم',
        icon: '📊',
        path: '/dashboard',
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE, ROLES.ACCOUNTANT],
    },
    {
        id: 'customers',
        label: 'العملاء',
        icon: '👥',
        path: '/customers',
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT],
    },
    {
        id: 'orders',
        label: 'الطلبات',
        icon: '📋',
        path: '/orders',
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT],
    },
    {
        id: 'services',
        label: 'الخدمات',
        icon: '🛠️',
        path: '/services',
        roles: [ROLES.ADMIN, ROLES.MANAGER],
    },
    {
        id: 'employees',
        label: 'الموظفين',
        icon: '👤',
        path: '/employees',
        roles: [ROLES.ADMIN, ROLES.MANAGER],
    },
    {
        id: 'attendance',
        label: 'الحضور',
        icon: '⏰',
        path: '/attendance',
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE],
    },
    {
        id: 'tasks',
        label: 'المهام',
        icon: '✅',
        path: '/tasks',
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE],
    },
    {
        id: 'accounting',
        label: 'المحاسبة',
        icon: '💰',
        path: '/accounting',
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT],
    },
    {
        id: 'invoices',
        label: 'الفواتير',
        icon: '🧾',
        path: '/invoices',
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT],
    },
    {
        id: 'reports',
        label: 'التقارير',
        icon: '📈',
        path: '/reports',
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT],
    },
    {
        id: 'notifications',
        label: 'الإشعارات',
        icon: '🔔',
        path: '/notifications',
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE, ROLES.ACCOUNTANT],
    },
    {
        id: 'messages',
        label: 'الرسائل',
        icon: '💬',
        path: '/messages',
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE, ROLES.ACCOUNTANT],
    },
    {
        id: 'files',
        label: 'الملفات',
        icon: '📁',
        path: '/files',
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE, ROLES.ACCOUNTANT],
    },
    {
        id: 'settings',
        label: 'الإعدادات',
        icon: '⚙️',
        path: '/settings',
        roles: [ROLES.ADMIN],
    },
];

const FOOTER_ITEMS = [
    {
        id: 'help',
        label: 'المساعدة والدعم',
        icon: '❓',
        path: '/help',
        roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE, ROLES.ACCOUNTANT],
    },
];

// ============================================
//  2.  حالة المكون (State)
// ============================================

const state = {
    isCollapsed: getItem(STORAGE_KEYS.SIDEBAR_STATE) || false,
    isMobileOpen: false,
    activePath: getCurrentRoute() || '/dashboard',
    userRole: null,
    items: [],
    footerItems: [],
};

// ============================================
//  3.  مراجع DOM
// ============================================

let elements = {};

/**
 * تهيئة مراجع العناصر
 */
function initElements() {
    elements = {
        sidebar: document.getElementById('sidebar'),
        sidebarMenu: document.querySelector('.sidebar-menu'),
        sidebarFooter: document.querySelector('.sidebar-footer'),
        hamburgerBtn: document.querySelector('.hamburger-btn'),
        overlay: document.querySelector('.sidebar-overlay'),
    };
}

// ============================================
//  4.  دوال العرض (Render)
// ============================================

/**
 * تصفية العناصر حسب دور المستخدم
 */
function filterItemsByRole(items, role) {
    if (!role) return items;
    return items.filter(item => {
        if (!item.roles) return true;
        return item.roles.includes(role);
    });
}

/**
 * بناء عنصر قائمة HTML
 */
function createMenuItem(item, isActive) {
    const li = document.createElement('li');
    li.className = 'menu-item';

    const a = document.createElement('a');
    a.className = `menu-link${isActive ? ' active' : ''}`;
    a.href = `#${item.path}`;
    a.setAttribute('data-page', item.id);
    a.setAttribute('data-path', item.path);

    // الأيقونة
    const iconSpan = document.createElement('span');
    iconSpan.className = 'menu-icon';
    iconSpan.textContent = item.icon;
    a.appendChild(iconSpan);

    // النص
    const textSpan = document.createElement('span');
    textSpan.className = 'menu-label';
    textSpan.textContent = item.label;
    a.appendChild(textSpan);

    li.appendChild(a);
    return li;
}

/**
 * بناء القائمة الكاملة
 */
function renderMenu() {
    if (!elements.sidebarMenu) return;

    const role = state.userRole || ROLES.EMPLOYEE;
    const filteredItems = filterItemsByRole(state.items, role);

    // مسح القائمة الحالية
    elements.sidebarMenu.innerHTML = '';

    // إضافة العناصر
    filteredItems.forEach(item => {
        const isActive = state.activePath === item.path || state.activePath.startsWith(item.path + '/');
        const li = createMenuItem(item, isActive);
        elements.sidebarMenu.appendChild(li);
    });

    // تحديث القائمة السفلية
    renderFooter();
}

/**
 * بناء القائمة السفلية (Footer)
 */
function renderFooter() {
    if (!elements.sidebarFooter) return;

    const role = state.userRole || ROLES.EMPLOYEE;
    const filteredItems = filterItemsByRole(state.footerItems, role);

    elements.sidebarFooter.innerHTML = '';

    filteredItems.forEach(item => {
        const isActive = state.activePath === item.path;
        const li = createMenuItem(item, isActive);
        elements.sidebarFooter.appendChild(li);
    });
}

/**
 * تحديث حالة التصغير
 */
function renderCollapse() {
    if (!elements.sidebar) return;
    if (state.isCollapsed) {
        addClass(elements.sidebar, 'collapsed');
    } else {
        removeClass(elements.sidebar, 'collapsed');
    }
    // حفظ الحالة
    setItem(STORAGE_KEYS.SIDEBAR_STATE, state.isCollapsed);
}

/**
 * تحديث حالة الفتح في الموبايل
 */
function renderMobile() {
    if (!elements.sidebar || !elements.overlay) return;
    if (state.isMobileOpen) {
        addClass(elements.sidebar, 'open');
        addClass(elements.overlay, 'show');
        document.body.style.overflow = 'hidden';
    } else {
        removeClass(elements.sidebar, 'open');
        removeClass(elements.overlay, 'show');
        document.body.style.overflow = '';
    }
}

/**
 * تحديث العنصر النشط
 */
function renderActive(path) {
    state.activePath = path;
    // تحديث جميع روابط القائمة
    const links = document.querySelectorAll('.sidebar .menu-link');
    links.forEach(link => {
        const linkPath = link.getAttribute('data-path');
        if (linkPath === path || (linkPath && path.startsWith(linkPath + '/'))) {
            addClass(link, 'active');
        } else {
            removeClass(link, 'active');
        }
    });
}

// ============================================
//  5.  معالجات الأحداث (Event Handlers)
// ============================================

/**
 * معالج النقر على عنصر القائمة
 */
function handleMenuItemClick(e) {
    const link = e.target.closest('.menu-link');
    if (!link) return;

    e.preventDefault();
    const path = link.getAttribute('data-path');
    if (path) {
        // تحديث النشاط
        renderActive(path);
        // التنقل إلى المسار
        navigateTo(path);
        // إغلاق القائمة في الموبايل
        if (window.innerWidth < 768) {
            toggleMobile(false);
        }
    }
}

/**
 * معالج تبديل التصغير (Collapse)
 */
function handleCollapseToggle(e) {
    e.stopPropagation();
    state.isCollapsed = !state.isCollapsed;
    renderCollapse();
}

/**
 * معالج تبديل الفتح في الموبايل
 */
function handleMobileToggle(e) {
    e.stopPropagation();
    toggleMobile(!state.isMobileOpen);
}

/**
 * معالج إغلاق القائمة في الموبايل عند النقر على الخلفية
 */
function handleOverlayClick(e) {
    if (e.target === elements.overlay) {
        toggleMobile(false);
    }
}

/**
 * معالج تغيير المسار (من Router)
 */
function handleRouteChange(data) {
    const path = data.route?.path || getCurrentRoute();
    renderActive(path);
}

/**
 * معالج تغيير حجم الشاشة
 */
function handleResize() {
    const isMobile = window.innerWidth < 768;
    if (!isMobile && state.isMobileOpen) {
        toggleMobile(false);
    }
}

// ============================================
//  6.  دوال التحكم (Control Functions)
// ============================================

/**
 * تبديل حالة الفتح في الموبايل
 */
function toggleMobile(open) {
    state.isMobileOpen = open !== undefined ? open : !state.isMobileOpen;
    renderMobile();
}

/**
 * تبديل حالة التصغير
 */
function toggleCollapse() {
    state.isCollapsed = !state.isCollapsed;
    renderCollapse();
}

/**
 * تحديث القائمة بناءً على دور المستخدم
 */
function updateMenuForRole(role) {
    state.userRole = role;
    renderMenu();
    // إعادة تحديث العنصر النشط
    renderActive(state.activePath);
}

// ============================================
//  7.  دوال التهيئة والتنظيف
// ============================================

/**
 * تهيئة المكون
 */
export async function initSidebar() {
    // تهيئة المراجع
    initElements();

    // تعيين البيانات
    state.items = MENU_ITEMS;
    state.footerItems = FOOTER_ITEMS;
    state.activePath = getCurrentRoute() || '/dashboard';

    // الحصول على دور المستخدم
    const user = getItem(STORAGE_KEYS.USER_DATA);
    state.userRole = user?.role || ROLES.EMPLOYEE;

    // عرض القائمة
    renderMenu();
    renderCollapse();
    renderMobile();
    renderActive(state.activePath);

    // ربط الأحداث
    if (elements.sidebarMenu) {
        elements.sidebarMenu.addEventListener('click', handleMenuItemClick);
    }

    if (elements.sidebarFooter) {
        elements.sidebarFooter.addEventListener('click', handleMenuItemClick);
    }

    if (elements.hamburgerBtn) {
        elements.hamburgerBtn.addEventListener('click', handleMobileToggle);
    }

    if (elements.overlay) {
        elements.overlay.addEventListener('click', handleOverlayClick);
    }

    // إضافة زر تبديل التصغير (للكمبيوتر)
    const collapseBtn = document.createElement('button');
    collapseBtn.className = 'sidebar-collapse-btn no-print';
    collapseBtn.setAttribute('aria-label', 'تصغير القائمة الجانبية');
    collapseBtn.innerHTML = state.isCollapsed ? '➡️' : '⬅️';
    collapseBtn.style.cssText = `
        position: absolute;
        bottom: 80px;
        right: -12px;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 1px solid var(--border-color);
        background: var(--bg-card);
        color: var(--text-secondary);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        box-shadow: var(--shadow-sm);
        z-index: 10;
        transition: all var(--transition-fast);
    `;
    collapseBtn.addEventListener('click', handleCollapseToggle);

    if (elements.sidebar) {
        // إضافة الزر فقط في الشاشات الكبيرة
        if (window.innerWidth >= 768) {
            elements.sidebar.style.position = 'relative';
            elements.sidebar.appendChild(collapseBtn);
        }
    }

    // مستمعات عامة
    window.addEventListener('resize', handleResize);

    // الاستماع لأحداث الموجه
    const router = getRouter();
    router.on('routeChange', handleRouteChange);

    console.log('Sidebar component initialized successfully');
}

/**
 * تنظيف المكون (إزالة المستمعات)
 */
export function destroySidebar() {
    if (elements.sidebarMenu) {
        elements.sidebarMenu.removeEventListener('click', handleMenuItemClick);
    }
    if (elements.sidebarFooter) {
        elements.sidebarFooter.removeEventListener('click', handleMenuItemClick);
    }
    if (elements.hamburgerBtn) {
        elements.hamburgerBtn.removeEventListener('click', handleMobileToggle);
    }
    if (elements.overlay) {
        elements.overlay.removeEventListener('click', handleOverlayClick);
    }

    window.removeEventListener('resize', handleResize);

    const router = getRouter();
    router.off('routeChange', handleRouteChange);

    // إزالة زر التصغير
    const collapseBtn = document.querySelector('.sidebar-collapse-btn');
    if (collapseBtn) {
        collapseBtn.remove();
    }

    console.log('Sidebar component destroyed');
}

// ============================================
//  8.  API عام للمكون
// ============================================

export const sidebar = {
    init: initSidebar,
    destroy: destroySidebar,
    toggleCollapse,
    toggleMobile,
    updateMenuForRole,
    setActive: renderActive,
    refresh: () => {
        const user = getItem(STORAGE_KEYS.USER_DATA);
        state.userRole = user?.role || ROLES.EMPLOYEE;
        renderMenu();
        renderActive(state.activePath);
    },
};

// تصدير افتراضي
export default sidebar;

// ============================================
//  9.  تهيئة تلقائية عند تحميل الوحدة
// ============================================

// سيتم استدعاء init من app.js، لذلك لا نقوم بتهيئة تلقائية هنا

// ============================================
//  10. نهاية الملف
// ============================================
