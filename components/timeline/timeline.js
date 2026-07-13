/**
 * ======================================================
 * الملف: components/timeline/timeline.js
 * الوصف: مكون الجدول الزمني (Timeline)
 *         يعرض الأحداث بتسلسل زمني مع دعم للتصنيف،
 *         التصفية، البحث، التحميل غير المتزامن،
 *         التفاعلات، والتخصيص الكامل
 * الإصدار: 1.0.0
 * التاريخ: 2026-07-13
 * ======================================================
 */

import { createElement, removeElement, addClass, removeClass, toggleClass } from '../../utils/helpers.js';
import { formatDate, formatDateTime, formatLocaleDateTime, formatLocaleDate, formatLocaleTime } from '../../utils/helpers.js';
import { showLoader, hideLoader } from '../loader/loader.js';
import { toast } from '../toast/toast.js';

// ============================================
//  1.  الثوابت والإعدادات الافتراضية
// ============================================

const EVENT_TYPES = {
    CREATED: 'created',
    UPDATED: 'updated',
    DELETED: 'deleted',
    STATUS_CHANGED: 'status_changed',
    COMMENT: 'comment',
    FILE: 'file',
    PAYMENT: 'payment',
    TASK: 'task',
    NOTE: 'note',
    SYSTEM: 'system',
    CUSTOM: 'custom',
};

const EVENT_ICONS = {
    [EVENT_TYPES.CREATED]: '➕',
    [EVENT_TYPES.UPDATED]: '✏️',
    [EVENT_TYPES.DELETED]: '🗑️',
    [EVENT_TYPES.STATUS_CHANGED]: '🔄',
    [EVENT_TYPES.COMMENT]: '💬',
    [EVENT_TYPES.FILE]: '📁',
    [EVENT_TYPES.PAYMENT]: '💰',
    [EVENT_TYPES.TASK]: '✅',
    [EVENT_TYPES.NOTE]: '📝',
    [EVENT_TYPES.SYSTEM]: '⚙️',
    [EVENT_TYPES.CUSTOM]: '📌',
};

const EVENT_COLORS = {
    [EVENT_TYPES.CREATED]: 'var(--color-success)',
    [EVENT_TYPES.UPDATED]: 'var(--color-info)',
    [EVENT_TYPES.DELETED]: 'var(--color-danger)',
    [EVENT_TYPES.STATUS_CHANGED]: 'var(--color-warning)',
    [EVENT_TYPES.COMMENT]: 'var(--color-primary)',
    [EVENT_TYPES.FILE]: 'var(--color-info)',
    [EVENT_TYPES.PAYMENT]: 'var(--color-success)',
    [EVENT_TYPES.TASK]: 'var(--color-primary)',
    [EVENT_TYPES.NOTE]: 'var(--color-warning)',
    [EVENT_TYPES.SYSTEM]: 'var(--text-secondary)',
    [EVENT_TYPES.CUSTOM]: 'var(--color-primary)',
};

const DEFAULT_ITEMS_PER_PAGE = 10;

// ============================================
//  2.  فئة الجدول الزمني الرئيسية
// ============================================

class Timeline {
    constructor(options = {}) {
        this.id = options.id || `timeline-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        this.container = options.container || null;
        this.events = options.events || [];
        this.totalItems = options.totalItems || this.events.length;
        this.itemsPerPage = options.itemsPerPage || DEFAULT_ITEMS_PER_PAGE;
        this.currentPage = options.currentPage || 1;
        this.groupBy = options.groupBy || 'date'; // date, type, none
        this.filters = options.filters || {};
        this.searchQuery = options.searchQuery || '';
        this.sortOrder = options.sortOrder || 'desc'; // asc, desc
        this.loading = false;
        this.emptyMessage = options.emptyMessage || 'لا توجد أحداث لعرضها';
        this.loadingMessage = options.loadingMessage || 'جاري تحميل الأحداث...';
        this.showDateHeaders = options.showDateHeaders !== undefined ? options.showDateHeaders : true;
        this.showTimelineLine = options.showTimelineLine !== undefined ? options.showTimelineLine : true;
        this.clickable = options.clickable || false;
        this.expandable = options.expandable || false;
        this.actions = options.actions || [];
        this.onEventClick = options.onEventClick || null;
        this.onAction = options.onAction || null;
        this.onLoad = options.onLoad || null;
        this.onFilter = options.onFilter || null;
        this.className = options.className || '';
        this.style = options.style || {};
        this.dateFormat = options.dateFormat || 'locale';
        this.timeFormat = options.timeFormat || 'locale';
        this.locale = options.locale || 'ar-SA';

        // الحالة الداخلية
        this.element = null;
        this.eventsContainer = null;
        this.filterContainer = null;
        this.paginationElement = null;
        this.filteredEvents = [];
        this.paginatedEvents = [];
        this.selectedEvent = null;
        this.expandedEvents = new Set();

        // تهيئة
        if (this.container) {
            this.render();
        }
    }

    // ============================================
    //  3.  دوال معالجة البيانات
    // ============================================

    /**
     * معالجة الأحداث (تصفية، ترتيب، تجميع)
     */
    processEvents() {
        let processed = [...this.events];

        // التصفية
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase().trim();
            processed = processed.filter(event => {
                const searchableText = this.getSearchableText(event);
                return searchableText.toLowerCase().includes(query);
            });
        }

        // تصفية حسب النوع
        if (this.filters.types && this.filters.types.length > 0) {
            processed = processed.filter(event => {
                return this.filters.types.includes(event.type);
            });
        }

        // تصفية حسب النطاق الزمني
        if (this.filters.dateFrom) {
            const from = new Date(this.filters.dateFrom);
            processed = processed.filter(event => {
                return new Date(event.timestamp || event.date || event.created_at) >= from;
            });
        }
        if (this.filters.dateTo) {
            const to = new Date(this.filters.dateTo);
            processed = processed.filter(event => {
                return new Date(event.timestamp || event.date || event.created_at) <= to;
            });
        }

        // التصفية حسب المصدر (من قام بالحدث)
        if (this.filters.userId) {
            processed = processed.filter(event => {
                return event.userId === this.filters.userId || event.user_id === this.filters.userId;
            });
        }

        // الترتيب
        const sortKey = this.filters.sortKey || 'timestamp';
        const sortOrder = this.filters.sortOrder || this.sortOrder;
        processed.sort((a, b) => {
            const valA = a[sortKey] || a.timestamp || a.date || a.created_at || 0;
            const valB = b[sortKey] || b.timestamp || b.date || b.created_at || 0;
            const timeA = new Date(valA).getTime();
            const timeB = new Date(valB).getTime();
            return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
        });

        this.filteredEvents = processed;
        this.totalItems = processed.length;

        // التجميع (Grouping)
        let groupedEvents = [];
        if (this.groupBy === 'date') {
            const groups = {};
            processed.forEach(event => {
                const date = this.getEventDate(event);
                const key = formatDate(date);
                if (!groups[key]) {
                    groups[key] = [];
                }
                groups[key].push(event);
            });
            // تحويل المجموعات إلى مصفوفة مرتبة
            const sortedKeys = Object.keys(groups).sort((a, b) => {
                return sortOrder === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
            });
            groupedEvents = sortedKeys.map(key => ({
                group: key,
                events: groups[key],
                date: new Date(key),
            }));
        } else if (this.groupBy === 'type') {
            const groups = {};
            processed.forEach(event => {
                const type = event.type || 'custom';
                if (!groups[type]) {
                    groups[type] = [];
                }
                groups[type].push(event);
            });
            groupedEvents = Object.keys(groups).map(key => ({
                group: key,
                events: groups[key],
                icon: EVENT_ICONS[key] || '📌',
                label: this.getTypeLabel(key),
            }));
        } else {
            // لا تجميع
            groupedEvents = processed.map(event => ({
                group: null,
                events: [event],
            }));
        }

        // الترقيم
        if (this.itemsPerPage > 0 && this.paginated) {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            let itemCount = 0;
            const paginatedGroups = [];
            for (const group of groupedEvents) {
                const groupEvents = group.events;
                const startIdx = Math.max(0, start - itemCount);
                const endIdx = Math.min(groupEvents.length, end - itemCount);
                if (startIdx < groupEvents.length && endIdx > startIdx) {
                    paginatedGroups.push({
                        ...group,
                        events: groupEvents.slice(startIdx, endIdx),
                        _startIndex: startIdx,
                        _endIndex: endIdx,
                    });
                }
                itemCount += groupEvents.length;
                if (itemCount >= end) break;
            }
            this.paginatedEvents = paginatedGroups;
        } else {
            this.paginatedEvents = groupedEvents;
        }

        return this.paginatedEvents;
    }

    /**
     * الحصول على نص قابل للبحث من الحدث
     */
    getSearchableText(event) {
        const fields = ['title', 'description', 'content', 'message', 'text', 'note', 'comment', 'user_name', 'userName', 'type', 'status'];
        let text = '';
        fields.forEach(field => {
            if (event[field]) {
                text += ' ' + String(event[field]);
            }
        });
        // إضافة المعلومات الإضافية
        if (event.metadata) {
            text += ' ' + JSON.stringify(event.metadata);
        }
        return text;
    }

    /**
     * الحصول على تاريخ الحدث
     */
    getEventDate(event) {
        const date = event.timestamp || event.date || event.created_at || event.updated_at;
        return new Date(date);
    }

    /**
     * الحصول على تسمية النوع
     */
    getTypeLabel(type) {
        const labels = {
            [EVENT_TYPES.CREATED]: 'تم الإنشاء',
            [EVENT_TYPES.UPDATED]: 'تم التحديث',
            [EVENT_TYPES.DELETED]: 'تم الحذف',
            [EVENT_TYPES.STATUS_CHANGED]: 'تغيير الحالة',
            [EVENT_TYPES.COMMENT]: 'تعليق',
            [EVENT_TYPES.FILE]: 'ملف',
            [EVENT_TYPES.PAYMENT]: 'دفعة',
            [EVENT_TYPES.TASK]: 'مهمة',
            [EVENT_TYPES.NOTE]: 'ملاحظة',
            [EVENT_TYPES.SYSTEM]: 'نظام',
            [EVENT_TYPES.CUSTOM]: 'مخصص',
        };
        return labels[type] || type || 'حدث';
    }

    /**
     * تنسيق التاريخ حسب الإعدادات
     */
    formatEventDate(date) {
        if (this.dateFormat === 'locale') {
            return formatLocaleDateTime(date, { locale: this.locale });
        } else if (this.dateFormat === 'date') {
            return formatLocaleDate(date, { locale: this.locale });
        } else if (this.dateFormat === 'time') {
            return formatLocaleTime(date, { locale: this.locale });
        } else {
            return formatDateTime(date);
        }
    }

    // ============================================
    //  4.  دوال العرض (Render)
    // ============================================

    /**
     * عرض الجدول الزمني بالكامل
     */
    render() {
        const container = typeof this.container === 'string' ?
            document.querySelector(this.container) :
            this.container;

        if (!container) {
            console.error('Timeline container not found');
            return this;
        }

        // إنشاء عنصر الجدول الزمني
        this.element = createElement('div', {
            className: `timeline-container ${this.className}`,
            style: this.style,
            id: this.id,
        });

        // شريط الأدوات (تصفية، بحث)
        this.renderToolbar();

        // حاوية الأحداث
        this.eventsContainer = createElement('div', {
            className: 'timeline-events',
            style: {
                position: 'relative',
                padding: 'var(--spacing-2) 0',
            },
        });

        // خط الجدول الزمني
        if (this.showTimelineLine) {
            const line = createElement('div', {
                className: 'timeline-line',
                style: {
                    position: 'absolute',
                    right: '8px',
                    top: '0',
                    bottom: '0',
                    width: '2px',
                    backgroundColor: 'var(--border-color)',
                    zIndex: '0',
                },
            });
            this.eventsContainer.appendChild(line);
        }

        // عرض الأحداث
        this.renderEvents();

        this.element.appendChild(this.eventsContainer);

        // الترقيم
        this.renderPagination();

        container.appendChild(this.element);

        // معالجة البيانات
        this.processEvents();
        this.renderEvents();
        this.renderPagination();

        return this;
    }

    /**
     * عرض شريط الأدوات
     */
    renderToolbar() {
        const toolbar = createElement('div', {
            className: 'timeline-toolbar',
            style: {
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 'var(--spacing-3)',
                marginBottom: 'var(--spacing-4)',
                padding: 'var(--spacing-3)',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
            },
        });

        // البحث
        const searchWrapper = createElement('div', {
            className: 'search-wrapper',
            style: { flex: '1', minWidth: '150px', maxWidth: '300px' },
        });

        const searchInput = createElement('input', {
            type: 'text',
            className: 'search-input',
            placeholder: 'بحث في الأحداث...',
            value: this.searchQuery,
            style: { paddingRight: 'var(--spacing-7)' },
            onInput: (e) => {
                this.searchQuery = e.target.value;
                this.currentPage = 1;
                this.processEvents();
                this.renderEvents();
                this.renderPagination();
            },
        });

        const searchIcon = createElement('span', {
            className: 'search-icon',
            textContent: '🔍',
            style: {
                position: 'absolute',
                right: 'var(--spacing-3)',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)',
            },
        });

        searchWrapper.appendChild(searchIcon);
        searchWrapper.appendChild(searchInput);
        toolbar.appendChild(searchWrapper);

        // فلتر النوع
        const typeFilter = createElement('select', {
            className: 'filter-select',
            style: {
                padding: 'var(--spacing-2) var(--spacing-3)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: 'var(--font-sm)',
            },
            onChange: (e) => {
                const value = e.target.value;
                if (value) {
                    this.filters.types = [value];
                } else {
                    this.filters.types = [];
                }
                this.currentPage = 1;
                this.processEvents();
                this.renderEvents();
                this.renderPagination();
                if (this.onFilter) {
                    this.onFilter(this.filters);
                }
            },
        });

        const defaultOption = createElement('option', {
            value: '',
            textContent: 'جميع الأنواع',
        });
        typeFilter.appendChild(defaultOption);

        Object.keys(EVENT_ICONS).forEach(type => {
            const option = createElement('option', {
                value: type,
                textContent: this.getTypeLabel(type),
            });
            typeFilter.appendChild(option);
        });

        toolbar.appendChild(typeFilter);

        // فلتر التاريخ
        const dateFrom = createElement('input', {
            type: 'date',
            className: 'filter-date',
            placeholder: 'من',
            value: this.filters.dateFrom || '',
            style: {
                padding: 'var(--spacing-2) var(--spacing-3)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: 'var(--font-sm)',
            },
            onChange: (e) => {
                this.filters.dateFrom = e.target.value;
                this.currentPage = 1;
                this.processEvents();
                this.renderEvents();
                this.renderPagination();
                if (this.onFilter) {
                    this.onFilter(this.filters);
                }
            },
        });
        toolbar.appendChild(dateFrom);

        const dateTo = createElement('input', {
            type: 'date',
            className: 'filter-date',
            placeholder: 'إلى',
            value: this.filters.dateTo || '',
            style: {
                padding: 'var(--spacing-2) var(--spacing-3)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: 'var(--font-sm)',
            },
            onChange: (e) => {
                this.filters.dateTo = e.target.value;
                this.currentPage = 1;
                this.processEvents();
                this.renderEvents();
                this.renderPagination();
                if (this.onFilter) {
                    this.onFilter(this.filters);
                }
            },
        });
        toolbar.appendChild(dateTo);

        // زر إعادة تعيين الفلاتر
        const resetBtn = createElement('button', {
            className: 'btn btn-secondary btn-sm',
            textContent: '🔄 إعادة تعيين',
            onClick: () => {
                this.searchQuery = '';
                this.filters = {};
                this.currentPage = 1;
                const searchInputEl = this.element.querySelector('.search-input');
                if (searchInputEl) searchInputEl.value = '';
                const typeSelect = this.element.querySelector('.filter-select');
                if (typeSelect) typeSelect.value = '';
                const dateFromEl = this.element.querySelector('.filter-date');
                if (dateFromEl) dateFromEl.value = '';
                const dateToEl = this.element.querySelector('.filter-date:last-child');
                if (dateToEl) dateToEl.value = '';
                this.processEvents();
                this.renderEvents();
                this.renderPagination();
                if (this.onFilter) {
                    this.onFilter(this.filters);
                }
            },
        });
        toolbar.appendChild(resetBtn);

        // معلومات العدد
        const info = createElement('div', {
            className: 'timeline-info',
            textContent: `إجمالي: ${this.totalItems} حدث`,
            style: {
                color: 'var(--text-secondary)',
                fontSize: 'var(--font-sm)',
                marginRight: 'auto',
            },
        });
        toolbar.appendChild(info);

        this.element.appendChild(toolbar);
        this.filterContainer = toolbar;
    }

    /**
     * عرض الأحداث
     */
    renderEvents() {
        if (!this.eventsContainer) return;

        // إزالة الأحداث القديمة (مع الحفاظ على خط الجدول الزمني)
        const eventItems = this.eventsContainer.querySelectorAll('.timeline-group, .timeline-item');
        eventItems.forEach(el => removeElement(el));

        const processedEvents = this.paginatedEvents || [];

        if (processedEvents.length === 0) {
            const empty = createElement('div', {
                className: 'timeline-empty',
                textContent: this.loading ? this.loadingMessage : this.emptyMessage,
                style: {
                    textAlign: 'center',
                    padding: 'var(--spacing-6)',
                    color: 'var(--text-tertiary)',
                    fontSize: 'var(--font-lg)',
                },
            });
            this.eventsContainer.appendChild(empty);
            return;
        }

        // عرض الأحداث المجمعة
        processedEvents.forEach((group, groupIndex) => {
            if (group.group) {
                // عرض رأس المجموعة
                const groupHeader = this.renderGroupHeader(group);
                this.eventsContainer.appendChild(groupHeader);
            }

            // عرض الأحداث في المجموعة
            group.events.forEach((event, eventIndex) => {
                const eventItem = this.renderEventItem(event, groupIndex, eventIndex);
                this.eventsContainer.appendChild(eventItem);
            });
        });
    }

    /**
     * عرض رأس المجموعة
     */
    renderGroupHeader(group) {
        const header = createElement('div', {
            className: 'timeline-group-header',
            style: {
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-3)',
                padding: 'var(--spacing-2) var(--spacing-3)',
                marginTop: 'var(--spacing-4)',
                marginBottom: 'var(--spacing-2)',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                borderRight: '4px solid var(--color-primary)',
                position: 'relative',
                zIndex: '1',
            },
        });

        let label = group.group;
        let icon = '📅';

        if (this.groupBy === 'date') {
            // تنسيق التاريخ
            const date = group.date || new Date(group.group);
            label = formatLocaleDate(date, { locale: this.locale });
            const today = formatDate(new Date());
            const yesterday = formatDate(new Date(Date.now() - 86400000));
            if (group.group === today) {
                label = 'اليوم';
            } else if (group.group === yesterday) {
                label = 'أمس';
            }
            icon = '📅';
        } else if (this.groupBy === 'type') {
            icon = group.icon || '📌';
            label = group.label || group.group;
        }

        const iconSpan = createElement('span', {
            textContent: icon,
            style: { fontSize: '20px' },
        });
        header.appendChild(iconSpan);

        const labelSpan = createElement('span', {
            className: 'group-label',
            textContent: label,
            style: {
                fontWeight: 'var(--font-semibold)',
                color: 'var(--text-primary)',
                fontSize: 'var(--font-sm)',
            },
        });
        header.appendChild(labelSpan);

        const count = createElement('span', {
            className: 'group-count',
            textContent: `(${group.events.length})`,
            style: {
                fontSize: 'var(--font-xs)',
                color: 'var(--text-tertiary)',
                marginRight: 'auto',
            },
        });
        header.appendChild(count);

        return header;
    }

    /**
     * عرض عنصر حدث فردي
     */
    renderEventItem(event, groupIndex, eventIndex) {
        const id = event.id || `event-${Date.now()}-${eventIndex}`;
        const type = event.type || EVENT_TYPES.CUSTOM;
        const icon = event.icon || EVENT_ICONS[type] || '📌';
        const color = event.color || EVENT_COLORS[type] || 'var(--color-primary)';
        const timestamp = this.getEventDate(event);
        const formattedTime = this.formatEventDate(timestamp);

        // العنصر الرئيسي
        const item = createElement('div', {
            className: `timeline-item ${event.className || ''} ${this.clickable ? 'clickable' : ''}`,
            'data-id': id,
            'data-type': type,
            style: {
                position: 'relative',
                paddingRight: 'var(--spacing-5)',
                paddingBottom: 'var(--spacing-4)',
                marginRight: '16px',
                cursor: this.clickable ? 'pointer' : 'default',
                opacity: this.loading ? '0.6' : '1',
            },
            onClick: (e) => {
                if (e.target.closest('.timeline-actions') || e.target.closest('.timeline-expand')) {
                    return;
                }
                if (this.clickable && this.onEventClick) {
                    this.onEventClick(event, groupIndex, eventIndex);
                }
                if (this.expandable) {
                    this.toggleExpand(id);
                }
            },
        });

        // النقطة الزمنية (العلامة)
        const dot = createElement('div', {
            className: 'timeline-dot',
            style: {
                position: 'absolute',
                right: '-6px',
                top: '4px',
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                backgroundColor: color,
                border: '2px solid var(--bg-primary)',
                zIndex: '1',
                boxShadow: '0 0 0 2px var(--border-color)',
            },
        });
        item.appendChild(dot);

        // محتوى الحدث
        const content = createElement('div', {
            className: 'timeline-content',
            style: {
                backgroundColor: 'var(--bg-card)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--spacing-3) var(--spacing-4)',
                border: '1px solid var(--border-color)',
                transition: 'all var(--transition-fast)',
                boxShadow: 'var(--shadow-sm)',
            },
        });

        // رأس المحتوى
        const header = createElement('div', {
            className: 'timeline-content-header',
            style: {
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 'var(--spacing-3)',
                marginBottom: 'var(--spacing-2)',
            },
        });

        // الأيقونة واللقب
        const titleWrapper = createElement('div', {
            className: 'timeline-title-wrapper',
            style: {
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-2)',
                flex: '1',
                minWidth: '0',
            },
        });

        const iconSpan = createElement('span', {
            className: 'timeline-icon',
            textContent: icon,
            style: {
                fontSize: '18px',
                flexShrink: '0',
            },
        });
        titleWrapper.appendChild(iconSpan);

        const title = createElement('span', {
            className: 'timeline-title',
            textContent: event.title || this.getTypeLabel(type),
            style: {
                fontWeight: 'var(--font-medium)',
                color: 'var(--text-primary)',
                fontSize: 'var(--font-sm)',
                wordBreak: 'break-word',
            },
        });
        titleWrapper.appendChild(title);

        header.appendChild(titleWrapper);

        // الوقت
        const time = createElement('span', {
            className: 'timeline-time',
            textContent: formattedTime,
            style: {
                fontSize: 'var(--font-xs)',
                color: 'var(--text-tertiary)',
                whiteSpace: 'nowrap',
                flexShrink: '0',
            },
        });
        header.appendChild(time);

        content.appendChild(header);

        // وصف الحدث (محتوى)
        const body = createElement('div', {
            className: 'timeline-body',
            style: {
                marginTop: 'var(--spacing-2)',
            },
        });

        const description = event.description || event.content || event.message || event.text || '';
        if (description) {
            const descEl = createElement('div', {
                className: 'timeline-description',
                style: {
                    fontSize: 'var(--font-sm)',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.6',
                    wordBreak: 'break-word',
                },
            });
            if (typeof description === 'string') {
                descEl.innerHTML = description;
            } else if (description instanceof HTMLElement) {
                descEl.appendChild(description);
            } else {
                descEl.textContent = String(description);
            }
            body.appendChild(descEl);
        }

        // معلومات إضافية
        if (event.metadata) {
            const meta = createElement('div', {
                className: 'timeline-metadata',
                style: {
                    marginTop: 'var(--spacing-2)',
                    fontSize: 'var(--font-xs)',
                    color: 'var(--text-tertiary)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 'var(--spacing-2)',
                },
            });
            Object.keys(event.metadata).forEach(key => {
                const value = event.metadata[key];
                if (value !== undefined && value !== null) {
                    const tag = createElement('span', {
                        className: 'timeline-meta-tag',
                        textContent: `${key}: ${String(value)}`,
                        style: {
                            backgroundColor: 'var(--bg-tertiary)',
                            padding: 'var(--spacing-1) var(--spacing-2)',
                            borderRadius: 'var(--radius-sm)',
                        },
                    });
                    meta.appendChild(tag);
                }
            });
            if (meta.children.length > 0) {
                body.appendChild(meta);
            }
        }

        // المستخدم
        const userName = event.user_name || event.userName || event.user || '';
        if (userName) {
            const userEl = createElement('div', {
                className: 'timeline-user',
                textContent: `👤 ${userName}`,
                style: {
                    marginTop: 'var(--spacing-2)',
                    fontSize: 'var(--font-xs)',
                    color: 'var(--text-secondary)',
                },
            });
            body.appendChild(userEl);
        }

        // حالة الحدث (Status)
        const status = event.status || '';
        if (status) {
            const statusEl = createElement('span', {
                className: `status-tag status-${status}`,
                textContent: status,
                style: {
                    marginTop: 'var(--spacing-2)',
                    display: 'inline-block',
                },
            });
            body.appendChild(statusEl);
        }

        content.appendChild(body);

        // الأزرار والإجراءات
        this.renderEventActions(content, event, groupIndex, eventIndex);

        // زر التوسيع
        if (this.expandable) {
            const expandBtn = createElement('button', {
                className: 'timeline-expand btn btn-sm btn-secondary',
                textContent: this.expandedEvents.has(id) ? '▲ تصغير' : '▼ توسيع',
                style: {
                    marginTop: 'var(--spacing-2)',
                    fontSize: 'var(--font-xs)',
                },
                onClick: (e) => {
                    e.stopPropagation();
                    this.toggleExpand(id);
                },
            });
            content.appendChild(expandBtn);

            // محتوى موسع (اختياري)
            if (event.expandedContent) {
                const expandedContent = createElement('div', {
                    className: 'timeline-expanded-content',
                    style: {
                        display: this.expandedEvents.has(id) ? 'block' : 'none',
                        marginTop: 'var(--spacing-3)',
                        padding: 'var(--spacing-3)',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                    },
                });
                if (typeof event.expandedContent === 'string') {
                    expandedContent.innerHTML = event.expandedContent;
                } else if (event.expandedContent instanceof HTMLElement) {
                    expandedContent.appendChild(event.expandedContent);
                } else {
                    expandedContent.textContent = String(event.expandedContent);
                }
                content.appendChild(expandedContent);
                event._expandedContent = expandedContent;
            }
        }

        item.appendChild(content);

        return item;
    }

    /**
     * عرض الإجراءات على الحدث
     */
    renderEventActions(container, event, groupIndex, eventIndex) {
        if (this.actions.length === 0) return;

        const actionsWrapper = createElement('div', {
            className: 'timeline-actions',
            style: {
                display: 'flex',
                gap: 'var(--spacing-2)',
                marginTop: 'var(--spacing-3)',
                flexWrap: 'wrap',
            },
        });

        this.actions.forEach(action => {
            const btn = createElement('button', {
                className: `btn btn-${action.type || 'secondary'} btn-sm ${action.className || ''}`,
                textContent: action.icon || action.label || 'إجراء',
                onClick: (e) => {
                    e.stopPropagation();
                    if (this.onAction) {
                        this.onAction(action.key, event, groupIndex, eventIndex);
                    }
                    if (action.onClick) {
                        action.onClick(event, groupIndex, eventIndex);
                    }
                },
                style: {
                    fontSize: 'var(--font-xs)',
                },
            });
            actionsWrapper.appendChild(btn);
        });

        container.appendChild(actionsWrapper);
    }

    /**
     * عرض الترقيم (Pagination)
     */
    renderPagination() {
        if (this.itemsPerPage <= 0) {
            if (this.paginationElement) {
                removeElement(this.paginationElement);
                this.paginationElement = null;
            }
            return;
        }

        const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        if (totalPages <= 1) {
            if (this.paginationElement) {
                removeElement(this.paginationElement);
                this.paginationElement = null;
            }
            return;
        }

        if (!this.paginationElement) {
            this.paginationElement = createElement('div', {
                className: 'timeline-pagination',
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 'var(--spacing-3)',
                    marginTop: 'var(--spacing-4)',
                    paddingTop: 'var(--spacing-3)',
                    borderTop: '1px solid var(--border-color)',
                },
            });
            this.element.appendChild(this.paginationElement);
        }

        // مسح المحتوى القديم
        this.paginationElement.innerHTML = '';

        // معلومات الصفحة
        const info = createElement('span', {
            className: 'pagination-info',
            textContent: `صفحة ${this.currentPage} من ${totalPages} (${this.totalItems} حدث)`,
            style: {
                color: 'var(--text-secondary)',
                fontSize: 'var(--font-sm)',
            },
        });
        this.paginationElement.appendChild(info);

        // أزرار التنقل
        const nav = createElement('div', {
            style: { display: 'flex', gap: 'var(--spacing-2)' },
        });

        // زر السابق
        const prevBtn = createElement('button', {
            className: 'btn btn-secondary btn-sm',
            textContent: '‹ السابق',
            disabled: this.currentPage <= 1,
            onClick: () => this.goToPage(this.currentPage - 1),
        });
        nav.appendChild(prevBtn);

        // أزرار الصفحات
        const pages = this.getPageNumbers(totalPages);
        pages.forEach(page => {
            if (page === '...') {
                const span = createElement('span', {
                    textContent: '…',
                    style: { padding: '0 var(--spacing-2)', color: 'var(--text-tertiary)' },
                });
                nav.appendChild(span);
            } else {
                const btn = createElement('button', {
                    className: `btn btn-${page === this.currentPage ? 'primary' : 'secondary'} btn-sm`,
                    textContent: page,
                    onClick: () => this.goToPage(page),
                    style: {
                        minWidth: '32px',
                        fontWeight: page === this.currentPage ? 'bold' : 'normal',
                    },
                });
                nav.appendChild(btn);
            }
        });

        // زر التالي
        const nextBtn = createElement('button', {
            className: 'btn btn-secondary btn-sm',
            textContent: 'التالي ›',
            disabled: this.currentPage >= totalPages,
            onClick: () => this.goToPage(this.currentPage + 1),
        });
        nav.appendChild(nextBtn);

        this.paginationElement.appendChild(nav);
    }

    /**
     * الحصول على أرقام الصفحات للعرض
     */
    getPageNumbers(totalPages) {
        const current = this.currentPage;
        const delta = 2;
        const range = [];
        const rangeWithDots = [];

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || Math.abs(i - current) <= delta) {
                range.push(i);
            }
        }

        let last = null;
        range.forEach(i => {
            if (last !== null && i - last > 1) {
                rangeWithDots.push('...');
            }
            rangeWithDots.push(i);
            last = i;
        });

        return rangeWithDots;
    }

    // ============================================
    //  5.  دوال التحكم (Control Functions)
    // ============================================

    /**
     * الذهاب إلى صفحة معينة
     */
    goToPage(page) {
        const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        if (page < 1 || page > totalPages) return;
        this.currentPage = page;
        this.processEvents();
        this.renderEvents();
        this.renderPagination();
        // التمرير إلى أعلى الأحداث
        if (this.eventsContainer) {
            this.eventsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return this;
    }

    /**
     * تبديل حالة التوسيع لحدث
     */
    toggleExpand(id) {
        if (this.expandedEvents.has(id)) {
            this.expandedEvents.delete(id);
        } else {
            this.expandedEvents.add(id);
        }
        // تحديث العرض
        const item = this.element.querySelector(`.timeline-item[data-id="${id}"]`);
        if (item) {
            const expandBtn = item.querySelector('.timeline-expand');
            const expandedContent = item.querySelector('.timeline-expanded-content');
            if (expandBtn) {
                expandBtn.textContent = this.expandedEvents.has(id) ? '▲ تصغير' : '▼ توسيع';
            }
            if (expandedContent) {
                expandedContent.style.display = this.expandedEvents.has(id) ? 'block' : 'none';
            }
        }
        return this;
    }

    /**
     * إضافة حدث جديد
     */
    addEvent(event, prepend = false) {
        if (prepend) {
            this.events.unshift(event);
        } else {
            this.events.push(event);
        }
        this.totalItems = this.events.length;
        this.processEvents();
        this.renderEvents();
        this.renderPagination();
        return this;
    }

    /**
     * إضافة أحداث متعددة
     */
    addEvents(events, prepend = false) {
        if (prepend) {
            this.events = [...events, ...this.events];
        } else {
            this.events = [...this.events, ...events];
        }
        this.totalItems = this.events.length;
        this.processEvents();
        this.renderEvents();
        this.renderPagination();
        return this;
    }

    /**
     * تحديث الأحداث
     */
    setEvents(events) {
        this.events = events;
        this.totalItems = events.length;
        this.currentPage = 1;
        this.processEvents();
        this.renderEvents();
        this.renderPagination();
        return this;
    }

    /**
     * تحميل الأحداث من مصدر خارجي
     */
    async loadEvents(fetchFn, params = {}) {
        this.showLoading(true);
        try {
            const result = await fetchFn({
                page: this.currentPage,
                limit: this.itemsPerPage,
                search: this.searchQuery,
                filters: this.filters,
                ...params,
            });
            this.setEvents(result.data || result.events || []);
            this.totalItems = result.total || this.events.length;
            if (this.onLoad) {
                this.onLoad(result);
            }
        } catch (error) {
            toast.error('حدث خطأ أثناء تحميل الأحداث: ' + error.message);
            console.error('Timeline load error:', error);
        } finally {
            this.showLoading(false);
        }
        return this;
    }

    /**
     * تصفية الأحداث
     */
    setFilters(filters) {
        this.filters = { ...this.filters, ...filters };
        this.currentPage = 1;
        this.processEvents();
        this.renderEvents();
        this.renderPagination();
        if (this.onFilter) {
            this.onFilter(this.filters);
        }
        return this;
    }

    /**
     * البحث في الأحداث
     */
    search(query) {
        this.searchQuery = query;
        this.currentPage = 1;
        this.processEvents();
        this.renderEvents();
        this.renderPagination();
        return this;
    }

    /**
     * إظهار/إخفاء حالة التحميل
     */
    showLoading(loading) {
        this.loading = loading;
        if (loading) {
            const loaderId = showLoader({
                target: this.eventsContainer || this.element,
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
        // إعادة عرض الأحداث مع حالة التحميل
        this.renderEvents();
        return this;
    }

    // ============================================
    //  6.  دوال التصدير
    // ============================================

    /**
     * تصدير الأحداث كـ JSON
     */
    exportJSON() {
        return JSON.stringify(this.filteredEvents || this.events, null, 2);
    }

    /**
     * تصدير الأحداث كـ CSV
     */
    exportCSV() {
        const data = this.filteredEvents || this.events;
        if (data.length === 0) {
            toast.warning('لا توجد أحداث للتصدير');
            return;
        }

        const headers = ['id', 'type', 'title', 'description', 'timestamp', 'user_name', 'status'];
        const rows = data.map(event => {
            return headers.map(key => {
                let value = event[key] || '';
                if (key === 'timestamp') {
                    value = this.formatEventDate(this.getEventDate(event));
                }
                return `"${String(value).replace(/"/g, '""')}"`;
            });
        });

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `timeline-export-${Date.now()}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);

        toast.success('تم تصدير الأحداث إلى CSV بنجاح');
    }

    // ============================================
    //  7.  دوال التنظيف والتدمير
    // ============================================

    /**
     * تدمير الجدول الزمني وإزالة العناصر
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
        this.filteredEvents = [];
        this.paginatedEvents = [];
        this.expandedEvents.clear();
        console.log('Timeline destroyed:', this.id);
        return this;
    }

    /**
     * تحديث الجدول الزمني (إعادة عرض)
     */
    refresh() {
        this.processEvents();
        this.renderEvents();
        this.renderPagination();
        return this;
    }

    // ============================================
    //  8.  دوال مساعدة للاستعلام
    // ============================================

    /**
     * الحصول على إجمالي عدد الأحداث
     */
    getTotal() {
        return this.totalItems;
    }

    /**
     * الحصول على الأحداث الحالية المعروضة
     */
    getCurrentEvents() {
        return this.filteredEvents || [];
    }

    /**
     * الحصول على جميع الأحداث
     */
    getAllEvents() {
        return this.events || [];
    }

    /**
     * الحصول على الأحداث المجمعة الحالية
     */
    getPaginatedEvents() {
        return this.paginatedEvents || [];
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
//  9.  دوال مساعدة لإنشاء الجداول الزمنية
// ============================================

/**
 * إنشاء جدول زمني جديد
 */
export function createTimeline(options = {}) {
    return new Timeline(options);
}

/**
 * إنشاء جدول زمني من أحداث
 */
export function createTimelineFromEvents(container, events, options = {}) {
    return new Timeline({
        container,
        events,
        ...options,
    });
}

/**
 * إنشاء حدث للجدول الزمني
 */
export function createEvent(options = {}) {
    return {
        id: options.id || `event-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        type: options.type || EVENT_TYPES.CUSTOM,
        title: options.title || 'حدث',
        description: options.description || options.content || '',
        timestamp: options.timestamp || options.date || options.created_at || new Date().toISOString(),
        icon: options.icon || null,
        color: options.color || null,
        status: options.status || '',
        user_name: options.user_name || options.userName || options.user || '',
        metadata: options.metadata || {},
        className: options.className || '',
        expandedContent: options.expandedContent || null,
        ...options,
    };
}

// ============================================
//  10.  دوال التهيئة والتنظيف
// ============================================

/**
 * تهيئة نظام الجداول الزمنية
 */
export function initTimeline() {
    // إضافة أنماط إضافية
    if (!document.getElementById('timeline-style')) {
        const style = document.createElement('style');
        style.id = 'timeline-style';
        style.textContent = `
            .timeline-item.clickable .timeline-content {
                cursor: pointer;
            }
            .timeline-item.clickable .timeline-content:hover {
                box-shadow: var(--shadow-md);
                border-color: var(--color-primary);
            }
            .timeline-item .timeline-content {
                transition: all 0.2s ease;
            }
            .timeline-item:last-child {
                padding-bottom: 0;
            }
            .timeline-group-header:first-child {
                margin-top: 0;
            }
            .timeline-toolbar .search-wrapper {
                max-width: 100%;
            }
            .dark .timeline-item .timeline-content {
                border-color: var(--border-color);
            }
            .dark .timeline-item.clickable .timeline-content:hover {
                border-color: var(--color-primary);
            }
            @media (max-width: 768px) {
                .timeline-toolbar {
                    flex-direction: column;
                    align-items: stretch;
                }
                .timeline-toolbar .search-wrapper {
                    max-width: 100%;
                }
                .timeline-toolbar .filter-select,
                .timeline-toolbar .filter-date {
                    width: 100%;
                }
                .timeline-content-header {
                    flex-wrap: wrap;
                }
                .timeline-time {
                    font-size: 10px;
                }
                .timeline-item {
                    padding-right: var(--spacing-4);
                    margin-right: 12px;
                }
                .timeline-dot {
                    width: 10px;
                    height: 10px;
                    right: -4px;
                }
                .timeline-events {
                    padding-right: 4px;
                }
            }
        `;
        document.head.appendChild(style);
    }
    console.log('Timeline component initialized successfully');
}

/**
 * تنظيف نظام الجداول الزمنية
 */
export function destroyTimeline() {
    const style = document.getElementById('timeline-style');
    if (style) {
        style.remove();
    }
    console.log('Timeline component destroyed');
}

// ============================================
//  11.  API عام للمكون
// ============================================

export const timeline = {
    Timeline,
    create: createTimeline,
    fromEvents: createTimelineFromEvents,
    createEvent,
    init: initTimeline,
    destroy: destroyTimeline,
    TYPES: EVENT_TYPES,
    ICONS: EVENT_ICONS,
    COLORS: EVENT_COLORS,
};

// تصدير افتراضي
export default timeline;

// ============================================
//  12.  تهيئة تلقائية عند تحميل الوحدة
// ============================================

// سيتم استدعاء init من app.js، لذلك لا نقوم بتهيئة تلقائية هنا

// ============================================
//  13.  نهاية الملف
// ============================================
