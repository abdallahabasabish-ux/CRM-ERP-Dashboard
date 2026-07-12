/**
 * ======================================================
 * الملف: components/navbar/navbar.js
 * الوصف: مكون الشريط العلوي (Navbar)
 *         يحتوي على الشعار، البحث، الإشعارات، الرسائل،
 *         وقائمة المستخدم مع تبديل الثيم وتسجيل الخروج
 * الإصدار: 1.0.0
 * التاريخ: 2026-07-12
 * ======================================================
 */

import { getItem, setItem } from '../../utils/storage.js';
import { STORAGE_KEYS } from '../../utils/constants.js';
import { getRouter, navigateTo } from '../../utils/router.js';
import { toggleTheme, getCurrentTheme, isDarkMode } from '../../utils/theme.js';
import { debounce } from '../../utils/helpers.js';
import { api } from '../../utils/api.js';

// ============================================
//  1.  حالة المكون (State)
// ============================================

const state = {
    user: null,
    notifications: [],
    unreadNotifications: 0,
    unreadMessages: 0,
    isSearchOpen: false,
    searchQuery: '',
    searchResults: [],
    isSearching: false,
};

// ============================================
//  2.  مراجع DOM
// ============================================

let elements = {};

/**
 * تهيئة مراجع العناصر
 */
function initElements() {
    elements = {
        navbar: document.querySelector('.navbar'),
        brandLink: document.querySelector('.brand-link'),
        searchInput: document.getElementById('globalSearch'),
        searchWrapper: document.querySelector('.search-wrapper'),
        searchResults: document.querySelector('.search-results'),
        notificationBtn: document.getElementById('notificationBtn'),
        notificationBadge: document.getElementById('notificationBadge'),
        messagesBtn: document.getElementById('messagesBtn'),
        messagesBadge: document.getElementById('messagesBadge'),
        userMenuBtn: document.getElementById('userMenuBtn'),
        userDropdown: document.getElementById('userDropdown'),
        userAvatar: document.getElementById('userAvatar'),
        userName: document.getElementById('userName'),
        logoutBtn: document.getElementById('logoutBtn'),
        themeToggleBtn: document.getElementById('themeToggleBtn'),
        themeToggleText: document.getElementById('themeToggleText'),
        hamburgerBtn: document.querySelector('.hamburger-btn'),
        sidebarOverlay: document.querySelector('.sidebar-overlay'),
    };
}

// ============================================
//  3.  عرض المكون (Render)
// ============================================

/**
 * تحديث واجهة المستخدم بناءً على الحالة
 */
function render() {
    renderUserInfo();
    renderNotifications();
    renderMessages();
    renderThemeToggle();
    renderSearchResults();
}

/**
 * عرض معلومات المستخدم
 */
function renderUserInfo() {
    const user = state.user;
    if (!user) return;

    if (elements.userName) {
        elements.userName.textContent = user.name || 'المستخدم';
    }

    if (elements.userAvatar) {
        if (user.avatar) {
            elements.userAvatar.src = user.avatar;
        } else {
            // استخدام الأحرف الأولى كصورة افتراضية
            const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';
            elements.userAvatar.src = `data:image/svg+xml,${encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
                    <rect width="40" height="40" rx="20" fill="#2d7ff9"/>
                    <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="white" font-size="18" font-weight="bold">${initials}</text>
                </svg>
            `)}`;
        }
    }
}

/**
 * عرض الإشعارات
 */
function renderNotifications() {
    const count = state.unreadNotifications || 0;
    if (elements.notificationBadge) {
        elements.notificationBadge.textContent = count > 0 ? count : '0';
        elements.notificationBadge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
}

/**
 * عرض الرسائل
 */
function renderMessages() {
    const count = state.unreadMessages || 0;
    if (elements.messagesBadge) {
        elements.messagesBadge.textContent = count > 0 ? count : '0';
        elements.messagesBadge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
}

/**
 * عرض زر تبديل الثيم
 */
function renderThemeToggle() {
    const theme = getCurrentTheme();
    const isDark = isDarkMode();

    if (elements.themeToggleText) {
        if (theme === 'auto') {
            elements.themeToggleText.textContent = isDark ? 'الوضع التلقائي (ليلي)' : 'الوضع التلقائي (نهاري)';
        } else {
            elements.themeToggleText.textContent = isDark ? 'الوضع النهاري' : 'الوضع الليلي';
        }
    }

    // تغيير الأيقونة (يمكن إضافتها لاحقاً)
}

/**
 * عرض نتائج البحث
 */
function renderSearchResults() {
    if (!elements.searchResults) return;

    if (state.searchQuery.trim() === '' || state.searchResults.length === 0) {
        elements.searchResults.classList.remove('show');
        elements.searchResults.innerHTML = '';
        return;
    }

    elements.searchResults.classList.add('show');

    // بناء قائمة النتائج
    let html = '';
    state.searchResults.forEach(result => {
        const icon = result.type === 'customer' ? '👤' :
                    result.type === 'order' ? '📦' :
                    result.type === 'employee' ? '👨‍💼' :
                    result.type === 'service' ? '⚙️' : '📄';
        html += `
            <div class="search-result-item" data-type="${result.type}" data-id="${result.id}" data-url="${result.url}">
                <span class="result-icon">${icon}</span>
                <div class="result-text">
                    <div class="title">${result.title || result.name || ''}</div>
                    <div class="subtitle">${result.subtitle || ''}</div>
                </div>
                <span class="result-type">${result.typeLabel || result.type}</span>
            </div>
        `;
    });

    elements.searchResults.innerHTML = html;

    // إضافة مستمعات للنقر على النتائج
    elements.searchResults.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
            const url = item.dataset.url;
            if (url) {
                navigateTo(url);
                closeSearch();
            }
        });
    });
}

// ============================================
//  4.  دوال التحكم (Actions)
// ============================================

/**
 * فتح/إغلاق القائمة الجانبية (للأجهزة المحمولة)
 */
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = elements.sidebarOverlay;

    if (sidebar) {
        sidebar.classList.toggle('open');
        if (overlay) {
            overlay.classList.toggle('show');
        }
    }
}

/**
 * فتح قائمة المستخدم
 */
function toggleUserDropdown() {
    if (elements.userDropdown) {
        elements.userDropdown.classList.toggle('show');
    }
}

/**
 * إغلاق قائمة المستخدم
 */
function closeUserDropdown() {
    if (elements.userDropdown) {
        elements.userDropdown.classList.remove('show');
    }
}

/**
 * فتح/إغلاق البحث
 */
function toggleSearch() {
    state.isSearchOpen = !state.isSearchOpen;
    if (elements.searchInput) {
        if (state.isSearchOpen) {
            elements.searchInput.focus();
        } else {
            elements.searchInput.blur();
            closeSearch();
        }
    }
}

/**
 * إغلاق البحث
 */
function closeSearch() {
    state.isSearchOpen = false;
    state.searchQuery = '';
    state.searchResults = [];
    if (elements.searchInput) {
        elements.searchInput.value = '';
    }
    renderSearchResults();
}

/**
 * تنفيذ البحث
 */
const performSearch = debounce(async (query) => {
    if (!query || query.trim().length < 2) {
        state.searchResults = [];
        renderSearchResults();
        return;
    }

    state.isSearching = true;

    try {
        const response = await api.search.search(query);
        if (response.success && response.data) {
            state.searchResults = response.data;
        } else {
            state.searchResults = [];
        }
    } catch (error) {
        console.error('Search error:', error);
        state.searchResults = [];
    } finally {
        state.isSearching = false;
        renderSearchResults();
    }
}, 300);

/**
 * تسجيل الخروج
 */
async function handleLogout() {
    try {
        await api.auth.logout();
        // تنظيف البيانات المحلية
        setItem(STORAGE_KEYS.AUTH_TOKEN, null);
        setItem(STORAGE_KEYS.USER_DATA, null);
        // التوجيه إلى صفحة تسجيل الدخول
        navigateTo('/login');
        // إعادة تحميل الصفحة لتطبيق التغييرات
        window.location.reload();
    } catch (error) {
        console.error('Logout error:', error);
        // حتى في حالة الخطأ، نقوم بتسجيل الخروج محلياً
        setItem(STORAGE_KEYS.AUTH_TOKEN, null);
        setItem(STORAGE_KEYS.USER_DATA, null);
        navigateTo('/login');
        window.location.reload();
    }
}

/**
 * تبديل الثيم
 */
function handleThemeToggle() {
    const theme = getCurrentTheme();
    let newTheme;
    if (theme === 'light') newTheme = 'dark';
    else if (theme === 'dark') newTheme = 'auto';
    else newTheme = 'light';
    toggleTheme(newTheme);
    renderThemeToggle();
}

/**
 * الانتقال إلى صفحة الإشعارات
 */
function goToNotifications() {
    navigateTo('/notifications');
}

/**
 * الانتقال إلى صفحة الرسائل
 */
function goToMessages() {
    navigateTo('/messages');
}

// ============================================
//  5.  جلب البيانات (Data Fetching)
// ============================================

/**
 * جلب بيانات المستخدم الحالي
 */
async function fetchUserData() {
    const user = getItem(STORAGE_KEYS.USER_DATA);
    if (user) {
        state.user = user;
        render();
    } else {
        // محاولة جلب بيانات المستخدم من API
        try {
            const response = await api.auth.verify();
            if (response.success && response.user) {
                state.user = response.user;
                setItem(STORAGE_KEYS.USER_DATA, response.user);
                render();
            }
        } catch (error) {
            console.error('Failed to fetch user data:', error);
        }
    }
}

/**
 * جلب عدد الإشعارات غير المقروءة
 */
async function fetchUnreadNotifications() {
    try {
        const response = await api.notifications.getAll({ limit: 1, unread: true });
        if (response.success && response.data) {
            state.unreadNotifications = response.total || response.data.length || 0;
            renderNotifications();
        }
    } catch (error) {
        console.error('Failed to fetch notifications:', error);
    }
}

/**
 * جلب عدد الرسائل غير المقروءة
 */
async function fetchUnreadMessages() {
    try {
        const response = await api.messages.getAll({ limit: 1, unread: true });
        if (response.success && response.data) {
            state.unreadMessages = response.total || response.data.length || 0;
            renderMessages();
        }
    } catch (error) {
        console.error('Failed to fetch messages:', error);
    }
}

// ============================================
//  6.  ربط الأحداث (Event Binding)
// ============================================

/**
 * ربط جميع الأحداث
 */
function bindEvents() {
    // زر القائمة الجانبية (همبرغر)
    if (elements.hamburgerBtn) {
        elements.hamburgerBtn.addEventListener('click', toggleSidebar);
    }

    // تغطية القائمة الجانبية
    if (elements.sidebarOverlay) {
        elements.sidebarOverlay.addEventListener('click', () => {
            document.querySelector('.sidebar')?.classList.remove('open');
            elements.sidebarOverlay.classList.remove('show');
        });
    }

    // زر المستخدم
    if (elements.userMenuBtn) {
        elements.userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleUserDropdown();
        });
    }

    // إغلاق القائمة المنسدلة عند النقر خارجها
    document.addEventListener('click', (e) => {
        if (elements.userDropdown && !elements.userDropdown.contains(e.target) && !elements.userMenuBtn?.contains(e.target)) {
            closeUserDropdown();
        }
    });

    // زر تسجيل الخروج
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', handleLogout);
    }

    // زر تبديل الثيم
    if (elements.themeToggleBtn) {
        elements.themeToggleBtn.addEventListener('click', handleThemeToggle);
    }

    // زر الإشعارات
    if (elements.notificationBtn) {
        elements.notificationBtn.addEventListener('click', goToNotifications);
    }

    // زر الرسائل
    if (elements.messagesBtn) {
        elements.messagesBtn.addEventListener('click', goToMessages);
    }

    // شريط البحث
    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', (e) => {
            state.searchQuery = e.target.value;
            performSearch(state.searchQuery);
        });

        elements.searchInput.addEventListener('focus', () => {
            state.isSearchOpen = true;
            if (state.searchQuery.trim() !== '') {
                renderSearchResults();
            }
        });

        elements.searchInput.addEventListener('blur', () => {
            // تأخير الإغلاق للسماح بالنقر على النتائج
            setTimeout(() => {
                if (!elements.searchResults?.matches(':hover')) {
                    closeSearch();
                }
            }, 200);
        });

        // إغلاق البحث بالضغط على Escape
        elements.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeSearch();
                elements.searchInput.blur();
            }
            if (e.key === 'Enter') {
                if (state.searchResults.length > 0) {
                    // الانتقال إلى أول نتيجة
                    const firstResult = elements.searchResults.querySelector('.search-result-item');
                    if (firstResult) {
                        const url = firstResult.dataset.url;
                        if (url) {
                            navigateTo(url);
                            closeSearch();
                        }
                    }
                }
            }
        });
    }

    // إغلاق البحث بالنقر خارجها
    document.addEventListener('click', (e) => {
        if (elements.searchWrapper && !elements.searchWrapper.contains(e.target)) {
            closeSearch();
        }
    });

    // الشعار - العودة إلى لوحة التحكم
    if (elements.brandLink) {
        elements.brandLink.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('/dashboard');
        });
    }
}

// ============================================
//  7.  التهيئة (Initialization)
// ============================================

/**
 * تهيئة مكون Navbar
 */
export async function initNavbar() {
    // تهيئة مراجع العناصر
    initElements();

    // ربط الأحداث
    bindEvents();

    // جلب البيانات
    await Promise.all([
        fetchUserData(),
        fetchUnreadNotifications(),
        fetchUnreadMessages(),
    ]);

    // تحديث الثيم
    renderThemeToggle();

    console.log('Navbar component initialized successfully');
}

/**
 * تحديث بيانات المكون (للاستخدام من خارج المكون)
 */
export function refreshNavbar() {
    fetchUserData();
    fetchUnreadNotifications();
    fetchUnreadMessages();
}

/**
 * تحديث عدد الإشعارات (للاستخدام من خارج المكون)
 */
export function updateNotificationCount(count) {
    state.unreadNotifications = count || 0;
    renderNotifications();
}

/**
 * تحديث عدد الرسائل (للاستخدام من خارج المكون)
 */
export function updateMessageCount(count) {
    state.unreadMessages = count || 0;
    renderMessages();
}

// ============================================
//  8.  تصدير المكون
// ============================================

export const navbar = {
    init: initNavbar,
    refresh: refreshNavbar,
    updateNotifications: updateNotificationCount,
    updateMessages: updateMessageCount,
};

// تصدير افتراضي
export default navbar;

// ============================================
//  9.  تنفيذ التهيئة عند تحميل الوحدة
// ============================================

// إذا كانت الصفحة قد اكتمل تحميلها، قم بالتهيئة فوراً
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initNavbar();
} else {
    document.addEventListener('DOMContentLoaded', initNavbar);
}

// ============================================
//  10. نهاية الملف
// ============================================
