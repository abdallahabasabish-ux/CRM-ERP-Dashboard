/**
 * ======================================================
 * الملف: components/search/search.js
 * الوصف: مكون البحث العام (Search)
 *         يدير وظائف البحث المتقدمة مع دعم الإكمال التلقائي،
 *         اقتراحات البحث، التصفية، التمييز، السجل،
 *         لوحة المفاتيح، والتفاعل مع المكونات الأخرى
 * الإصدار: 1.0.0
 * التاريخ: 2026-07-13
 * ======================================================
 */

import { createElement, removeElement, addClass, removeClass, toggleClass } from '../../utils/helpers.js';
import { debounce, escapeHtml, truncateText, getInitials } from '../../utils/helpers.js';
import { showLoader, hideLoader } from '../loader/loader.js';
import { toast } from '../toast/toast.js';

// ============================================
//  1.  الثوابت والإعدادات الافتراضية
// ============================================

const DEFAULT_DEBOUNCE = 300;
const DEFAULT_MAX_RESULTS = 10;
const DEFAULT_MAX_HISTORY = 20;
const SEARCH_HISTORY_KEY = 'erp_search_history';

const SEARCH_TYPES = {
    ALL: 'all',
    CUSTOMERS: 'customers',
    ORDERS: 'orders',
    EMPLOYEES: 'employees',
    SERVICES: 'services',
    TASKS: 'tasks',
    FILES: 'files',
    MESSAGES: 'messages',
    INVOICES: 'invoices',
};

const SEARCH_TYPE_LABELS = {
    [SEARCH_TYPES.ALL]: 'الكل',
    [SEARCH_TYPES.CUSTOMERS]: 'العملاء',
    [SEARCH_TYPES.ORDERS]: 'الطلبات',
    [SEARCH_TYPES.EMPLOYEES]: 'الموظفين',
    [SEARCH_TYPES.SERVICES]: 'الخدمات',
    [SEARCH_TYPES.TASKS]: 'المهام',
    [SEARCH_TYPES.FILES]: 'الملفات',
    [SEARCH_TYPES.MESSAGES]: 'الرسائل',
    [SEARCH_TYPES.INVOICES]: 'الفواتير',
};

const SEARCH_TYPE_ICONS = {
    [SEARCH_TYPES.ALL]: '🔍',
    [SEARCH_TYPES.CUSTOMERS]: '👥',
    [SEARCH_TYPES.ORDERS]: '📋',
    [SEARCH_TYPES.EMPLOYEES]: '👤',
    [SEARCH_TYPES.SERVICES]: '🛠️',
    [SEARCH_TYPES.TASKS]: '✅',
    [SEARCH_TYPES.FILES]: '📁',
    [SEARCH_TYPES.MESSAGES]: '💬',
    [SEARCH_TYPES.INVOICES]: '🧾',
};

// ============================================
//  2.  فئة البحث الرئيسية
// ============================================

class Search {
    constructor(options = {}) {
        this.id = options.id || `search-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        this.container = options.container || null;
        this.placeholder = options.placeholder || 'بحث...';
        this.type = options.type || SEARCH_TYPES.ALL;
        this.maxResults = options.maxResults || DEFAULT_MAX_RESULTS;
        this.debounceDelay = options.debounceDelay || DEFAULT_DEBOUNCE;
        this.enableHistory = options.enableHistory !== undefined ? options.enableHistory : true;
        this.enableSuggestions = options.enableSuggestions !== undefined ? options.enableSuggestions : true;
        this.enableTypes = options.enableTypes !== undefined ? options.enableTypes : true;
        this.enableShortcuts = options.enableShortcuts !== undefined ? options.enableShortcuts : true;
        this.autoFocus = options.autoFocus || false;
        this.expanded = options.expanded || false;
        this.className = options.className || '';
        this.style = options.style || {};
        this.resultsRenderer = options.resultsRenderer || null;
        this.suggestionRenderer = options.suggestionRenderer || null;
        this.emptyMessage = options.emptyMessage || 'لا توجد نتائج';
        this.loadingMessage = options.loadingMessage || 'جاري البحث...';
        this.noResultsMessage = options.noResultsMessage || 'لم يتم العثور على نتائج';

        // مصادر البيانات
        this.dataSources = options.dataSources || [];
        this.searchFn = options.searchFn || null;
        this.suggestFn = options.suggestFn || null;

        // الأحداث
        this.onSearch = options.onSearch || null;
        this.onSelect = options.onSelect || null;
        this.onSuggestion = options.onSuggestion || null;
        this.onClear = options.onClear || null;
        this.onFocus = options.onFocus || null;
        this.onBlur = options.onBlur || null;
        this.onLoad = options.onLoad || null;

        // الحالة الداخلية
        this.element = null;
        this.input = null;
        this.resultsContainer = null;
        this.suggestionsContainer = null;
        this.typeSelector = null;
        this.clearBtn = null;
        this.loadingIndicator = null;
        this.selectedIndex = -1;
        this.currentResults = [];
        this.currentSuggestions = [];
        this.searchHistory = [];
        this.isOpen = false;
        this.isLoading = false;
        this._debouncedSearch = null;
        this._loaderId = null;
        this._isDestroyed = false;

        // تهيئة
        if (this.container) {
            this.render();
        }
    }

    // ============================================
    //  3.  دوال العرض (Render)
    // ============================================

    /**
     * عرض مكون البحث بالكامل
     */
    render() {
        const container = typeof this.container === 'string' ?
            document.querySelector(this.container) :
            this.container;

        if (!container) {
            console.error('Search container not found');
            return this;
        }

        // إنشاء عنصر البحث
        this.element = createElement('div', {
            className: `search-component ${this.className} ${this.expanded ? 'expanded' : ''}`,
            style: {
                position: 'relative',
                width: '100%',
                maxWidth: '600px',
                ...this.style,
            },
            id: this.id,
        });

        // حاوية الإدخال
        const inputWrapper = createElement('div', {
            className: 'search-input-wrapper',
            style: {
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '0 var(--spacing-2)',
                transition: 'all var(--transition-fast)',
                boxShadow: 'var(--shadow-sm)',
            },
        });

        // أيقونة البحث
        const icon = createElement('span', {
            className: 'search-icon',
            textContent: '🔍',
            style: {
                fontSize: '18px',
                color: 'var(--text-tertiary)',
                padding: 'var(--spacing-2)',
                flexShrink: '0',
            },
        });
        inputWrapper.appendChild(icon);

        // حقل الإدخال
        this.input = createElement('input', {
            type: 'text',
            className: 'search-input',
            placeholder: this.placeholder,
            style: {
                flex: '1',
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                color: 'var(--text-primary)',
                fontSize: 'var(--font-base)',
                padding: 'var(--spacing-2)',
                minWidth: '60px',
            },
            autocomplete: 'off',
            spellcheck: 'false',
            onInput: (e) => {
                this.handleInput(e);
            },
            onFocus: (e) => {
                this.handleFocus(e);
            },
            onBlur: (e) => {
                // تأخير الإغلاق للسماح بالنقر على النتائج
                setTimeout(() => {
                    if (!this._isDestroyed) {
                        this.handleBlur(e);
                    }
                }, 150);
            },
            onKeydown: (e) => {
                this.handleKeydown(e);
            },
        });

        if (this.autoFocus) {
            setTimeout(() => this.input.focus(), 100);
        }

        // اختصار لوحة المفاتيح (Ctrl+K أو Cmd+K)
        if (this.enableShortcuts) {
            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                    e.preventDefault();
                    this.input.focus();
                    this.input.select();
                }
                if (e.key === 'Escape') {
                    this.close();
                    this.input.blur();
                }
            });
        }

        inputWrapper.appendChild(this.input);

        // زر المسح
        this.clearBtn = createElement('button', {
            className: 'search-clear',
            textContent: '✕',
            style: {
                display: 'none',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                padding: 'var(--spacing-2)',
                fontSize: '14px',
                borderRadius: 'var(--radius-full)',
                transition: 'all var(--transition-fast)',
                flexShrink: '0',
            },
            onClick: () => {
                this.clear();
            },
            onMouseEnter: (e) => {
                e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                e.currentTarget.style.color = 'var(--text-primary)';
            },
            onMouseLeave: (e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-tertiary)';
            },
        });
        inputWrapper.appendChild(this.clearBtn);

        // مؤشر التحميل
        this.loadingIndicator = createElement('div', {
            className: 'search-loading',
            style: {
                display: 'none',
                width: '20px',
                height: '20px',
                border: '2px solid var(--border-color)',
                borderTopColor: 'var(--color-primary)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                flexShrink: '0',
            },
        });
        inputWrapper.appendChild(this.loadingIndicator);

        this.element.appendChild(inputWrapper);

        // محدد النوع (فلتر)
        if (this.enableTypes) {
            this.typeSelector = this.createTypeSelector();
            this.element.appendChild(this.typeSelector);
        }

        // حاوية النتائج (منبثقة)
        this.resultsContainer = createElement('div', {
            className: 'search-results',
            style: {
                position: 'absolute',
                top: 'calc(100% + 4px)',
                right: '0',
                left: '0',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                maxHeight: '400px',
                overflowY: 'auto',
                zIndex: '1000',
                display: 'none',
                padding: 'var(--spacing-2) 0',
            },
        });
        this.element.appendChild(this.resultsContainer);

        // إضافة المكون إلى الحاوية
        container.appendChild(this.element);

        // تحميل سجل البحث
        if (this.enableHistory) {
            this.loadHistory();
        }

        // إنشاء دالة البحث المؤجلة
        this._debouncedSearch = debounce(this.performSearch.bind(this), this.debounceDelay);

        return this;
    }

    /**
     * إنشاء محدد النوع (فلتر)
     */
    createTypeSelector() {
        const container = createElement('div', {
            className: 'search-type-selector',
            style: {
                display: 'flex',
                gap: 'var(--spacing-1)',
                marginTop: 'var(--spacing-2)',
                flexWrap: 'wrap',
                padding: '0 var(--spacing-1)',
            },
        });

        const types = [
            { key: SEARCH_TYPES.ALL, label: SEARCH_TYPE_LABELS[SEARCH_TYPES.ALL] },
            { key: SEARCH_TYPES.CUSTOMERS, label: SEARCH_TYPE_LABELS[SEARCH_TYPES.CUSTOMERS] },
            { key: SEARCH_TYPES.ORDERS, label: SEARCH_TYPE_LABELS[SEARCH_TYPES.ORDERS] },
            { key: SEARCH_TYPES.EMPLOYEES, label: SEARCH_TYPE_LABELS[SEARCH_TYPES.EMPLOYEES] },
            { key: SEARCH_TYPES.SERVICES, label: SEARCH_TYPE_LABELS[SEARCH_TYPES.SERVICES] },
            { key: SEARCH_TYPES.TASKS, label: SEARCH_TYPE_LABELS[SEARCH_TYPES.TASKS] },
            { key: SEARCH_TYPES.FILES, label: SEARCH_TYPE_LABELS[SEARCH_TYPES.FILES] },
            { key: SEARCH_TYPES.MESSAGES, label: SEARCH_TYPE_LABELS[SEARCH_TYPES.MESSAGES] },
            { key: SEARCH_TYPES.INVOICES, label: SEARCH_TYPE_LABELS[SEARCH_TYPES.INVOICES] },
        ];

        types.forEach(type => {
            const btn = createElement('button', {
                className: `search-type-btn ${type.key === this.type ? 'active' : ''}`,
                textContent: type.label,
                'data-type': type.key,
                style: {
                    padding: 'var(--spacing-1) var(--spacing-3)',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: type.key === this.type ? 'var(--color-primary)' : 'transparent',
                    color: type.key === this.type ? '#ffffff' : 'var(--text-secondary)',
                    fontSize: 'var(--font-xs)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    whiteSpace: 'nowrap',
                },
                onClick: () => {
                    this.setType(type.key);
                },
                onMouseEnter: (e) => {
                    if (type.key !== this.type) {
                        e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                    }
                },
                onMouseLeave: (e) => {
                    if (type.key !== this.type) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }
                },
            });
            container.appendChild(btn);
        });

        return container;
    }

    /**
     * عرض النتائج
     */
    renderResults(results, suggestions = null) {
        if (!this.resultsContainer) return;

        // مسح المحتوى القديم
        this.resultsContainer.innerHTML = '';

        if (this.isLoading) {
            // عرض حالة التحميل
            const loadingEl = createElement('div', {
                className: 'search-loading-message',
                textContent: this.loadingMessage,
                style: {
                    padding: 'var(--spacing-4)',
                    textAlign: 'center',
                    color: 'var(--text-tertiary)',
                    fontSize: 'var(--font-sm)',
                },
            });
            this.resultsContainer.appendChild(loadingEl);
            this.resultsContainer.style.display = 'block';
            return;
        }

        // عرض الاقتراحات (إذا كانت موجودة)
        if (suggestions && suggestions.length > 0 && this.enableSuggestions) {
            this.renderSuggestions(suggestions);
        }

        // عرض النتائج
        if (!results || results.length === 0) {
            // عرض رسالة عدم وجود نتائج
            const message = suggestions && suggestions.length > 0 ? this.noResultsMessage : this.emptyMessage;
            const emptyEl = createElement('div', {
                className: 'search-empty',
                textContent: message,
                style: {
                    padding: 'var(--spacing-4)',
                    textAlign: 'center',
                    color: 'var(--text-tertiary)',
                    fontSize: 'var(--font-sm)',
                },
            });
            this.resultsContainer.appendChild(emptyEl);
        } else {
            // عرض النتائج
            results.forEach((result, index) => {
                const item = this.createResultItem(result, index);
                this.resultsContainer.appendChild(item);
            });
        }

        // عرض السجل (إذا كان البحث فارغاً)
        if (!this.input?.value?.trim() && this.enableHistory && this.searchHistory.length > 0 && results.length === 0) {
            this.renderHistory();
        }

        // عرض النتائج
        this.resultsContainer.style.display = 'block';
        this.isOpen = true;

        // تحديد العنصر الأول
        this.selectedIndex = -1;
        this.highlightSelected();
    }

    /**
     * عرض الاقتراحات
     */
    renderSuggestions(suggestions) {
        const wrapper = createElement('div', {
            className: 'search-suggestions',
            style: {
                padding: 'var(--spacing-2) var(--spacing-3)',
                borderBottom: '1px solid var(--border-color)',
                marginBottom: 'var(--spacing-2)',
            },
        });

        const label = createElement('div', {
            className: 'search-suggestions-label',
            textContent: 'اقتراحات:',
            style: {
                fontSize: 'var(--font-xs)',
                color: 'var(--text-tertiary)',
                marginBottom: 'var(--spacing-2)',
            },
        });
        wrapper.appendChild(label);

        const itemsContainer = createElement('div', {
            style: {
                display: 'flex',
                flexWrap: 'wrap',
                gap: 'var(--spacing-2)',
            },
        });

        suggestions.forEach(suggestion => {
            const item = this.createSuggestionItem(suggestion);
            itemsContainer.appendChild(item);
        });

        wrapper.appendChild(itemsContainer);
        this.resultsContainer.appendChild(wrapper);
    }

    /**
     * إنشاء عنصر نتيجة
     */
    createResultItem(result, index) {
        const query = this.input?.value?.trim() || '';

        const item = createElement('div', {
            className: 'search-result-item',
            'data-index': index,
            style: {
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-3)',
                padding: 'var(--spacing-2) var(--spacing-4)',
                cursor: 'pointer',
                transition: 'background var(--transition-fast)',
                borderBottom: index < this.currentResults.length - 1 ? '1px solid var(--border-color)' : 'none',
            },
            onMouseEnter: () => {
                this.selectedIndex = index;
                this.highlightSelected();
            },
            onClick: () => {
                this.selectResult(result);
            },
        });

        // أيقونة النوع
        const icon = result.icon || result.typeIcon || this.getResultIcon(result);
        if (icon) {
            const iconEl = createElement('span', {
                className: 'result-icon',
                textContent: icon,
                style: {
                    fontSize: '20px',
                    flexShrink: '0',
                },
            });
            item.appendChild(iconEl);
        }

        // محتوى النتيجة
        const content = createElement('div', {
            className: 'result-content',
            style: {
                flex: '1',
                minWidth: '0',
            },
        });

        // العنوان
        const title = createElement('div', {
            className: 'result-title',
            style: {
                fontWeight: 'var(--font-medium)',
                color: 'var(--text-primary)',
                fontSize: 'var(--font-sm)',
                wordBreak: 'break-word',
            },
        });

        // تمييز النص المطابق
        if (query && result.title) {
            title.innerHTML = this.highlightText(result.title, query);
        } else {
            title.textContent = result.title || 'بدون عنوان';
        }
        content.appendChild(title);

        // الوصف
        if (result.description || result.subtitle) {
            const desc = createElement('div', {
                className: 'result-description',
                style: {
                    fontSize: 'var(--font-xs)',
                    color: 'var(--text-secondary)',
                    wordBreak: 'break-word',
                },
            });
            if (query && result.description) {
                desc.innerHTML = this.highlightText(result.description, query);
            } else {
                desc.textContent = result.description || result.subtitle || '';
            }
            content.appendChild(desc);
        }

        // معلومات إضافية
        if (result.meta || result.type) {
            const meta = createElement('div', {
                className: 'result-meta',
                style: {
                    display: 'flex',
                    gap: 'var(--spacing-2)',
                    fontSize: 'var(--font-xs)',
                    color: 'var(--text-tertiary)',
                    marginTop: 'var(--spacing-1)',
                },
            });

            if (result.type) {
                const typeLabel = createElement('span', {
                    className: 'result-type',
                    textContent: SEARCH_TYPE_LABELS[result.type] || result.type,
                    style: {
                        backgroundColor: 'var(--bg-tertiary)',
                        padding: '0 var(--spacing-2)',
                        borderRadius: 'var(--radius-sm)',
                    },
                });
                meta.appendChild(typeLabel);
            }

            if (result.meta) {
                const metaText = createElement('span', {
                    textContent: result.meta,
                });
                meta.appendChild(metaText);
            }

            if (meta.children.length > 0) {
                content.appendChild(meta);
            }
        }

        item.appendChild(content);

        // زر إجراء (اختياري)
        if (result.action) {
            const actionBtn = createElement('button', {
                className: 'result-action btn btn-secondary btn-sm',
                textContent: result.action.label || 'عرض',
                style: {
                    fontSize: 'var(--font-xs)',
                    flexShrink: '0',
                },
                onClick: (e) => {
                    e.stopPropagation();
                    if (result.action.onClick) {
                        result.action.onClick(result);
                    }
                },
            });
            item.appendChild(actionBtn);
        }

        return item;
    }

    /**
     * إنشاء عنصر اقتراح
     */
    createSuggestionItem(suggestion) {
        const item = createElement('button', {
            className: 'search-suggestion-item',
            style: {
                padding: 'var(--spacing-1) var(--spacing-3)',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-secondary)',
                fontSize: 'var(--font-xs)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                whiteSpace: 'nowrap',
            },
            onClick: () => {
                if (typeof suggestion === 'string') {
                    this.input.value = suggestion;
                    this.performSearch(suggestion);
                } else if (suggestion.text) {
                    this.input.value = suggestion.text;
                    this.performSearch(suggestion.text);
                }
                if (this.onSuggestion) {
                    this.onSuggestion(suggestion);
                }
            },
            onMouseEnter: (e) => {
                e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                e.currentTarget.style.borderColor = 'var(--color-primary)';
            },
            onMouseLeave: (e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                e.currentTarget.style.borderColor = 'var(--border-color)';
            },
        });

        const icon = suggestion.icon || '🔍';
        const text = typeof suggestion === 'string' ? suggestion : suggestion.text || suggestion.label || '';

        item.innerHTML = `${icon} ${escapeHtml(text)}`;
        return item;
    }

    /**
     * عرض سجل البحث
     */
    renderHistory() {
        if (!this.enableHistory || this.searchHistory.length === 0) return;

        const wrapper = createElement('div', {
            className: 'search-history',
            style: {
                padding: 'var(--spacing-2) var(--spacing-3)',
            },
        });

        const header = createElement('div', {
            style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--spacing-2)',
            },
        });

        const label = createElement('span', {
            textContent: 'آخر عمليات البحث:',
            style: {
                fontSize: 'var(--font-xs)',
                color: 'var(--text-tertiary)',
            },
        });
        header.appendChild(label);

        const clearBtn = createElement('button', {
            className: 'btn btn-sm',
            textContent: 'مسح الكل',
            style: {
                fontSize: 'var(--font-xs)',
                background: 'transparent',
                border: 'none',
                color: 'var(--color-danger)',
                cursor: 'pointer',
                padding: 'var(--spacing-1) var(--spacing-2)',
                borderRadius: 'var(--radius-sm)',
            },
            onClick: (e) => {
                e.stopPropagation();
                this.clearHistory();
            },
            onMouseEnter: (e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,86,48,0.1)';
            },
            onMouseLeave: (e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
            },
        });
        header.appendChild(clearBtn);

        wrapper.appendChild(header);

        const itemsContainer = createElement('div', {
            style: {
                display: 'flex',
                flexWrap: 'wrap',
                gap: 'var(--spacing-2)',
            },
        });

        this.searchHistory.slice(0, DEFAULT_MAX_HISTORY).forEach(term => {
            const item = createElement('button', {
                className: 'search-history-item',
                textContent: term,
                style: {
                    padding: 'var(--spacing-1) var(--spacing-3)',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-secondary)',
                    fontSize: 'var(--font-xs)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                },
                onClick: () => {
                    this.input.value = term;
                    this.performSearch(term);
                },
                onMouseEnter: (e) => {
                    e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                },
                onMouseLeave: (e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                },
            });
            itemsContainer.appendChild(item);
        });

        wrapper.appendChild(itemsContainer);
        this.resultsContainer.appendChild(wrapper);
    }

    /**
     * تمييز النص المطابق
     */
    highlightText(text, query) {
        if (!text || !query) return escapeHtml(text);
        const escapedText = escapeHtml(text);
        const escapedQuery = escapeHtml(query);
        const regex = new RegExp(`(${escapedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return escapedText.replace(regex, '<mark style="background-color:var(--color-primary);color:#ffffff;border-radius:var(--radius-sm);padding:0 2px;">$1</mark>');
    }

    /**
     * الحصول على أيقونة النتيجة
     */
    getResultIcon(result) {
        if (result.icon) return result.icon;
        const type = result.type || this.type;
        return SEARCH_TYPE_ICONS[type] || '📄';
    }

    /**
     * تحديد العنصر المحدد
     */
    highlightSelected() {
        const items = this.resultsContainer?.querySelectorAll('.search-result-item');
        if (!items) return;

        items.forEach((item, index) => {
            if (index === this.selectedIndex) {
                addClass(item, 'selected');
                item.style.backgroundColor = 'var(--selected-bg)';
                // التمرير إلى العنصر المحدد
                item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                removeClass(item, 'selected');
                item.style.backgroundColor = '';
            }
        });
    }

    // ============================================
    //  4.  دوال معالجة الأحداث (Event Handlers)
    // ============================================

    /**
     * معالج الإدخال
     */
    handleInput(e) {
        const value = e.target.value;

        // إظهار/إخفاء زر المسح
        if (this.clearBtn) {
            this.clearBtn.style.display = value ? 'block' : 'none';
        }

        if (value.trim().length > 0) {
            // تنفيذ البحث المؤجل
            this._debouncedSearch(value);
        } else {
            // إظهار السجل عند مسح النص
            this.close();
            if (this.enableHistory) {
                this.loadHistory();
                this.renderResults([]);
            }
        }
    }

    /**
     * معالج التركيز
     */
    handleFocus(e) {
        if (this.onFocus) {
            this.onFocus(e);
        }

        // إظهار النتائج إذا كان هناك نص
        const value = this.input?.value?.trim() || '';
        if (value.length > 0) {
            this.performSearch(value);
        } else if (this.enableHistory && this.searchHistory.length > 0) {
            this.renderResults([]);
        }

        // إضافة صنف التركيز
        addClass(this.element, 'focused');
    }

    /**
     * معالج فقدان التركيز
     */
    handleBlur(e) {
        if (this.onBlur) {
            this.onBlur(e);
        }

        removeClass(this.element, 'focused');

        // إغلاق النتائج بعد تأخير
        if (!this._isDestroyed) {
            this.close();
        }
    }

    /**
     * معالج لوحة المفاتيح
     */
    handleKeydown(e) {
        const items = this.resultsContainer?.querySelectorAll('.search-result-item');
        const total = items?.length || 0;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (total > 0) {
                    this.selectedIndex = (this.selectedIndex + 1) % total;
                    this.highlightSelected();
                }
                break;

            case 'ArrowUp':
                e.preventDefault();
                if (total > 0) {
                    this.selectedIndex = (this.selectedIndex - 1 + total) % total;
                    this.highlightSelected();
                }
                break;

            case 'Enter':
                e.preventDefault();
                if (this.selectedIndex >= 0 && this.selectedIndex < total) {
                    const selectedItem = items[this.selectedIndex];
                    if (selectedItem) {
                        selectedItem.click();
                    }
                } else {
                    // تنفيذ البحث الفوري
                    const value = this.input?.value?.trim();
                    if (value) {
                        this.performSearch(value);
                        this.selectResult({ title: value, type: 'search' });
                    }
                }
                break;

            case 'Escape':
                e.preventDefault();
                this.close();
                this.input?.blur();
                break;
        }
    }

    // ============================================
    //  5.  دوال البحث الأساسية
    // ============================================

    /**
     * تنفيذ البحث
     */
    async performSearch(query = null) {
        const searchQuery = query || this.input?.value?.trim() || '';

        if (!searchQuery) {
            this.close();
            return;
        }

        this.isLoading = true;
        this.showLoading(true);

        try {
            let results = [];
            let suggestions = [];

            // استخدام دالة البحث المخصصة
            if (this.searchFn) {
                const result = await this.searchFn(searchQuery, this.type);
                results = result.results || result.data || result || [];
                suggestions = result.suggestions || [];
            } else if (this.dataSources.length > 0) {
                // البحث في مصادر البيانات
                results = await this.searchDataSources(searchQuery);
            } else {
                // بيانات افتراضية للتجربة
                results = this.getMockResults(searchQuery);
            }

            // حفظ السجل
            if (this.enableHistory && searchQuery.trim().length > 0) {
                this.addHistory(searchQuery.trim());
            }

            // تحديث النتائج
            this.currentResults = results;
            this.currentSuggestions = suggestions;

            // عرض النتائج
            this.renderResults(results, suggestions);

            // استدعاء onSearch
            if (this.onSearch) {
                this.onSearch(searchQuery, results, suggestions);
            }

        } catch (error) {
            console.error('Search error:', error);
            toast.error('حدث خطأ أثناء البحث: ' + error.message);
            this.renderResults([]);
        } finally {
            this.isLoading = false;
            this.showLoading(false);
        }
    }

    /**
     * البحث في مصادر البيانات
     */
    async searchDataSources(query) {
        const results = [];

        for (const source of this.dataSources) {
            try {
                let data;
                if (typeof source === 'function') {
                    data = await source(query, this.type);
                } else if (source.data && typeof source.data === 'function') {
                    data = await source.data(query, this.type);
                } else if (Array.isArray(source)) {
                    data = this.searchArray(source, query, source.searchKeys || ['title', 'name', 'description']);
                } else {
                    continue;
                }

                if (Array.isArray(data)) {
                    results.push(...data);
                }
            } catch (error) {
                console.warn('Search source error:', error);
            }
        }

        // إزالة المكررات
        const unique = new Map();
        results.forEach(item => {
            const id = item.id || item.key || item.title || JSON.stringify(item);
            if (!unique.has(id)) {
                unique.set(id, item);
            }
        });

        return Array.from(unique.values()).slice(0, this.maxResults);
    }

    /**
     * البحث في مصفوفة
     */
    searchArray(array, query, searchKeys) {
        const q = query.toLowerCase().trim();
        return array.filter(item => {
            return searchKeys.some(key => {
                const value = this.getValueByPath(item, key);
                return value && String(value).toLowerCase().includes(q);
            });
        });
    }

    /**
     * الحصول على قيمة من كائن باستخدام مسار
     */
    getValueByPath(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : null;
        }, obj);
    }

    /**
     * بيانات افتراضية للتجربة
     */
    getMockResults(query) {
        const q = query.toLowerCase();
        const mockData = [
            { id: 1, title: 'أحمد محمد', type: 'customers', description: 'عميل', icon: '👤' },
            { id: 2, title: 'طلب #12345', type: 'orders', description: 'طلب جديد', icon: '📋' },
            { id: 3, title: 'سارة علي', type: 'employees', description: 'موظف', icon: '👤' },
            { id: 4, title: 'خدمة تصميم', type: 'services', description: 'خدمة', icon: '🛠️' },
            { id: 5, title: 'مهمة مراجعة', type: 'tasks', description: 'مهمة', icon: '✅' },
            { id: 6, title: 'فاتورة #6789', type: 'invoices', description: 'فاتورة', icon: '🧾' },
        ];

        return mockData.filter(item => {
            const searchText = `${item.title} ${item.description}`.toLowerCase();
            return searchText.includes(q);
        });
    }

    // ============================================
    //  6.  دوال التحكم (Control Functions)
    // ============================================

    /**
     * تحديد نتيجة
     */
    selectResult(result) {
        // حفظ في السجل إذا لم يتم حفظه مسبقاً
        if (this.enableHistory && result.title && !this.searchHistory.includes(result.title)) {
            this.addHistory(result.title);
        }

        // إغلاق النتائج
        this.close();

        // استدعاء onSelect
        if (this.onSelect) {
            this.onSelect(result);
        }

        // تعيين قيمة الإدخال
        if (result.title) {
            this.input.value = result.title;
        }
    }

    /**
     * تعيين نوع البحث
     */
    setType(type) {
        this.type = type;
        // تحديث واجهة الأزرار
        const buttons = this.element?.querySelectorAll('.search-type-btn');
        buttons?.forEach(btn => {
            const btnType = btn.dataset.type;
            if (btnType === type) {
                addClass(btn, 'active');
                btn.style.backgroundColor = 'var(--color-primary)';
                btn.style.color = '#ffffff';
            } else {
                removeClass(btn, 'active');
                btn.style.backgroundColor = 'transparent';
                btn.style.color = 'var(--text-secondary)';
            }
        });

        // إعادة البحث
        const value = this.input?.value?.trim();
        if (value) {
            this.performSearch(value);
        }
    }

    /**
     * مسح البحث
     */
    clear() {
        if (this.input) {
            this.input.value = '';
            this.input.focus();
        }
        if (this.clearBtn) {
            this.clearBtn.style.display = 'none';
        }
        this.close();
        if (this.onClear) {
            this.onClear();
        }
        // عرض السجل
        if (this.enableHistory) {
            this.loadHistory();
            this.renderResults([]);
        }
    }

    /**
     * إغلاق النتائج
     */
    close() {
        if (this.resultsContainer) {
            this.resultsContainer.style.display = 'none';
        }
        this.isOpen = false;
        this.selectedIndex = -1;
        this.isLoading = false;
        this.showLoading(false);
    }

    /**
     * فتح النتائج
     */
    open() {
        if (this.resultsContainer) {
            const value = this.input?.value?.trim() || '';
            if (value) {
                this.performSearch(value);
            } else if (this.enableHistory && this.searchHistory.length > 0) {
                this.renderResults([]);
            }
        }
    }

    // ============================================
    //  7.  دوال السجل (History)
    // ============================================

    /**
     * تحميل سجل البحث
     */
    loadHistory() {
        try {
            const data = localStorage.getItem(SEARCH_HISTORY_KEY);
            this.searchHistory = data ? JSON.parse(data) : [];
        } catch (e) {
            this.searchHistory = [];
        }
    }

    /**
     * حفظ سجل البحث
     */
    saveHistory() {
        try {
            localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(this.searchHistory));
        } catch (e) {
            console.warn('Failed to save search history:', e);
        }
    }

    /**
     * إضافة مصطلح إلى السجل
     */
    addHistory(term) {
        term = term.trim();
        if (!term) return;

        // إزالة المكررات
        this.searchHistory = this.searchHistory.filter(item => item !== term);
        // إضافة في البداية
        this.searchHistory.unshift(term);
        // الحد الأقصى
        if (this.searchHistory.length > DEFAULT_MAX_HISTORY) {
            this.searchHistory = this.searchHistory.slice(0, DEFAULT_MAX_HISTORY);
        }
        this.saveHistory();
    }

    /**
     * مسح السجل
     */
    clearHistory() {
        this.searchHistory = [];
        this.saveHistory();
        // إعادة عرض النتائج
        const value = this.input?.value?.trim() || '';
        if (!value) {
            this.renderResults([]);
        }
        toast.success('تم مسح سجل البحث');
    }

    // ============================================
    //  8.  دوال التحميل غير المتزامن
    // ============================================

    /**
     * تحميل البيانات من مصدر خارجي
     */
    async loadData(fetchFn, params = {}) {
        this.showLoading(true);
        try {
            const result = await fetchFn(params);
            const data = result.data || result;
            if (Array.isArray(data)) {
                this.dataSources = [data];
            }
            if (this.onLoad) {
                this.onLoad(result);
            }
        } catch (error) {
            toast.error('حدث خطأ أثناء تحميل بيانات البحث: ' + error.message);
            console.error('Search load error:', error);
        } finally {
            this.showLoading(false);
        }
        return this;
    }

    /**
     * إظهار/إخفاء حالة التحميل
     */
    showLoading(loading) {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = loading ? 'block' : 'none';
        }
        if (loading) {
            this._loaderId = showLoader({
                target: this.element,
                message: this.loadingMessage,
                overlay: true,
                overlayColor: 'rgba(255,255,255,0.4)',
            });
        } else {
            if (this._loaderId) {
                hideLoader(this._loaderId);
                this._loaderId = null;
            }
        }
        return this;
    }

    // ============================================
    //  9.  دوال التصدير
    // ============================================

    /**
     * تصدير النتائج الحالية
     */
    exportResults() {
        return JSON.stringify(this.currentResults, null, 2);
    }

    /**
     * تصدير السجل
     */
    exportHistory() {
        return JSON.stringify(this.searchHistory, null, 2);
    }

    // ============================================
    //  10.  دوال التنظيف والتدمير
    // ============================================

    /**
     * تدمير مكون البحث
     */
    destroy() {
        this._isDestroyed = true;
        if (this._loaderId) {
            hideLoader(this._loaderId);
            this._loaderId = null;
        }
        if (this.element) {
            removeElement(this.element);
            this.element = null;
        }
        this.input = null;
        this.resultsContainer = null;
        this.currentResults = [];
        this.currentSuggestions = [];
        console.log('Search destroyed:', this.id);
        return this;
    }

    /**
     * تحديث مكون البحث
     */
    refresh() {
        const value = this.input?.value?.trim() || '';
        if (value) {
            this.performSearch(value);
        } else {
            this.close();
        }
        return this;
    }

    // ============================================
    //  11.  دوال مساعدة للاستعلام
    // ============================================

    /**
     * الحصول على قيمة الإدخال
     */
    getValue() {
        return this.input?.value || '';
    }

    /**
     * تعيين قيمة الإدخال
     */
    setValue(value) {
        if (this.input) {
            this.input.value = value;
            if (this.clearBtn) {
                this.clearBtn.style.display = value ? 'block' : 'none';
            }
            if (value.trim()) {
                this.performSearch(value);
            }
        }
        return this;
    }

    /**
     * الحصول على النتائج الحالية
     */
    getResults() {
        return [...this.currentResults];
    }

    /**
     * الحصول على السجل
     */
    getHistory() {
        return [...this.searchHistory];
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

    /**
     * التركيز على حقل الإدخال
     */
    focus() {
        this.input?.focus();
        return this;
    }

    /**
     * إلغاء التركيز
     */
    blur() {
        this.input?.blur();
        return this;
    }
}

// ============================================
//  12.  دوال مساعدة لإنشاء البحث
// ============================================

/**
 * إنشاء مكون بحث جديد
 */
export function createSearch(options = {}) {
    return new Search(options);
}

/**
 * إنشاء بحث مع مصادر بيانات
 */
export function createSearchWithSources(container, sources, options = {}) {
    return new Search({
        container,
        dataSources: sources,
        ...options,
    });
}

// ============================================
//  13.  دوال التهيئة والتنظيف
// ============================================

/**
 * تهيئة نظام البحث
 */
export function initSearch() {
    if (!document.getElementById('search-style')) {
        const style = document.createElement('style');
        style.id = 'search-style';
        style.textContent = `
            .search-component {
                position: relative;
                width: 100%;
                max-width: 600px;
            }
            .search-component .search-input-wrapper {
                display: flex;
                align-items: center;
                background-color: var(--bg-primary);
                border: 1px solid var(--border-color);
                border-radius: var(--radius-md);
                padding: 0 var(--spacing-2);
                transition: all 0.2s ease;
                box-shadow: var(--shadow-sm);
            }
            .search-component .search-input-wrapper:focus-within {
                border-color: var(--color-primary);
                box-shadow: 0 0 0 3px var(--selected-bg);
            }
            .search-component .search-input {
                flex: 1;
                border: none;
                outline: none;
                background-color: transparent;
                color: var(--text-primary);
                font-size: var(--font-base);
                padding: var(--spacing-2);
                min-width: 60px;
            }
            .search-component .search-input::placeholder {
                color: var(--text-tertiary);
            }
            .search-component .search-clear {
                display: none;
                border: none;
                background: transparent;
                color: var(--text-tertiary);
                cursor: pointer;
                padding: var(--spacing-2);
                font-size: 14px;
                border-radius: var(--radius-full);
                transition: all 0.15s ease;
                flex-shrink: 0;
            }
            .search-component .search-clear:hover {
                background-color: var(--hover-bg);
                color: var(--text-primary);
            }
            .search-component .search-loading {
                display: none;
                width: 20px;
                height: 20px;
                border: 2px solid var(--border-color);
                border-top-color: var(--color-primary);
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
                flex-shrink: 0;
            }
            .search-component .search-type-selector {
                display: flex;
                gap: var(--spacing-1);
                margin-top: var(--spacing-2);
                flex-wrap: wrap;
                padding: 0 var(--spacing-1);
            }
            .search-component .search-type-btn {
                padding: var(--spacing-1) var(--spacing-3);
                border-radius: var(--radius-full);
                border: 1px solid var(--border-color);
                background-color: transparent;
                color: var(--text-secondary);
                font-size: var(--font-xs);
                cursor: pointer;
                transition: all 0.15s ease;
                white-space: nowrap;
            }
            .search-component .search-type-btn:hover {
                background-color: var(--hover-bg);
            }
            .search-component .search-type-btn.active {
                background-color: var(--color-primary);
                color: #ffffff;
                border-color: var(--color-primary);
            }
            .search-component .search-results {
                position: absolute;
                top: calc(100% + 4px);
                right: 0;
                left: 0;
                background-color: var(--bg-card);
                border: 1px solid var(--border-color);
                border-radius: var(--radius-md);
                box-shadow: var(--shadow-lg);
                max-height: 400px;
                overflow-y: auto;
                z-index: 1000;
                display: none;
                padding: var(--spacing-2) 0;
            }
            .search-component .search-result-item {
                display: flex;
                align-items: center;
                gap: var(--spacing-3);
                padding: var(--spacing-2) var(--spacing-4);
                cursor: pointer;
                transition: background 0.15s ease;
                border-bottom: 1px solid var(--border-color);
            }
            .search-component .search-result-item:last-child {
                border-bottom: none;
            }
            .search-component .search-result-item:hover,
            .search-component .search-result-item.selected {
                background-color: var(--selected-bg);
            }
            .search-component .search-result-item .result-icon {
                font-size: 20px;
                flex-shrink: 0;
            }
            .search-component .search-result-item .result-content {
                flex: 1;
                min-width: 0;
            }
            .search-component .search-result-item .result-title {
                font-weight: var(--font-medium);
                color: var(--text-primary);
                font-size: var(--font-sm);
                word-break: break-word;
            }
            .search-component .search-result-item .result-title mark {
                background-color: var(--color-primary);
                color: #ffffff;
                border-radius: var(--radius-sm);
                padding: 0 2px;
            }
            .search-component .search-result-item .result-description {
                font-size: var(--font-xs);
                color: var(--text-secondary);
                word-break: break-word;
            }
            .search-component .search-result-item .result-description mark {
                background-color: var(--color-primary);
                color: #ffffff;
                border-radius: var(--radius-sm);
                padding: 0 2px;
            }
            .search-component .search-result-item .result-meta {
                display: flex;
                gap: var(--spacing-2);
                font-size: var(--font-xs);
                color: var(--text-tertiary);
                margin-top: var(--spacing-1);
            }
            .search-component .search-result-item .result-type {
                background-color: var(--bg-tertiary);
                padding: 0 var(--spacing-2);
                border-radius: var(--radius-sm);
            }
            .search-component .search-suggestions {
                padding: var(--spacing-2) var(--spacing-3);
                border-bottom: 1px solid var(--border-color);
                margin-bottom: var(--spacing-2);
            }
            .search-component .search-suggestions-label {
                font-size: var(--font-xs);
                color: var(--text-tertiary);
                margin-bottom: var(--spacing-2);
            }
            .search-component .search-suggestion-item {
                padding: var(--spacing-1) var(--spacing-3);
                border-radius: var(--radius-full);
                border: 1px solid var(--border-color);
                background-color: var(--bg-primary);
                color: var(--text-secondary);
                font-size: var(--font-xs);
                cursor: pointer;
                transition: all 0.15s ease;
                white-space: nowrap;
            }
            .search-component .search-suggestion-item:hover {
                background-color: var(--hover-bg);
                border-color: var(--color-primary);
            }
            .search-component .search-history {
                padding: var(--spacing-2) var(--spacing-3);
            }
            .search-component .search-history-item {
                padding: var(--spacing-1) var(--spacing-3);
                border-radius: var(--radius-full);
                border: 1px solid var(--border-color);
                background-color: var(--bg-secondary);
                color: var(--text-secondary);
                font-size: var(--font-xs);
                cursor: pointer;
                transition: all 0.15s ease;
            }
            .search-component .search-history-item:hover {
                background-color: var(--hover-bg);
                border-color: var(--color-primary);
            }
            .search-component .search-empty,
            .search-component .search-loading-message {
                padding: var(--spacing-4);
                text-align: center;
                color: var(--text-tertiary);
                font-size: var(--font-sm);
            }
            .dark .search-component .search-input-wrapper {
                border-color: var(--border-color);
            }
            .dark .search-component .search-input-wrapper:focus-within {
                border-color: var(--color-primary);
            }
            .dark .search-component .search-results {
                border-color: var(--border-color);
                background-color: var(--bg-card);
            }
            .dark .search-component .search-result-item {
                border-color: var(--border-color);
            }
            .dark .search-component .search-result-item:hover,
            .dark .search-component .search-result-item.selected {
                background-color: var(--selected-bg);
            }
            @media (max-width: 768px) {
                .search-component {
                    max-width: 100%;
                }
                .search-component .search-input {
                    font-size: var(--font-sm);
                    padding: var(--spacing-1) var(--spacing-2);
                }
                .search-component .search-type-selector {
                    gap: var(--spacing-1);
                }
                .search-component .search-type-btn {
                    font-size: 10px;
                    padding: var(--spacing-1) var(--spacing-2);
                }
                .search-component .search-results {
                    max-height: 300px;
                    right: -8px;
                    left: -8px;
                    border-radius: var(--radius-sm);
                }
                .search-component .search-result-item {
                    padding: var(--spacing-2) var(--spacing-3);
                    gap: var(--spacing-2);
                }
                .search-component .search-result-item .result-icon {
                    font-size: 16px;
                }
                .search-component .search-result-item .result-title {
                    font-size: var(--font-xs);
                }
                .search-component .search-result-item .result-description {
                    font-size: 10px;
                }
            }
            @media (max-width: 480px) {
                .search-component .search-input-wrapper {
                    border-radius: var(--radius-sm);
                    padding: 0 var(--spacing-1);
                }
                .search-component .search-input {
                    font-size: 10px;
                    padding: var(--spacing-1);
                }
                .search-component .search-type-selector {
                    gap: 2px;
                }
                .search-component .search-type-btn {
                    font-size: 9px;
                    padding: 2px var(--spacing-2);
                }
                .search-component .search-results {
                    max-height: 250px;
                    padding: var(--spacing-1) 0;
                }
                .search-component .search-result-item {
                    padding: var(--spacing-1) var(--spacing-2);
                    gap: var(--spacing-1);
                }
                .search-component .search-result-item .result-icon {
                    font-size: 14px;
                }
                .search-component .search-result-item .result-title {
                    font-size: 10px;
                }
                .search-component .search-suggestion-item {
                    font-size: 9px;
                    padding: 2px var(--spacing-2);
                }
                .search-component .search-history-item {
                    font-size: 9px;
                    padding: 2px var(--spacing-2);
                }
            }
        `;
        document.head.appendChild(style);
    }
    console.log('Search component initialized successfully');
}

/**
 * تنظيف نظام البحث
 */
export function destroySearch() {
    const style = document.getElementById('search-style');
    if (style) {
        style.remove();
    }
    console.log('Search component destroyed');
}

// ============================================
//  14.  API عام للمكون
// ============================================

export const search = {
    Search,
    create: createSearch,
    withSources: createSearchWithSources,
    init: initSearch,
    destroy: destroySearch,
    TYPES: SEARCH_TYPES,
    LABELS: SEARCH_TYPE_LABELS,
    ICONS: SEARCH_TYPE_ICONS,
};

// تصدير افتراضي
export default search;

// ============================================
//  15.  تهيئة تلقائية عند تحميل الوحدة
// ============================================

// سيتم استدعاء init من app.js، لذلك لا نقوم بتهيئة تلقائية هنا

// ============================================
//  16.  نهاية الملف
// ============================================
