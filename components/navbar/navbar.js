/**
 * ======================================================
 * الملف: components/navbar/navbar.js
 * الوصف: مكون الشريط العلوي (Navbar)
 *         يدير عرض معلومات المستخدم، الإشعارات،
 *         الرسائل، البحث، القائمة المنسدلة، والتفاعلات
 * الإصدار: 1.0.0
 * التاريخ: 2026-07-12
 * ======================================================
 */

import { getItem, setItem } from '../../utils/storage.js';
import { STORAGE_KEYS } from '../../utils/constants.js';
import { debounce, escapeHtml, getInitials, toggleClass, addClass, removeClass } from '../../utils/helpers.js';
import { getRouter, navigateTo } from '../../utils/router.js';
import { api } from '../../utils/api.js';
import { toggleTheme, getCurrentTheme, getSystemTheme } from '../../utils/theme.js';

// ============================================
//  1.  حالة المكون (State)
// ============================================

const state = {
    user: null,
    notifications: [],
    unreadNotifications: 0,
    messages: [],
    unreadMessages: 0,
    searchQuery: '',
    isSearchActive: false,
    isUserMenuOpen: false,
    isNotificationsOpen: false,
    isMessagesOpen: false,
    isMobile: window.innerWidth < 768,
    theme: getCurrentTheme(),
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
        userAvatar: document.getElementById('userAvatar'),
        userName: document.getElementById('userName'),
        userMenuBtn: document.getElementById('userMenuBtn'),
        userDropdown: document.getElementById('userDropdown'),
        notificationBtn: document.getElementById('notificationBtn'),
        notificationBadge: document.getElementById('notificationBadge'),
        messagesBtn: document.getElementById('messagesBtn'),
        messagesBadge: document.getElementById('messagesBadge'),
        globalSearch: document.getElementById('globalSearch'),
        themeToggleBtn: document.getElementById('themeToggleBtn'),
        themeToggleText: document.getElementById('themeToggleText'),
        logoutBtn: document.getElementById('logoutBtn'),
        navbar: document.getElementById('navbar'),
    };
}

// ============================================
//  3.  دوال العرض (Render)
// ============================================

/**
 * تحديث معلومات المستخدم في الواجهة
 */
function renderUser() {
    const { user } = state;
    if (!user || !elements.userAvatar || !elements.userName) return;

    // الصورة الشخصية
    if (user.avatar) {
        elements.userAvatar.src = user.avatar;
        elements.userAvatar.alt = user.name || 'المستخدم';
    } else {
        // عرض الأحرف الأولى كصورة افتراضية
        const initials = getInitials(user.name || 'مستخدم', 2);
        elements.userAvatar.src = '';
        elements.userAvatar.alt = initials;
        // يمكن إضافة SVG أو Canvas كصورة افتراضية
        elements.userAvatar.style.backgroundColor = '#2d7ff9';
        elements.userAvatar.style.display = 'flex';
        elements.userAvatar.style.alignItems = 'center';
        elements.userAvatar.style.justifyContent = 'center';
        elements.userAvatar.style.color = '#ffffff';
        elements.userAvatar.style.fontWeight = 'bold';
        elements.userAvatar.style.fontSize = '16px';
        elements.userAvatar.textContent = initials;
    }

    // اسم المستخدم
    elements.userName.textContent = user.name || 'المستخدم';
}

/**
 * تحديث شارة الإشعارات
 */
function renderNotificationsBadge() {
    if (!elements.notificationBadge) return;
    const count = state.unreadNotifications;
    if (count > 0) {
        elements.notificationBadge.textContent = count > 99 ? '99+' : count;
        elements.notificationBadge.style.display = 'inline-flex';
    } else {
        elements.notificationBadge.style.display = 'none';
    }
}

/**
 * تحديث شارة الرسائل
 */
function renderMessagesBadge() {
    if (!elements.messagesBadge) return;
    const count = state.unreadMessages;
    if (count > 0) {
        elements.messagesBadge.textContent = count > 99 ? '99+' : count;
        elements.messagesBadge.style.display = 'inline-flex';
    } else {
        elements.messagesBadge.style.display = 'none';
    }
}

/**
 * تحديث حالة الوضع الليلي
 */
function renderTheme() {
    if (!elements.themeToggleText) return;
    const theme = state.theme;
    if (theme === 'dark') {
        elements.themeToggleText.textContent = 'الوضع النهاري';
    } else if (theme === 'light') {
        elements.themeToggleText.textContent = 'الوضع الليلي';
    } else {
        elements.themeToggleText.textContent = 'تلقائي';
    }
}

/**
 * عرض/إخفاء القائمة المنسدلة للمستخدم
 */
function renderUserMenu(show) {
    if (!elements.userDropdown) return;
    if (show) {
        addClass(elements.userDropdown, 'show');
        state.isUserMenuOpen = true;
    } else {
        removeClass(elements.userDropdown, 'show');
        state.isUserMenuOpen = false;
    }
}

/**
 * عرض نتائج البحث (قائمة منسدلة)
 */
function renderSearchResults(results) {
    // إنشاء حاوية النتائج إذا لم تكن موجودة
    let resultsContainer = document.querySelector('.search-results');
    const searchWrapper = document.querySelector('.search-wrapper');

    if (!resultsContainer) {
        resultsContainer = document.createElement('div');
        resultsContainer.className = 'search-results';
        searchWrapper?.appendChild(resultsContainer);
    }

    if (!results || results.length === 0) {
        resultsContainer.innerHTML = `
            <div class="search-result-item" style="justify-content:center;color:var(--text-tertiary);padding:var(--spacing-4);">
                لا توجد نتائج
            </div>
        `;
        resultsContainer.classList.add('show');
        return;
    }

    let html = '';
    results.forEach(item => {
        const icon = item.icon || '📄';
        const type = item.type || 'عام';
        const title = escapeHtml(item.title || '');
        const subtitle = escapeHtml(item.subtitle || '');
        const link = item.link || '#';

        html += `
            <a href="${link}" class="search-result-item" data-link="${link}">
                <span class="result-icon">${icon}</span>
                <div class="result-text">
                    <div class="title">${title}</div>
                    ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
                </div>
                <span class="result-type">${type}</span>
            </a>
        `;
    });

    resultsContainer.innerHTML = html;
    resultsContainer.classList.add('show');

    // إضافة مستمعات للنقر على النتائج
    resultsContainer.querySelectorAll('.search-result-item[data-link]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const link = el.getAttribute('data-link');
            if (link) {
                navigateTo(link);
                closeSearch();
            }
        });
    });
}

/**
 * إغلاق نتائج البحث
 */
function closeSearch() {
    const resultsContainer = document.querySelector('.search-results');
    if (resultsContainer) {
        resultsContainer.classList.remove('show');
    }
    state.isSearchActive = false;
}

// ============================================
//  4.  دوال جلب البيانات (Fetch)
// ============================================

/**
 * جلب بيانات المستخدم من التخزين المحلي أو API
 */
async function fetchUserData() {
    const user = getItem(STORAGE_KEYS.USER_DATA);
    if (user) {
        state.user = user;
        renderUser();
    } else {
        // محاولة جلب من API
        try {
            const response = await api.auth.verify();
            if (response.valid && response.user) {
                state.user = response.user;
                setItem(STORAGE_KEYS.USER_DATA, response.user);
                renderUser();
            }
        } catch (error) {
            console.warn('Failed to fetch user data:', error);
        }
    }
}

/**
 * جلب الإشعارات غير المقروءة
 */
async function fetchNotifications() {
    try {
        const response = await api.notifications.getAll({ limit: 10, read: false });
        if (response.success && response.data) {
            state.notifications = response.data;
            state.unreadNotifications = response.data.filter(n => !n.read).length;
            renderNotificationsBadge();
        }
    } catch (error) {
        console.warn('Failed to fetch notifications:', error);
        // استخدام بيانات مخزنة مؤقتاً
        const cached = getItem('erp_notifications_cache');
        if (cached) {
            state.notifications = cached;
            state.unreadNotifications = cached.filter(n => !n.read).length;
            renderNotificationsBadge();
        }
    }
}

/**
 * جلب الرسائل غير المقروءة
 */
async function fetchMessages() {
    try {
        const response = await api.messages.getAll({ limit: 10, unread: true });
        if (response.success && response.data) {
            state.messages = response.data;
            state.unreadMessages = response.data.filter(m => !m.read).length;
            renderMessagesBadge();
        }
    } catch (error) {
        console.warn('Failed to fetch messages:', error);
        const cached = getItem('erp_messages_cache');
        if (cached) {
            state.messages = cached;
            state.unreadMessages = cached.filter(m => !m.read).length;
            renderMessagesBadge();
        }
    }
}

/**
 * البحث العام
 */
async function performSearch(query) {
    if (!query || query.trim().length < 2) {
        closeSearch();
        return;
    }

    try {
        const response = await api.search.search(query);
        if (response.success && response.data) {
            renderSearchResults(response.data);
        } else {
            renderSearchResults([]);
        }
    } catch (error) {
        console.warn('Search error:', error);
        renderSearchResults([]);
    }
}

// ============================================
//  5.  معالجات الأحداث (Event Handlers)
// ============================================

/**
 * معالج زر القائمة المنسدلة للمستخدم
 */
function handleUserMenuToggle(e) {
    e.stopPropagation();
    renderUserMenu(!state.isUserMenuOpen);
}

/**
 * معالج زر الإشعارات
 */
function handleNotificationsClick() {
    // التنقل إلى صفحة الإشعارات
    navigateTo('/notifications');
}

/**
 * معالج زر الرسائل
 */
function handleMessagesClick() {
    // التنقل إلى صفحة الرسائل
    navigateTo('/messages');
}

/**
 * معالج تبديل الوضع الليلي
 */
function handleThemeToggle(e) {
    e.preventDefault();
    const newTheme = toggleTheme();
    state.theme = newTheme;
    renderTheme();
}

/**
 * معالج تسجيل الخروج
 */
async function handleLogout(e) {
    e.preventDefault();
    try {
        await api.auth.logout();
        // تنظيف التخزين المحلي
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER_DATA);
        // إعادة توجيه إلى صفحة تسجيل الدخول
        navigateTo('/login');
    } catch (error) {
        console.error('Logout error:', error);
        // حتى في حالة الخطأ، نقوم بتسجيل الخروج محلياً
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER_DATA);
        navigateTo('/login');
    }
}

/**
 * معالج البحث (مع debounce)
 */
const handleSearch = debounce((e) => {
    const query = e.target.value.trim();
    state.searchQuery = query;
    if (query.length >= 2) {
        performSearch(query);
        state.isSearchActive = true;
    } else {
        closeSearch();
        state.isSearchActive = false;
    }
}, 300);

/**
 * معالج إغلاق البحث عند الضغط على ESC
 */
function handleSearchKeydown(e) {
    if (e.key === 'Escape') {
        closeSearch();
        elements.globalSearch.value = '';
        state.searchQuery = '';
        elements.globalSearch.blur();
    }
}

/**
 * معالج النقر خارج القائمة المنسدلة والبحث
 */
function handleOutsideClick(e) {
    // إغلاق قائمة المستخدم
    if (state.isUserMenuOpen) {
        const target = e.target;
        if (!elements.userMenuBtn.contains(target) && !elements.userDropdown.contains(target)) {
            renderUserMenu(false);
        }
    }

    // إغلاق نتائج البحث
    if (state.isSearchActive) {
        const target = e.target;
        const searchWrapper = document.querySelector('.search-wrapper');
        const resultsContainer = document.querySelector('.search-results');
        if (searchWrapper && !searchWrapper.contains(target)) {
            closeSearch();
        }
    }
}

/**
 * معالج تغيير حجم الشاشة
 */
function handleResize() {
    const isMobile = window.innerWidth < 768;
    if (state.isMobile !== isMobile) {
        state.isMobile = isMobile;
        // تحديث واجهة القائمة الجانبية (سيتم التعامل معها في sidebar)
    }
}

/**
 * معالج تغيير المسار (من Router)
 */
function handleRouteChange(data) {
    // إغلاق القوائم المفتوحة عند تغيير الصفحة
    if (state.isUserMenuOpen) {
        renderUserMenu(false);
    }
    if (state.isSearchActive) {
        closeSearch();
    }
    // تحديث البيانات إذا لزم الأمر
    fetchNotifications();
    fetchMessages();
}

// ============================================
//  6.  دوال التهيئة والتنظيف
// ============================================

/**
 * تهيئة المكون
 */
export async function initNavbar() {
    // تهيئة المراجع
    initElements();

    // جلب البيانات
    await fetchUserData();
    await fetchNotifications();
    await fetchMessages();

    // تعيين الوضع الليلي
    state.theme = getCurrentTheme();
    renderTheme();

    // ربط الأحداث
    if (elements.userMenuBtn) {
        elements.userMenuBtn.addEventListener('click', handleUserMenuToggle);
    }

    if (elements.notificationBtn) {
        elements.notificationBtn.addEventListener('click', handleNotificationsClick);
    }

    if (elements.messagesBtn) {
        elements.messagesBtn.addEventListener('click', handleMessagesClick);
    }

    if (elements.themeToggleBtn) {
        elements.themeToggleBtn.addEventListener('click', handleThemeToggle);
    }

    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', handleLogout);
    }

    if (elements.globalSearch) {
        elements.globalSearch.addEventListener('input', handleSearch);
        elements.globalSearch.addEventListener('keydown', handleSearchKeydown);
        // إضافة زر مسح البحث
        const clearBtn = document.createElement('button');
        clearBtn.className = 'search-clear';
        clearBtn.innerHTML = '✕';
        clearBtn.setAttribute('aria-label', 'مسح البحث');
        clearBtn.style.display = 'none';
        elements.globalSearch.parentNode.appendChild(clearBtn);

        elements.globalSearch.addEventListener('input', () => {
            if (elements.globalSearch.value.length > 0) {
                clearBtn.style.display = 'block';
            } else {
                clearBtn.style.display = 'none';
            }
        });

        clearBtn.addEventListener('click', () => {
            elements.globalSearch.value = '';
            clearBtn.style.display = 'none';
            closeSearch();
            elements.globalSearch.focus();
        });
    }

    // مستمعات عامة
    document.addEventListener('click', handleOutsideClick);
    window.addEventListener('resize', handleResize);

    // الاستماع لأحداث الموجه
    const router = getRouter();
    router.on('routeChange', handleRouteChange);

    // تحديث البيانات بشكل دوري (كل 30 ثانية)
    const intervalId = setInterval(() => {
        if (document.hidden) return; // عدم التحديث في الخلفية
        fetchNotifications();
        fetchMessages();
    }, 30000);

    // حفظ معرف الفاصل الزمني للتنظيف
    window._navbarInterval = intervalId;

    console.log('Navbar component initialized successfully');
}

/**
 * تنظيف المكون (إزالة المستمعات)
 */
export function destroyNavbar() {
    if (elements.userMenuBtn) {
        elements.userMenuBtn.removeEventListener('click', handleUserMenuToggle);
    }
    if (elements.notificationBtn) {
        elements.notificationBtn.removeEventListener('click', handleNotificationsClick);
    }
    if (elements.messagesBtn) {
        elements.messagesBtn.removeEventListener('click', handleMessagesClick);
    }
    if (elements.themeToggleBtn) {
        elements.themeToggleBtn.removeEventListener('click', handleThemeToggle);
    }
    if (elements.logoutBtn) {
        elements.logoutBtn.removeEventListener('click', handleLogout);
    }
    if (elements.globalSearch) {
        elements.globalSearch.removeEventListener('input', handleSearch);
        elements.globalSearch.removeEventListener('keydown', handleSearchKeydown);
    }
    document.removeEventListener('click', handleOutsideClick);
    window.removeEventListener('resize', handleResize);

    const router = getRouter();
    router.off('routeChange', handleRouteChange);

    if (window._navbarInterval) {
        clearInterval(window._navbarInterval);
        delete window._navbarInterval;
    }

    console.log('Navbar component destroyed');
}

// ============================================
//  7.  API عام للمكون
// ============================================

export const navbar = {
    init: initNavbar,
    destroy: destroyNavbar,
    refresh: () => {
        fetchNotifications();
        fetchMessages();
        fetchUserData();
    },
    setUser: (user) => {
        state.user = user;
        renderUser();
    },
};

// تصدير افتراضي
export default navbar;

// ============================================
//  8.  تهيئة تلقائية عند تحميل الوحدة
// ============================================

// سيتم استدعاء init من app.js، لذلك لا نقوم بتهيئة تلقائية هنا

// ============================================
//  9.  نهاية الملف
// ============================================
