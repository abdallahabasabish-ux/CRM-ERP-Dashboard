/**
 * ======================================================
 * الملف: components/cards/cards.js
 * الوصف: مكون البطاقات (Cards)
 *         يدير إنشاء وعرض أنواع مختلفة من البطاقات
 *         (إحصائيات، معلومات، قابلة للنقر، مع صور،
 *         مع قوائم، مع أزرار، إلخ) مع دعم للسمات،
 *         التخصيص، والتفاعلات
 * الإصدار: 1.0.0
 * التاريخ: 2026-07-12
 * ======================================================
 */

import { createElement, removeElement, addClass, removeClass, toggleClass } from '../../utils/helpers.js';
import { formatCurrency, formatNumber, formatDate } from '../../utils/helpers.js';
import { toast } from '../toast/toast.js';

// ============================================
//  1.  الثوابت والإعدادات الافتراضية
// ============================================

const CARD_TYPES = {
    STAT: 'stat',           // بطاقة إحصائية
    INFO: 'info',           // بطاقة معلومات عامة
    CLICKABLE: 'clickable', // بطاقة قابلة للنقر
    IMAGE: 'image',         // بطاقة مع صورة
    LIST: 'list',           // بطاقة مع قائمة
    PROFILE: 'profile',     // بطاقة ملف شخصي
    METRIC: 'metric',       // بطاقة مقياس
    CUSTOM: 'custom',       // بطاقة مخصصة
};

const CARD_SIZES = {
    SMALL: 'sm',
    MEDIUM: 'md',
    LARGE: 'lg',
    XLARGE: 'xl',
};

// ============================================
//  2.  فئة البطاقة الرئيسية
// ============================================

class Card {
    constructor(options = {}) {
        this.id = options.id || `card-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        this.container = options.container || null;
        this.type = options.type || CARD_TYPES.INFO;
        this.size = options.size || CARD_TYPES.MEDIUM;
        this.title = options.title || '';
        this.subtitle = options.subtitle || '';
        this.content = options.content || '';
        this.icon = options.icon || null;
        this.image = options.image || null;
        this.imageAlt = options.imageAlt || 'صورة البطاقة';
        this.imagePosition = options.imagePosition || 'top'; // top, bottom, left, right
        this.value = options.value || null;
        this.valuePrefix = options.valuePrefix || '';
        this.valueSuffix = options.valueSuffix || '';
        this.change = options.change || null; // نسبة التغيير
        this.changeType = options.changeType || 'neutral'; // positive, negative, neutral
        this.link = options.link || null;
        this.linkText = options.linkText || 'عرض المزيد';
        this.actions = options.actions || [];
        this.items = options.items || [];
        this.buttons = options.buttons || [];
        this.badge = options.badge || null;
        this.badgeType = options.badgeType || 'primary';
        this.className = options.className || '';
        this.style = options.style || {};
        this.clickable = options.clickable || false;
        this.onClick = options.onClick || null;
        this.onAction = options.onAction || null;
        this.loading = options.loading || false;
        this.hoverable = options.hoverable !== undefined ? options.hoverable : true;
        this.shadow = options.shadow !== undefined ? options.shadow : true;
        this.border = options.border !== undefined ? options.border : true;
        this.animation = options.animation || 'fade-in';
        this.animationDelay = options.animationDelay || '0s';
        this.gridSpan = options.gridSpan || 1;
        this.responsive = options.responsive || {};

        // الحالة الداخلية
        this.element = null;
        this.isExpanded = false;
        this._contentElement = null;
        this._headerElement = null;
        this._footerElement = null;

        // تهيئة
        if (this.container) {
            this.render();
        }
    }

    // ============================================
    //  3.  دوال العرض (Render)
    // ============================================

    /**
     * عرض البطاقة بالكامل
     */
    render() {
        const container = typeof this.container === 'string' ?
            document.querySelector(this.container) :
            this.container;

        if (!container) {
            console.error('Card container not found');
            return this;
        }

        // إنشاء عنصر البطاقة
        this.element = createElement('div', {
            className: `card card-${this.type} card-${this.size} ${this.className}`,
            style: {
                gridColumn: `span ${this.gridSpan}`,
                animation: this.animation ? `${this.animation} ${this.animationDelay}` : 'none',
                ...this.style,
            },
            id: this.id,
            onClick: (e) => {
                if (this.clickable && this.onClick) {
                    this.onClick(e);
                }
            },
        });

        // إضافة الصنفات
        if (this.clickable) {
            addClass(this.element, 'card-clickable');
        }
        if (this.hoverable) {
            addClass(this.element, 'card-hoverable');
        }
        if (!this.shadow) {
            addClass(this.element, 'no-shadow');
        }
        if (!this.border) {
            addClass(this.element, 'no-border');
        }
        if (this.loading) {
            addClass(this.element, 'loading');
        }

        // بناء البطاقة حسب النوع
        switch (this.type) {
            case CARD_TYPES.STAT:
                this.renderStatCard();
                break;
            case CARD_TYPES.IMAGE:
                this.renderImageCard();
                break;
            case CARD_TYPES.LIST:
                this.renderListCard();
                break;
            case CARD_TYPES.PROFILE:
                this.renderProfileCard();
                break;
            case CARD_TYPES.METRIC:
                this.renderMetricCard();
                break;
            case CARD_TYPES.CLICKABLE:
                this.renderClickableCard();
                break;
            case CARD_TYPES.CUSTOM:
                this.renderCustomCard();
                break;
            default:
                this.renderInfoCard();
        }

        // إضافة البطاقة إلى الحاوية
        container.appendChild(this.element);

        // تطبيق الاستجابة
        this.applyResponsive();

        return this;
    }

    /**
     * عرض بطاقة إحصائية (Stat)
     */
    renderStatCard() {
        const body = this.createBody();

        // الأيقونة
        if (this.icon) {
            const iconWrapper = createElement('div', {
                className: 'stat-icon',
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-tertiary)',
                    fontSize: '24px',
                    flexShrink: '0',
                },
            });
            if (typeof this.icon === 'string') {
                iconWrapper.textContent = this.icon;
            } else if (this.icon instanceof HTMLElement) {
                iconWrapper.appendChild(this.icon);
            }
            body.prepend(iconWrapper);
        }

        // المحتوى
        const contentWrapper = createElement('div', {
            className: 'stat-content',
            style: { flex: '1', minWidth: '0' },
        });

        // القيمة
        if (this.value !== null && this.value !== undefined) {
            const valueEl = createElement('div', {
                className: 'stat-value',
                style: {
                    fontSize: 'var(--font-2xl)',
                    fontWeight: 'var(--font-bold)',
                    color: 'var(--text-primary)',
                    lineHeight: '1.2',
                },
            });
            valueEl.textContent = `${this.valuePrefix}${typeof this.value === 'number' ? formatNumber(this.value) : this.value}${this.valueSuffix}`;
            contentWrapper.appendChild(valueEl);
        }

        // العنوان
        if (this.title) {
            const titleEl = createElement('div', {
                className: 'stat-label',
                style: {
                    fontSize: 'var(--font-sm)',
                    color: 'var(--text-secondary)',
                    marginTop: 'var(--spacing-1)',
                },
                textContent: this.title,
            });
            contentWrapper.appendChild(titleEl);
        }

        // التغيير (نسبة)
        if (this.change !== null && this.change !== undefined) {
            const changeEl = createElement('div', {
                className: `stat-change ${this.changeType}`,
                style: {
                    fontSize: 'var(--font-xs)',
                    fontWeight: 'var(--font-medium)',
                    marginTop: 'var(--spacing-1)',
                    color: this.changeType === 'positive' ? 'var(--color-success)' :
                           this.changeType === 'negative' ? 'var(--color-danger)' :
                           'var(--text-tertiary)',
                },
            });
            const changeSign = this.change >= 0 ? '+' : '';
            changeEl.textContent = `${changeSign}${formatNumber(this.change, 1)}%`;
            contentWrapper.appendChild(changeEl);
        }

        body.appendChild(contentWrapper);

        // الرابط
        if (this.link) {
            const linkEl = createElement('a', {
                className: 'card-link',
                href: this.link,
                textContent: this.linkText,
                style: {
                    fontSize: 'var(--font-sm)',
                    color: 'var(--color-primary)',
                    textDecoration: 'none',
                    display: 'inline-block',
                    marginTop: 'var(--spacing-2)',
                },
            });
            body.appendChild(linkEl);
        }

        this.element.appendChild(body);
    }

    /**
     * عرض بطاقة معلومات عامة (Info)
     */
    renderInfoCard() {
        // الرأس
        this.renderHeader();

        // الجسم
        const body = this.createBody();

        if (this.content) {
            const contentEl = createElement('div', {
                className: 'card-content',
            });
            if (typeof this.content === 'string') {
                contentEl.innerHTML = this.content;
            } else if (this.content instanceof HTMLElement) {
                contentEl.appendChild(this.content);
            } else {
                contentEl.textContent = String(this.content);
            }
            body.appendChild(contentEl);
        }

        // الأزرار
        if (this.buttons.length > 0) {
            const btnGroup = createElement('div', {
                className: 'card-buttons',
                style: {
                    display: 'flex',
                    gap: 'var(--spacing-2)',
                    marginTop: 'var(--spacing-3)',
                    flexWrap: 'wrap',
                },
            });
            this.buttons.forEach(btnConfig => {
                const btn = this.createButton(btnConfig);
                btnGroup.appendChild(btn);
            });
            body.appendChild(btnGroup);
        }

        // الرابط
        if (this.link) {
            const linkEl = createElement('a', {
                className: 'card-link',
                href: this.link,
                textContent: this.linkText,
                style: {
                    fontSize: 'var(--font-sm)',
                    color: 'var(--color-primary)',
                    textDecoration: 'none',
                    display: 'inline-block',
                    marginTop: 'var(--spacing-2)',
                },
            });
            body.appendChild(linkEl);
        }

        this.element.appendChild(body);

        // التذييل
        this.renderFooter();
    }

    /**
     * عرض بطاقة مع صورة (Image)
     */
    renderImageCard() {
        const imageContainer = createElement('div', {
            className: 'card-image-container',
            style: {
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
            },
        });

        if (this.image) {
            const img = createElement('img', {
                className: 'card-image',
                src: this.image,
                alt: this.imageAlt,
                style: {
                    width: '100%',
                    height: '200px',
                    objectFit: 'cover',
                    display: 'block',
                },
            });
            imageContainer.appendChild(img);
        }

        // الشارة (Badge)
        if (this.badge) {
            const badgeEl = createElement('span', {
                className: `badge badge-${this.badgeType}`,
                textContent: this.badge,
                style: {
                    position: 'absolute',
                    top: 'var(--spacing-3)',
                    right: 'var(--spacing-3)',
                },
            });
            imageContainer.appendChild(badgeEl);
        }

        this.element.appendChild(imageContainer);

        // الرأس
        this.renderHeader();

        // الجسم
        const body = this.createBody();

        if (this.subtitle) {
            const subtitleEl = createElement('div', {
                className: 'card-subtitle',
                style: {
                    fontSize: 'var(--font-sm)',
                    color: 'var(--text-secondary)',
                    marginBottom: 'var(--spacing-2)',
                },
                textContent: this.subtitle,
            });
            body.appendChild(subtitleEl);
        }

        if (this.content) {
            const contentEl = createElement('div', {
                className: 'card-content',
            });
            if (typeof this.content === 'string') {
                contentEl.innerHTML = this.content;
            } else if (this.content instanceof HTMLElement) {
                contentEl.appendChild(this.content);
            } else {
                contentEl.textContent = String(this.content);
            }
            body.appendChild(contentEl);
        }

        if (this.buttons.length > 0) {
            const btnGroup = createElement('div', {
                className: 'card-buttons',
                style: {
                    display: 'flex',
                    gap: 'var(--spacing-2)',
                    marginTop: 'var(--spacing-3)',
                    flexWrap: 'wrap',
                },
            });
            this.buttons.forEach(btnConfig => {
                const btn = this.createButton(btnConfig);
                btnGroup.appendChild(btn);
            });
            body.appendChild(btnGroup);
        }

        this.element.appendChild(body);
        this.renderFooter();
    }

    /**
     * عرض بطاقة قائمة (List)
     */
    renderListCard() {
        this.renderHeader();

        const body = this.createBody();

        if (this.items.length > 0) {
            const list = createElement('ul', {
                className: 'card-list',
                style: {
                    listStyle: 'none',
                    padding: '0',
                    margin: '0',
                },
            });

            this.items.forEach(item => {
                const li = createElement('li', {
                    className: 'card-list-item',
                    style: {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 'var(--spacing-2) 0',
                        borderBottom: '1px solid var(--border-color)',
                    },
                });

                if (item.icon) {
                    const iconSpan = createElement('span', {
                        className: 'list-item-icon',
                        textContent: item.icon,
                        style: { marginLeft: 'var(--spacing-2)' },
                    });
                    li.appendChild(iconSpan);
                }

                const labelSpan = createElement('span', {
                    className: 'list-item-label',
                    textContent: item.label || item.text || '',
                });
                li.appendChild(labelSpan);

                if (item.value !== undefined) {
                    const valueSpan = createElement('span', {
                        className: 'list-item-value',
                        textContent: typeof item.value === 'number' ? formatNumber(item.value) : item.value,
                        style: {
                            fontWeight: 'var(--font-medium)',
                            color: 'var(--text-primary)',
                        },
                    });
                    li.appendChild(valueSpan);
                }

                if (item.action) {
                    const actionBtn = this.createButton({
                        label: item.actionLabel || 'إجراء',
                        type: 'secondary',
                        size: 'sm',
                        onClick: item.action,
                    });
                    li.appendChild(actionBtn);
                }

                if (item.link) {
                    const linkEl = createElement('a', {
                        href: item.link,
                        className: 'list-item-link',
                        textContent: '🔗',
                        style: {
                            color: 'var(--color-primary)',
                            textDecoration: 'none',
                            marginRight: 'var(--spacing-2)',
                        },
                    });
                    li.appendChild(linkEl);
                }

                list.appendChild(li);
            });

            body.appendChild(list);
        }

        if (this.link) {
            const linkEl = createElement('a', {
                className: 'card-link',
                href: this.link,
                textContent: this.linkText,
                style: {
                    fontSize: 'var(--font-sm)',
                    color: 'var(--color-primary)',
                    textDecoration: 'none',
                    display: 'inline-block',
                    marginTop: 'var(--spacing-2)',
                },
            });
            body.appendChild(linkEl);
        }

        this.element.appendChild(body);
        this.renderFooter();
    }

    /**
     * عرض بطاقة ملف شخصي (Profile)
     */
    renderProfileCard() {
        // الصورة
        const avatarContainer = createElement('div', {
            className: 'profile-avatar',
            style: {
                display: 'flex',
                justifyContent: 'center',
                paddingTop: 'var(--spacing-4)',
            },
        });

        const avatar = createElement('div', {
            className: 'profile-avatar-image',
            style: {
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--bg-tertiary)',
                fontSize: '32px',
                color: 'var(--text-secondary)',
            },
        });

        if (this.image) {
            const img = createElement('img', {
                src: this.image,
                alt: this.imageAlt || 'الصورة الشخصية',
                style: {
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                },
            });
            avatar.appendChild(img);
        } else if (this.icon) {
            avatar.textContent = this.icon;
        } else {
            avatar.textContent = '👤';
        }

        avatarContainer.appendChild(avatar);
        this.element.appendChild(avatarContainer);

        // الرأس (الاسم واللقب)
        const header = createElement('div', {
            className: 'profile-header',
            style: {
                textAlign: 'center',
                padding: 'var(--spacing-3) var(--spacing-4)',
            },
        });

        if (this.title) {
            const nameEl = createElement('h3', {
                className: 'profile-name',
                style: {
                    fontSize: 'var(--font-lg)',
                    fontWeight: 'var(--font-bold)',
                    margin: '0 0 var(--spacing-1) 0',
                },
                textContent: this.title,
            });
            header.appendChild(nameEl);
        }

        if (this.subtitle) {
            const roleEl = createElement('div', {
                className: 'profile-role',
                style: {
                    fontSize: 'var(--font-sm)',
                    color: 'var(--text-secondary)',
                },
                textContent: this.subtitle,
            });
            header.appendChild(roleEl);
        }

        if (this.badge) {
            const badgeEl = createElement('span', {
                className: `badge badge-${this.badgeType}`,
                textContent: this.badge,
                style: { marginTop: 'var(--spacing-2)' },
            });
            header.appendChild(badgeEl);
        }

        this.element.appendChild(header);

        // الجسم (المعلومات الإضافية)
        const body = this.createBody();

        if (this.content) {
            const contentEl = createElement('div', {
                className: 'profile-content',
            });
            if (typeof this.content === 'string') {
                contentEl.innerHTML = this.content;
            } else if (this.content instanceof HTMLElement) {
                contentEl.appendChild(this.content);
            } else {
                contentEl.textContent = String(this.content);
            }
            body.appendChild(contentEl);
        }

        // قائمة المعلومات
        if (this.items.length > 0) {
            const infoList = createElement('div', {
                className: 'profile-info-list',
                style: {
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 'var(--spacing-2)',
                    marginTop: 'var(--spacing-3)',
                },
            });

            this.items.forEach(item => {
                const itemEl = createElement('div', {
                    className: 'profile-info-item',
                    style: {
                        display: 'flex',
                        flexDirection: 'column',
                        padding: 'var(--spacing-2)',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-sm)',
                    },
                });

                if (item.label) {
                    const labelEl = createElement('span', {
                        className: 'profile-info-label',
                        style: {
                            fontSize: 'var(--font-xs)',
                            color: 'var(--text-tertiary)',
                        },
                        textContent: item.label,
                    });
                    itemEl.appendChild(labelEl);
                }

                const valueEl = createElement('span', {
                    className: 'profile-info-value',
                    style: {
                        fontSize: 'var(--font-sm)',
                        fontWeight: 'var(--font-medium)',
                        color: 'var(--text-primary)',
                    },
                });
                valueEl.textContent = typeof item.value === 'number' ? formatNumber(item.value) : (item.value || '');
                itemEl.appendChild(valueEl);

                infoList.appendChild(itemEl);
            });

            body.appendChild(infoList);
        }

        // الأزرار
        if (this.buttons.length > 0) {
            const btnGroup = createElement('div', {
                className: 'profile-buttons',
                style: {
                    display: 'flex',
                    gap: 'var(--spacing-2)',
                    marginTop: 'var(--spacing-3)',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                },
            });
            this.buttons.forEach(btnConfig => {
                const btn = this.createButton(btnConfig);
                btnGroup.appendChild(btn);
            });
            body.appendChild(btnGroup);
        }

        this.element.appendChild(body);
        this.renderFooter();
    }

    /**
     * عرض بطاقة مقياس (Metric)
     */
    renderMetricCard() {
        this.renderHeader();

        const body = this.createBody();

        // عرض المقياس
        const metricContainer = createElement('div', {
            className: 'metric-container',
            style: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: 'var(--spacing-4) 0',
            },
        });

        if (this.value !== null && this.value !== undefined) {
            const valueEl = createElement('div', {
                className: 'metric-value',
                style: {
                    fontSize: 'var(--font-3xl)',
                    fontWeight: 'var(--font-bold)',
                    color: 'var(--color-primary)',
                },
            });
            valueEl.textContent = `${this.valuePrefix}${typeof this.value === 'number' ? formatNumber(this.value) : this.value}${this.valueSuffix}`;
            metricContainer.appendChild(valueEl);
        }

        if (this.title) {
            const titleEl = createElement('div', {
                className: 'metric-label',
                style: {
                    fontSize: 'var(--font-sm)',
                    color: 'var(--text-secondary)',
                    marginTop: 'var(--spacing-1)',
                },
                textContent: this.title,
            });
            metricContainer.appendChild(titleEl);
        }

        // شريط التقدم (إذا كان value نسبة)
        if (this.change !== null && this.change !== undefined && this.change <= 100) {
            const progressWrapper = createElement('div', {
                className: 'metric-progress',
                style: {
                    width: '100%',
                    marginTop: 'var(--spacing-3)',
                },
            });

            const progress = createElement('div', {
                className: 'progress',
                style: {
                    width: '100%',
                    height: '8px',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-full)',
                    overflow: 'hidden',
                },
            });

            const bar = createElement('div', {
                className: 'progress-bar',
                style: {
                    width: `${Math.min(Math.max(this.change, 0), 100)}%`,
                    height: '100%',
                    backgroundColor: 'var(--color-primary)',
                    borderRadius: 'var(--radius-full)',
                    transition: 'width 0.6s ease',
                },
            });
            progress.appendChild(bar);
            progressWrapper.appendChild(progress);

            const changeEl = createElement('div', {
                className: 'metric-change',
                style: {
                    fontSize: 'var(--font-xs)',
                    color: 'var(--text-tertiary)',
                    marginTop: 'var(--spacing-1)',
                    textAlign: 'center',
                },
                textContent: `${this.change}%`,
            });
            progressWrapper.appendChild(changeEl);

            metricContainer.appendChild(progressWrapper);
        }

        body.appendChild(metricContainer);

        if (this.link) {
            const linkEl = createElement('a', {
                className: 'card-link',
                href: this.link,
                textContent: this.linkText,
                style: {
                    fontSize: 'var(--font-sm)',
                    color: 'var(--color-primary)',
                    textDecoration: 'none',
                    display: 'inline-block',
                    marginTop: 'var(--spacing-2)',
                },
            });
            body.appendChild(linkEl);
        }

        this.element.appendChild(body);
        this.renderFooter();
    }

    /**
     * عرض بطاقة قابلة للنقر (Clickable)
     */
    renderClickableCard() {
        // إضافة صنف clickable
        addClass(this.element, 'card-clickable');

        // جعل البطاقة قابلة للنقر
        if (this.onClick) {
            this.element.addEventListener('click', (e) => {
                if (!e.target.closest('.card-buttons') && !e.target.closest('.card-link')) {
                    this.onClick(e);
                }
            });
        }

        // نفس محتوى info ولكن مع أيقونة مميزة
        if (this.icon) {
            const iconWrapper = createElement('div', {
                className: 'clickable-icon',
                style: {
                    fontSize: '32px',
                    textAlign: 'center',
                    padding: 'var(--spacing-3) 0',
                },
            });
            if (typeof this.icon === 'string') {
                iconWrapper.textContent = this.icon;
            } else if (this.icon instanceof HTMLElement) {
                iconWrapper.appendChild(this.icon);
            }
            this.element.appendChild(iconWrapper);
        }

        this.renderHeader();

        const body = this.createBody();

        if (this.content) {
            const contentEl = createElement('div', {
                className: 'card-content',
                style: { textAlign: 'center' },
            });
            if (typeof this.content === 'string') {
                contentEl.innerHTML = this.content;
            } else if (this.content instanceof HTMLElement) {
                contentEl.appendChild(this.content);
            } else {
                contentEl.textContent = String(this.content);
            }
            body.appendChild(contentEl);
        }

        if (this.subtitle) {
            const subtitleEl = createElement('div', {
                className: 'card-subtitle',
                style: {
                    fontSize: 'var(--font-sm)',
                    color: 'var(--text-secondary)',
                    textAlign: 'center',
                    marginTop: 'var(--spacing-2)',
                },
                textContent: this.subtitle,
            });
            body.appendChild(subtitleEl);
        }

        if (this.badge) {
            const badgeEl = createElement('span', {
                className: `badge badge-${this.badgeType}`,
                textContent: this.badge,
                style: { display: 'block', textAlign: 'center', marginTop: 'var(--spacing-2)' },
            });
            body.appendChild(badgeEl);
        }

        this.element.appendChild(body);
        this.renderFooter();
    }

    /**
     * عرض بطاقة مخصصة (Custom)
     */
    renderCustomCard() {
        this.renderHeader();

        const body = this.createBody();

        if (this.content) {
            if (typeof this.content === 'string') {
                body.innerHTML = this.content;
            } else if (this.content instanceof HTMLElement) {
                body.appendChild(this.content);
            } else {
                body.textContent = String(this.content);
            }
        }

        this.element.appendChild(body);
        this.renderFooter();
    }

    // ============================================
    //  4.  دوال مساعدة للعرض
    // ============================================

    /**
     * عرض رأس البطاقة
     */
    renderHeader() {
        if (!this.title && !this.badge) return;

        this._headerElement = createElement('div', {
            className: 'card-header',
            style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: 'var(--spacing-3)',
                marginBottom: 'var(--spacing-3)',
                borderBottom: '1px solid var(--border-color)',
            },
        });

        if (this.title) {
            const titleEl = createElement('h3', {
                className: 'card-title',
                style: {
                    fontSize: 'var(--font-lg)',
                    fontWeight: 'var(--font-semibold)',
                    margin: '0',
                    color: 'var(--text-primary)',
                },
                textContent: this.title,
            });
            this._headerElement.appendChild(titleEl);
        }

        if (this.badge) {
            const badgeEl = createElement('span', {
                className: `badge badge-${this.badgeType}`,
                textContent: this.badge,
            });
            this._headerElement.appendChild(badgeEl);
        }

        this.element.appendChild(this._headerElement);
    }

    /**
     * عرض تذييل البطاقة
     */
    renderFooter() {
        if (this.actions.length === 0) return;

        this._footerElement = createElement('div', {
            className: 'card-footer',
            style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 'var(--spacing-2)',
                paddingTop: 'var(--spacing-3)',
                marginTop: 'var(--spacing-3)',
                borderTop: '1px solid var(--border-color)',
            },
        });

        this.actions.forEach(action => {
            const btn = this.createButton({
                label: action.label || action.icon || 'إجراء',
                type: action.type || 'secondary',
                size: 'sm',
                onClick: (e) => {
                    if (this.onAction) {
                        this.onAction(action.key, action);
                    }
                    if (action.onClick) {
                        action.onClick(e);
                    }
                },
                icon: action.icon,
                className: action.className || '',
            });
            this._footerElement.appendChild(btn);
        });

        this.element.appendChild(this._footerElement);
    }

    /**
     * إنشاء جسم البطاقة
     */
    createBody() {
        const body = createElement('div', {
            className: 'card-body',
            style: {
                flex: '1',
                padding: this.type === CARD_TYPES.STAT ? 'var(--spacing-4)' : '0',
            },
        });
        this._contentElement = body;
        return body;
    }

    /**
     * إنشاء زر
     */
    createButton(config) {
        const {
            label = '',
            type = 'secondary',
            size = 'md',
            icon = null,
            onClick = null,
            className = '',
            disabled = false,
        } = config;

        const btn = createElement('button', {
            className: `btn btn-${type} btn-${size} ${className}`,
            textContent: label || icon || 'زر',
            disabled: disabled,
            onClick: (e) => {
                e.stopPropagation();
                if (onClick) {
                    onClick(e);
                }
            },
        });

        if (icon && typeof icon === 'string') {
            btn.prepend(document.createTextNode(icon + ' '));
        } else if (icon instanceof HTMLElement) {
            btn.prepend(icon);
        }

        return btn;
    }

    /**
     * تطبيق الاستجابة
     */
    applyResponsive() {
        if (!this.responsive) return;

        Object.keys(this.responsive).forEach(breakpoint => {
            const styles = this.responsive[breakpoint];
            const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`);

            const applyStyles = () => {
                if (mediaQuery.matches) {
                    Object.assign(this.element.style, styles);
                } else {
                    // إعادة تعيين الأنماط إلى القيم الأصلية
                    Object.keys(styles).forEach(key => {
                        this.element.style[key] = '';
                    });
                }
            };

            mediaQuery.addEventListener('change', applyStyles);
            applyStyles();
        });
    }

    // ============================================
    //  5.  دوال التحكم (Control Functions)
    // ============================================

    /**
     * تحديث البطاقة
     */
    update(options = {}) {
        Object.assign(this, options);
        // إعادة عرض البطاقة
        if (this.element && this.element.parentNode) {
            const parent = this.element.parentNode;
            const newElement = this.render();
            if (newElement) {
                parent.replaceChild(newElement.element, this.element);
                this.element = newElement.element;
            }
        } else {
            this.render();
        }
        return this;
    }

    /**
     * إزالة البطاقة
     */
    remove() {
        if (this.element) {
            removeElement(this.element);
            this.element = null;
        }
        return this;
    }

    /**
     * تبديل حالة التوسيع
     */
    toggleExpand() {
        this.isExpanded = !this.isExpanded;
        if (this.isExpanded) {
            addClass(this.element, 'expanded');
        } else {
            removeClass(this.element, 'expanded');
        }
        return this;
    }

    /**
     * إظهار البطاقة
     */
    show() {
        if (this.element) {
            this.element.style.display = '';
        }
        return this;
    }

    /**
     * إخفاء البطاقة
     */
    hide() {
        if (this.element) {
            this.element.style.display = 'none';
        }
        return this;
    }

    /**
     * عرض حالة التحميل
     */
    setLoading(loading) {
        this.loading = loading;
        if (this.element) {
            if (loading) {
                addClass(this.element, 'loading');
            } else {
                removeClass(this.element, 'loading');
            }
        }
        return this;
    }

    /**
     * تحديث القيمة
     */
    setValue(value) {
        this.value = value;
        // تحديث عرض القيمة
        const valueEl = this.element?.querySelector('.stat-value, .metric-value');
        if (valueEl) {
            valueEl.textContent = `${this.valuePrefix}${typeof this.value === 'number' ? formatNumber(this.value) : this.value}${this.valueSuffix}`;
        }
        return this;
    }

    /**
     * تحديث التغيير (نسبة)
     */
    setChange(change, type = 'neutral') {
        this.change = change;
        this.changeType = type;
        const changeEl = this.element?.querySelector('.stat-change');
        if (changeEl) {
            const changeSign = change >= 0 ? '+' : '';
            changeEl.textContent = `${changeSign}${formatNumber(change, 1)}%`;
            changeEl.className = `stat-change ${type}`;
            changeEl.style.color = type === 'positive' ? 'var(--color-success)' :
                                    type === 'negative' ? 'var(--color-danger)' :
                                    'var(--text-tertiary)';
        }
        return this;
    }

    // ============================================
    //  6.  دوال مساعدة للاستعلام
    // ============================================

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
     * الحصول على النوع
     */
    getType() {
        return this.type;
    }

    /**
     * التحقق من أن البطاقة موسعة
     */
    isCardExpanded() {
        return this.isExpanded;
    }
}

// ============================================
//  7.  دوال مساعدة لإنشاء البطاقات
// ============================================

/**
 * إنشاء بطاقة جديدة
 */
export function createCard(options = {}) {
    return new Card(options);
}

/**
 * إنشاء بطاقة إحصائية
 */
export function createStatCard(container, options = {}) {
    return new Card({
        container,
        type: CARD_TYPES.STAT,
        ...options,
    });
}

/**
 * إنشاء بطاقة معلومات
 */
export function createInfoCard(container, options = {}) {
    return new Card({
        container,
        type: CARD_TYPES.INFO,
        ...options,
    });
}

/**
 * إنشاء بطاقة مع صورة
 */
export function createImageCard(container, options = {}) {
    return new Card({
        container,
        type: CARD_TYPES.IMAGE,
        ...options,
    });
}

/**
 * إنشاء بطاقة قائمة
 */
export function createListCard(container, options = {}) {
    return new Card({
        container,
        type: CARD_TYPES.LIST,
        ...options,
    });
}

/**
 * إنشاء بطاقة ملف شخصي
 */
export function createProfileCard(container, options = {}) {
    return new Card({
        container,
        type: CARD_TYPES.PROFILE,
        ...options,
    });
}

/**
 * إنشاء بطاقة مقياس
 */
export function createMetricCard(container, options = {}) {
    return new Card({
        container,
        type: CARD_TYPES.METRIC,
        ...options,
    });
}

/**
 * إنشاء بطاقة قابلة للنقر
 */
export function createClickableCard(container, options = {}) {
    return new Card({
        container,
        type: CARD_TYPES.CLICKABLE,
        clickable: true,
        ...options,
    });
}

/**
 * إنشاء بطاقة مخصصة
 */
export function createCustomCard(container, options = {}) {
    return new Card({
        container,
        type: CARD_TYPES.CUSTOM,
        ...options,
    });
}

// ============================================
//  8.  دوال مساعدة لعرض مجموعة بطاقات
// ============================================

/**
 * إنشاء شبكة بطاقات
 */
export function createCardGrid(container, cards = [], options = {}) {
    const {
        columns = 3,
        gap = 'var(--spacing-4)',
        className = '',
        responsive = {
            '768': { columns: 2 },
            '480': { columns: 1 },
        },
    } = options;

    const grid = createElement('div', {
        className: `card-grid ${className}`,
        style: {
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: gap,
        },
    });

    cards.forEach(cardOptions => {
        const card = createCard({
            container: grid,
            ...cardOptions,
        });
    });

    // تطبيق الاستجابة
    Object.keys(responsive).forEach(breakpoint => {
        const styles = responsive[breakpoint];
        const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`);

        const applyResponsive = () => {
            if (mediaQuery.matches) {
                grid.style.gridTemplateColumns = `repeat(${styles.columns || 1}, 1fr)`;
                if (styles.gap) {
                    grid.style.gap = styles.gap;
                }
            } else {
                grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
                grid.style.gap = gap;
            }
        };

        mediaQuery.addEventListener('change', applyResponsive);
        applyResponsive();
    });

    const containerEl = typeof container === 'string' ?
        document.querySelector(container) :
        container;

    if (containerEl) {
        containerEl.appendChild(grid);
    }

    return grid;
}

// ============================================
//  9.  دوال التهيئة والتنظيف
// ============================================

/**
 * تهيئة نظام البطاقات (إضافة أنماط إضافية)
 */
export function initCards() {
    // إضافة أنماط إضافية للبطاقات
    if (!document.getElementById('card-style')) {
        const style = document.createElement('style');
        style.id = 'card-style';
        style.textContent = `
            .card {
                transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
            }
            .card-hoverable:hover {
                transform: translateY(-2px);
                box-shadow: var(--shadow-lg);
            }
            .card-clickable {
                cursor: pointer;
            }
            .card-clickable:active {
                transform: scale(0.98);
            }
            .card.loading {
                opacity: 0.6;
                pointer-events: none;
                position: relative;
            }
            .card.loading::after {
                content: '';
                position: absolute;
                inset: 0;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                animation: shimmer 1.5s infinite;
                border-radius: inherit;
            }
            @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }
            .card.no-shadow {
                box-shadow: none !important;
            }
            .card.no-border {
                border: none !important;
            }
            .card.expanded {
                grid-column: 1 / -1 !important;
            }
            .card-sm { padding: var(--spacing-3); }
            .card-md { padding: var(--spacing-4); }
            .card-lg { padding: var(--spacing-5); }
            .card-xl { padding: var(--spacing-6); }
            .card-grid {
                width: 100%;
            }
            .card-buttons .btn {
                flex: 1 1 auto;
            }
            .dark .card.loading::after {
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
            }
        `;
        document.head.appendChild(style);
    }
    console.log('Cards component initialized successfully');
}

/**
 * تنظيف نظام البطاقات
 */
export function destroyCards() {
    const style = document.getElementById('card-style');
    if (style) {
        style.remove();
    }
    console.log('Cards component destroyed');
}

// ============================================
//  10.  API عام للمكون
// ============================================

export const cards = {
    Card,
    create: createCard,
    stat: createStatCard,
    info: createInfoCard,
    image: createImageCard,
    list: createListCard,
    profile: createProfileCard,
    metric: createMetricCard,
    clickable: createClickableCard,
    custom: createCustomCard,
    grid: createCardGrid,
    init: initCards,
    destroy: destroyCards,
    TYPES: CARD_TYPES,
    SIZES: CARD_SIZES,
};

// تصدير افتراضي
export default cards;

// ============================================
//  11.  تهيئة تلقائية عند تحميل الوحدة
// ============================================

// سيتم استدعاء init من app.js، لذلك لا نقوم بتهيئة تلقائية هنا

// ============================================
//  12.  نهاية الملف
// ============================================
