/**
 * ======================================================
 * الملف: components/calendar/calendar.js
 * الوصف: مكون التقويم (Calendar)
 *         يعرض تقويمًا شهريًا مع دعم للأحداث،
 *         التنقل بين الأشهر، إضافة الأحداث، التعديل،
 *         الحذف، السحب والإفلات، والتفاعل مع المكونات الأخرى
 * الإصدار: 1.0.0
 * التاريخ: 2026-07-13
 * ======================================================
 */

import { createElement, removeElement, addClass, removeClass, toggleClass } from '../../utils/helpers.js';
import { formatDate, formatDateTime, formatLocaleDate, formatLocaleDateTime, addDays, addMonths, startOfDay, endOfDay } from '../../utils/helpers.js';
import { showLoader, hideLoader } from '../loader/loader.js';
import { toast } from '../toast/toast.js';
import { modal } from '../modal/modal.js';

// ============================================
//  1.  الثوابت والإعدادات الافتراضية
// ============================================

const DAYS_OF_WEEK = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

const EVENT_COLORS = [
    '#2d7ff9', '#36b37e', '#ffab00', '#ff5630', '#00b8d4',
    '#6554c0', '#ff8b00', '#00b8a0', '#ff6b6b', '#4a9eff',
];

// ============================================
//  2.  فئة التقويم الرئيسية
// ============================================

class Calendar {
    constructor(options = {}) {
        this.id = options.id || `calendar-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        this.container = options.container || null;
        this.events = options.events || [];
        this.currentDate = options.currentDate ? new Date(options.currentDate) : new Date();
        this.view = options.view || 'month'; // month, week, day
        this.firstDayOfWeek = options.firstDayOfWeek || 0; // 0 = الأحد
        this.locale = options.locale || 'ar-SA';
        this.selectable = options.selectable !== undefined ? options.selectable : true;
        this.editable = options.editable !== undefined ? options.editable : true;
        this.draggable = options.draggable !== undefined ? options.draggable : true;
        this.eventClickable = options.eventClickable !== undefined ? options.eventClickable : true;
        this.showWeekNumbers = options.showWeekNumbers || false;
        this.showTodayButton = options.showTodayButton !== undefined ? options.showTodayButton : true;
        this.showViewToggle = options.showViewToggle !== undefined ? options.showViewToggle : true;
        this.showEventColors = options.showEventColors !== undefined ? options.showEventColors : true;
        this.eventLimit = options.eventLimit || 3; // عدد الأحداث المعروضة في اليوم الواحد
        this.loading = false;
        this.emptyMessage = options.emptyMessage || 'لا توجد أحداث في هذا اليوم';
        this.loadingMessage = options.loadingMessage || 'جاري تحميل التقويم...';

        // الأحداث
        this.onEventClick = options.onEventClick || null;
        this.onEventAdd = options.onEventAdd || null;
        this.onEventEdit = options.onEventEdit || null;
        this.onEventDelete = options.onEventDelete || null;
        this.onEventDrop = options.onEventDrop || null;
        this.onDateSelect = options.onDateSelect || null;
        this.onViewChange = options.onViewChange || null;
        this.onMonthChange = options.onMonthChange || null;
        this.onLoad = options.onLoad || null;

        // الحالة الداخلية
        this.element = null;
        this.calendarGrid = null;
        this.headerElement = null;
        this.eventsMap = {};
        this.selectedDate = null;
        this.draggingEvent = null;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this._eventElements = {};

        // تهيئة
        if (this.container) {
            this.render();
        }
    }

    // ============================================
    //  3.  دوال معالجة الأحداث
    // ============================================

    /**
     * فهرسة الأحداث حسب التاريخ
     */
    indexEvents() {
        this.eventsMap = {};
        this.events.forEach(event => {
            const dateKey = this.getEventDateKey(event);
            if (!this.eventsMap[dateKey]) {
                this.eventsMap[dateKey] = [];
            }
            this.eventsMap[dateKey].push(event);
        });
        // ترتيب الأحداث حسب الوقت
        Object.keys(this.eventsMap).forEach(key => {
            this.eventsMap[key].sort((a, b) => {
                const timeA = a.time || a.start || '00:00';
                const timeB = b.time || b.start || '00:00';
                return timeA.localeCompare(timeB);
            });
        });
    }

    /**
     * الحصول على مفتاح التاريخ للحدث
     */
    getEventDateKey(event) {
        const date = event.date || event.start_date || event.start || event.created_at;
        if (date instanceof Date) {
            return formatDate(date);
        }
        return formatDate(new Date(date));
    }

    /**
     * الحصول على أحداث يوم معين
     */
    getEventsForDate(date) {
        const key = formatDate(date);
        return this.eventsMap[key] || [];
    }

    /**
     * إضافة حدث جديد
     */
    addEvent(event) {
        // توليد معرف إذا لم يكن موجوداً
        if (!event.id) {
            event.id = `event-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        }
        // تعيين لون افتراضي إذا لم يكن موجوداً
        if (!event.color) {
            const colors = EVENT_COLORS;
            const index = this.events.length % colors.length;
            event.color = colors[index];
        }
        this.events.push(event);
        this.indexEvents();
        this.renderGrid();
        if (this.onEventAdd) {
            this.onEventAdd(event);
        }
        return event;
    }

    /**
     * تحديث حدث موجود
     */
    updateEvent(id, updates) {
        const index = this.events.findIndex(e => e.id === id);
        if (index === -1) {
            toast.error('الحدث غير موجود');
            return null;
        }
        this.events[index] = { ...this.events[index], ...updates };
        this.indexEvents();
        this.renderGrid();
        if (this.onEventEdit) {
            this.onEventEdit(this.events[index]);
        }
        return this.events[index];
    }

    /**
     * حذف حدث
     */
    deleteEvent(id) {
        const index = this.events.findIndex(e => e.id === id);
        if (index === -1) {
            toast.error('الحدث غير موجود');
            return false;
        }
        const event = this.events[index];
        this.events.splice(index, 1);
        this.indexEvents();
        this.renderGrid();
        if (this.onEventDelete) {
            this.onEventDelete(event);
        }
        return true;
    }

    /**
     * الحصول على جميع الأحداث
     */
    getAllEvents() {
        return [...this.events];
    }

    /**
     * الحصول على أحداث في نطاق تاريخي
     */
    getEventsInRange(startDate, endDate) {
        const start = startOfDay(startDate);
        const end = endOfDay(endDate);
        return this.events.filter(event => {
            const eventDate = new Date(event.date || event.start_date || event.start || event.created_at);
            return eventDate >= start && eventDate <= end;
        });
    }

    // ============================================
    //  4.  دوال العرض (Render)
    // ============================================

    /**
     * عرض التقويم بالكامل
     */
    render() {
        const container = typeof this.container === 'string' ?
            document.querySelector(this.container) :
            this.container;

        if (!container) {
            console.error('Calendar container not found');
            return this;
        }

        // إنشاء عنصر التقويم
        this.element = createElement('div', {
            className: 'calendar-component',
            style: {
                backgroundColor: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-sm)',
            },
            id: this.id,
        });

        // رأس التقويم
        this.renderHeader();

        // أيام الأسبوع
        this.renderWeekDays();

        // شبكة التقويم
        this.calendarGrid = createElement('div', {
            className: 'calendar-grid',
            style: {
                display: 'grid',
                gridTemplateColumns: this.showWeekNumbers ? '40px repeat(7, 1fr)' : 'repeat(7, 1fr)',
                gap: '1px',
                backgroundColor: 'var(--border-color)',
                padding: '1px',
            },
        });

        // عرض الأيام
        this.renderGrid();

        this.element.appendChild(this.calendarGrid);

        // إضافة التقويم إلى الحاوية
        container.appendChild(this.element);

        // فهرسة الأحداث
        this.indexEvents();

        return this;
    }

    /**
     * عرض رأس التقويم
     */
    renderHeader() {
        this.headerElement = createElement('div', {
            className: 'calendar-header',
            style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--spacing-4) var(--spacing-5)',
                borderBottom: '1px solid var(--border-color)',
                flexWrap: 'wrap',
                gap: 'var(--spacing-3)',
            },
        });

        // الشهر والسنة
        const title = createElement('div', {
            className: 'calendar-title',
            style: {
                fontSize: 'var(--font-xl)',
                fontWeight: 'var(--font-bold)',
                color: 'var(--text-primary)',
            },
        });

        const monthYear = createElement('span', {
            textContent: `${MONTHS[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`,
        });
        title.appendChild(monthYear);

        // أزرار التنقل
        const nav = createElement('div', {
            className: 'calendar-nav',
            style: {
                display: 'flex',
                gap: 'var(--spacing-2)',
                alignItems: 'center',
            },
        });

        const prevBtn = createElement('button', {
            className: 'btn btn-secondary btn-sm',
            textContent: '‹',
            onClick: () => this.prevMonth(),
            style: {
                fontSize: '18px',
                padding: 'var(--spacing-1) var(--spacing-3)',
            },
        });
        nav.appendChild(prevBtn);

        if (this.showTodayButton) {
            const todayBtn = createElement('button', {
                className: 'btn btn-secondary btn-sm',
                textContent: 'اليوم',
                onClick: () => this.goToToday(),
            });
            nav.appendChild(todayBtn);
        }

        const nextBtn = createElement('button', {
            className: 'btn btn-secondary btn-sm',
            textContent: '›',
            onClick: () => this.nextMonth(),
            style: {
                fontSize: '18px',
                padding: 'var(--spacing-1) var(--spacing-3)',
            },
        });
        nav.appendChild(nextBtn);

        // عرض الأزرار
        const actions = createElement('div', {
            className: 'calendar-actions',
            style: {
                display: 'flex',
                gap: 'var(--spacing-2)',
                alignItems: 'center',
            },
        });

        // زر إضافة حدث
        if (this.editable) {
            const addBtn = createElement('button', {
                className: 'btn btn-primary btn-sm',
                textContent: '+ إضافة حدث',
                onClick: () => this.showAddEventModal(),
            });
            actions.appendChild(addBtn);
        }

        // تبديل العرض (شهر، أسبوع، يوم)
        if (this.showViewToggle) {
            const viewGroup = createElement('div', {
                className: 'btn-group',
                style: { display: 'flex', gap: '0' },
            });

            const views = [
                { key: 'month', label: 'شهر' },
                { key: 'week', label: 'أسبوع' },
                { key: 'day', label: 'يوم' },
            ];

            views.forEach(v => {
                const btn = createElement('button', {
                    className: `btn btn-${this.view === v.key ? 'primary' : 'secondary'} btn-sm`,
                    textContent: v.label,
                    onClick: () => this.setView(v.key),
                    style: {
                        borderRadius: '0',
                        borderRight: v.key !== views[views.length - 1].key ? '1px solid var(--border-color)' : 'none',
                    },
                });
                if (v.key === views[0].key) {
                    btn.style.borderRadius = '0 var(--radius-sm) var(--radius-sm) 0';
                }
                if (v.key === views[views.length - 1].key) {
                    btn.style.borderRadius = 'var(--radius-sm) 0 0 var(--radius-sm)';
                }
                viewGroup.appendChild(btn);
            });

            actions.appendChild(viewGroup);
        }

        this.headerElement.appendChild(title);
        this.headerElement.appendChild(nav);
        this.headerElement.appendChild(actions);

        this.element.appendChild(this.headerElement);
    }

    /**
     * عرض أيام الأسبوع
     */
    renderWeekDays() {
        const weekDays = createElement('div', {
            className: 'calendar-weekdays',
            style: {
                display: 'grid',
                gridTemplateColumns: this.showWeekNumbers ? '40px repeat(7, 1fr)' : 'repeat(7, 1fr)',
                gap: '1px',
                backgroundColor: 'var(--border-color)',
                padding: '1px',
                backgroundColor: 'var(--bg-secondary)',
            },
        });

        // عمود رقم الأسبوع (إذا كان مفعلاً)
        if (this.showWeekNumbers) {
            const empty = createElement('div', {
                className: 'calendar-weekday',
                style: {
                    backgroundColor: 'var(--bg-secondary)',
                    padding: 'var(--spacing-2)',
                    textAlign: 'center',
                    fontSize: 'var(--font-xs)',
                    color: 'var(--text-tertiary)',
                    fontWeight: 'var(--font-medium)',
                },
            });
            weekDays.appendChild(empty);
        }

        // أيام الأسبوع
        const days = [...DAYS_OF_WEEK];
        // إعادة ترتيب حسب firstDayOfWeek
        const orderedDays = [
            ...days.slice(this.firstDayOfWeek),
            ...days.slice(0, this.firstDayOfWeek),
        ];

        orderedDays.forEach(day => {
            const el = createElement('div', {
                className: 'calendar-weekday',
                textContent: day,
                style: {
                    backgroundColor: 'var(--bg-secondary)',
                    padding: 'var(--spacing-2)',
                    textAlign: 'center',
                    fontSize: 'var(--font-sm)',
                    color: 'var(--text-secondary)',
                    fontWeight: 'var(--font-medium)',
                },
            });
            weekDays.appendChild(el);
        });

        this.element.appendChild(weekDays);
    }

    /**
     * عرض شبكة الأيام
     */
    renderGrid() {
        if (!this.calendarGrid) return;

        // إزالة الأيام القديمة
        const oldDays = this.calendarGrid.querySelectorAll('.calendar-day, .calendar-week-number');
        oldDays.forEach(el => removeElement(el));

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        // أول يوم في الشهر
        const firstDay = new Date(year, month, 1);
        // عدد الأيام في الشهر
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        // اليوم الأول من الأسبوع (0-6)
        let firstDayOfWeek = firstDay.getDay();
        // تعديل حسب firstDayOfWeek
        firstDayOfWeek = (firstDayOfWeek - this.firstDayOfWeek + 7) % 7;

        // اليوم الحالي
        const today = new Date();
        const todayStr = formatDate(today);

        // الأيام من الشهر السابق
        const prevMonth = new Date(year, month, 0);
        const daysInPrevMonth = prevMonth.getDate();

        // عرض الأيام
        let dayCount = 0;
        let weekNumber = 1;

        // حساب عدد الأسابيع
        const totalDays = firstDayOfWeek + daysInMonth;
        const weeks = Math.ceil(totalDays / 7);

        for (let w = 0; w < weeks; w++) {
            // رقم الأسبوع
            if (this.showWeekNumbers) {
                const weekNumEl = createElement('div', {
                    className: 'calendar-week-number',
                    textContent: weekNumber,
                    style: {
                        backgroundColor: 'var(--bg-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 'var(--font-xs)',
                        color: 'var(--text-tertiary)',
                        fontWeight: 'var(--font-medium)',
                        padding: 'var(--spacing-1)',
                    },
                });
                this.calendarGrid.appendChild(weekNumEl);
                weekNumber++;
            }

            for (let d = 0; d < 7; d++) {
                const dayIndex = w * 7 + d;
                let dayNumber;
                let isCurrentMonth = true;
                let dateObj;

                if (dayIndex < firstDayOfWeek) {
                    // يوم من الشهر السابق
                    dayNumber = daysInPrevMonth - firstDayOfWeek + dayIndex + 1;
                    isCurrentMonth = false;
                    dateObj = new Date(year, month - 1, dayNumber);
                } else if (dayIndex >= firstDayOfWeek + daysInMonth) {
                    // يوم من الشهر التالي
                    dayNumber = dayIndex - firstDayOfWeek - daysInMonth + 1;
                    isCurrentMonth = false;
                    dateObj = new Date(year, month + 1, dayNumber);
                } else {
                    dayNumber = dayIndex - firstDayOfWeek + 1;
                    dateObj = new Date(year, month, dayNumber);
                }

                const dateStr = formatDate(dateObj);
                const isToday = dateStr === todayStr;
                const events = this.getEventsForDate(dateObj);
                const hasEvents = events.length > 0;

                // إنشاء عنصر اليوم
                const dayEl = createElement('div', {
                    className: `calendar-day ${isCurrentMonth ? 'current-month' : 'other-month'} ${isToday ? 'today' : ''} ${hasEvents ? 'has-event' : ''} ${this.selectable ? 'selectable' : ''}`,
                    'data-date': dateStr,
                    style: {
                        backgroundColor: 'var(--bg-primary)',
                        minHeight: '80px',
                        padding: 'var(--spacing-2)',
                        cursor: this.selectable ? 'pointer' : 'default',
                        position: 'relative',
                        transition: 'background-color 0.15s ease',
                    },
                    onClick: (e) => {
                        if (e.target.closest('.calendar-event')) return;
                        if (this.selectable) {
                            this.selectDate(dateObj);
                        }
                    },
                    onMouseEnter: (e) => {
                        if (this.selectable) {
                            e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                        }
                    },
                    onMouseLeave: (e) => {
                        if (this.selectable) {
                            e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                        }
                    },
                });

                // رقم اليوم
                const dayNumberEl = createElement('div', {
                    className: 'day-number',
                    textContent: dayNumber,
                    style: {
                        fontSize: 'var(--font-sm)',
                        fontWeight: isToday ? 'var(--font-bold)' : 'var(--font-regular)',
                        color: isToday ? 'var(--color-primary)' : (isCurrentMonth ? 'var(--text-primary)' : 'var(--text-tertiary)'),
                        marginBottom: 'var(--spacing-1)',
                    },
                });
                dayEl.appendChild(dayNumberEl);

                // عرض الأحداث (مع حد)
                if (hasEvents) {
                    const eventsContainer = createElement('div', {
                        className: 'calendar-events',
                        style: {
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            overflow: 'hidden',
                        },
                    });

                    const visibleEvents = events.slice(0, this.eventLimit);
                    const remaining = events.length - visibleEvents.length;

                    visibleEvents.forEach(event => {
                        const eventEl = this.createEventElement(event, dateObj);
                        eventsContainer.appendChild(eventEl);
                    });

                    if (remaining > 0) {
                        const moreEl = createElement('div', {
                            className: 'calendar-more-events',
                            textContent: `+${remaining} أكثر`,
                            style: {
                                fontSize: 'var(--font-xs)',
                                color: 'var(--text-tertiary)',
                                cursor: 'pointer',
                                padding: '2px 4px',
                                borderRadius: 'var(--radius-sm)',
                                textAlign: 'center',
                            },
                            onClick: (e) => {
                                e.stopPropagation();
                                this.showDayEvents(dateObj);
                            },
                            onMouseEnter: (e) => {
                                e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                            },
                            onMouseLeave: (e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            },
                        });
                        eventsContainer.appendChild(moreEl);
                    }

                    dayEl.appendChild(eventsContainer);
                }

                this.calendarGrid.appendChild(dayEl);
                dayCount++;
            }
        }

        // إذا كان هناك أيام قليلة، نضيف أياماً فارغة
        // (تمت المعالجة بالفعل في الحلقة)
    }

    /**
     * إنشاء عنصر حدث في التقويم
     */
    createEventElement(event, date) {
        const el = createElement('div', {
            className: 'calendar-event',
            'data-event-id': event.id,
            style: {
                backgroundColor: this.showEventColors ? (event.color || '#2d7ff9') : 'var(--color-primary)',
                color: '#ffffff',
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '10px',
                cursor: this.eventClickable ? 'pointer' : 'default',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                transition: 'opacity 0.15s ease',
                opacity: 0.9,
            },
            onClick: (e) => {
                e.stopPropagation();
                if (this.eventClickable) {
                    this.handleEventClick(event, date);
                }
            },
            onMouseEnter: (e) => {
                e.currentTarget.style.opacity = '1';
            },
            onMouseLeave: (e) => {
                e.currentTarget.style.opacity = '0.9';
            },
        });

        // إضافة أيقونة أو وقت
        const timeText = event.time || event.start || '';
        if (timeText) {
            const timeSpan = createElement('span', {
                textContent: `${timeText} `,
                style: {
                    fontWeight: 'var(--font-bold)',
                    opacity: 0.8,
                },
            });
            el.appendChild(timeSpan);
        }

        // عنوان الحدث
        const titleSpan = createElement('span', {
            textContent: event.title || 'حدث',
        });
        el.appendChild(titleSpan);

        // تخزين مرجع الحدث
        this._eventElements[event.id] = el;

        return el;
    }

    /**
     * عرض أحداث اليوم في مودال
     */
    showDayEvents(date) {
        const events = this.getEventsForDate(date);
        const formattedDate = formatLocaleDate(date, { locale: this.locale });

        // إنشاء محتوى المودال
        const content = createElement('div', {
            style: {
                maxHeight: '400px',
                overflowY: 'auto',
            },
        });

        if (events.length === 0) {
            const empty = createElement('p', {
                textContent: this.emptyMessage,
                style: {
                    color: 'var(--text-tertiary)',
                    textAlign: 'center',
                    padding: 'var(--spacing-4)',
                },
            });
            content.appendChild(empty);
        } else {
            events.forEach(event => {
                const item = createElement('div', {
                    style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-3)',
                        padding: 'var(--spacing-3)',
                        borderBottom: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                    },
                    onMouseEnter: (e) => {
                        e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                    },
                    onMouseLeave: (e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    },
                    onClick: () => {
                        this.handleEventClick(event, date);
                    },
                });

                // لون الحدث
                const colorDot = createElement('div', {
                    style: {
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: event.color || '#2d7ff9',
                        flexShrink: '0',
                    },
                });
                item.appendChild(colorDot);

                // معلومات الحدث
                const info = createElement('div', {
                    style: {
                        flex: '1',
                    },
                });

                const title = createElement('div', {
                    textContent: event.title || 'حدث',
                    style: {
                        fontWeight: 'var(--font-medium)',
                        color: 'var(--text-primary)',
                    },
                });
                info.appendChild(title);

                const meta = createElement('div', {
                    textContent: `${event.time || event.start || ''} ${event.location ? '📍 ' + event.location : ''}`,
                    style: {
                        fontSize: 'var(--font-xs)',
                        color: 'var(--text-secondary)',
                    },
                });
                info.appendChild(meta);

                item.appendChild(info);

                // زر حذف (إذا كان قابلاً للتعديل)
                if (this.editable) {
                    const deleteBtn = createElement('button', {
                        className: 'btn btn-danger btn-sm',
                        textContent: '🗑️',
                        style: {
                            fontSize: '12px',
                            padding: 'var(--spacing-1) var(--spacing-2)',
                        },
                        onClick: (e) => {
                            e.stopPropagation();
                            this.confirmDeleteEvent(event);
                        },
                    });
                    item.appendChild(deleteBtn);
                }

                content.appendChild(item);
            });
        }

        modal.show({
            title: `أحداث ${formattedDate}`,
            content,
            size: 'md',
            buttons: [
                {
                    label: 'إضافة حدث',
                    type: 'primary',
                    onClick: () => {
                        modal.close();
                        this.showAddEventModal(date);
                    },
                },
                {
                    label: 'إغلاق',
                    type: 'secondary',
                    onClick: () => modal.close(),
                },
            ],
        });
    }

    // ============================================
    //  5.  دوال معالجة الأحداث (Event Handlers)
    // ============================================

    /**
     * معالج النقر على حدث
     */
    handleEventClick(event, date) {
        if (this.onEventClick) {
            this.onEventClick(event, date);
            return;
        }

        // عرض تفاصيل الحدث في مودال
        this.showEventDetails(event);
    }

    /**
     * عرض تفاصيل حدث في مودال
     */
    showEventDetails(event) {
        const content = createElement('div');

        // معلومات الحدث
        const fields = [
            { label: 'العنوان', value: event.title },
            { label: 'الوصف', value: event.description || event.content || '' },
            { label: 'التاريخ', value: formatLocaleDate(event.date || event.start_date || event.start, { locale: this.locale }) },
            { label: 'الوقت', value: event.time || event.start || '' },
            { label: 'الموقع', value: event.location || '' },
            { label: 'اللون', value: event.color || '' },
        ];

        fields.forEach(field => {
            if (field.value) {
                const row = createElement('div', {
                    style: {
                        display: 'flex',
                        padding: 'var(--spacing-2) 0',
                        borderBottom: '1px solid var(--border-color)',
                    },
                });

                const label = createElement('div', {
                    textContent: `${field.label}:`,
                    style: {
                        width: '100px',
                        fontWeight: 'var(--font-medium)',
                        color: 'var(--text-secondary)',
                        flexShrink: '0',
                    },
                });
                row.appendChild(label);

                const value = createElement('div', {
                    textContent: field.value,
                    style: {
                        flex: '1',
                        color: 'var(--text-primary)',
                    },
                });
                if (field.label === 'اللون' && field.value) {
                    value.innerHTML = `<span style="display:inline-block;width:20px;height:20px;border-radius:50%;background-color:${field.value};"></span>`;
                }
                row.appendChild(value);

                content.appendChild(row);
            }
        });

        const buttons = [];

        if (this.editable) {
            buttons.push({
                label: '✏️ تعديل',
                type: 'primary',
                onClick: () => {
                    modal.close();
                    this.showEditEventModal(event);
                },
            });
            buttons.push({
                label: '🗑️ حذف',
                type: 'danger',
                onClick: () => {
                    modal.close();
                    this.confirmDeleteEvent(event);
                },
            });
        }

        buttons.push({
            label: 'إغلاق',
            type: 'secondary',
            onClick: () => modal.close(),
        });

        modal.show({
            title: 'تفاصيل الحدث',
            content,
            size: 'md',
            buttons,
        });
    }

    /**
     * عرض مودال إضافة حدث
     */
    showAddEventModal(date = null) {
        if (!this.editable) return;

        const targetDate = date || this.selectedDate || this.currentDate;
        const formattedDate = formatDate(targetDate);

        // إنشاء نموذج الإضافة
        const form = createElement('div', {
            style: {
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-3)',
            },
        });

        // العنوان
        const titleGroup = createElement('div');
        const titleLabel = createElement('label', {
            textContent: 'العنوان *',
            style: { fontWeight: 'var(--font-medium)', display: 'block', marginBottom: 'var(--spacing-1)' },
        });
        titleGroup.appendChild(titleLabel);
        const titleInput = createElement('input', {
            type: 'text',
            id: 'event-title',
            className: 'form-control',
            placeholder: 'أدخل عنوان الحدث',
            style: { width: '100%' },
        });
        titleGroup.appendChild(titleInput);
        form.appendChild(titleGroup);

        // الوصف
        const descGroup = createElement('div');
        const descLabel = createElement('label', {
            textContent: 'الوصف',
            style: { fontWeight: 'var(--font-medium)', display: 'block', marginBottom: 'var(--spacing-1)' },
        });
        descGroup.appendChild(descLabel);
        const descInput = createElement('textarea', {
            id: 'event-description',
            className: 'form-control',
            placeholder: 'أدخل وصف الحدث',
            rows: '3',
            style: { width: '100%' },
        });
        descGroup.appendChild(descInput);
        form.appendChild(descGroup);

        // التاريخ
        const dateGroup = createElement('div');
        const dateLabel = createElement('label', {
            textContent: 'التاريخ *',
            style: { fontWeight: 'var(--font-medium)', display: 'block', marginBottom: 'var(--spacing-1)' },
        });
        dateGroup.appendChild(dateLabel);
        const dateInput = createElement('input', {
            type: 'date',
            id: 'event-date',
            className: 'form-control',
            value: formattedDate,
            style: { width: '100%' },
        });
        dateGroup.appendChild(dateInput);
        form.appendChild(dateGroup);

        // الوقت
        const timeGroup = createElement('div');
        const timeLabel = createElement('label', {
            textContent: 'الوقت',
            style: { fontWeight: 'var(--font-medium)', display: 'block', marginBottom: 'var(--spacing-1)' },
        });
        timeGroup.appendChild(timeLabel);
        const timeInput = createElement('input', {
            type: 'time',
            id: 'event-time',
            className: 'form-control',
            value: '09:00',
            style: { width: '100%' },
        });
        timeGroup.appendChild(timeInput);
        form.appendChild(timeGroup);

        // الموقع
        const locGroup = createElement('div');
        const locLabel = createElement('label', {
            textContent: 'الموقع',
            style: { fontWeight: 'var(--font-medium)', display: 'block', marginBottom: 'var(--spacing-1)' },
        });
        locGroup.appendChild(locLabel);
        const locInput = createElement('input', {
            type: 'text',
            id: 'event-location',
            className: 'form-control',
            placeholder: 'أدخل الموقع',
            style: { width: '100%' },
        });
        locGroup.appendChild(locInput);
        form.appendChild(locGroup);

        // اللون
        const colorGroup = createElement('div');
        const colorLabel = createElement('label', {
            textContent: 'اللون',
            style: { fontWeight: 'var(--font-medium)', display: 'block', marginBottom: 'var(--spacing-1)' },
        });
        colorGroup.appendChild(colorLabel);
        const colorInput = createElement('input', {
            type: 'color',
            id: 'event-color',
            className: 'form-control',
            value: EVENT_COLORS[this.events.length % EVENT_COLORS.length],
            style: { width: '60px', height: '40px', padding: '2px', cursor: 'pointer' },
        });
        colorGroup.appendChild(colorInput);
        form.appendChild(colorGroup);

        modal.show({
            title: 'إضافة حدث جديد',
            content: form,
            size: 'md',
            buttons: [
                {
                    label: 'إضافة',
                    type: 'primary',
                    onClick: () => {
                        const title = document.getElementById('event-title').value.trim();
                        if (!title) {
                            toast.error('يرجى إدخال عنوان الحدث');
                            return;
                        }
                        const newEvent = {
                            title,
                            description: document.getElementById('event-description').value.trim(),
                            date: document.getElementById('event-date').value,
                            time: document.getElementById('event-time').value,
                            location: document.getElementById('event-location').value.trim(),
                            color: document.getElementById('event-color').value,
                        };
                        this.addEvent(newEvent);
                        modal.close();
                        toast.success('تم إضافة الحدث بنجاح');
                    },
                },
                {
                    label: 'إلغاء',
                    type: 'secondary',
                    onClick: () => modal.close(),
                },
            ],
        });

        // التركيز على حقل العنوان
        setTimeout(() => document.getElementById('event-title')?.focus(), 100);
    }

    /**
     * عرض مودال تعديل حدث
     */
    showEditEventModal(event) {
        if (!this.editable) return;

        const form = createElement('div', {
            style: {
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-3)',
            },
        });

        // العنوان
        const titleGroup = createElement('div');
        const titleLabel = createElement('label', {
            textContent: 'العنوان *',
            style: { fontWeight: 'var(--font-medium)', display: 'block', marginBottom: 'var(--spacing-1)' },
        });
        titleGroup.appendChild(titleLabel);
        const titleInput = createElement('input', {
            type: 'text',
            id: 'edit-event-title',
            className: 'form-control',
            value: event.title || '',
            style: { width: '100%' },
        });
        titleGroup.appendChild(titleInput);
        form.appendChild(titleGroup);

        // الوصف
        const descGroup = createElement('div');
        const descLabel = createElement('label', {
            textContent: 'الوصف',
            style: { fontWeight: 'var(--font-medium)', display: 'block', marginBottom: 'var(--spacing-1)' },
        });
        descGroup.appendChild(descLabel);
        const descInput = createElement('textarea', {
            id: 'edit-event-description',
            className: 'form-control',
            rows: '3',
            style: { width: '100%' },
        });
        descInput.value = event.description || event.content || '';
        descGroup.appendChild(descInput);
        form.appendChild(descGroup);

        // التاريخ
        const dateGroup = createElement('div');
        const dateLabel = createElement('label', {
            textContent: 'التاريخ *',
            style: { fontWeight: 'var(--font-medium)', display: 'block', marginBottom: 'var(--spacing-1)' },
        });
        dateGroup.appendChild(dateLabel);
        const dateInput = createElement('input', {
            type: 'date',
            id: 'edit-event-date',
            className: 'form-control',
            value: formatDate(event.date || event.start_date || event.start || new Date()),
            style: { width: '100%' },
        });
        dateGroup.appendChild(dateInput);
        form.appendChild(dateGroup);

        // الوقت
        const timeGroup = createElement('div');
        const timeLabel = createElement('label', {
            textContent: 'الوقت',
            style: { fontWeight: 'var(--font-medium)', display: 'block', marginBottom: 'var(--spacing-1)' },
        });
        timeGroup.appendChild(timeLabel);
        const timeInput = createElement('input', {
            type: 'time',
            id: 'edit-event-time',
            className: 'form-control',
            value: event.time || event.start || '09:00',
            style: { width: '100%' },
        });
        timeGroup.appendChild(timeInput);
        form.appendChild(timeGroup);

        // الموقع
        const locGroup = createElement('div');
        const locLabel = createElement('label', {
            textContent: 'الموقع',
            style: { fontWeight: 'var(--font-medium)', display: 'block', marginBottom: 'var(--spacing-1)' },
        });
        locGroup.appendChild(locLabel);
        const locInput = createElement('input', {
            type: 'text',
            id: 'edit-event-location',
            className: 'form-control',
            value: event.location || '',
            style: { width: '100%' },
        });
        locGroup.appendChild(locInput);
        form.appendChild(locGroup);

        // اللون
        const colorGroup = createElement('div');
        const colorLabel = createElement('label', {
            textContent: 'اللون',
            style: { fontWeight: 'var(--font-medium)', display: 'block', marginBottom: 'var(--spacing-1)' },
        });
        colorGroup.appendChild(colorLabel);
        const colorInput = createElement('input', {
            type: 'color',
            id: 'edit-event-color',
            className: 'form-control',
            value: event.color || EVENT_COLORS[0],
            style: { width: '60px', height: '40px', padding: '2px', cursor: 'pointer' },
        });
        colorGroup.appendChild(colorInput);
        form.appendChild(colorGroup);

        modal.show({
            title: 'تعديل الحدث',
            content: form,
            size: 'md',
            buttons: [
                {
                    label: 'حفظ التغييرات',
                    type: 'primary',
                    onClick: () => {
                        const title = document.getElementById('edit-event-title').value.trim();
                        if (!title) {
                            toast.error('يرجى إدخال عنوان الحدث');
                            return;
                        }
                        const updates = {
                            title,
                            description: document.getElementById('edit-event-description').value.trim(),
                            date: document.getElementById('edit-event-date').value,
                            time: document.getElementById('edit-event-time').value,
                            location: document.getElementById('edit-event-location').value.trim(),
                            color: document.getElementById('edit-event-color').value,
                        };
                        this.updateEvent(event.id, updates);
                        modal.close();
                        toast.success('تم تحديث الحدث بنجاح');
                    },
                },
                {
                    label: 'إلغاء',
                    type: 'secondary',
                    onClick: () => modal.close(),
                },
            ],
        });

        setTimeout(() => document.getElementById('edit-event-title')?.focus(), 100);
    }

    /**
     * تأكيد حذف حدث
     */
    confirmDeleteEvent(event) {
        modal.confirm(`هل أنت متأكد من حذف الحدث "${event.title}"؟`, {
            title: 'تأكيد الحذف',
            onConfirm: () => {
                this.deleteEvent(event.id);
                toast.success('تم حذف الحدث بنجاح');
            },
        });
    }

    // ============================================
    //  6.  دوال التنقل والتحكم
    // ============================================

    /**
     * الانتقال إلى الشهر السابق
     */
    prevMonth() {
        this.currentDate = addMonths(this.currentDate, -1);
        this.updateView();
        if (this.onMonthChange) {
            this.onMonthChange(this.currentDate);
        }
        return this;
    }

    /**
     * الانتقال إلى الشهر التالي
     */
    nextMonth() {
        this.currentDate = addMonths(this.currentDate, 1);
        this.updateView();
        if (this.onMonthChange) {
            this.onMonthChange(this.currentDate);
        }
        return this;
    }

    /**
     * الانتقال إلى اليوم الحالي
     */
    goToToday() {
        this.currentDate = new Date();
        this.updateView();
        if (this.onMonthChange) {
            this.onMonthChange(this.currentDate);
        }
        return this;
    }

    /**
     * تحديد تاريخ معين
     */
    selectDate(date) {
        this.selectedDate = new Date(date);
        // تحديث واجهة التحديد
        const dayElements = this.calendarGrid?.querySelectorAll('.calendar-day');
        dayElements?.forEach(el => {
            const dateStr = el.getAttribute('data-date');
            if (dateStr === formatDate(this.selectedDate)) {
                addClass(el, 'selected');
                el.style.backgroundColor = 'var(--selected-bg)';
                el.style.border = '2px solid var(--color-primary)';
            } else {
                removeClass(el, 'selected');
                el.style.backgroundColor = 'var(--bg-primary)';
                el.style.border = 'none';
            }
        });

        if (this.onDateSelect) {
            this.onDateSelect(this.selectedDate);
        }
        return this;
    }

    /**
     * تغيير العرض (شهر، أسبوع، يوم)
     */
    setView(view) {
        if (this.view === view) return;
        this.view = view;
        if (this.onViewChange) {
            this.onViewChange(view);
        }
        this.updateView();
        return this;
    }

    /**
     * تحديث العرض (إعادة رسم)
     */
    updateView() {
        // تحديث عنوان الشهر
        const titleEl = this.headerElement?.querySelector('.calendar-title span');
        if (titleEl) {
            titleEl.textContent = `${MONTHS[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
        }
        // إعادة رسم الشبكة
        this.renderGrid();
        // إعادة فهرسة الأحداث
        this.indexEvents();
        // استعادة التحديد إذا كان موجوداً
        if (this.selectedDate) {
            this.selectDate(this.selectedDate);
        }
        return this;
    }

    // ============================================
    //  7.  دوال التحميل غير المتزامن
    // ============================================

    /**
     * تحميل الأحداث من مصدر خارجي
     */
    async loadEvents(fetchFn, params = {}) {
        this.showLoading(true);
        try {
            const result = await fetchFn({
                year: this.currentDate.getFullYear(),
                month: this.currentDate.getMonth() + 1,
                ...params,
            });
            this.events = result.data || result.events || [];
            this.indexEvents();
            this.renderGrid();
            if (this.onLoad) {
                this.onLoad(result);
            }
        } catch (error) {
            toast.error('حدث خطأ أثناء تحميل الأحداث: ' + error.message);
            console.error('Calendar load error:', error);
        } finally {
            this.showLoading(false);
        }
        return this;
    }

    /**
     * إظهار/إخفاء حالة التحميل
     */
    showLoading(loading) {
        this.loading = loading;
        if (loading) {
            const loaderId = showLoader({
                target: this.element || this.container,
                message: this.loadingMessage,
                overlay: true,
                overlayColor: 'rgba(255,255,255,0.6)',
            });
            this._loaderId = loaderId;
        } else {
            if (this._loaderId) {
                hideLoader(this._loaderId);
                this._loaderId = null;
            }
        }
        return this;
    }

    // ============================================
    //  8.  دوال التصدير
    // ============================================

    /**
     * تصدير الأحداث كـ JSON
     */
    exportJSON() {
        return JSON.stringify(this.events, null, 2);
    }

    /**
     * تصدير الأحداث كـ ICS (تقويم)
     */
    exportICS() {
        const events = this.events;
        if (events.length === 0) {
            toast.warning('لا توجد أحداث للتصدير');
            return;
        }

        let ics = 'BEGIN:VCALENDAR\n';
        ics += 'VERSION:2.0\n';
        ics += 'PRODID:-//ERP CRM//Calendar//AR\n';
        ics += 'CALSCALE:GREGORIAN\n';

        events.forEach(event => {
            const date = new Date(event.date || event.start_date || event.start);
            const dtStart = formatDateTime(date).replace(/[-:]/g, '').replace(/\.\d{3}/, '');
            const dtEnd = event.end_date ? formatDateTime(new Date(event.end_date)).replace(/[-:]/g, '').replace(/\.\d{3}/, '') : dtStart;

            ics += 'BEGIN:VEVENT\n';
            ics += `UID:${event.id || Date.now()}\n`;
            ics += `DTSTAMP:${dtStart}\n`;
            ics += `DTSTART:${dtStart}\n`;
            ics += `DTEND:${dtEnd}\n`;
            ics += `SUMMARY:${event.title || 'حدث'}\n`;
            if (event.description) {
                ics += `DESCRIPTION:${event.description}\n`;
            }
            if (event.location) {
                ics += `LOCATION:${event.location}\n`;
            }
            ics += 'END:VEVENT\n';
        });

        ics += 'END:VCALENDAR';

        const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `calendar-export-${Date.now()}.ics`;
        link.click();
        URL.revokeObjectURL(link.href);

        toast.success('تم تصدير الأحداث إلى ICS بنجاح');
    }

    // ============================================
    //  9.  دوال التنظيف والتدمير
    // ============================================

    /**
     * تدمير التقويم وإزالة العناصر
     */
    destroy() {
        if (this._loaderId) {
            hideLoader(this._loaderId);
            this._loaderId = null;
        }
        if (this.element) {
            removeElement(this.element);
            this.element = null;
        }
        this.events = [];
        this.eventsMap = {};
        this._eventElements = {};
        console.log('Calendar destroyed:', this.id);
        return this;
    }

    /**
     * تحديث التقويم (إعادة عرض)
     */
    refresh() {
        this.indexEvents();
        this.renderGrid();
        return this;
    }

    // ============================================
    //  10.  دوال مساعدة للاستعلام
    // ============================================

    /**
     * الحصول على جميع الأحداث
     */
    getEvents() {
        return [...this.events];
    }

    /**
     * الحصول على الأحداث في يوم معين
     */
    getEventsForDateStr(dateStr) {
        return this.eventsMap[dateStr] || [];
    }

    /**
     * الحصول على التاريخ الحالي
     */
    getCurrentDate() {
        return new Date(this.currentDate);
    }

    /**
     * الحصول على التاريخ المحدد
     */
    getSelectedDate() {
        return this.selectedDate ? new Date(this.selectedDate) : null;
    }

    /**
     * الحصول على العنصر DOM
     */
    getElement() {
        return this.element;
    }

    /**
     * الحصول على المعرف
     */
    getId() {
        return this.id;
    }
}

// ============================================
//  11.  دوال مساعدة لإنشاء التقويمات
// ============================================

/**
 * إنشاء تقويم جديد
 */
export function createCalendar(options = {}) {
    return new Calendar(options);
}

/**
 * إنشاء تقويم من أحداث
 */
export function createCalendarFromEvents(container, events, options = {}) {
    return new Calendar({
        container,
        events,
        ...options,
    });
}

/**
 * إنشاء حدث للتقويم
 */
export function createCalendarEvent(options = {}) {
    return {
        id: options.id || `event-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        title: options.title || 'حدث',
        description: options.description || options.content || '',
        date: options.date || options.start_date || options.start || new Date().toISOString().split('T')[0],
        time: options.time || options.start_time || '09:00',
        end_date: options.end_date || options.end || '',
        end_time: options.end_time || '',
        location: options.location || '',
        color: options.color || EVENT_COLORS[Math.floor(Math.random() * EVENT_COLORS.length)],
        allDay: options.allDay || false,
        ...options,
    };
}

// ============================================
//  12.  دوال التهيئة والتنظيف
// ============================================

/**
 * تهيئة نظام التقويم
 */
export function initCalendar() {
    if (!document.getElementById('calendar-style')) {
        const style = document.createElement('style');
        style.id = 'calendar-style';
        style.textContent = `
            .calendar-day.selectable:hover {
                background-color: var(--hover-bg) !important;
            }
            .calendar-day.today {
                border: 2px solid var(--color-primary);
                border-radius: var(--radius-sm);
            }
            .calendar-day.selected {
                border: 2px solid var(--color-primary) !important;
                border-radius: var(--radius-sm);
            }
            .calendar-day.current-month .day-number {
                color: var(--text-primary);
            }
            .calendar-day.other-month .day-number {
                color: var(--text-tertiary);
            }
            .calendar-event {
                transition: opacity 0.15s ease, transform 0.15s ease;
            }
            .calendar-event:hover {
                transform: scale(1.02);
            }
            .calendar-more-events:hover {
                background-color: var(--hover-bg);
                border-radius: var(--radius-sm);
            }
            .calendar-day .calendar-events {
                pointer-events: none;
            }
            .calendar-day .calendar-events .calendar-event {
                pointer-events: auto;
            }
            .calendar-day .calendar-events .calendar-more-events {
                pointer-events: auto;
            }
            .dark .calendar-day.today {
                border-color: var(--color-primary);
            }
            .dark .calendar-day.selected {
                border-color: var(--color-primary);
            }
            @media (max-width: 768px) {
                .calendar-header {
                    flex-direction: column;
                    align-items: stretch;
                    gap: var(--spacing-2);
                }
                .calendar-header .calendar-title {
                    text-align: center;
                }
                .calendar-header .calendar-nav {
                    justify-content: center;
                }
                .calendar-header .calendar-actions {
                    justify-content: center;
                    flex-wrap: wrap;
                }
                .calendar-day {
                    min-height: 50px !important;
                    padding: var(--spacing-1) !important;
                }
                .calendar-day .day-number {
                    font-size: var(--font-xs) !important;
                }
                .calendar-event {
                    font-size: 8px !important;
                    padding: 1px 3px !important;
                }
                .calendar-weekday {
                    font-size: var(--font-xs) !important;
                    padding: var(--spacing-1) !important;
                }
                .calendar-grid {
                    gap: 1px;
                    padding: 1px;
                }
            }
            @media (max-width: 480px) {
                .calendar-day {
                    min-height: 40px !important;
                }
                .calendar-day .day-number {
                    font-size: 9px !important;
                }
                .calendar-event {
                    font-size: 7px !important;
                    padding: 1px 2px !important;
                }
                .calendar-weekday {
                    font-size: 9px !important;
                }
            }
        `;
        document.head.appendChild(style);
    }
    console.log('Calendar component initialized successfully');
}

/**
 * تنظيف نظام التقويم
 */
export function destroyCalendar() {
    const style = document.getElementById('calendar-style');
    if (style) {
        style.remove();
    }
    console.log('Calendar component destroyed');
}

// ============================================
//  13.  API عام للمكون
// ============================================

export const calendar = {
    Calendar,
    create: createCalendar,
    fromEvents: createCalendarFromEvents,
    createEvent: createCalendarEvent,
    init: initCalendar,
    destroy: destroyCalendar,
    DAYS: DAYS_OF_WEEK,
    MONTHS: MONTHS,
    COLORS: EVENT_COLORS,
};

// تصدير افتراضي
export default calendar;

// ============================================
//  14.  تهيئة تلقائية عند تحميل الوحدة
// ============================================

// سيتم استدعاء init من app.js، لذلك لا نقوم بتهيئة تلقائية هنا

// ============================================
//  15.  نهاية الملف
// ============================================
