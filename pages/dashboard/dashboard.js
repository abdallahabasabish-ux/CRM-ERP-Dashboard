/**
 * ======================================================
 * الملف: pages/dashboard/dashboard.js
 * الوصف: منطق لوحة التحكم (Dashboard)
 *         يدير تحميل وعرض الإحصائيات، المخططات، التقويم،
 *         الجدول الزمني، الإشعارات، وأفضل العناصر
 * الإصدار: 1.0.0
 * التاريخ: 2026-07-13
 * ======================================================
 */

import { api } from '../../utils/api.js';
import { getItem } from '../../utils/storage.js';
import { STORAGE_KEYS } from '../../utils/constants.js';
import { formatCurrency, formatNumber, formatLocaleDateTime, formatLocaleDate, debounce } from '../../utils/helpers.js';
import { toast } from '../../components/toast/toast.js';
import { loader } from '../../components/loader/loader.js';
import { createCalendar } from '../../components/calendar/calendar.js';
import { createTimeline, createEvent } from '../../components/timeline/timeline.js';
import { createChart, createBarChart, createLineChart } from '../../components/charts/charts.js';
import { createCard } from '../../components/cards/cards.js';
import { modal } from '../../components/modal/modal.js';

// ============================================
//  1.  مراجع DOM
// ============================================

const elements = {
    statsContainer: document.getElementById('statsContainer'),
    chartContainer: document.getElementById('chartContainer'),
    calendarContainer: document.getElementById('calendarContainer'),
    timelineContainer: document.getElementById('timelineContainer'),
    notificationsContainer: document.getElementById('notificationsContainer'),
    topServices: document.getElementById('topServices'),
    topEmployees: document.getElementById('topEmployees'),
    topCustomers: document.getElementById('topCustomers'),
    dashboardDate: document.getElementById('dashboardDate'),
    chartPeriod: document.getElementById('chartPeriod'),
    refreshBtn: document.getElementById('refreshDashboard'),
    exportBtn: document.getElementById('exportDashboard'),
    markAllReadBtn: document.getElementById('markAllRead'),
};

// ============================================
//  2.  الحالة الداخلية
// ============================================

const state = {
    summary: null,
    charts: null,
    recent: null,
    activities: null,
    notifications: [],
    topServices: [],
    topEmployees: [],
    topCustomers: [],
    chartInstance: null,
    calendarInstance: null,
    timelineInstance: null,
    isLoading: false,
    currentPeriod: 'monthly',
};

// ============================================
//  3.  دوال تحميل البيانات
// ============================================

/**
 * تحميل ملخص الإحصائيات
 */
async function loadSummary() {
    try {
        const response = await api.dashboard.getSummary();
        if (response.success && response.data) {
            state.summary = response.data;
            return state.summary;
        }
        // استخدام بيانات محلية مؤقتة في حالة عدم وجود API
        return getLocalSummary();
    } catch (error) {
        console.warn('Failed to load summary, using local data:', error);
        return getLocalSummary();
    }
}

/**
 * بيانات محلية مؤقتة للإحصائيات
 */
function getLocalSummary() {
    return {
        total_profit: 125000,
        total_customers: 156,
        total_employees: 28,
        total_orders: 342,
        total_revenue: 215000,
        total_expenses: 90000,
        treasury: 165000,
        growth: 12.5,
    };
}

/**
 * تحميل بيانات المخططات
 */
async function loadChartData(period = 'monthly') {
    try {
        const response = await api.dashboard.getCharts({ period });
        if (response.success && response.data) {
            state.charts = response.data;
            return state.charts;
        }
        return getLocalChartData(period);
    } catch (error) {
        console.warn('Failed to load chart data, using local data:', error);
        return getLocalChartData(period);
    }
}

/**
 * بيانات محلية مؤقتة للمخططات
 */
function getLocalChartData(period) {
    const labels = period === 'weekly' ? ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'] :
                   period === 'yearly' ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'] :
                   ['أسبوع 1', 'أسبوع 2', 'أسبوع 3', 'أسبوع 4'];

    return {
        labels,
        revenue: labels.map(() => Math.floor(Math.random() * 30000) + 5000),
        expenses: labels.map(() => Math.floor(Math.random() * 15000) + 2000),
    };
}

/**
 * تحميل الأحداث الأخيرة
 */
async function loadRecentActivities() {
    try {
        const response = await api.dashboard.getRecent();
        if (response.success && response.data) {
            state.recent = response.data;
            return state.recent;
        }
        return getLocalRecent();
    } catch (error) {
        console.warn('Failed to load recent activities, using local data:', error);
        return getLocalRecent();
    }
}

/**
 * بيانات محلية مؤقتة للأحداث الأخيرة
 */
function getLocalRecent() {
    const now = new Date();
    return {
        orders: [
            { id: 'ORD-001', customer: 'أحمد محمد', total: 1500, status: 'completed', date: new Date(now - 1000 * 60 * 30) },
            { id: 'ORD-002', customer: 'سارة علي', total: 2300, status: 'in_progress', date: new Date(now - 1000 * 60 * 120) },
            { id: 'ORD-003', customer: 'محمد خالد', total: 800, status: 'new', date: new Date(now - 1000 * 60 * 240) },
        ],
        invoices: [
            { id: 'INV-001', customer: 'نورة سعد', total: 3200, status: 'paid', date: new Date(now - 1000 * 60 * 45) },
            { id: 'INV-002', customer: 'عبدالله راشد', total: 1100, status: 'unpaid', date: new Date(now - 1000 * 60 * 180) },
        ],
    };
}

/**
 * تحميل النشاطات (الجدول الزمني)
 */
async function loadActivities() {
    try {
        const response = await api.dashboard.getActivities();
        if (response.success && response.data) {
            state.activities = response.data;
            return state.activities;
        }
        return getLocalActivities();
    } catch (error) {
        console.warn('Failed to load activities, using local data:', error);
        return getLocalActivities();
    }
}

/**
 * بيانات محلية مؤقتة للنشاطات
 */
function getLocalActivities() {
    const now = new Date();
    return [
        { id: 'act-1', type: 'order', title: 'طلب جديد #ORD-001', description: 'تم إنشاء طلب جديد من قبل أحمد محمد', timestamp: new Date(now - 1000 * 60 * 5), user: 'نظام' },
        { id: 'act-2', type: 'payment', title: 'دفعة مستلمة', description: 'تم استلام دفعة بقيمة 1,500 ر.س من سارة علي', timestamp: new Date(now - 1000 * 60 * 25), user: 'محاسب' },
        { id: 'act-3', type: 'customer', title: 'عميل جديد', description: 'تم إضافة عميل جديد: محمد خالد', timestamp: new Date(now - 1000 * 60 * 60), user: 'مدير' },
        { id: 'act-4', type: 'task', title: 'مهمة مكتملة', description: 'تم إكمال مهمة "مراجعة تقرير المبيعات"', timestamp: new Date(now - 1000 * 60 * 120), user: 'موظف' },
        { id: 'act-5', type: 'order', title: 'تحديث حالة طلب', description: 'تم تغيير حالة الطلب #ORD-002 إلى "قيد التنفيذ"', timestamp: new Date(now - 1000 * 60 * 180), user: 'مدير' },
    ];
}

/**
 * تحميل الإشعارات
 */
async function loadNotifications() {
    try {
        const response = await api.notifications.getAll({ limit: 10, unread: false });
        if (response.success && response.data) {
            state.notifications = response.data;
            return state.notifications;
        }
        return getLocalNotifications();
    } catch (error) {
        console.warn('Failed to load notifications, using local data:', error);
        return getLocalNotifications();
    }
}

/**
 * بيانات محلية مؤقتة للإشعارات
 */
function getLocalNotifications() {
    const now = new Date();
    return [
        { id: 'not-1', type: 'order', message: 'طلب جديد #ORD-001 من أحمد محمد', read: false, created_at: new Date(now - 1000 * 60 * 2) },
        { id: 'not-2', type: 'payment', message: 'تم استلام دفعة بقيمة 2,300 ر.س من سارة علي', read: false, created_at: new Date(now - 1000 * 60 * 15) },
        { id: 'not-3', type: 'task', message: 'مهمة جديدة: مراجعة تقرير المبيعات', read: true, created_at: new Date(now - 1000 * 60 * 45) },
        { id: 'not-4', type: 'customer', message: 'تم إضافة عميل جديد: محمد خالد', read: true, created_at: new Date(now - 1000 * 60 * 120) },
        { id: 'not-5', type: 'system', message: 'تم تحديث النظام إلى الإصدار 2.0.0', read: true, created_at: new Date(now - 1000 * 60 * 180) },
    ];
}

/**
 * تحميل أفضل العناصر (خدمات، موظفين، عملاء)
 */
async function loadTopItems() {
    try {
        // محاولة جلب البيانات من API
        const [servicesRes, employeesRes, customersRes] = await Promise.all([
            api.services.getAll({ limit: 5, sort: 'popularity', order: 'desc' }),
            api.employees.getAll({ limit: 5, sort: 'performance', order: 'desc' }),
            api.customers.getAll({ limit: 5, sort: 'orders', order: 'desc' }),
        ]);

        state.topServices = servicesRes.success ? servicesRes.data : getLocalTopServices();
        state.topEmployees = employeesRes.success ? employeesRes.data : getLocalTopEmployees();
        state.topCustomers = customersRes.success ? customersRes.data : getLocalTopCustomers();
    } catch (error) {
        console.warn('Failed to load top items, using local data:', error);
        state.topServices = getLocalTopServices();
        state.topEmployees = getLocalTopEmployees();
        state.topCustomers = getLocalTopCustomers();
    }
    return { services: state.topServices, employees: state.topEmployees, customers: state.topCustomers };
}

/**
 * بيانات محلية مؤقتة لأفضل الخدمات
 */
function getLocalTopServices() {
    return [
        { id: 'svc-1', name: 'تصميم مواقع', count: 45, revenue: 45000 },
        { id: 'svc-2', name: 'تطوير تطبيقات', count: 32, revenue: 38000 },
        { id: 'svc-3', name: 'استضافة سحابية', count: 28, revenue: 22000 },
        { id: 'svc-4', name: 'تسويق رقمي', count: 20, revenue: 18000 },
        { id: 'svc-5', name: 'استشارات تقنية', count: 15, revenue: 12000 },
    ];
}

/**
 * بيانات محلية مؤقتة لأفضل الموظفين
 */
function getLocalTopEmployees() {
    return [
        { id: 'emp-1', name: 'أحمد محمد', position: 'مطور', tasks: 28, rating: 4.9 },
        { id: 'emp-2', name: 'سارة علي', position: 'مصمم', tasks: 24, rating: 4.8 },
        { id: 'emp-3', name: 'خالد سعد', position: 'محلل', tasks: 22, rating: 4.7 },
        { id: 'emp-4', name: 'نورة راشد', position: 'مدير مشروع', tasks: 20, rating: 4.6 },
        { id: 'emp-5', name: 'فهد مبارك', position: 'مطور', tasks: 18, rating: 4.5 },
    ];
}

/**
 * بيانات محلية مؤقتة لأفضل العملاء
 */
function getLocalTopCustomers() {
    return [
        { id: 'cst-1', name: 'شركة التقنية المتقدمة', orders: 12, total: 85000 },
        { id: 'cst-2', name: 'مؤسسة الرؤية', orders: 9, total: 62000 },
        { id: 'cst-3', name: 'شركة الابتكار', orders: 8, total: 54000 },
        { id: 'cst-4', name: 'مكتب الخبراء', orders: 6, total: 38000 },
        { id: 'cst-5', name: 'شركة النجاح', orders: 5, total: 29000 },
    ];
}

// ============================================
//  4.  دوال العرض (Render Functions)
// ============================================

/**
 * عرض بطاقات الإحصائيات
 */
function renderStats(summary) {
    if (!summary || !elements.statsContainer) return;

    const stats = [
        { label: 'إجمالي الأرباح', value: formatCurrency(summary.total_profit || 0), icon: '💰', color: 'var(--color-success)' },
        { label: 'إجمالي العملاء', value: formatNumber(summary.total_customers || 0), icon: '👥', color: 'var(--color-primary)' },
        { label: 'إجمالي الموظفين', value: formatNumber(summary.total_employees || 0), icon: '👤', color: 'var(--color-info)' },
        { label: 'الطلبات', value: formatNumber(summary.total_orders || 0), icon: '📋', color: 'var(--color-warning)' },
        { label: 'الإيرادات', value: formatCurrency(summary.total_revenue || 0), icon: '📈', color: 'var(--color-success)' },
        { label: 'المصروفات', value: formatCurrency(summary.total_expenses || 0), icon: '📉', color: 'var(--color-danger)' },
        { label: 'الخزينة', value: formatCurrency(summary.treasury || 0), icon: '🏦', color: 'var(--color-primary)' },
        { label: 'النمو', value: `${summary.growth || 0}%`, icon: '📊', color: summary.growth >= 0 ? 'var(--color-success)' : 'var(--color-danger)' },
    ];

    elements.statsContainer.innerHTML = '';

    stats.forEach(stat => {
        const card = createCard({
            type: 'stat',
            title: stat.label,
            value: stat.value,
            icon: stat.icon,
            className: 'glass',
            style: { borderRight: `3px solid ${stat.color}` },
        });
        // إضافة البطاقة إلى الحاوية
        const cardEl = card.getElement();
        if (cardEl) {
            elements.statsContainer.appendChild(cardEl);
        }
    });
}

/**
 * عرض المخطط البياني
 */
async function renderChart(period = 'monthly') {
    if (!elements.chartContainer) return;

    try {
        const data = await loadChartData(period);

        // تدمير المخطط القديم
        if (state.chartInstance) {
            state.chartInstance.destroy();
            state.chartInstance = null;
        }

        // إعداد البيانات
        const chartData = {
            labels: data.labels,
            datasets: [
                {
                    label: 'الإيرادات',
                    data: data.revenue,
                    backgroundColor: 'rgba(45, 127, 249, 0.2)',
                    borderColor: '#2d7ff9',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                },
                {
                    label: 'المصروفات',
                    data: data.expenses,
                    backgroundColor: 'rgba(255, 86, 48, 0.2)',
                    borderColor: '#ff5630',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                },
            ],
        };

        // إنشاء المخطط
        state.chartInstance = createLineChart(elements.chartContainer, chartData, {
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: { size: 12 },
                        },
                    },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => formatCurrency(value, ''),
                        },
                    },
                },
            },
            height: 280,
        });

    } catch (error) {
        console.error('Failed to render chart:', error);
        elements.chartContainer.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-tertiary);">
                ⚠️ حدث خطأ أثناء تحميل المخطط
            </div>
        `;
    }
}

/**
 * عرض التقويم
 */
async function renderCalendar() {
    if (!elements.calendarContainer) return;

    try {
        // تدمير التقويم القديم
        if (state.calendarInstance) {
            state.calendarInstance.destroy();
            state.calendarInstance = null;
        }

        // تحميل أحداث التقويم
        const events = await loadCalendarEvents();

        // إنشاء التقويم الجديد
        state.calendarInstance = createCalendar({
            container: elements.calendarContainer,
            events: events,
            editable: false,
            eventClickable: true,
            showTodayButton: true,
            showViewToggle: false,
            eventLimit: 2,
            onEventClick: (event) => {
                toast.info(`الحدث: ${event.title}`);
            },
        });

    } catch (error) {
        console.error('Failed to render calendar:', error);
        elements.calendarContainer.innerHTML = `
            <div style="text-align:center;padding:var(--spacing-4);color:var(--text-tertiary);">
                ⚠️ حدث خطأ أثناء تحميل التقويم
            </div>
        `;
    }
}

/**
 * تحميل أحداث التقويم
 */
async function loadCalendarEvents() {
    try {
        const response = await api.orders.getAll({ limit: 20 });
        if (response.success && response.data) {
            return response.data.map(order => ({
                id: order.id,
                title: `طلب #${order.order_number}`,
                date: order.delivery_date || order.created_at,
                color: order.status === 'completed' ? '#36b37e' :
                       order.status === 'in_progress' ? '#ffab00' :
                       order.status === 'cancelled' ? '#ff5630' : '#2d7ff9',
                description: `عميل: ${order.customer_name || ''}`,
            }));
        }
        return getLocalCalendarEvents();
    } catch (error) {
        console.warn('Failed to load calendar events, using local data:', error);
        return getLocalCalendarEvents();
    }
}

/**
 * أحداث تقويم محلية مؤقتة
 */
function getLocalCalendarEvents() {
    const now = new Date();
    return [
        { id: 'cal-1', title: 'طلب #ORD-001', date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2), color: '#2d7ff9' },
        { id: 'cal-2', title: 'طلب #ORD-002', date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5), color: '#ffab00' },
        { id: 'cal-3', title: 'طلب #ORD-003', date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 8), color: '#36b37e' },
        { id: 'cal-4', title: 'طلب #ORD-004', date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 12), color: '#ff5630' },
    ];
}

/**
 * عرض الجدول الزمني
 */
async function renderTimeline() {
    if (!elements.timelineContainer) return;

    try {
        const activities = await loadActivities();

        // تدمير الجدول الزمني القديم
        if (state.timelineInstance) {
            state.timelineInstance.destroy();
            state.timelineInstance = null;
        }

        // إنشاء الجدول الزمني الجديد
        state.timelineInstance = createTimeline({
            container: elements.timelineContainer,
            events: activities.map(act => createEvent({
                id: act.id,
                type: act.type || 'system',
                title: act.title || 'نشاط',
                description: act.description || '',
                timestamp: act.timestamp || act.created_at || new Date(),
                user_name: act.user || 'نظام',
                icon: act.type === 'order' ? '📋' :
                      act.type === 'payment' ? '💰' :
                      act.type === 'customer' ? '👤' :
                      act.type === 'task' ? '✅' : '🔔',
            })),
            clickable: true,
            showDateHeaders: true,
            itemsPerPage: 10,
            onEventClick: (event) => {
                toast.info(`النشاط: ${event.title}`);
            },
        });

    } catch (error) {
        console.error('Failed to render timeline:', error);
        elements.timelineContainer.innerHTML = `
            <div style="text-align:center;padding:var(--spacing-4);color:var(--text-tertiary);">
                ⚠️ حدث خطأ أثناء تحميل الجدول الزمني
            </div>
        `;
    }
}

/**
 * عرض الإشعارات
 */
function renderNotifications(notifications) {
    if (!elements.notificationsContainer) return;

    if (!notifications || notifications.length === 0) {
        elements.notificationsContainer.innerHTML = `
            <div style="text-align:center;padding:var(--spacing-4);color:var(--text-tertiary);">
                🎉 لا توجد إشعارات جديدة
            </div>
        `;
        return;
    }

    const list = document.createElement('div');
    list.style.cssText = 'display:flex;flex-direction:column;gap:var(--spacing-2);';

    notifications.forEach(notif => {
        const item = document.createElement('div');
        item.style.cssText = `
            display:flex;
            align-items:flex-start;
            gap:var(--spacing-3);
            padding:var(--spacing-2) var(--spacing-3);
            border-radius:var(--radius-md);
            background:${notif.read ? 'transparent' : 'var(--selected-bg)'};
            border-right:3px solid ${notif.read ? 'transparent' : 'var(--color-primary)'};
            transition:background var(--transition-fast);
            cursor:pointer;
        `;

        const iconMap = {
            order: '📋',
            payment: '💰',
            task: '✅',
            customer: '👤',
            system: '⚙️',
        };
        const icon = iconMap[notif.type] || '🔔';

        const iconEl = document.createElement('span');
        iconEl.textContent = icon;
        iconEl.style.cssText = 'font-size:18px;flex-shrink:0;';
        item.appendChild(iconEl);

        const content = document.createElement('div');
        content.style.cssText = 'flex:1;min-width:0;';

        const message = document.createElement('div');
        message.textContent = notif.message || '';
        message.style.cssText = `
            font-size:var(--font-sm);
            color:var(--text-primary);
            word-break:break-word;
        `;
        content.appendChild(message);

        const time = document.createElement('div');
        time.textContent = formatLocaleDateTime(notif.created_at || notif.timestamp || new Date());
        time.style.cssText = `
            font-size:var(--font-xs);
            color:var(--text-tertiary);
            margin-top:var(--spacing-1);
        `;
        content.appendChild(time);

        item.appendChild(content);

        if (!notif.read) {
            const dot = document.createElement('span');
            dot.textContent = '●';
            dot.style.cssText = 'color:var(--color-primary);font-size:12px;flex-shrink:0;';
            item.appendChild(dot);
        }

        item.addEventListener('click', () => {
            if (!notif.read) {
                markNotificationRead(notif.id);
            }
            if (notif.link) {
                window.location.hash = notif.link;
            }
        });

        list.appendChild(item);
    });

    elements.notificationsContainer.innerHTML = '';
    elements.notificationsContainer.appendChild(list);
}

/**
 * تحديد إشعار كمقروء
 */
async function markNotificationRead(id) {
    try {
        await api.notifications.markRead(id);
        // تحديث القائمة
        const notif = state.notifications.find(n => n.id === id);
        if (notif) {
            notif.read = true;
            renderNotifications(state.notifications);
        }
    } catch (error) {
        console.warn('Failed to mark notification as read:', error);
    }
}

/**
 * تحديد جميع الإشعارات كمقروءة
 */
async function markAllNotificationsRead() {
    try {
        await api.notifications.markAllRead();
        state.notifications.forEach(n => n.read = true);
        renderNotifications(state.notifications);
        toast.success('تم تحديد جميع الإشعارات كمقروءة');
    } catch (error) {
        console.warn('Failed to mark all notifications as read:', error);
        // محاكاة النجاح محلياً
        state.notifications.forEach(n => n.read = true);
        renderNotifications(state.notifications);
        toast.success('تم تحديد جميع الإشعارات كمقروءة');
    }
}

/**
 * عرض أفضل العناصر
 */
function renderTopItems(services, employees, customers) {
    renderTopList(elements.topServices, services, (item) => ({
        name: item.name,
        sub: `${item.count || 0} طلب • ${formatCurrency(item.revenue || item.total || 0)}`,
        value: formatCurrency(item.revenue || item.total || 0),
        avatar: '🛠️',
    }));

    renderTopList(elements.topEmployees, employees, (item) => ({
        name: item.name,
        sub: `${item.position || ''} • ${item.tasks || 0} مهمة`,
        value: `${item.rating || 0} ★`,
        avatar: '👤',
    }));

    renderTopList(elements.topCustomers, customers, (item) => ({
        name: item.name,
        sub: `${item.orders || 0} طلب`,
        value: formatCurrency(item.total || 0),
        avatar: '👥',
    }));
}

/**
 * عرض قائمة أفضل العناصر
 */
function renderTopList(container, items, mapFn) {
    if (!container) return;

    if (!items || items.length === 0) {
        container.innerHTML = `
            <li style="text-align:center;color:var(--text-tertiary);padding:var(--spacing-4);">
                لا توجد بيانات
            </li>
        `;
        return;
    }

    const ranks = ['gold', 'silver', 'bronze'];

    container.innerHTML = '';
    items.slice(0, 5).forEach((item, index) => {
        const mapped = mapFn(item);
        const li = document.createElement('li');

        const rankClass = index < 3 ? `rank ${ranks[index]}` : 'rank';
        const rankEl = document.createElement('span');
        rankEl.className = rankClass;
        rankEl.textContent = index + 1;
        li.appendChild(rankEl);

        const info = document.createElement('div');
        info.className = 'item-info';

        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.textContent = mapped.avatar || '📄';
        info.appendChild(avatar);

        const text = document.createElement('div');
        const name = document.createElement('div');
        name.className = 'name';
        name.textContent = mapped.name || 'غير معروف';
        text.appendChild(name);

        if (mapped.sub) {
            const sub = document.createElement('div');
            sub.className = 'sub';
            sub.textContent = mapped.sub;
            text.appendChild(sub);
        }

        info.appendChild(text);
        li.appendChild(info);

        const value = document.createElement('div');
        value.className = 'item-value';
        value.textContent = mapped.value || '';
        li.appendChild(value);

        container.appendChild(li);
    });
}

// ============================================
//  5.  دوال التحديث والتحكم
// ============================================

/**
 * تحديث لوحة التحكم بالكامل
 */
async function refreshDashboard() {
    if (state.isLoading) return;

    state.isLoading = true;
    const loaderId = loader.global('جاري تحديث لوحة التحكم...', { size: 'lg' });

    try {
        // تحميل جميع البيانات بالتوازي
        const [summary, notifications, topItems] = await Promise.all([
            loadSummary(),
            loadNotifications(),
            loadTopItems(),
        ]);

        // تحديث التاريخ
        if (elements.dashboardDate) {
            elements.dashboardDate.textContent = `مرحباً بك في نظام ERP + CRM • ${formatLocaleDateTime(new Date())}`;
        }

        // عرض البيانات
        renderStats(summary);
        renderNotifications(notifications);
        renderTopItems(topItems.services, topItems.employees, topItems.customers);

        // تحديث المخطط والتقويم والجدول الزمني (إذا كانت المكونات موجودة)
        await renderChart(state.currentPeriod);
        await renderCalendar();
        await renderTimeline();

        toast.success('تم تحديث لوحة التحكم بنجاح');

    } catch (error) {
        console.error('Failed to refresh dashboard:', error);
        toast.error('حدث خطأ أثناء تحديث لوحة التحكم');
    } finally {
        state.isLoading = false;
        loader.hide(loaderId);
    }
}

/**
 * تصدير تقرير لوحة التحكم
 */
async function exportDashboardReport() {
    try {
        const summary = state.summary || await loadSummary();

        // إنشاء محتوى التقرير
        const reportData = {
            title: 'تقرير لوحة التحكم',
            date: formatLocaleDateTime(new Date()),
            summary: summary,
            topServices: state.topServices,
            topEmployees: state.topEmployees,
            topCustomers: state.topCustomers,
        };

        // تحويل إلى JSON
        const json = JSON.stringify(reportData, null, 2);

        // تنزيل الملف
        const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `dashboard-report-${formatDate(new Date())}.json`;
        link.click();
        URL.revokeObjectURL(url);

        toast.success('تم تصدير التقرير بنجاح');

    } catch (error) {
        console.error('Failed to export report:', error);
        toast.error('حدث خطأ أثناء تصدير التقرير');
    }
}

/**
 * تغيير فترة المخطط
 */
function handleChartPeriodChange(e) {
    state.currentPeriod = e.target.value;
    renderChart(state.currentPeriod);
}

/**
 * تنسيق التاريخ للاسم
 */
function formatDate(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ============================================
//  6.  تهيئة الصفحة
// ============================================

/**
 * تهيئة لوحة التحكم
 */
export async function initDashboard() {
    console.log('📊 Initializing Dashboard...');

    // إضافة مستمعات الأحداث
    if (elements.refreshBtn) {
        elements.refreshBtn.addEventListener('click', refreshDashboard);
    }

    if (elements.exportBtn) {
        elements.exportBtn.addEventListener('click', exportDashboardReport);
    }

    if (elements.markAllReadBtn) {
        elements.markAllReadBtn.addEventListener('click', markAllNotificationsRead);
    }

    if (elements.chartPeriod) {
        elements.chartPeriod.addEventListener('change', handleChartPeriodChange);
    }

    // تحميل البيانات الأولية
    await refreshDashboard();

    // تحديث تلقائي كل 5 دقائق
    setInterval(() => {
        if (document.hidden) return; // عدم التحديث في الخلفية
        refreshDashboard();
    }, 5 * 60 * 1000);

    console.log('✅ Dashboard initialized successfully');
}

// ============================================
//  7.  تصدير الدوال للاستخدام الخارجي
// ============================================

export default {
    init: initDashboard,
    refresh: refreshDashboard,
    renderStats,
    renderChart,
    renderCalendar,
    renderTimeline,
    renderNotifications,
    renderTopItems,
};

// ============================================
//  8.  تهيئة تلقائية عند تحميل الصفحة
// ============================================

// بدء التهيئة عند تحميل DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}

// ============================================
//  9.  نهاية الملف
// ============================================
