/**
 * ======================================================
 * الملف: components/kanban/kanban.js
 * الوصف: مكون لوحة كانبان (Kanban Board)
 *         يدير عرض الأعمدة والبطاقات مع دعم السحب والإفلات،
 *         إضافة وتعديل وحذف البطاقات، وتحديث الحالة،
 *         والتفاعل مع المكونات الأخرى
 * الإصدار: 1.0.0
 * التاريخ: 2026-07-13
 * ======================================================
 */

import { createElement, removeElement, addClass, removeClass, toggleClass } from '../../utils/helpers.js';
import { generateId, formatDate, formatLocaleDateTime, truncateText } from '../../utils/helpers.js';
import { showLoader, hideLoader } from '../loader/loader.js';
import { toast } from '../toast/toast.js';
import { modal } from '../modal/modal.js';

// ============================================
//  1.  الثوابت والإعدادات الافتراضية
// ============================================

const DEFAULT_COLUMNS = [
    { id: 'open', title: 'مفتوحة', color: '#2d7ff9', limit: 0 },
    { id: 'in_progress', title: 'قيد التنفيذ', color: '#ffab00', limit: 0 },
    { id: 'done', title: 'منتهية', color: '#36b37e', limit: 0 },
];

const DEFAULT_CARD_COLORS = ['#2d7ff9', '#36b37e', '#ffab00', '#ff5630', '#6554c0', '#00b8d4', '#ff8b00'];

// ============================================
//  2.  فئة كانبان الرئيسية
// ============================================

class Kanban {
    constructor(options = {}) {
        this.id = options.id || `kanban-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        this.container = options.container || null;
        this.columns = options.columns || DEFAULT_COLUMNS;
        this.cards = options.cards || [];
        this.loading = false;
        this.emptyMessage = options.emptyMessage || 'لا توجد بطاقات في هذا العمود';
        this.loadingMessage = options.loadingMessage || 'جاري تحميل لوحة كانبان...';
        this.editable = options.editable !== undefined ? options.editable : true;
        this.draggable = options.draggable !== undefined ? options.draggable : true;
        this.cardClickable = options.cardClickable !== undefined ? options.cardClickable : true;
        this.showCardCount = options.showCardCount !== undefined ? options.showCardCount : true;
        this.showAddCard = options.showAddCard !== undefined ? options.showAddCard : true;
        this.columnLimit = options.columnLimit || 0; // 0 = غير محدود
        this.className = options.className || '';
        this.style = options.style || {};
        this.animation = options.animation !== undefined ? options.animation : true;

        // الأحداث
        this.onCardMove = options.onCardMove || null;
        this.onCardAdd = options.onCardAdd || null;
        this.onCardEdit = options.onCardEdit || null;
        this.onCardDelete = options.onCardDelete || null;
        this.onCardClick = options.onCardClick || null;
        this.onColumnClick = options.onColumnClick || null;
        this.onLoad = options.onLoad || null;

        // الحالة الداخلية
        this.element = null;
        this.boardContainer = null;
        this.columnElements = {};
        this.cardElements = {};
        this.draggedCard = null;
        this.draggedCardData = null;
        this.dragOverColumn = null;
        this.dragOverCard = null;
        this._cardIdCounter = 0;
        this._loaderId = null;

        // تهيئة
        if (this.container) {
            this.render();
        }
    }

    // ============================================
    //  3.  دوال معالجة البيانات
    // ============================================

    /**
     * الحصول على بطاقات عمود معين
     */
    getCardsForColumn(columnId) {
        return this.cards.filter(card => card.columnId === columnId);
    }

    /**
     * الحصول على بطاقة حسب المعرف
     */
    getCard(id) {
        return this.cards.find(card => card.id === id);
    }

    /**
     * إضافة بطاقة جديدة
     */
    addCard(card) {
        if (!card.id) {
            card.id = `card-${Date.now()}-${++this._cardIdCounter}`;
        }
        if (!card.columnId) {
            card.columnId = this.columns[0]?.id || 'open';
        }
        if (!card.title) {
            card.title = 'بطاقة جديدة';
        }
        if (!card.color) {
            const colors = DEFAULT_CARD_COLORS;
            const index = this.cards.length % colors.length;
            card.color = colors[index];
        }
        if (!card.createdAt) {
            card.createdAt = new Date().toISOString();
        }
        if (!card.order) {
            const columnCards = this.getCardsForColumn(card.columnId);
            card.order = columnCards.length;
        }

        this.cards.push(card);
        this.renderColumn(card.columnId);
        this.updateColumnCounts();

        if (this.onCardAdd) {
            this.onCardAdd(card);
        }
        return card;
    }

    /**
     * تحديث بطاقة موجودة
     */
    updateCard(id, updates) {
        const index = this.cards.findIndex(c => c.id === id);
        if (index === -1) {
            toast.error('البطاقة غير موجودة');
            return null;
        }

        const oldColumnId = this.cards[index].columnId;
        const newColumnId = updates.columnId || oldColumnId;

        // تحديث البيانات
        this.cards[index] = { ...this.cards[index], ...updates, updatedAt: new Date().toISOString() };

        // إعادة ترتيب البطاقات إذا تغير العمود
        if (newColumnId !== oldColumnId) {
            this.reorderCards(oldColumnId);
            this.reorderCards(newColumnId);
        }

        // إعادة عرض الأعمدة المتأثرة
        if (newColumnId !== oldColumnId) {
            this.renderColumn(oldColumnId);
            this.renderColumn(newColumnId);
        } else {
            this.renderColumn(newColumnId);
        }
        this.updateColumnCounts();

        if (this.onCardEdit) {
            this.onCardEdit(this.cards[index]);
        }
        return this.cards[index];
    }

    /**
     * حذف بطاقة
     */
    deleteCard(id) {
        const index = this.cards.findIndex(c => c.id === id);
        if (index === -1) {
            toast.error('البطاقة غير موجودة');
            return false;
        }

        const card = this.cards[index];
        const columnId = card.columnId;

        this.cards.splice(index, 1);
        this.reorderCards(columnId);
        this.renderColumn(columnId);
        this.updateColumnCounts();

        if (this.onCardDelete) {
            this.onCardDelete(card);
        }
        return true;
    }

    /**
     * نقل بطاقة إلى عمود آخر
     */
    moveCard(id, targetColumnId, targetIndex = null) {
        const card = this.getCard(id);
        if (!card) {
            toast.error('البطاقة غير موجودة');
            return false;
        }

        const sourceColumnId = card.columnId;

        if (sourceColumnId === targetColumnId && targetIndex === null) {
            return true;
        }

        // التحقق من الحد الأقصى للعمود
        const column = this.columns.find(c => c.id === targetColumnId);
        if (column && column.limit > 0) {
            const columnCards = this.getCardsForColumn(targetColumnId);
            if (columnCards.length >= column.limit) {
                toast.warning(`لا يمكن إضافة المزيد من البطاقات إلى عمود "${column.title}" (الحد الأقصى: ${column.limit})`);
                return false;
            }
        }

        // إزالة البطاقة من الموقع الحالي
        const cardIndex = this.cards.indexOf(card);
        this.cards.splice(cardIndex, 1);

        // تحديث العمود
        card.columnId = targetColumnId;
        card.updatedAt = new Date().toISOString();

        // إدراج البطاقة في الموقع الجديد
        if (targetIndex !== null && targetIndex !== undefined) {
            const targetCards = this.getCardsForColumn(targetColumnId);
            const insertIndex = Math.min(targetIndex, targetCards.length);
            const actualIndex = this.cards.indexOf(targetCards[insertIndex] || targetCards[targetCards.length - 1]);
            if (actualIndex !== -1) {
                this.cards.splice(actualIndex, 0, card);
            } else {
                this.cards.push(card);
            }
        } else {
            this.cards.push(card);
        }

        // إعادة ترتيب البطاقات
        this.reorderCards(sourceColumnId);
        this.reorderCards(targetColumnId);

        // إعادة عرض الأعمدة
        this.renderColumn(sourceColumnId);
        this.renderColumn(targetColumnId);
        this.updateColumnCounts();

        if (this.onCardMove) {
            this.onCardMove(card, sourceColumnId, targetColumnId);
        }
        return true;
    }

    /**
     * إعادة ترتيب البطاقات في عمود
     */
    reorderCards(columnId) {
        const columnCards = this.getCardsForColumn(columnId);
        columnCards.forEach((card, index) => {
            card.order = index;
        });
    }

    // ============================================
    //  4.  دوال العرض (Render)
    // ============================================

    /**
     * عرض لوحة كانبان بالكامل
     */
    render() {
        const container = typeof this.container === 'string' ?
            document.querySelector(this.container) :
            this.container;

        if (!container) {
            console.error('Kanban container not found');
            return this;
        }

        // إنشاء عنصر اللوحة
        this.element = createElement('div', {
            className: `kanban-board ${this.className}`,
            style: {
                display: 'grid',
                gridTemplateColumns: `repeat(${this.columns.length}, 1fr)`,
                gap: 'var(--spacing-4)',
                alignItems: 'start',
                ...this.style,
            },
            id: this.id,
        });

        // إنشاء الأعمدة
        this.columns.forEach(column => {
            const columnEl = this.createColumn(column);
            this.element.appendChild(columnEl);
            this.columnElements[column.id] = columnEl;
        });

        container.appendChild(this.element);

        // تحديث العدادات
        this.updateColumnCounts();

        // تهيئة السحب والإفلات
        if (this.draggable) {
            this.initDragDrop();
        }

        return this;
    }

    /**
     * إنشاء عمود
     */
    createColumn(column) {
        const columnCards = this.getCardsForColumn(column.id);

        const columnEl = createElement('div', {
            className: `kanban-column ${column.className || ''}`,
            'data-column-id': column.id,
            style: {
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--spacing-3)',
                minHeight: '200px',
                border: '1px solid var(--border-color)',
                transition: 'all var(--transition-fast)',
            },
            onClick: (e) => {
                if (e.target.closest('.kanban-card') || e.target.closest('.kanban-add-card')) {
                    return;
                }
                if (this.onColumnClick) {
                    this.onColumnClick(column, e);
                }
            },
        });

        // رأس العمود
        const header = createElement('div', {
            className: 'kanban-column-header',
            style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--spacing-3)',
                padding: '0 var(--spacing-1)',
            },
        });

        // عنوان العمود مع اللون
        const titleWrapper = createElement('div', {
            style: {
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-2)',
                fontWeight: 'var(--font-semibold)',
                color: 'var(--text-secondary)',
                fontSize: 'var(--font-sm)',
            },
        });

        const colorDot = createElement('span', {
            style: {
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: column.color || 'var(--color-primary)',
                flexShrink: '0',
            },
        });
        titleWrapper.appendChild(colorDot);

        const titleSpan = createElement('span', {
            textContent: column.title,
        });
        titleWrapper.appendChild(titleSpan);

        header.appendChild(titleWrapper);

        // عدد البطاقات
        if (this.showCardCount) {
            const countBadge = createElement('span', {
                className: 'kanban-column-count',
                textContent: columnCards.length,
                style: {
                    backgroundColor: 'var(--bg-tertiary)',
                    padding: '0 var(--spacing-2)',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 'var(--font-xs)',
                    color: 'var(--text-secondary)',
                    minWidth: '24px',
                    textAlign: 'center',
                },
            });
            header.appendChild(countBadge);
            columnEl._countBadge = countBadge;
        }

        columnEl.appendChild(header);

        // حاوية البطاقات (Drop Zone)
        const cardsContainer = createElement('div', {
            className: 'kanban-cards-container',
            'data-column-id': column.id,
            style: {
                minHeight: '100px',
                padding: 'var(--spacing-1)',
                borderRadius: 'var(--radius-sm)',
                transition: 'background-color var(--transition-fast)',
            },
        });

        // عرض البطاقات
        columnCards.forEach(card => {
            const cardEl = this.createCard(card);
            cardsContainer.appendChild(cardEl);
            this.cardElements[card.id] = cardEl;
        });

        columnEl.appendChild(cardsContainer);
        columnEl._cardsContainer = cardsContainer;

        // زر إضافة بطاقة
        if (this.editable && this.showAddCard) {
            const addBtn = createElement('button', {
                className: 'kanban-add-card btn btn-secondary btn-sm',
                textContent: '+ إضافة بطاقة',
                style: {
                    width: '100%',
                    marginTop: 'var(--spacing-2)',
                    padding: 'var(--spacing-2)',
                    border: '1px dashed var(--border-color)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: 'var(--font-sm)',
                    cursor: 'pointer',
                    borderRadius: 'var(--radius-sm)',
                    transition: 'all var(--transition-fast)',
                },
                onClick: (e) => {
                    e.stopPropagation();
                    this.showAddCardModal(column.id);
                },
                onMouseEnter: (e) => {
                    e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                },
                onMouseLeave: (e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                },
            });
            columnEl.appendChild(addBtn);
        }

        return columnEl;
    }

    /**
     * إنشاء بطاقة
     */
    createCard(card) {
        const cardEl = createElement('div', {
            className: `kanban-card ${card.className || ''}`,
            'data-card-id': card.id,
            'data-column-id': card.columnId,
            draggable: this.draggable,
            style: {
                backgroundColor: 'var(--bg-card)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--spacing-3)',
                marginBottom: 'var(--spacing-2)',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-sm)',
                cursor: this.draggable ? 'grab' : 'default',
                transition: 'all var(--transition-fast)',
                position: 'relative',
            },
            onClick: (e) => {
                if (e.target.closest('.kanban-card-actions') || e.target.closest('.kanban-card-delete')) {
                    return;
                }
                if (this.cardClickable) {
                    this.handleCardClick(card);
                }
            },
            onDragStart: (e) => {
                if (!this.draggable) {
                    e.preventDefault();
                    return;
                }
                this.handleDragStart(e, card);
            },
            onDragEnd: (e) => {
                if (!this.draggable) return;
                this.handleDragEnd(e);
            },
            onDragOver: (e) => {
                if (!this.draggable) return;
                e.preventDefault();
                this.handleDragOver(e, card);
            },
            onDragLeave: (e) => {
                if (!this.draggable) return;
                this.handleDragLeave(e);
            },
            onDrop: (e) => {
                if (!this.draggable) return;
                e.preventDefault();
                this.handleDrop(e, card);
            },
        });

        // لون البطاقة (شريط جانبي)
        if (card.color) {
            const colorBar = createElement('div', {
                style: {
                    position: 'absolute',
                    top: '0',
                    right: '0',
                    width: '4px',
                    height: '100%',
                    backgroundColor: card.color,
                    borderRadius: 'var(--radius-md) 0 0 var(--radius-md)',
                },
            });
            cardEl.appendChild(colorBar);
        }

        // عنوان البطاقة
        const titleEl = createElement('div', {
            className: 'kanban-card-title',
            textContent: card.title || 'بدون عنوان',
            style: {
                fontWeight: 'var(--font-medium)',
                fontSize: 'var(--font-sm)',
                color: 'var(--text-primary)',
                marginBottom: 'var(--spacing-2)',
                wordBreak: 'break-word',
                paddingRight: '4px',
            },
        });
        cardEl.appendChild(titleEl);

        // وصف مختصر
        if (card.description) {
            const descEl = createElement('div', {
                className: 'kanban-card-description',
                textContent: truncateText(card.description, 60),
                style: {
                    fontSize: 'var(--font-xs)',
                    color: 'var(--text-secondary)',
                    marginBottom: 'var(--spacing-2)',
                    wordBreak: 'break-word',
                    paddingRight: '4px',
                },
            });
            cardEl.appendChild(descEl);
        }

        // معلومات إضافية (أسفل البطاقة)
        const footer = createElement('div', {
            className: 'kanban-card-footer',
            style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 'var(--font-xs)',
                color: 'var(--text-tertiary)',
                paddingRight: '4px',
                gap: 'var(--spacing-2)',
                flexWrap: 'wrap',
            },
        });

        // معلومات الجانب الأيسر
        const leftInfo = createElement('div', {
            style: {
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-2)',
                flexWrap: 'wrap',
            },
        });

        // المستخدم المسؤول
        if (card.assignee) {
            const assigneeEl = createElement('span', {
                textContent: `👤 ${card.assignee}`,
                style: {
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px',
                },
            });
            leftInfo.appendChild(assigneeEl);
        }

        // التاريخ
        if (card.dueDate) {
            const dateEl = createElement('span', {
                textContent: `📅 ${formatLocaleDateTime(card.dueDate)}`,
                style: {
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px',
                },
            });
            leftInfo.appendChild(dateEl);
        }

        // التصنيف (Label)
        if (card.label) {
            const labelEl = createElement('span', {
                textContent: card.label,
                style: {
                    backgroundColor: card.color || 'var(--color-primary)',
                    color: '#ffffff',
                    padding: '0 var(--spacing-2)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '9px',
                    display: 'inline-block',
                },
            });
            leftInfo.appendChild(labelEl);
        }

        footer.appendChild(leftInfo);

        // الإجراءات (تعديل، حذف)
        if (this.editable) {
            const actions = createElement('div', {
                className: 'kanban-card-actions',
                style: {
                    display: 'flex',
                    gap: 'var(--spacing-1)',
                },
            });

            // زر تعديل
            const editBtn = createElement('button', {
                className: 'btn btn-icon-only btn-sm',
                textContent: '✏️',
                style: {
                    width: '24px',
                    height: '24px',
                    fontSize: '12px',
                    padding: '0',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                },
                onClick: (e) => {
                    e.stopPropagation();
                    this.showEditCardModal(card.id);
                },
                onMouseEnter: (e) => {
                    e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                },
                onMouseLeave: (e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                },
            });
            actions.appendChild(editBtn);

            // زر حذف
            const deleteBtn = createElement('button', {
                className: 'btn btn-icon-only btn-sm kanban-card-delete',
                textContent: '🗑️',
                style: {
                    width: '24px',
                    height: '24px',
                    fontSize: '12px',
                    padding: '0',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                },
                onClick: (e) => {
                    e.stopPropagation();
                    this.confirmDeleteCard(card.id);
                },
                onMouseEnter: (e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 86, 48, 0.1)';
                    e.currentTarget.style.color = 'var(--color-danger)';
                },
                onMouseLeave: (e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                },
            });
            actions.appendChild(deleteBtn);

            footer.appendChild(actions);
        }

        cardEl.appendChild(footer);

        // إضافة مؤشر السحب
        if (this.draggable) {
            const dragHandle = createElement('div', {
                style: {
                    position: 'absolute',
                    bottom: '4px',
                    left: '6px',
                    fontSize: '12px',
                    color: 'var(--text-tertiary)',
                    opacity: '0.5',
                    cursor: 'grab',
                    userSelect: 'none',
                },
                textContent: '⠿',
            });
            cardEl.appendChild(dragHandle);
        }

        return cardEl;
    }

    /**
     * إعادة عرض عمود معين
     */
    renderColumn(columnId) {
        const columnEl = this.columnElements[columnId];
        if (!columnEl) return;

        const cardsContainer = columnEl._cardsContainer;
        if (!cardsContainer) return;

        // إزالة البطاقات القديمة
        const oldCards = cardsContainer.querySelectorAll('.kanban-card');
        oldCards.forEach(el => removeElement(el));

        // إضافة البطاقات الجديدة
        const columnCards = this.getCardsForColumn(columnId);
        // ترتيب البطاقات حسب order
        columnCards.sort((a, b) => (a.order || 0) - (b.order || 0));

        columnCards.forEach(card => {
            const cardEl = this.createCard(card);
            cardsContainer.appendChild(cardEl);
            this.cardElements[card.id] = cardEl;
        });

        // تحديث العداد
        this.updateColumnCount(columnId);
    }

    /**
     * تحديث عدادات الأعمدة
     */
    updateColumnCounts() {
        this.columns.forEach(column => {
            this.updateColumnCount(column.id);
        });
    }

    /**
     * تحديث عداد عمود معين
     */
    updateColumnCount(columnId) {
        const columnEl = this.columnElements[columnId];
        if (!columnEl) return;

        const countBadge = columnEl._countBadge;
        if (!countBadge) return;

        const columnCards = this.getCardsForColumn(columnId);
        countBadge.textContent = columnCards.length;

        // تغيير لون العداد إذا تجاوز الحد
        const column = this.columns.find(c => c.id === columnId);
        if (column && column.limit > 0) {
            if (columnCards.length >= column.limit) {
                countBadge.style.backgroundColor = 'var(--color-danger)';
                countBadge.style.color = '#ffffff';
            } else {
                countBadge.style.backgroundColor = 'var(--bg-tertiary)';
                countBadge.style.color = 'var(--text-secondary)';
            }
        }
    }

    // ============================================
    //  5.  دوال السحب والإفلات (Drag & Drop)
    // ============================================

    /**
     * تهيئة السحب والإفلات
     */
    initDragDrop() {
        // منع السلوك الافتراضي للسحب
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => e.preventDefault());

        // إضافة مستمعين للأعمدة (drop zones)
        document.addEventListener('dragover', this.handleGlobalDragOver.bind(this));
        document.addEventListener('drop', this.handleGlobalDrop.bind(this));
    }

    /**
     * معالج بدء السحب
     */
    handleDragStart(e, card) {
        this.draggedCard = card;
        this.draggedCardData = { ...card };
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', card.id);

        // إضافة class إلى البطاقة المسحوبة
        const cardEl = e.target.closest('.kanban-card');
        if (cardEl) {
            addClass(cardEl, 'dragging');
            cardEl.style.opacity = '0.5';
        }

        // إضافة class drag-over إلى الأعمدة
        Object.values(this.columnElements).forEach(col => {
            const container = col._cardsContainer;
            if (container) {
                container.style.backgroundColor = 'var(--hover-bg)';
                container.style.border = '2px dashed var(--border-color)';
            }
        });
    }

    /**
     * معالج نهاية السحب
     */
    handleDragEnd(e) {
        const cardEl = e.target.closest('.kanban-card');
        if (cardEl) {
            removeClass(cardEl, 'dragging');
            cardEl.style.opacity = '1';
        }

        // إزالة class drag-over من الأعمدة
        Object.values(this.columnElements).forEach(col => {
            const container = col._cardsContainer;
            if (container) {
                container.style.backgroundColor = '';
                container.style.border = '';
            }
        });

        this.draggedCard = null;
        this.draggedCardData = null;
        this.dragOverColumn = null;
        this.dragOverCard = null;
    }

    /**
     * معالج السحب فوق عنصر
     */
    handleDragOver(e, card) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        // إذا كان السحب فوق بطاقة أخرى
        if (card && card.id !== this.draggedCard?.id) {
            // تحديد اتجاه الإدراج (فوق أو تحت)
            const cardEl = this.cardElements[card.id];
            if (cardEl) {
                const rect = cardEl.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                const isBelow = e.clientY > midY;

                // إزالة المؤشرات القديمة
                const indicators = cardEl.parentNode?.querySelectorAll('.drop-indicator');
                indicators?.forEach(el => removeElement(el));

                // إضافة مؤشر جديد
                const indicator = createElement('div', {
                    className: 'drop-indicator',
                    style: {
                        height: '2px',
                        backgroundColor: 'var(--color-primary)',
                        margin: '2px 0',
                        borderRadius: 'var(--radius-sm)',
                        position: isBelow ? 'relative' : 'relative',
                        order: isBelow ? 1 : -1,
                    },
                });
                if (isBelow) {
                    cardEl.parentNode?.insertBefore(indicator, cardEl.nextSibling);
                } else {
                    cardEl.parentNode?.insertBefore(indicator, cardEl);
                }

                this.dragOverCard = card;
                this.dragOverColumn = card.columnId;
            }
        } else {
            // السحب فوق العمود (بدون بطاقة محددة)
            const columnEl = e.target.closest('.kanban-column');
            if (columnEl) {
                const columnId = columnEl.dataset.columnId;
                if (columnId && columnId !== this.draggedCard?.columnId) {
                    // تسليط الضوء على العمود
                    const container = columnEl._cardsContainer;
                    if (container) {
                        container.style.backgroundColor = 'var(--selected-bg)';
                        container.style.border = '2px solid var(--color-primary)';
                    }
                    this.dragOverColumn = columnId;
                    this.dragOverCard = null;
                }
            }
        }
    }

    /**
     * معالج مغادرة السحب
     */
    handleDragLeave(e) {
        const columnEl = e.target.closest('.kanban-column');
        if (columnEl) {
            const container = columnEl._cardsContainer;
            if (container) {
                container.style.backgroundColor = '';
                container.style.border = '';
            }
        }

        // إزالة المؤشرات
        const indicators = document.querySelectorAll('.drop-indicator');
        indicators.forEach(el => removeElement(el));
    }

    /**
     * معالج الإفلات (Drop)
     */
    handleDrop(e, targetCard) {
        e.preventDefault();

        const cardId = e.dataTransfer.getData('text/plain');
        if (!cardId) return;

        const draggedCard = this.getCard(cardId);
        if (!draggedCard) return;

        // تحديد العمود الهدف
        let targetColumnId = null;

        // إذا كان الهدف بطاقة
        if (targetCard && targetCard.id !== draggedCard.id) {
            const targetCardEl = this.cardElements[targetCard.id];
            if (targetCardEl) {
                const columnEl = targetCardEl.closest('.kanban-column');
                if (columnEl) {
                    targetColumnId = columnEl.dataset.columnId;
                }
            }
        }

        // إذا لم يتم تحديد عمود، استخدم العمود الحالي أو العمود الذي تم السحب فوقه
        if (!targetColumnId) {
            targetColumnId = this.dragOverColumn || draggedCard.columnId;
        }

        // إذا كان العمود الهدف هو نفسه العمود المصدر ولم يتغير الترتيب
        if (targetColumnId === draggedCard.columnId && !this.dragOverCard) {
            // إعادة ترتيب البطاقات في نفس العمود
            const columnCards = this.getCardsForColumn(targetColumnId);
            const draggedIndex = columnCards.indexOf(draggedCard);

            // تحديد الموقع الجديد
            let newIndex = columnCards.length - 1;
            if (this.dragOverCard) {
                const targetIndex = columnCards.indexOf(this.dragOverCard);
                if (targetIndex !== -1) {
                    // تحديد إذا كان يجب إدراج فوق أو تحت البطاقة المستهدفة
                    const targetEl = this.cardElements[this.dragOverCard.id];
                    if (targetEl) {
                        const rect = targetEl.getBoundingClientRect();
                        const midY = rect.top + rect.height / 2;
                        const isBelow = e.clientY > midY;
                        newIndex = isBelow ? targetIndex + 1 : targetIndex;
                    } else {
                        newIndex = targetIndex;
                    }
                }
            }

            // تجنب الحركة غير الضرورية
            if (draggedIndex === newIndex || draggedIndex === newIndex - 1) {
                this.handleDragEnd(e);
                return;
            }

            // إعادة ترتيب البطاقات
            this.cards.splice(this.cards.indexOf(draggedCard), 1);
            const insertIndex = this.cards.findIndex(c => c.columnId === targetColumnId);
            if (insertIndex !== -1) {
                this.cards.splice(insertIndex + newIndex, 0, draggedCard);
            } else {
                this.cards.push(draggedCard);
            }
            this.reorderCards(targetColumnId);
            this.renderColumn(targetColumnId);
            this.updateColumnCounts();

            if (this.onCardMove) {
                this.onCardMove(draggedCard, targetColumnId, targetColumnId);
            }
        } else if (targetColumnId && targetColumnId !== draggedCard.columnId) {
            // نقل البطاقة إلى عمود آخر
            const targetCards = this.getCardsForColumn(targetColumnId);
            let newIndex = targetCards.length;

            if (this.dragOverCard) {
                const targetIndex = targetCards.indexOf(this.dragOverCard);
                if (targetIndex !== -1) {
                    const targetEl = this.cardElements[this.dragOverCard.id];
                    if (targetEl) {
                        const rect = targetEl.getBoundingClientRect();
                        const midY = rect.top + rect.height / 2;
                        const isBelow = e.clientY > midY;
                        newIndex = isBelow ? targetIndex + 1 : targetIndex;
                    } else {
                        newIndex = targetIndex;
                    }
                }
            }

            this.moveCard(draggedCard.id, targetColumnId, newIndex);
        }

        // تنظيف
        this.handleDragEnd(e);
    }

    /**
     * معالج السحب العام (للأعمدة)
     */
    handleGlobalDragOver(e) {
        e.preventDefault();
        // تحديث عمود السحب الحالي
        const columnEl = e.target.closest('.kanban-column');
        if (columnEl) {
            const columnId = columnEl.dataset.columnId;
            if (columnId && columnId !== this.dragOverColumn) {
                // إزالة التمييز عن العمود السابق
                if (this.dragOverColumn) {
                    const prevCol = this.columnElements[this.dragOverColumn];
                    if (prevCol && prevCol._cardsContainer) {
                        prevCol._cardsContainer.style.backgroundColor = '';
                        prevCol._cardsContainer.style.border = '';
                    }
                }
                this.dragOverColumn = columnId;
                // تمييز العمود الجديد
                if (columnEl._cardsContainer) {
                    columnEl._cardsContainer.style.backgroundColor = 'var(--selected-bg)';
                    columnEl._cardsContainer.style.border = '2px solid var(--color-primary)';
                }
            }
        }
    }

    /**
     * معالج الإفلات العام (للأعمدة)
     */
    handleGlobalDrop(e) {
        e.preventDefault();

        const columnEl = e.target.closest('.kanban-column');
        if (!columnEl) return;

        const targetColumnId = columnEl.dataset.columnId;
        if (!targetColumnId) return;

        const cardId = e.dataTransfer.getData('text/plain');
        if (!cardId) return;

        const draggedCard = this.getCard(cardId);
        if (!draggedCard) return;

        if (targetColumnId !== draggedCard.columnId) {
            this.moveCard(draggedCard.id, targetColumnId);
        }

        // تنظيف
        this.handleDragEnd(e);
    }

    // ============================================
    //  6.  دوال النوافذ المنبثقة (Modals)
    // ============================================

    /**
     * عرض مودال إضافة بطاقة
     */
    showAddCardModal(columnId) {
        if (!this.editable) return;

        const column = this.columns.find(c => c.id === columnId);
        if (!column) return;

        // التحقق من الحد الأقصى
        if (column.limit > 0) {
            const columnCards = this.getCardsForColumn(columnId);
            if (columnCards.length >= column.limit) {
                toast.warning(`لا يمكن إضافة المزيد من البطاقات إلى عمود "${column.title}" (الحد الأقصى: ${column.limit})`);
                return;
            }
        }

        const form = this.createCardForm();

        modal.show({
            title: `إضافة بطاقة جديدة إلى "${column.title}"`,
            content: form,
            size: 'md',
            buttons: [
                {
                    label: 'إضافة',
                    type: 'primary',
                    onClick: () => {
                        const cardData = this.getCardFormData();
                        if (!cardData.title) {
                            toast.error('يرجى إدخال عنوان البطاقة');
                            return;
                        }
                        cardData.columnId = columnId;
                        this.addCard(cardData);
                        modal.close();
                        toast.success('تم إضافة البطاقة بنجاح');
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
        setTimeout(() => document.getElementById('kanban-card-title')?.focus(), 100);
    }

    /**
     * عرض مودال تعديل بطاقة
     */
    showEditCardModal(cardId) {
        if (!this.editable) return;

        const card = this.getCard(cardId);
        if (!card) {
            toast.error('البطاقة غير موجودة');
            return;
        }

        const form = this.createCardForm(card);

        modal.show({
            title: 'تعديل البطاقة',
            content: form,
            size: 'md',
            buttons: [
                {
                    label: 'حفظ التغييرات',
                    type: 'primary',
                    onClick: () => {
                        const cardData = this.getCardFormData();
                        if (!cardData.title) {
                            toast.error('يرجى إدخال عنوان البطاقة');
                            return;
                        }
                        // لا نسمح بتغيير العمود من هنا (يتم عبر السحب)
                        delete cardData.columnId;
                        this.updateCard(cardId, cardData);
                        modal.close();
                        toast.success('تم تحديث البطاقة بنجاح');
                    },
                },
                {
                    label: 'إلغاء',
                    type: 'secondary',
                    onClick: () => modal.close(),
                },
            ],
        });

        setTimeout(() => document.getElementById('kanban-card-title')?.focus(), 100);
    }

    /**
     * إنشاء نموذج البطاقة
     */
    createCardForm(card = null) {
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
            id: 'kanban-card-title',
            className: 'form-control',
            value: card?.title || '',
            placeholder: 'أدخل عنوان البطاقة',
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
            id: 'kanban-card-description',
            className: 'form-control',
            value: card?.description || '',
            placeholder: 'أدخل وصف البطاقة',
            rows: '3',
            style: { width: '100%' },
        });
        descGroup.appendChild(descInput);
        form.appendChild(descGroup);

        // المستخدم المسؤول
        const assigneeGroup = createElement('div');
        const assigneeLabel = createElement('label', {
            textContent: 'المسؤول',
            style: { fontWeight: 'var(--font-medium)', display: 'block', marginBottom: 'var(--spacing-1)' },
        });
        assigneeGroup.appendChild(assigneeLabel);
        const assigneeInput = createElement('input', {
            type: 'text',
            id: 'kanban-card-assignee',
            className: 'form-control',
            value: card?.assignee || '',
            placeholder: 'أدخل اسم المسؤول',
            style: { width: '100%' },
        });
        assigneeGroup.appendChild(assigneeInput);
        form.appendChild(assigneeGroup);

        // التاريخ
        const dateGroup = createElement('div');
        const dateLabel = createElement('label', {
            textContent: 'تاريخ الاستحقاق',
            style: { fontWeight: 'var(--font-medium)', display: 'block', marginBottom: 'var(--spacing-1)' },
        });
        dateGroup.appendChild(dateLabel);
        const dateInput = createElement('input', {
            type: 'datetime-local',
            id: 'kanban-card-due-date',
            className: 'form-control',
            value: card?.dueDate ? new Date(card.dueDate).toISOString().slice(0, 16) : '',
            style: { width: '100%' },
        });
        dateGroup.appendChild(dateInput);
        form.appendChild(dateGroup);

        // التصنيف
        const labelGroup = createElement('div');
        const labelLabel = createElement('label', {
            textContent: 'التصنيف',
            style: { fontWeight: 'var(--font-medium)', display: 'block', marginBottom: 'var(--spacing-1)' },
        });
        labelGroup.appendChild(labelLabel);
        const labelInput = createElement('input', {
            type: 'text',
            id: 'kanban-card-label',
            className: 'form-control',
            value: card?.label || '',
            placeholder: 'أدخل تصنيف البطاقة',
            style: { width: '100%' },
        });
        labelGroup.appendChild(labelInput);
        form.appendChild(labelGroup);

        // اللون
        const colorGroup = createElement('div');
        const colorLabel = createElement('label', {
            textContent: 'اللون',
            style: { fontWeight: 'var(--font-medium)', display: 'block', marginBottom: 'var(--spacing-1)' },
        });
        colorGroup.appendChild(colorLabel);
        const colorInput = createElement('input', {
            type: 'color',
            id: 'kanban-card-color',
            className: 'form-control',
            value: card?.color || DEFAULT_CARD_COLORS[0],
            style: { width: '60px', height: '40px', padding: '2px', cursor: 'pointer' },
        });
        colorGroup.appendChild(colorInput);
        form.appendChild(colorGroup);

        return form;
    }

    /**
     * الحصول على بيانات البطاقة من النموذج
     */
    getCardFormData() {
        return {
            title: document.getElementById('kanban-card-title')?.value.trim() || '',
            description: document.getElementById('kanban-card-description')?.value.trim() || '',
            assignee: document.getElementById('kanban-card-assignee')?.value.trim() || '',
            dueDate: document.getElementById('kanban-card-due-date')?.value || '',
            label: document.getElementById('kanban-card-label')?.value.trim() || '',
            color: document.getElementById('kanban-card-color')?.value || DEFAULT_CARD_COLORS[0],
        };
    }

    /**
     * تأكيد حذف بطاقة
     */
    confirmDeleteCard(cardId) {
        const card = this.getCard(cardId);
        if (!card) return;

        modal.confirm(`هل أنت متأكد من حذف البطاقة "${card.title}"؟`, {
            title: 'تأكيد الحذف',
            onConfirm: () => {
                this.deleteCard(cardId);
                toast.success('تم حذف البطاقة بنجاح');
            },
        });
    }

    // ============================================
    //  7.  دوال معالجة الأحداث
    // ============================================

    /**
     * معالج النقر على البطاقة
     */
    handleCardClick(card) {
        if (this.onCardClick) {
            this.onCardClick(card);
            return;
        }

        // عرض تفاصيل البطاقة في مودال
        this.showCardDetails(card);
    }

    /**
     * عرض تفاصيل البطاقة
     */
    showCardDetails(card) {
        const content = createElement('div');

        const fields = [
            { label: 'العنوان', value: card.title },
            { label: 'الوصف', value: card.description || '' },
            { label: 'المسؤول', value: card.assignee || '' },
            { label: 'التاريخ', value: card.dueDate ? formatLocaleDateTime(card.dueDate) : '' },
            { label: 'التصنيف', value: card.label || '' },
            { label: 'الحالة', value: this.columns.find(c => c.id === card.columnId)?.title || card.columnId },
            { label: 'تاريخ الإنشاء', value: card.createdAt ? formatLocaleDateTime(card.createdAt) : '' },
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
                row.appendChild(value);

                content.appendChild(row);
            }
        });

        const buttons = [
            {
                label: 'إغلاق',
                type: 'secondary',
                onClick: () => modal.close(),
            },
        ];

        if (this.editable) {
            buttons.unshift({
                label: '✏️ تعديل',
                type: 'primary',
                onClick: () => {
                    modal.close();
                    this.showEditCardModal(card.id);
                },
            });
            buttons.unshift({
                label: '🗑️ حذف',
                type: 'danger',
                onClick: () => {
                    modal.close();
                    this.confirmDeleteCard(card.id);
                },
            });
        }

        modal.show({
            title: 'تفاصيل البطاقة',
            content,
            size: 'md',
            buttons,
        });
    }

    // ============================================
    //  8.  دوال التحميل غير المتزامن
    // ============================================

    /**
     * تحميل البطاقات من مصدر خارجي
     */
    async loadCards(fetchFn, params = {}) {
        this.showLoading(true);
        try {
            const result = await fetchFn(params);
            const cards = result.data || result.cards || [];
            this.cards = cards;
            // إعادة عرض جميع الأعمدة
            this.columns.forEach(column => {
                this.renderColumn(column.id);
            });
            this.updateColumnCounts();
            if (this.onLoad) {
                this.onLoad(result);
            }
        } catch (error) {
            toast.error('حدث خطأ أثناء تحميل البطاقات: ' + error.message);
            console.error('Kanban load error:', error);
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
            this._loaderId = showLoader({
                target: this.element || this.container,
                message: this.loadingMessage,
                overlay: true,
                overlayColor: 'rgba(255,255,255,0.6)',
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
     * تصدير البطاقات كـ JSON
     */
    exportJSON() {
        return JSON.stringify(this.cards, null, 2);
    }

    /**
     * تصدير البطاقات كـ CSV
     */
    exportCSV() {
        const data = this.cards;
        if (data.length === 0) {
            toast.warning('لا توجد بطاقات للتصدير');
            return;
        }

        const headers = ['id', 'title', 'description', 'columnId', 'assignee', 'dueDate', 'label', 'color', 'createdAt'];
        const rows = data.map(card => {
            return headers.map(key => {
                let value = card[key] || '';
                if (key === 'columnId') {
                    const column = this.columns.find(c => c.id === value);
                    value = column?.title || value;
                }
                if (key === 'dueDate' && value) {
                    value = formatLocaleDateTime(value);
                }
                if (key === 'createdAt' && value) {
                    value = formatLocaleDateTime(value);
                }
                return `"${String(value).replace(/"/g, '""')}"`;
            });
        });

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `kanban-export-${Date.now()}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);

        toast.success('تم تصدير البطاقات إلى CSV بنجاح');
    }

    // ============================================
    //  10.  دوال التنظيف والتدمير
    // ============================================

    /**
     * تدمير لوحة كانبان وإزالة العناصر
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
        this.columnElements = {};
        this.cardElements = {};
        this.cards = [];
        console.log('Kanban destroyed:', this.id);
        return this;
    }

    /**
     * تحديث لوحة كانبان (إعادة عرض)
     */
    refresh() {
        this.columns.forEach(column => {
            this.renderColumn(column.id);
        });
        this.updateColumnCounts();
        return this;
    }

    // ============================================
    //  11.  دوال مساعدة للاستعلام
    // ============================================

    /**
     * الحصول على جميع البطاقات
     */
    getCards() {
        return [...this.cards];
    }

    /**
     * الحصول على بطاقات عمود معين
     */
    getCardsByColumn(columnId) {
        return this.getCardsForColumn(columnId);
    }

    /**
     * الحصول على الأعمدة
     */
    getColumns() {
        return [...this.columns];
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
//  12.  دوال مساعدة لإنشاء لوحات كانبان
// ============================================

/**
 * إنشاء لوحة كانبان جديدة
 */
export function createKanban(options = {}) {
    return new Kanban(options);
}

/**
 * إنشاء لوحة كانبان من بطاقات وأعمدة
 */
export function createKanbanFromData(container, columns, cards, options = {}) {
    return new Kanban({
        container,
        columns,
        cards,
        ...options,
    });
}

/**
 * إنشاء بطاقة كانبان
 */
export function createKanbanCard(options = {}) {
    return {
        id: options.id || `card-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        title: options.title || 'بطاقة جديدة',
        description: options.description || '',
        columnId: options.columnId || 'open',
        assignee: options.assignee || '',
        dueDate: options.dueDate || '',
        label: options.label || '',
        color: options.color || DEFAULT_CARD_COLORS[0],
        order: options.order || 0,
        createdAt: options.createdAt || new Date().toISOString(),
        updatedAt: options.updatedAt || '',
        ...options,
    };
}

// ============================================
//  13.  دوال التهيئة والتنظيف
// ============================================

/**
 * تهيئة نظام كانبان
 */
export function initKanban() {
    if (!document.getElementById('kanban-style')) {
        const style = document.createElement('style');
        style.id = 'kanban-style';
        style.textContent = `
            .kanban-card.dragging {
                opacity: 0.5 !important;
                transform: scale(0.95) !important;
            }
            .kanban-card.drag-over {
                border: 2px solid var(--color-primary) !important;
                border-radius: var(--radius-md) !important;
            }
            .kanban-card.drag-over-bottom {
                border-bottom: 3px solid var(--color-primary) !important;
            }
            .kanban-card.drag-over-top {
                border-top: 3px solid var(--color-primary) !important;
            }
            .kanban-column .kanban-cards-container {
                min-height: 80px;
                transition: background-color 0.2s ease, border 0.2s ease;
                border-radius: var(--radius-sm);
            }
            .drop-indicator {
                height: 3px;
                background-color: var(--color-primary);
                margin: 2px 0;
                border-radius: var(--radius-sm);
                animation: pulse 0.8s ease-in-out infinite;
            }
            .kanban-add-card {
                transition: all 0.2s ease;
            }
            .kanban-add-card:hover {
                background-color: var(--hover-bg) !important;
                border-color: var(--color-primary) !important;
                color: var(--color-primary) !important;
            }
            .kanban-card .kanban-card-actions .btn-icon-only {
                opacity: 0.6;
                transition: all 0.15s ease;
            }
            .kanban-card .kanban-card-actions .btn-icon-only:hover {
                opacity: 1;
            }
            .dark .kanban-column {
                border-color: var(--border-color);
            }
            .dark .kanban-card {
                border-color: var(--border-color);
            }
            .dark .kanban-card.drag-over {
                border-color: var(--color-primary);
            }
            @media (max-width: 992px) {
                .kanban-board {
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)) !important;
                }
            }
            @media (max-width: 768px) {
                .kanban-board {
                    grid-template-columns: 1fr !important;
                }
                .kanban-column {
                    min-height: 150px;
                }
                .kanban-card {
                    padding: var(--spacing-2);
                }
                .kanban-card-title {
                    font-size: var(--font-xs);
                }
                .kanban-card-footer {
                    font-size: 9px;
                    flex-wrap: wrap;
                }
                .kanban-card-footer .kanban-card-actions .btn-icon-only {
                    width: 20px;
                    height: 20px;
                    font-size: 10px;
                }
            }
            @media (max-width: 480px) {
                .kanban-board {
                    grid-template-columns: 1fr !important;
                    gap: var(--spacing-3);
                }
                .kanban-column {
                    padding: var(--spacing-2);
                    min-height: 120px;
                }
                .kanban-column-header {
                    font-size: var(--font-xs);
                }
                .kanban-card {
                    padding: var(--spacing-2);
                    margin-bottom: var(--spacing-1);
                }
                .kanban-card-title {
                    font-size: 10px;
                }
                .kanban-card-description {
                    font-size: 9px;
                }
                .kanban-card-footer {
                    font-size: 8px;
                }
                .kanban-add-card {
                    font-size: 10px;
                    padding: var(--spacing-1);
                }
            }
        `;
        document.head.appendChild(style);
    }
    console.log('Kanban component initialized successfully');
}

/**
 * تنظيف نظام كانبان
 */
export function destroyKanban() {
    const style = document.getElementById('kanban-style');
    if (style) {
        style.remove();
    }
    console.log('Kanban component destroyed');
}

// ============================================
//  14.  API عام للمكون
// ============================================

export const kanban = {
    Kanban,
    create: createKanban,
    fromData: createKanbanFromData,
    createCard: createKanbanCard,
    init: initKanban,
    destroy: destroyKanban,
    DEFAULT_COLUMNS,
    DEFAULT_CARD_COLORS,
};

// تصدير افتراضي
export default kanban;

// ============================================
//  15.  تهيئة تلقائية عند تحميل الوحدة
// ============================================

// سيتم استدعاء init من app.js، لذلك لا نقوم بتهيئة تلقائية هنا

// ============================================
//  16.  نهاية الملف
// ============================================
