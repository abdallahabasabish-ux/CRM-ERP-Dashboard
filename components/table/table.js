/**
 * ======================================================
 * الملف: components/table/table.js
 * الوصف: مكون الجداول المتقدم (Table)
 *         يدير عرض البيانات في جداول تفاعلية مع دعم
 *         للترقيم، الفرز، البحث، التحديد، التصدير،
 *         التخصيص، ومعالجة الأحداث
 * الإصدار: 1.0.0
 * التاريخ: 2026-07-12
 * ======================================================
 */

import { createElement, removeElement, addClass, removeClass, toggleClass } from '../../utils/helpers.js';
import { formatDate, formatCurrency, formatNumber, escapeHtml } from '../../utils/helpers.js';
import { showLoader, hideLoader } from '../loader/loader.js';
import { toast } from '../toast/toast.js';

// ============================================
//  1.  الثوابت والإعدادات الافتراضية
// ============================================

const DEFAULT_ITEMS_PER_PAGE = 10;
const DEFAULT_PAGE_SIZES = [5, 10, 25, 50, 100];

const SORT_DIRECTIONS = {
    ASC: 'asc',
    DESC: 'desc',
};

const SELECTION_MODES = {
    NONE: 'none',
    SINGLE: 'single',
    MULTIPLE: 'multiple',
};

// ============================================
//  2.  دوال مساعدة لعرض البيانات
// ============================================

/**
 * تنسيق قيمة العمود حسب النوع
 */
function formatColumnValue(value, type, options = {}) {
    if (value === undefined || value === null || value === '') {
        return '<span class="text-tertiary">-</span>';
    }

    switch (type) {
        case 'date':
            return escapeHtml(formatDate(value));
        case 'datetime':
            return escapeHtml(formatDate(value, true));
        case 'currency':
            return escapeHtml(formatCurrency(value, options.currency));
        case 'number':
            return escapeHtml(formatNumber(value, options.decimals || 0));
        case 'percentage':
            return escapeHtml(`${formatNumber(value, options.decimals || 1)}%`);
        case 'boolean':
            return value ? '<span class="badge badge-success">نعم</span>' :
                          '<span class="badge badge-secondary">لا</span>';
        case 'badge':
            return `<span class="badge badge-${options.badgeType || 'primary'}">${escapeHtml(value)}</span>`;
        case 'status':
            return `<span class="status-tag status-${options.statusType || value}">${escapeHtml(value)}</span>`;
        case 'image':
            return `<img src="${escapeHtml(value)}" alt="صورة" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">`;
        case 'html':
            return value;
        default:
            return escapeHtml(String(value));
    }
}

/**
 * مقارنة قيمتين للفرز
 */
function compareValues(a, b, type = 'string') {
    if (a === undefined || a === null) a = '';
    if (b === undefined || b === null) b = '';

    switch (type) {
        case 'number':
        case 'currency':
            return parseFloat(a) - parseFloat(b);
        case 'date':
        case 'datetime':
            return new Date(a).getTime() - new Date(b).getTime();
        case 'boolean':
            return a === b ? 0 : a ? 1 : -1;
        default:
            return String(a).localeCompare(String(b), 'ar');
    }
}

// ============================================
//  3.  فئة الجدول الرئيسية
// ============================================

class Table {
    constructor(options = {}) {
        this.id = options.id || `table-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        this.container = options.container || null;
        this.columns = options.columns || [];
        this.data = options.data || [];
        this.totalItems = options.totalItems || this.data.length;
        this.itemsPerPage = options.itemsPerPage || DEFAULT_ITEMS_PER_PAGE;
        this.pageSizes = options.pageSizes || DEFAULT_PAGE_SIZES;
        this.currentPage = options.currentPage || 1;
        this.sortColumn = options.sortColumn || null;
        this.sortDirection = options.sortDirection || SORT_DIRECTIONS.ASC;
        this.searchQuery = options.searchQuery || '';
        this.selectionMode = options.selectionMode || SELECTION_MODES.NONE;
        this.selectedRows = new Set();
        this.loading = false;
        this.emptyMessage = options.emptyMessage || 'لا توجد بيانات للعرض';
        this.loadingMessage = options.loadingMessage || 'جاري تحميل البيانات...';
        this.exportable = options.exportable || false;
        this.searchable = options.searchable !== undefined ? options.searchable : true;
        this.sortable = options.sortable !== undefined ? options.sortable : true;
        this.paginated = options.paginated !== undefined ? options.paginated : true;
        this.rowClickable = options.rowClickable || false;
        this.rowActions = options.rowActions || [];
        this.bulkActions = options.bulkActions || [];
        this.onRowClick = options.onRowClick || null;
        this.onRowAction = options.onRowAction || null;
        this.onBulkAction = options.onBulkAction || null;
        this.onSort = options.onSort || null;
        this.onPageChange = options.onPageChange || null;
        this.onSearch = options.onSearch || null;
        this.onSelectionChange = options.onSelectionChange || null;
        this.onLoad = options.onLoad || null;
        this.className = options.className || '';
        this.style = options.style || {};

        // مصفوفة لتخزين البيانات المفلترة والمرتبة
        this.filteredData = [];
        this.paginatedData = [];

        // مراجع DOM
        this.element = null;
        this.tableWrapper = null;
        this.tableElement = null;
        this.theadElement = null;
        this.tbodyElement = null;
        this.tfootElement = null;
        this.paginationElement = null;
        this.searchInput = null;
        this.bulkActionsBar = null;
        this.exportButtons = null;

        // تهيئة
        if (this.container) {
            this.render();
        }
    }

    // ============================================
    //  4.  دوال معالجة البيانات
    // ============================================

    /**
     * تطبيق البحث والفرز والترقيم على البيانات
     */
    processData() {
        let processed = [...this.data];

        // البحث
        if (this.searchQuery && this.searchable) {
            const query = this.searchQuery.toLowerCase().trim();
            processed = processed.filter(row => {
                return this.columns.some(col => {
                    if (!col.searchable) return false;
                    const value = this.getRowValue(row, col.key);
                    return String(value).toLowerCase().includes(query);
                });
            });
        }

        // الفرز
        if (this.sortColumn && this.sortable) {
            const col = this.columns.find(c => c.key === this.sortColumn);
            if (col) {
                const type = col.type || 'string';
                processed.sort((a, b) => {
                    const valA = this.getRowValue(a, this.sortColumn);
                    const valB = this.getRowValue(b, this.sortColumn);
                    const result = compareValues(valA, valB, type);
                    return this.sortDirection === SORT_DIRECTIONS.ASC ? result : -result;
                });
            }
        }

        this.filteredData = processed;
        this.totalItems = processed.length;

        // الترقيم
        if (this.paginated) {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            this.paginatedData = processed.slice(start, end);
        } else {
            this.paginatedData = processed;
        }

        return this.paginatedData;
    }

    /**
     * الحصول على قيمة صف حسب المفتاح
     */
    getRowValue(row, key) {
        if (typeof key === 'function') {
            return key(row);
        }
        return key.split('.').reduce((obj, k) => obj?.[k], row);
    }

    /**
     * تحديث البيانات
     */
    setData(data, totalItems = null) {
        this.data = data;
        this.totalItems = totalItems !== null ? totalItems : data.length;
        this.processData();
        this.renderBody();
        this.renderPagination();
        this.renderFooter();
        this.updateSelectionUI();
        return this;
    }

    /**
     * تحديث البيانات من مصدر خارجي (تحميل غير متزامن)
     */
    async loadData(fetchFn, params = {}) {
        this.showLoading(true);
        try {
            const result = await fetchFn({
                page: this.currentPage,
                limit: this.itemsPerPage,
                search: this.searchQuery,
                sort: this.sortColumn,
                direction: this.sortDirection,
                ...params,
            });
            this.setData(result.data, result.total);
            if (this.onLoad) {
                this.onLoad(result);
            }
        } catch (error) {
            toast.error('حدث خطأ أثناء تحميل البيانات: ' + error.message);
            console.error('Table load error:', error);
        } finally {
            this.showLoading(false);
        }
        return this;
    }

    // ============================================
    //  5.  دوال العرض (Render)
    // ============================================

    /**
     * عرض الجدول بالكامل
     */
    render() {
        const container = typeof this.container === 'string' ?
            document.querySelector(this.container) :
            this.container;

        if (!container) {
            console.error('Table container not found');
            return this;
        }

        // إنشاء عنصر الجدول
        this.element = createElement('div', {
            className: `table-container ${this.className}`,
            style: this.style,
            id: this.id,
        });

        // شريط الأدوات (بحث، تصدير، إجراءات)
        this.renderToolbar();

        // حاوية الجدول
        this.tableWrapper = createElement('div', {
            className: 'table-responsive',
        });

        this.tableElement = createElement('table', {
            className: 'table table-striped table-hover',
        });

        // الرأس
        this.renderHeader();

        // الجسم
        this.renderBody();

        // التذييل
        this.renderFooter();

        this.tableWrapper.appendChild(this.tableElement);
        this.element.appendChild(this.tableWrapper);

        // الترقيم
        this.renderPagination();

        // شريط الإجراءات الجماعية
        this.renderBulkActions();

        container.appendChild(this.element);

        // معالجة البيانات
        this.processData();
        this.renderBody();
        this.renderPagination();

        return this;
    }

    /**
     * عرض شريط الأدوات
     */
    renderToolbar() {
        const toolbar = createElement('div', {
            className: 'table-toolbar',
            style: {
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--spacing-4)',
                gap: 'var(--spacing-3)',
            },
        });

        // البحث
        if (this.searchable) {
            const searchWrapper = createElement('div', {
                className: 'search-wrapper',
                style: { flex: '1', minWidth: '200px', maxWidth: '400px' },
            });

            this.searchInput = createElement('input', {
                type: 'text',
                className: 'search-input',
                placeholder: 'بحث...',
                value: this.searchQuery,
                style: { paddingRight: 'var(--spacing-7)' },
                onInput: (e) => {
                    this.searchQuery = e.target.value;
                    this.currentPage = 1;
                    this.processData();
                    this.renderBody();
                    this.renderPagination();
                    if (this.onSearch) {
                        this.onSearch(this.searchQuery);
                    }
                },
            });

            const icon = createElement('span', {
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

            searchWrapper.appendChild(icon);
            searchWrapper.appendChild(this.searchInput);
            toolbar.appendChild(searchWrapper);
        }

        // أزرار التصدير
        if (this.exportable) {
            const exportGroup = createElement('div', {
                className: 'btn-group',
                style: { display: 'flex', gap: 'var(--spacing-2)' },
            });

            const exportCSV = createElement('button', {
                className: 'btn btn-secondary btn-sm',
                textContent: '📄 CSV',
                onClick: () => this.exportCSV(),
            });

            const exportExcel = createElement('button', {
                className: 'btn btn-secondary btn-sm',
                textContent: '📊 Excel',
                onClick: () => this.exportExcel(),
            });

            exportGroup.appendChild(exportCSV);
            exportGroup.appendChild(exportExcel);
            toolbar.appendChild(exportGroup);
        }

        // معلومات العدد
        const info = createElement('div', {
            className: 'table-info',
            textContent: `إجمالي: ${this.totalItems} عنصر`,
            style: { color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' },
        });
        toolbar.appendChild(info);

        this.element.appendChild(toolbar);
    }

    /**
     * عرض رأس الجدول
     */
    renderHeader() {
        this.theadElement = createElement('thead');

        const tr = createElement('tr');

        // عمود التحديد
        if (this.selectionMode !== SELECTION_MODES.NONE) {
            const th = createElement('th', {
                style: { width: '40px', textAlign: 'center' },
            });
            if (this.selectionMode === SELECTION_MODES.MULTIPLE) {
                const checkbox = createElement('input', {
                    type: 'checkbox',
                    className: 'select-all',
                    onChange: (e) => {
                        this.selectAll(e.target.checked);
                    },
                });
                th.appendChild(checkbox);
            }
            tr.appendChild(th);
        }

        // أعمدة البيانات
        this.columns.forEach((col, index) => {
            const th = createElement('th', {
                style: {
                    textAlign: col.align || 'right',
                    width: col.width || 'auto',
                    minWidth: col.minWidth || 'auto',
                    cursor: this.sortable && col.sortable !== false ? 'pointer' : 'default',
                },
                onClick: () => {
                    if (this.sortable && col.sortable !== false) {
                        this.handleSort(col.key);
                    }
                },
            });

            // عنوان العمود
            const titleSpan = createElement('span', {
                textContent: col.title || col.key,
            });
            th.appendChild(titleSpan);

            // أيقونة الترتيب
            if (this.sortable && col.sortable !== false) {
                const sortIcon = createElement('span', {
                    className: 'sort-icon',
                    textContent: this.sortColumn === col.key ?
                        (this.sortDirection === SORT_DIRECTIONS.ASC ? ' ▲' : ' ▼') :
                        ' ⇅',
                    style: {
                        fontSize: '10px',
                        marginRight: '4px',
                        color: this.sortColumn === col.key ? 'var(--color-primary)' : 'var(--text-tertiary)',
                    },
                });
                th.appendChild(sortIcon);
            }

            tr.appendChild(th);
        });

        // عمود الإجراءات
        if (this.rowActions.length > 0) {
            const th = createElement('th', {
                textContent: 'إجراءات',
                style: { width: '120px', textAlign: 'center' },
            });
            tr.appendChild(th);
        }

        this.theadElement.appendChild(tr);
        this.tableElement.appendChild(this.theadElement);
    }

    /**
     * عرض جسم الجدول
     */
    renderBody() {
        // إزالة الجسم القديم
        if (this.tbodyElement) {
            removeElement(this.tbodyElement);
        }

        this.tbodyElement = createElement('tbody');

        const data = this.paginatedData || [];

        if (data.length === 0) {
            const tr = createElement('tr');
            const td = createElement('td', {
                colSpan: this.columns.length + (this.selectionMode !== SELECTION_MODES.NONE ? 1 : 0) + (this.rowActions.length > 0 ? 1 : 0),
                style: { textAlign: 'center', padding: 'var(--spacing-6)', color: 'var(--text-tertiary)' },
                textContent: this.loading ? this.loadingMessage : this.emptyMessage,
            });
            tr.appendChild(td);
            this.tbodyElement.appendChild(tr);
        } else {
            data.forEach((row, index) => {
                const tr = this.createRow(row, index);
                this.tbodyElement.appendChild(tr);
            });
        }

        this.tableElement.appendChild(this.tbodyElement);
    }

    /**
     * إنشاء صف في الجدول
     */
    createRow(row, index) {
        const tr = createElement('tr', {
            'data-index': index,
            'data-id': row.id || index,
            className: this.selectedRows.has(row.id || index) ? 'selected' : '',
            style: { cursor: this.rowClickable ? 'pointer' : 'default' },
            onClick: (e) => {
                if (e.target.closest('input[type="checkbox"]') || e.target.closest('.row-actions')) {
                    return;
                }
                if (this.rowClickable && this.onRowClick) {
                    this.onRowClick(row, index);
                }
                if (this.selectionMode !== SELECTION_MODES.NONE) {
                    this.toggleRowSelection(row.id || index);
                }
            },
        });

        // عمود التحديد
        if (this.selectionMode !== SELECTION_MODES.NONE) {
            const td = createElement('td', {
                style: { textAlign: 'center' },
            });
            const checkbox = createElement('input', {
                type: 'checkbox',
                checked: this.selectedRows.has(row.id || index),
                onChange: (e) => {
                    e.stopPropagation();
                    this.toggleRowSelection(row.id || index);
                },
            });
            td.appendChild(checkbox);
            tr.appendChild(td);
        }

        // أعمدة البيانات
        this.columns.forEach(col => {
            const td = createElement('td', {
                style: {
                    textAlign: col.align || 'right',
                    verticalAlign: col.verticalAlign || 'middle',
                },
            });

            const value = this.getRowValue(row, col.key);
            const formatted = formatColumnValue(value, col.type || 'string', col.formatOptions || {});
            td.innerHTML = formatted;

            // إضافة بيانات مخصصة
            if (col.render) {
                const customContent = col.render(value, row, index);
                if (customContent) {
                    td.innerHTML = '';
                    if (typeof customContent === 'string') {
                        td.innerHTML = customContent;
                    } else if (customContent instanceof HTMLElement) {
                        td.appendChild(customContent);
                    } else {
                        td.textContent = String(customContent);
                    }
                }
            }

            tr.appendChild(td);
        });

        // عمود الإجراءات
        if (this.rowActions.length > 0) {
            const td = createElement('td', {
                className: 'row-actions',
                style: { textAlign: 'center', whiteSpace: 'nowrap' },
            });

            this.rowActions.forEach(action => {
                const btn = createElement('button', {
                    className: `btn btn-icon-only btn-sm ${action.className || ''}`,
                    textContent: action.icon || '⚙️',
                    title: action.label || action.tooltip || '',
                    onClick: (e) => {
                        e.stopPropagation();
                        if (this.onRowAction) {
                            this.onRowAction(action.key, row, index);
                        }
                        if (action.onClick) {
                            action.onClick(row, index);
                        }
                    },
                    style: {
                        width: '30px',
                        height: '30px',
                        fontSize: '14px',
                        padding: '0',
                        borderRadius: 'var(--radius-sm)',
                    },
                });
                td.appendChild(btn);
            });

            tr.appendChild(td);
        }

        return tr;
    }

    /**
     * عرض تذييل الجدول
     */
    renderFooter() {
        if (this.tfootElement) {
            removeElement(this.tfootElement);
        }

        const hasFooter = this.columns.some(col => col.footer);
        if (!hasFooter) return;

        this.tfootElement = createElement('tfoot');
        const tr = createElement('tr');

        // خلية فارغة للتحديد
        if (this.selectionMode !== SELECTION_MODES.NONE) {
            const td = createElement('td');
            tr.appendChild(td);
        }

        this.columns.forEach(col => {
            const td = createElement('td', {
                style: {
                    textAlign: col.align || 'right',
                    fontWeight: 'bold',
                },
            });

            if (col.footer) {
                const value = typeof col.footer === 'function' ?
                    col.footer(this.data) :
                    col.footer;
                td.textContent = value;
            }

            tr.appendChild(td);
        });

        // خلية فارغة للإجراءات
        if (this.rowActions.length > 0) {
            const td = createElement('td');
            tr.appendChild(td);
        }

        this.tfootElement.appendChild(tr);
        this.tableElement.appendChild(this.tfootElement);
    }

    /**
     * عرض الترقيم (Pagination)
     */
    renderPagination() {
        if (!this.paginated) {
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
                className: 'table-pagination',
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 'var(--spacing-3)',
                    marginTop: 'var(--spacing-4)',
                    paddingTop: 'var(--spacing-3)',
                    borderTop: '1px solid var(--border-color)',
                },
            });
            this.element.appendChild(this.paginationElement);
        }

        // معلومات الصفحة
        const info = createElement('div', {
            className: 'pagination-info',
            textContent: `صفحة ${this.currentPage} من ${totalPages} (${this.totalItems} عنصر)`,
            style: { color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' },
        });

        // أزرار التنقل
        const nav = createElement('div', {
            className: 'pagination-nav',
            style: { display: 'flex', gap: 'var(--spacing-2)', alignItems: 'center' },
        });

        // اختيار عدد العناصر لكل صفحة
        const sizeSelect = createElement('select', {
            className: 'pagination-size',
            style: {
                padding: 'var(--spacing-1) var(--spacing-3)',
                fontSize: 'var(--font-sm)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
            },
            onChange: (e) => {
                this.itemsPerPage = parseInt(e.target.value);
                this.currentPage = 1;
                this.processData();
                this.renderBody();
                this.renderPagination();
                if (this.onPageChange) {
                    this.onPageChange(this.currentPage, this.itemsPerPage);
                }
            },
        });

        this.pageSizes.forEach(size => {
            const option = createElement('option', {
                value: size,
                textContent: size,
                selected: size === this.itemsPerPage,
            });
            sizeSelect.appendChild(option);
        });

        nav.appendChild(sizeSelect);

        // زر السابق
        const prevBtn = createElement('button', {
            className: 'btn btn-secondary btn-sm',
            textContent: '‹',
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
            textContent: '›',
            disabled: this.currentPage >= totalPages,
            onClick: () => this.goToPage(this.currentPage + 1),
        });
        nav.appendChild(nextBtn);

        // مسح المحتوى القديم وإضافة الجديد
        this.paginationElement.innerHTML = '';
        this.paginationElement.appendChild(info);
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

    /**
     * عرض شريط الإجراءات الجماعية
     */
    renderBulkActions() {
        if (this.bulkActionsBar) {
            removeElement(this.bulkActionsBar);
            this.bulkActionsBar = null;
        }

        if (this.selectionMode === SELECTION_MODES.NONE || this.bulkActions.length === 0) {
            return;
        }

        const selectedCount = this.selectedRows.size;
        if (selectedCount === 0) return;

        this.bulkActionsBar = createElement('div', {
            className: 'bulk-actions-bar',
            style: {
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-3)',
                padding: 'var(--spacing-3) var(--spacing-4)',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                marginTop: 'var(--spacing-3)',
                border: '1px solid var(--border-color)',
                flexWrap: 'wrap',
            },
        });

        const info = createElement('span', {
            className: 'bulk-info',
            textContent: `تم تحديد ${selectedCount} عنصر`,
            style: { fontWeight: 'medium', color: 'var(--text-primary)' },
        });
        this.bulkActionsBar.appendChild(info);

        this.bulkActions.forEach(action => {
            const btn = createElement('button', {
                className: `btn btn-${action.type || 'secondary'} btn-sm`,
                textContent: action.label || action.icon || 'إجراء',
                onClick: () => {
                    const selectedData = this.getSelectedData();
                    if (this.onBulkAction) {
                        this.onBulkAction(action.key, selectedData);
                    }
                    if (action.onClick) {
                        action.onClick(selectedData);
                    }
                },
            });
            this.bulkActionsBar.appendChild(btn);
        });

        // زر إلغاء التحديد
        const clearBtn = createElement('button', {
            className: 'btn btn-sm',
            textContent: '✕ إلغاء التحديد',
            style: {
                marginRight: 'auto',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
            },
            onClick: () => this.clearSelection(),
        });
        this.bulkActionsBar.appendChild(clearBtn);

        this.element.appendChild(this.bulkActionsBar);
    }

    // ============================================
    //  6.  دوال التحكم (Control Functions)
    // ============================================

    /**
     * الذهاب إلى صفحة معينة
     */
    goToPage(page) {
        const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        if (page < 1 || page > totalPages) return;
        this.currentPage = page;
        this.processData();
        this.renderBody();
        this.renderPagination();
        if (this.onPageChange) {
            this.onPageChange(this.currentPage, this.itemsPerPage);
        }
        return this;
    }

    /**
     * معالج الفرز
     */
    handleSort(key) {
        if (this.sortColumn === key) {
            this.sortDirection = this.sortDirection === SORT_DIRECTIONS.ASC ?
                SORT_DIRECTIONS.DESC : SORT_DIRECTIONS.ASC;
        } else {
            this.sortColumn = key;
            this.sortDirection = SORT_DIRECTIONS.ASC;
        }
        this.processData();
        this.renderBody();
        this.renderHeader();
        if (this.onSort) {
            this.onSort(this.sortColumn, this.sortDirection);
        }
        return this;
    }

    /**
     * تبديل تحديد صف
     */
    toggleRowSelection(id) {
        if (this.selectionMode === SELECTION_MODES.NONE) return;

        if (this.selectionMode === SELECTION_MODES.SINGLE) {
            this.selectedRows.clear();
            if (id !== undefined) {
                this.selectedRows.add(id);
            }
        } else {
            if (this.selectedRows.has(id)) {
                this.selectedRows.delete(id);
            } else {
                this.selectedRows.add(id);
            }
        }

        this.updateSelectionUI();
        if (this.onSelectionChange) {
            this.onSelectionChange(this.getSelectedData());
        }
        return this;
    }

    /**
     * تحديد جميع الصفوف
     */
    selectAll(checked) {
        if (this.selectionMode !== SELECTION_MODES.MULTIPLE) return;

        if (checked) {
            const data = this.paginatedData || [];
            data.forEach(row => {
                const id = row.id || this.paginatedData.indexOf(row);
                this.selectedRows.add(id);
            });
        } else {
            this.selectedRows.clear();
        }

        this.updateSelectionUI();
        if (this.onSelectionChange) {
            this.onSelectionChange(this.getSelectedData());
        }
        return this;
    }

    /**
     * إلغاء تحديد الكل
     */
    clearSelection() {
        this.selectedRows.clear();
        this.updateSelectionUI();
        if (this.onSelectionChange) {
            this.onSelectionChange([]);
        }
        return this;
    }

    /**
     * الحصول على البيانات المحددة
     */
    getSelectedData() {
        const data = this.paginatedData || [];
        return data.filter(row => {
            const id = row.id || data.indexOf(row);
            return this.selectedRows.has(id);
        });
    }

    /**
     * تحديث واجهة التحديد
     */
    updateSelectionUI() {
        // تحديث الصفوف
        const rows = this.tbodyElement?.querySelectorAll('tr') || [];
        rows.forEach((tr, index) => {
            const rowData = this.paginatedData?.[index];
            if (rowData) {
                const id = rowData.id || index;
                if (this.selectedRows.has(id)) {
                    addClass(tr, 'selected');
                } else {
                    removeClass(tr, 'selected');
                }
            }
        });

        // تحديث checkbox الكل
        const selectAll = this.tableElement?.querySelector('.select-all');
        if (selectAll) {
            const data = this.paginatedData || [];
            const selectedCount = data.filter(row => {
                const id = row.id || data.indexOf(row);
                return this.selectedRows.has(id);
            }).length;
            selectAll.checked = data.length > 0 && selectedCount === data.length;
            selectAll.indeterminate = selectedCount > 0 && selectedCount < data.length;
        }

        // تحديث شريط الإجراءات الجماعية
        this.renderBulkActions();
    }

    /**
     * إظهار/إخفاء حالة التحميل
     */
    showLoading(loading) {
        this.loading = loading;
        if (loading) {
            const loaderId = showLoader({
                target: this.tableWrapper,
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
    //  7.  دوال التصدير
    // ============================================

    /**
     * تصدير البيانات إلى CSV
     */
    exportCSV() {
        try {
            const data = this.filteredData || this.data;
            if (data.length === 0) {
                toast.warning('لا توجد بيانات للتصدير');
                return;
            }

            const headers = this.columns.map(col => col.title || col.key);
            const rows = data.map(row => {
                return this.columns.map(col => {
                    const value = this.getRowValue(row, col.key);
                    return `"${String(value).replace(/"/g, '""')}"`;
                });
            });

            const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `export-${Date.now()}.csv`;
            link.click();
            URL.revokeObjectURL(link.href);

            toast.success('تم تصدير البيانات إلى CSV بنجاح');
        } catch (error) {
            toast.error('حدث خطأ أثناء تصدير CSV: ' + error.message);
            console.error('Export CSV error:', error);
        }
    }

    /**
     * تصدير البيانات إلى Excel (XLSX)
     */
    exportExcel() {
        try {
            // استخدام مكتبة SheetJS إذا كانت متاحة
            if (typeof XLSX !== 'undefined') {
                const data = this.filteredData || this.data;
                if (data.length === 0) {
                    toast.warning('لا توجد بيانات للتصدير');
                    return;
                }

                const headers = this.columns.map(col => col.title || col.key);
                const rows = data.map(row => {
                    return this.columns.map(col => {
                        return this.getRowValue(row, col.key);
                    });
                });

                const wsData = [headers, ...rows];
                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.aoa_to_sheet(wsData);
                XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
                XLSX.writeFile(wb, `export-${Date.now()}.xlsx`);

                toast.success('تم تصدير البيانات إلى Excel بنجاح');
            } else {
                // مكتبة غير متاحة - تصدير CSV بدلاً من ذلك
                toast.info('مكتبة Excel غير متاحة، سيتم التصدير بصيغة CSV');
                this.exportCSV();
            }
        } catch (error) {
            toast.error('حدث خطأ أثناء تصدير Excel: ' + error.message);
            console.error('Export Excel error:', error);
        }
    }

    // ============================================
    //  8.  دوال التنظيف والتدمير
    // ============================================

    /**
     * تدمير الجدول وإزالة العناصر
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
        this.data = [];
        this.filteredData = [];
        this.paginatedData = [];
        this.selectedRows.clear();
        console.log('Table destroyed:', this.id);
        return this;
    }

    /**
     * تحديث الجدول (إعادة عرض)
     */
    refresh() {
        this.processData();
        this.renderBody();
        this.renderPagination();
        this.renderFooter();
        this.updateSelectionUI();
        return this;
    }

    // ============================================
    //  9.  دوال مساعدة للاستعلام
    // ============================================

    /**
     * الحصول على إجمالي عدد العناصر
     */
    getTotal() {
        return this.totalItems;
    }

    /**
     * الحصول على البيانات الحالية المعروضة
     */
    getCurrentData() {
        return this.paginatedData || [];
    }

    /**
     * الحصول على البيانات المفلترة (قبل الترقيم)
     */
    getFilteredData() {
        return this.filteredData || [];
    }

    /**
     * الحصول على جميع البيانات
     */
    getAllData() {
        return this.data || [];
    }

    /**
     * تصدير البيانات بتنسيق مخصص
     */
    exportData(format = 'json') {
        const data = this.filteredData || this.data;
        switch (format) {
            case 'json':
                return JSON.stringify(data, null, 2);
            case 'csv':
                // استخدام نفس منطق exportCSV ولكن إعادة النص
                const headers = this.columns.map(col => col.title || col.key);
                const rows = data.map(row => {
                    return this.columns.map(col => {
                        const value = this.getRowValue(row, col.key);
                        return `"${String(value).replace(/"/g, '""')}"`;
                    });
                });
                return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            default:
                return data;
        }
    }
}

// ============================================
//  10.  دوال مساعدة لإنشاء الجداول
// ============================================

/**
 * إنشاء جدول جديد
 */
export function createTable(options = {}) {
    return new Table(options);
}

/**
 * إنشاء جدول من بيانات JSON
 */
export function createTableFromData(container, columns, data, options = {}) {
    return new Table({
        container,
        columns,
        data,
        ...options,
    });
}

// ============================================
//  11.  API عام للمكون
// ============================================

export const table = {
    Table,
    create: createTable,
    fromData: createTableFromData,
    SORT_DIRECTIONS,
    SELECTION_MODES,
};

// تصدير افتراضي
export default table;

// ============================================
//  12.  نهاية الملف
// ============================================
