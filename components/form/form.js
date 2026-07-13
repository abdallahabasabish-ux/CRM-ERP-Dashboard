/**
 * ======================================================
 * الملف: components/form/form.js
 * الوصف: مكون النماذج المتقدم (Form)
 *         يدير إنشاء النماذج، التحقق من صحة المدخلات،
 *         معالجة البيانات، عرض الأخطاء، التحميل التلقائي،
 *         والتفاعل مع الخادم
 * الإصدار: 1.0.0
 * التاريخ: 2026-07-12
 * ======================================================
 */

import { createElement, removeElement, addClass, removeClass, toggleClass } from '../../utils/helpers.js';
import { validation } from '../../utils/validation.js';
import { showLoader, hideLoader } from '../loader/loader.js';
import { toast } from '../toast/toast.js';

// ============================================
//  1.  الثوابت والإعدادات الافتراضية
// ============================================

const FIELD_TYPES = {
    TEXT: 'text',
    TEXTAREA: 'textarea',
    NUMBER: 'number',
    EMAIL: 'email',
    PASSWORD: 'password',
    TEL: 'tel',
    DATE: 'date',
    DATETIME: 'datetime-local',
    TIME: 'time',
    SELECT: 'select',
    MULTI_SELECT: 'multi-select',
    CHECKBOX: 'checkbox',
    RADIO: 'radio',
    FILE: 'file',
    COLOR: 'color',
    RANGE: 'range',
    HIDDEN: 'hidden',
    HTML: 'html',
    CUSTOM: 'custom',
};

const VALIDATION_EVENTS = {
    BLUR: 'blur',
    INPUT: 'input',
    CHANGE: 'change',
    SUBMIT: 'submit',
    MANUAL: 'manual',
};

// ============================================
//  2.  فئة النموذج الرئيسية
// ============================================

class Form {
    constructor(options = {}) {
        this.id = options.id || `form-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        this.container = options.container || null;
        this.fields = options.fields || [];
        this.data = options.data || {};
        this.validationRules = options.validationRules || {};
        this.validationMode = options.validationMode || VALIDATION_EVENTS.BLUR;
        this.submitUrl = options.submitUrl || null;
        this.submitMethod = options.submitMethod || 'POST';
        this.submitHandler = options.submitHandler || null;
        this.onSubmit = options.onSubmit || null;
        this.onSuccess = options.onSuccess || null;
        this.onError = options.onError || null;
        this.onFieldChange = options.onFieldChange || null;
        this.onValidation = options.onValidation || null;
        this.enableAutoSave = options.enableAutoSave || false;
        this.autoSaveDelay = options.autoSaveDelay || 500;
        this.saveKey = options.saveKey || null;
        this.className = options.className || '';
        this.style = options.style || {};
        this.layout = options.layout || 'vertical'; // vertical, horizontal, inline
        this.labelPosition = options.labelPosition || 'top'; // top, left, right, bottom
        this.showLabels = options.showLabels !== undefined ? options.showLabels : true;
        this.showRequiredIndicator = options.showRequiredIndicator !== undefined ? options.showRequiredIndicator : true;
        this.showErrors = options.showErrors !== undefined ? options.showErrors : true;
        this.focusFirstField = options.focusFirstField !== undefined ? options.focusFirstField : true;
        this.resetAfterSubmit = options.resetAfterSubmit || false;
        this.clearErrorsOnReset = options.clearErrorsOnReset !== undefined ? options.clearErrorsOnReset : true;

        // الحالة الداخلية
        this.element = null;
        this.fieldsMap = {};
        this.errors = {};
        this.isSubmitting = false;
        this.isDirty = false;
        this.autoSaveTimer = null;
        this.initialData = {};
        this._fieldElements = [];

        // تهيئة
        if (this.container) {
            this.render();
        }
    }

    // ============================================
    //  3.  دوال معالجة الحقول
    // ============================================

    /**
     * تحليل الحقول وتحويلها إلى هياكل داخلية
     */
    processFields() {
        this.fieldsMap = {};
        this.fields.forEach(field => {
            const key = field.key || field.name;
            if (key) {
                this.fieldsMap[key] = field;
                // تعيين القيم الافتراضية
                if (this.data[key] === undefined && field.default !== undefined) {
                    this.data[key] = field.default;
                }
                if (this.data[key] === undefined) {
                    this.data[key] = '';
                }
            }
        });
        // حفظ البيانات الأولية
        this.initialData = { ...this.data };
    }

    /**
     * الحصول على قيمة حقل
     */
    getFieldValue(key) {
        return this.data[key] !== undefined ? this.data[key] : '';
    }

    /**
     * تعيين قيمة حقل
     */
    setFieldValue(key, value, triggerChange = true) {
        const oldValue = this.data[key];
        this.data[key] = value;
        this.isDirty = true;

        // تحديث العنصر في DOM
        const input = this.fieldsMap[key]?.element;
        if (input) {
            if (input.type === 'checkbox') {
                input.checked = Boolean(value);
            } else if (input.type === 'radio') {
                const radios = this.element.querySelectorAll(`input[name="${key}"]`);
                radios.forEach(radio => {
                    radio.checked = String(radio.value) === String(value);
                });
            } else if (input.tagName === 'SELECT') {
                input.value = value;
            } else {
                input.value = value;
            }
        }

        if (triggerChange && this.onFieldChange) {
            this.onFieldChange(key, value, oldValue);
        }

        // التحقق من الصحة إذا كان الوضع input
        if (this.validationMode === VALIDATION_EVENTS.INPUT) {
            this.validateField(key);
        }

        return this;
    }

    /**
     * الحصول على بيانات النموذج كاملة
     */
    getData() {
        return { ...this.data };
    }

    /**
     * تعيين بيانات النموذج كاملة
     */
    setData(data, triggerChange = true) {
        const oldData = { ...this.data };
        this.data = { ...this.data, ...data };
        this.isDirty = true;

        // تحديث جميع الحقول
        Object.keys(data).forEach(key => {
            const value = data[key];
            const input = this.fieldsMap[key]?.element;
            if (input) {
                if (input.type === 'checkbox') {
                    input.checked = Boolean(value);
                } else if (input.type === 'radio') {
                    const radios = this.element.querySelectorAll(`input[name="${key}"]`);
                    radios.forEach(radio => {
                        radio.checked = String(radio.value) === String(value);
                    });
                } else if (input.tagName === 'SELECT') {
                    input.value = value;
                } else {
                    input.value = value;
                }
            }
        });

        if (triggerChange && this.onFieldChange) {
            Object.keys(data).forEach(key => {
                this.onFieldChange(key, data[key], oldData[key]);
            });
        }

        return this;
    }

    /**
     * إعادة تعيين النموذج إلى القيم الافتراضية أو البيانات الأولية
     */
    reset(data = null) {
        const resetData = data || this.initialData || {};
        this.data = { ...resetData };
        this.isDirty = false;
        this.errors = {};

        // إعادة تعيين جميع الحقول
        Object.keys(this.fieldsMap).forEach(key => {
            const value = this.data[key] !== undefined ? this.data[key] : '';
            const input = this.fieldsMap[key]?.element;
            if (input) {
                if (input.type === 'checkbox') {
                    input.checked = Boolean(value);
                } else if (input.type === 'radio') {
                    const radios = this.element.querySelectorAll(`input[name="${key}"]`);
                    radios.forEach(radio => {
                        radio.checked = String(radio.value) === String(value);
                    });
                } else if (input.tagName === 'SELECT') {
                    input.value = value;
                } else {
                    input.value = value;
                }
            }
            // إزالة رسائل الخطأ
            this.clearFieldError(key);
        });

        if (this.clearErrorsOnReset) {
            this.clearAllErrors();
        }

        return this;
    }

    /**
     * التحقق من أن النموذج تم تعديله
     */
    isDirtyForm() {
        return this.isDirty;
    }

    // ============================================
    //  4.  دوال التحقق من الصحة (Validation)
    // ============================================

    /**
     * التحقق من صحة حقل معين
     */
    validateField(key) {
        const field = this.fieldsMap[key];
        if (!field) return true;

        const value = this.getFieldValue(key);
        const rules = this.validationRules[key] || [];

        // التحقق من الحقول المطلوبة
        const isRequired = field.required || false;
        let isValid = true;
        let errorMessage = '';

        // تطبيق قواعد التحقق
        for (const rule of rules) {
            let result;
            if (typeof rule === 'function') {
                result = rule(value, this.data);
            } else if (typeof rule === 'object') {
                const { validator, message, params } = rule;
                if (typeof validator === 'function') {
                    result = validator(value, this.data, params);
                } else if (typeof validator === 'string' && validation[validator]) {
                    result = validation[validator](value, field.label || key);
                } else {
                    continue;
                }
            } else if (typeof rule === 'string' && validation[rule]) {
                result = validation[rule](value, field.label || key);
            } else {
                continue;
            }

            if (result && typeof result === 'object' && !result.valid) {
                isValid = false;
                errorMessage = result.message || 'قيمة غير صحيحة';
                break;
            } else if (result === false) {
                isValid = false;
                errorMessage = 'قيمة غير صحيحة';
                break;
            }
        }

        // التحقق من required إذا لم يتم تطبيقه من خلال القواعد
        if (isRequired && isValid) {
            const reqResult = validation.required(value, field.label || key);
            if (!reqResult.valid) {
                isValid = false;
                errorMessage = reqResult.message;
            }
        }

        // تحديث حالة الخطأ
        if (!isValid) {
            this.errors[key] = errorMessage;
            this.showFieldError(key, errorMessage);
        } else {
            delete this.errors[key];
            this.clearFieldError(key);
        }

        // استدعاء onValidation
        if (this.onValidation) {
            this.onValidation(key, isValid, errorMessage);
        }

        return isValid;
    }

    /**
     * التحقق من صحة جميع الحقول
     */
    validateAll() {
        let allValid = true;
        const fieldKeys = Object.keys(this.fieldsMap);

        fieldKeys.forEach(key => {
            const isValid = this.validateField(key);
            if (!isValid) allValid = false;
        });

        return allValid;
    }

    /**
     * عرض خطأ حقل
     */
    showFieldError(key, message) {
        const field = this.fieldsMap[key];
        if (!field || !field.element) return;

        const container = field.element.closest('.form-group');
        if (!container) return;

        // إزالة الخطأ القديم
        const oldError = container.querySelector('.form-error');
        if (oldError) removeElement(oldError);

        // إضافة صنف الخطأ
        addClass(field.element, 'is-invalid');

        // إنشاء رسالة الخطأ
        const errorEl = createElement('div', {
            className: 'form-error',
            textContent: message,
        });
        container.appendChild(errorEl);

        // تحديث حالة الخطأ في الفيلد
        field._error = message;
    }

    /**
     * مسح خطأ حقل
     */
    clearFieldError(key) {
        const field = this.fieldsMap[key];
        if (!field || !field.element) return;

        const container = field.element.closest('.form-group');
        if (!container) return;

        const error = container.querySelector('.form-error');
        if (error) removeElement(error);

        removeClass(field.element, 'is-invalid');
        delete field._error;
    }

    /**
     * مسح جميع الأخطاء
     */
    clearAllErrors() {
        Object.keys(this.fieldsMap).forEach(key => {
            this.clearFieldError(key);
        });
        this.errors = {};
    }

    /**
     * الحصول على جميع الأخطاء
     */
    getErrors() {
        return { ...this.errors };
    }

    /**
     * التحقق من وجود أخطاء
     */
    hasErrors() {
        return Object.keys(this.errors).length > 0;
    }

    // ============================================
    //  5.  دوال الإرسال (Submit)
    // ============================================

    /**
     * إرسال النموذج
     */
    async submit() {
        if (this.isSubmitting) return;

        // التحقق من الصحة
        const isValid = this.validateAll();

        // استدعاء onSubmit
        if (this.onSubmit) {
            const result = this.onSubmit(this.data, isValid);
            if (result === false) return;
        }

        if (!isValid) {
            toast.error('يوجد أخطاء في النموذج، يرجى تصحيحها');
            return;
        }

        this.isSubmitting = true;

        // عرض مؤشر التحميل
        const loaderId = showLoader({
            target: this.element,
            message: 'جاري الإرسال...',
            overlay: true,
        });

        try {
            let response;
            if (this.submitHandler) {
                response = await this.submitHandler(this.data);
            } else if (this.submitUrl) {
                const fetchOptions = {
                    method: this.submitMethod,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(this.data),
                };
                const res = await fetch(this.submitUrl, fetchOptions);
                response = await res.json();
            } else {
                // لا يوجد معالج إرسال، نعتبر العملية ناجحة
                response = { success: true, data: this.data };
            }

            if (response.success !== false) {
                // نجاح
                if (this.onSuccess) {
                    this.onSuccess(response.data || response);
                }
                toast.success(response.message || 'تم الإرسال بنجاح');
                if (this.resetAfterSubmit) {
                    this.reset();
                }
                this.isDirty = false;
            } else {
                // فشل
                const errorMsg = response.message || 'حدث خطأ أثناء الإرسال';
                if (this.onError) {
                    this.onError(errorMsg, response);
                }
                toast.error(errorMsg);
                // عرض أخطاء من الخادم
                if (response.errors) {
                    Object.keys(response.errors).forEach(key => {
                        const message = response.errors[key];
                        if (this.fieldsMap[key]) {
                            this.showFieldError(key, message);
                            this.errors[key] = message;
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Form submit error:', error);
            const errorMsg = error.message || 'حدث خطأ أثناء الإرسال';
            if (this.onError) {
                this.onError(errorMsg, error);
            }
            toast.error(errorMsg);
        } finally {
            this.isSubmitting = false;
            hideLoader(loaderId);
        }
    }

    // ============================================
    //  6.  دوال العرض (Render)
    // ============================================

    /**
     * عرض النموذج بالكامل
     */
    render() {
        const container = typeof this.container === 'string' ?
            document.querySelector(this.container) :
            this.container;

        if (!container) {
            console.error('Form container not found');
            return this;
        }

        // معالجة الحقول
        this.processFields();

        // إنشاء عنصر النموذج
        this.element = createElement('form', {
            className: `form form-${this.layout} ${this.className}`,
            style: this.style,
            id: this.id,
            novalidate: true,
            onSubmit: (e) => {
                e.preventDefault();
                this.submit();
            },
        });

        // عرض الحقول
        this.fields.forEach(field => {
            const fieldGroup = this.renderField(field);
            if (fieldGroup) {
                this.element.appendChild(fieldGroup);
            }
        });

        // إضافة أزرار الإرسال
        this.renderActions();

        // إضافة النموذج إلى الحاوية
        container.appendChild(this.element);

        // تركيز الحقل الأول
        if (this.focusFirstField) {
            const firstInput = this.element.querySelector('input:not([type="hidden"]), textarea, select');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }

        // تفعيل الحفظ التلقائي
        if (this.enableAutoSave && this.saveKey) {
            this.loadAutoSave();
            this.element.addEventListener('input', this.handleAutoSave.bind(this));
        }

        return this;
    }

    /**
     * عرض حقل واحد
     */
    renderField(field) {
        const {
            key,
            name,
            label,
            type = FIELD_TYPES.TEXT,
            placeholder = '',
            required = false,
            disabled = false,
            readonly = false,
            options = [],
            defaultValue = '',
            className = '',
            style = {},
            help = '',
            wrapperClass = '',
            labelClass = '',
            inputClass = '',
            attributes = {},
            multiple = false,
            accept = '',
            min = '',
            max = '',
            step = '',
            rows = 3,
            cols = 50,
            render = null,
            visible = true,
            condition = null,
        } = field;

        if (!visible) return null;
        if (condition && !condition(this.data)) return null;

        const fieldKey = key || name;
        if (!fieldKey) return null;

        const value = this.getFieldValue(fieldKey);
        const fieldId = `field-${this.id}-${fieldKey}`;

        // إنشاء مجموعة الحقل
        const group = createElement('div', {
            className: `form-group ${wrapperClass}`,
            style: style,
            'data-field': fieldKey,
        });

        // التسمية
        let labelEl = null;
        if (this.showLabels && label && type !== FIELD_TYPES.HIDDEN) {
            labelEl = createElement('label', {
                className: `form-label ${labelClass}`,
                for: fieldId,
            });
            labelEl.textContent = label;
            if (required && this.showRequiredIndicator) {
                const requiredStar = createElement('span', {
                    className: 'required',
                    textContent: '*',
                });
                labelEl.appendChild(requiredStar);
            }
            group.appendChild(labelEl);
        }

        // عنصر الإدخال
        let inputEl = null;

        switch (type) {
            case FIELD_TYPES.TEXTAREA:
                inputEl = createElement('textarea', {
                    id: fieldId,
                    className: `form-control ${inputClass}`,
                    placeholder: placeholder,
                    disabled: disabled,
                    readonly: readonly,
                    rows: rows,
                    cols: cols,
                    ...attributes,
                    onInput: (e) => {
                        this.setFieldValue(fieldKey, e.target.value, true);
                        if (this.validationMode === VALIDATION_EVENTS.INPUT) {
                            this.validateField(fieldKey);
                        }
                    },
                    onBlur: (e) => {
                        if (this.validationMode === VALIDATION_EVENTS.BLUR) {
                            this.validateField(fieldKey);
                        }
                    },
                    onFocus: (e) => {
                        // إزالة حالة الخطأ عند التركيز
                        this.clearFieldError(fieldKey);
                    },
                });
                inputEl.value = value || defaultValue || '';
                break;

            case FIELD_TYPES.SELECT:
            case FIELD_TYPES.MULTI_SELECT:
                inputEl = createElement('select', {
                    id: fieldId,
                    className: `form-control ${inputClass}`,
                    disabled: disabled,
                    multiple: type === FIELD_TYPES.MULTI_SELECT || multiple,
                    ...attributes,
                    onChange: (e) => {
                        const selectedValue = multiple || type === FIELD_TYPES.MULTI_SELECT ?
                            Array.from(e.target.selectedOptions).map(opt => opt.value) :
                            e.target.value;
                        this.setFieldValue(fieldKey, selectedValue, true);
                        if (this.validationMode === VALIDATION_EVENTS.CHANGE) {
                            this.validateField(fieldKey);
                        }
                    },
                    onBlur: (e) => {
                        if (this.validationMode === VALIDATION_EVENTS.BLUR) {
                            this.validateField(fieldKey);
                        }
                    },
                });

                // إضافة الخيارات
                const currentValue = value || defaultValue || '';
                const selectedValues = Array.isArray(currentValue) ? currentValue : [currentValue];

                options.forEach(opt => {
                    const option = createElement('option', {
                        value: opt.value,
                        textContent: opt.label || opt.text || opt.value,
                        selected: selectedValues.includes(String(opt.value)),
                    });
                    inputEl.appendChild(option);
                });

                // خيار placeholder
                if (placeholder && !multiple) {
                    const placeholderOption = createElement('option', {
                        value: '',
                        textContent: placeholder,
                        selected: !currentValue || currentValue === '',
                        disabled: true,
                    });
                    inputEl.prepend(placeholderOption);
                }
                break;

            case FIELD_TYPES.CHECKBOX:
                const checkboxGroup = createElement('div', {
                    className: 'checkbox-group',
                });

                if (Array.isArray(options) && options.length > 0) {
                    // مجموعة من الخانات
                    const currentValues = Array.isArray(value) ? value : [];
                    options.forEach(opt => {
                        const wrapper = createElement('div', {
                            className: 'checkbox-option',
                            style: { display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' },
                        });
                        const checkbox = createElement('input', {
                            type: 'checkbox',
                            id: `${fieldId}-${opt.value}`,
                            className: `form-check-input ${inputClass}`,
                            value: opt.value,
                            checked: currentValues.includes(String(opt.value)),
                            disabled: disabled,
                            ...attributes,
                            onChange: (e) => {
                                const newValues = Array.isArray(this.data[fieldKey]) ? [...this.data[fieldKey]] : [];
                                if (e.target.checked) {
                                    if (!newValues.includes(e.target.value)) {
                                        newValues.push(e.target.value);
                                    }
                                } else {
                                    const index = newValues.indexOf(e.target.value);
                                    if (index > -1) {
                                        newValues.splice(index, 1);
                                    }
                                }
                                this.setFieldValue(fieldKey, newValues, true);
                                if (this.validationMode === VALIDATION_EVENTS.CHANGE) {
                                    this.validateField(fieldKey);
                                }
                            },
                            onBlur: (e) => {
                                if (this.validationMode === VALIDATION_EVENTS.BLUR) {
                                    this.validateField(fieldKey);
                                }
                            },
                        });
                        wrapper.appendChild(checkbox);
                        const labelCheck = createElement('label', {
                            className: 'checkbox-label',
                            for: `${fieldId}-${opt.value}`,
                            textContent: opt.label || opt.text || opt.value,
                        });
                        wrapper.appendChild(labelCheck);
                        checkboxGroup.appendChild(wrapper);
                    });
                } else {
                    // خانة واحدة
                    const wrapper = createElement('div', {
                        className: 'checkbox-option',
                        style: { display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' },
                    });
                    inputEl = createElement('input', {
                        type: 'checkbox',
                        id: fieldId,
                        className: `form-check-input ${inputClass}`,
                        checked: Boolean(value || defaultValue),
                        disabled: disabled,
                        ...attributes,
                        onChange: (e) => {
                            this.setFieldValue(fieldKey, e.target.checked, true);
                            if (this.validationMode === VALIDATION_EVENTS.CHANGE) {
                                this.validateField(fieldKey);
                            }
                        },
                        onBlur: (e) => {
                            if (this.validationMode === VALIDATION_EVENTS.BLUR) {
                                this.validateField(fieldKey);
                            }
                        },
                    });
                    wrapper.appendChild(inputEl);
                    if (label) {
                        const labelCheck = createElement('label', {
                            className: 'checkbox-label',
                            for: fieldId,
                            textContent: label,
                        });
                        wrapper.appendChild(labelCheck);
                    }
                    checkboxGroup.appendChild(wrapper);
                }

                // نحتاج إلى إضافة checkboxGroup إلى group بدلاً من inputEl
                group.appendChild(checkboxGroup);
                break;

            case FIELD_TYPES.RADIO:
                const radioGroup = createElement('div', {
                    className: 'radio-group',
                });

                const currentRadioValue = value || defaultValue || '';
                options.forEach(opt => {
                    const wrapper = createElement('div', {
                        className: 'radio-option',
                        style: { display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' },
                    });
                    const radio = createElement('input', {
                        type: 'radio',
                        id: `${fieldId}-${opt.value}`,
                        className: `form-radio-input ${inputClass}`,
                        name: fieldKey,
                        value: opt.value,
                        checked: String(opt.value) === String(currentRadioValue),
                        disabled: disabled,
                        ...attributes,
                        onChange: (e) => {
                            this.setFieldValue(fieldKey, e.target.value, true);
                            if (this.validationMode === VALIDATION_EVENTS.CHANGE) {
                                this.validateField(fieldKey);
                            }
                        },
                        onBlur: (e) => {
                            if (this.validationMode === VALIDATION_EVENTS.BLUR) {
                                this.validateField(fieldKey);
                            }
                        },
                    });
                    wrapper.appendChild(radio);
                    const labelRadio = createElement('label', {
                        className: 'radio-label',
                        for: `${fieldId}-${opt.value}`,
                        textContent: opt.label || opt.text || opt.value,
                    });
                    wrapper.appendChild(labelRadio);
                    radioGroup.appendChild(wrapper);
                });

                group.appendChild(radioGroup);
                break;

            case FIELD_TYPES.FILE:
                inputEl = createElement('input', {
                    type: 'file',
                    id: fieldId,
                    className: `form-control ${inputClass}`,
                    disabled: disabled,
                    readonly: readonly,
                    accept: accept,
                    multiple: multiple,
                    ...attributes,
                    onChange: (e) => {
                        const files = multiple ? e.target.files : (e.target.files[0] || null);
                        this.setFieldValue(fieldKey, files, true);
                        if (this.validationMode === VALIDATION_EVENTS.CHANGE) {
                            this.validateField(fieldKey);
                        }
                    },
                    onBlur: (e) => {
                        if (this.validationMode === VALIDATION_EVENTS.BLUR) {
                            this.validateField(fieldKey);
                        }
                    },
                });
                break;

            case FIELD_TYPES.HIDDEN:
                inputEl = createElement('input', {
                    type: 'hidden',
                    id: fieldId,
                    className: `form-control ${inputClass}`,
                    value: value || defaultValue || '',
                    ...attributes,
                });
                group.style.display = 'none';
                break;

            case FIELD_TYPES.HTML:
                // محتوى HTML مخصص
                const htmlContent = createElement('div', {
                    className: `form-html ${inputClass}`,
                });
                if (typeof render === 'function') {
                    htmlContent.innerHTML = render(this.data);
                } else if (typeof label === 'string') {
                    htmlContent.innerHTML = label;
                }
                group.appendChild(htmlContent);
                break;

            case FIELD_TYPES.CUSTOM:
                if (typeof render === 'function') {
                    const customContent = render(this.data);
                    if (customContent) {
                        const wrapper = createElement('div', {
                            className: `form-custom ${inputClass}`,
                        });
                        if (typeof customContent === 'string') {
                            wrapper.innerHTML = customContent;
                        } else if (customContent instanceof HTMLElement) {
                            wrapper.appendChild(customContent);
                        } else {
                            wrapper.textContent = String(customContent);
                        }
                        group.appendChild(wrapper);
                    }
                }
                break;

            default:
                // text, number, email, password, tel, date, datetime, time, color, range
                inputEl = createElement('input', {
                    type: type,
                    id: fieldId,
                    className: `form-control ${inputClass}`,
                    placeholder: placeholder,
                    disabled: disabled,
                    readonly: readonly,
                    value: value || defaultValue || '',
                    min: min,
                    max: max,
                    step: step,
                    ...attributes,
                    onInput: (e) => {
                        let val = e.target.value;
                        if (type === 'number') {
                            val = parseFloat(val);
                            if (isNaN(val)) val = '';
                        }
                        this.setFieldValue(fieldKey, val, true);
                        if (this.validationMode === VALIDATION_EVENTS.INPUT) {
                            this.validateField(fieldKey);
                        }
                    },
                    onBlur: (e) => {
                        if (this.validationMode === VALIDATION_EVENTS.BLUR) {
                            this.validateField(fieldKey);
                        }
                    },
                    onFocus: (e) => {
                        this.clearFieldError(fieldKey);
                    },
                    onChange: (e) => {
                        if (this.validationMode === VALIDATION_EVENTS.CHANGE) {
                            this.validateField(fieldKey);
                        }
                    },
                });
                break;
        }

        // إضافة عنصر الإدخال إلى المجموعة (ما لم يكن قد تمت إضافته بالفعل)
        if (inputEl && type !== FIELD_TYPES.CHECKBOX && type !== FIELD_TYPES.RADIO &&
            type !== FIELD_TYPES.HTML && type !== FIELD_TYPES.CUSTOM) {
            group.appendChild(inputEl);
            // حفظ مرجع العنصر
            field.element = inputEl;
            this._fieldElements.push(inputEl);
        } else if (type === FIELD_TYPES.CHECKBOX || type === FIELD_TYPES.RADIO) {
            // تمت إضافته بالفعل
        } else if (type === FIELD_TYPES.HTML || type === FIELD_TYPES.CUSTOM) {
            // تمت إضافته بالفعل
        }

        // النص المساعد
        if (help && type !== FIELD_TYPES.HIDDEN) {
            const helpEl = createElement('div', {
                className: 'form-hint',
                textContent: help,
            });
            group.appendChild(helpEl);
        }

        return group;
    }

    /**
     * عرض أزرار الإجراءات
     */
    renderActions() {
        const actions = createElement('div', {
            className: 'form-actions',
            style: {
                display: 'flex',
                gap: 'var(--spacing-3)',
                marginTop: 'var(--spacing-5)',
                paddingTop: 'var(--spacing-4)',
                borderTop: '1px solid var(--border-color)',
                justifyContent: 'flex-end',
            },
        });

        // زر الإرسال
        const submitBtn = createElement('button', {
            type: 'submit',
            className: 'btn btn-primary',
            textContent: 'إرسال',
        });
        actions.appendChild(submitBtn);

        // زر إعادة التعيين
        const resetBtn = createElement('button', {
            type: 'button',
            className: 'btn btn-secondary',
            textContent: 'إعادة تعيين',
            onClick: () => this.reset(),
        });
        actions.appendChild(resetBtn);

        this.element.appendChild(actions);
    }

    // ============================================
    //  7.  دوال الحفظ التلقائي (AutoSave)
    // ============================================

    /**
     * تحميل البيانات المحفوظة تلقائياً
     */
    loadAutoSave() {
        if (!this.saveKey) return;
        try {
            const saved = localStorage.getItem(`form_autosave_${this.saveKey}`);
            if (saved) {
                const data = JSON.parse(saved);
                this.setData(data, false);
                this.isDirty = false;
            }
        } catch (e) {
            console.warn('Failed to load auto-save data:', e);
        }
    }

    /**
     * حفظ البيانات تلقائياً
     */
    saveAutoSave() {
        if (!this.saveKey || !this.isDirty) return;
        try {
            localStorage.setItem(`form_autosave_${this.saveKey}`, JSON.stringify(this.data));
        } catch (e) {
            console.warn('Failed to save auto-save data:', e);
        }
    }

    /**
     * مسح البيانات المحفوظة تلقائياً
     */
    clearAutoSave() {
        if (!this.saveKey) return;
        try {
            localStorage.removeItem(`form_autosave_${this.saveKey}`);
        } catch (e) {
            console.warn('Failed to clear auto-save data:', e);
        }
    }

    /**
     * معالج الحفظ التلقائي
     */
    handleAutoSave() {
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }
        this.autoSaveTimer = setTimeout(() => {
            this.saveAutoSave();
        }, this.autoSaveDelay);
    }

    // ============================================
    //  8.  دوال التنظيف والتدمير
    // ============================================

    /**
     * تدمير النموذج وإزالة العناصر
     */
    destroy() {
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
        if (this.element) {
            removeElement(this.element);
            this.element = null;
        }
        this.fieldsMap = {};
        this.errors = {};
        this._fieldElements = [];
        console.log('Form destroyed:', this.id);
        return this;
    }

    /**
     * تحديث النموذج (إعادة عرض)
     */
    refresh() {
        if (this.element) {
            // إعادة عرض الحقول
            const container = this.element.parentNode;
            if (container) {
                const newForm = this.render();
                if (newForm) {
                    container.replaceChild(newForm.element, this.element);
                    this.element = newForm.element;
                }
            }
        }
        return this;
    }

    /**
     * إضافة حقل جديد ديناميكياً
     */
    addField(field, index = null) {
        if (!field.key && !field.name) {
            console.error('Field must have a key or name');
            return this;
        }

        const fieldKey = field.key || field.name;
        if (this.fieldsMap[fieldKey]) {
            console.warn(`Field "${fieldKey}" already exists`);
            return this;
        }

        if (index !== null && index >= 0) {
            this.fields.splice(index, 0, field);
        } else {
            this.fields.push(field);
        }

        this.processFields();

        // إعادة عرض النموذج
        this.refresh();
        return this;
    }

    /**
     * إزالة حقل
     */
    removeField(key) {
        const index = this.fields.findIndex(f => (f.key || f.name) === key);
        if (index === -1) {
            console.warn(`Field "${key}" not found`);
            return this;
        }

        this.fields.splice(index, 1);
        delete this.fieldsMap[key];
        delete this.data[key];
        delete this.errors[key];

        this.refresh();
        return this;
    }

    // ============================================
    //  9.  دوال مساعدة للاستعلام
    // ============================================

    /**
     * الحصول على جميع الحقول
     */
    getFields() {
        return [...this.fields];
    }

    /**
     * الحصول على حقل معين
     */
    getField(key) {
        return this.fieldsMap[key] || null;
    }

    /**
     * التحقق من صحة النموذج (بدون عرض أخطاء)
     */
    isValid() {
        const oldErrors = { ...this.errors };
        const isValid = this.validateAll();
        // استعادة الأخطاء القديمة (نريد فقط التحقق)
        this.errors = oldErrors;
        return isValid;
    }
}

// ============================================
//  10.  دوال مساعدة لإنشاء النماذج
// ============================================

/**
 * إنشاء نموذج جديد
 */
export function createForm(options = {}) {
    return new Form(options);
}

/**
 * إنشاء نموذج من عنصر HTML موجود
 */
export function createFormFromHTML(container, options = {}) {
    const formEl = typeof container === 'string' ?
        document.querySelector(container) :
        container;

    if (!formEl || formEl.tagName !== 'FORM') {
        console.error('Invalid form element');
        return null;
    }

    // استخراج الحقول من HTML
    const fields = [];
    const inputs = formEl.querySelectorAll('input, select, textarea');

    inputs.forEach(input => {
        const field = {
            key: input.name || input.id,
            name: input.name || input.id,
            label: input.getAttribute('data-label') || input.id,
            type: input.type || 'text',
            placeholder: input.placeholder || '',
            required: input.hasAttribute('required'),
            disabled: input.disabled,
            readonly: input.readOnly,
            defaultValue: input.value,
            className: input.className,
        };

        if (input.tagName === 'SELECT') {
            field.type = 'select';
            field.options = [];
            input.querySelectorAll('option').forEach(opt => {
                if (opt.value) {
                    field.options.push({
                        value: opt.value,
                        label: opt.textContent,
                        selected: opt.selected,
                    });
                }
            });
        }

        if (input.type === 'checkbox') {
            field.type = 'checkbox';
            field.defaultValue = input.checked;
        }

        if (input.type === 'radio') {
            field.type = 'radio';
            const group = document.querySelectorAll(`input[name="${input.name}"]`);
            field.options = [];
            group.forEach(radio => {
                field.options.push({
                    value: radio.value,
                    label: radio.getAttribute('data-label') || radio.value,
                    selected: radio.checked,
                });
            });
        }

        fields.push(field);
    });

    return new Form({
        container: formEl.parentNode || container,
        fields,
        ...options,
    });
}

// ============================================
//  11.  API عام للمكون
// ============================================

export const form = {
    Form,
    create: createForm,
    fromHTML: createFormFromHTML,
    FIELD_TYPES,
    VALIDATION_EVENTS,
};

// تصدير افتراضي
export default form;

// ============================================
//  12.  نهاية الملف
// ============================================
