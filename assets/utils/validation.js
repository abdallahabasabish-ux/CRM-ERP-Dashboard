/**
 * ======================================================
 * الملف: utils/validation.js
 * الوصف: دوال التحقق من صحة البيانات (Validation)
 *         تشمل التحقق من البريد الإلكتروني، رقم الهاتف،
 *         المعرفات، النطاقات، التطابق، الحقول المطلوبة،
 *         وأنماط مخصصة باستخدام regex
 * الإصدار: 1.0.0
 * التاريخ: 2026-07-12
 * ======================================================
 */

// ============================================
//  1.  الثوابت والأنماط (Patterns)
// ============================================

export const PATTERNS = {
    // البريد الإلكتروني (يدعم الأحرف العربية والإنجليزية والأرقام والرموز المسموحة)
    EMAIL: /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/,

    // رقم الهاتف السعودي (05xxxxxxxx أو 5xxxxxxxx)
    SAUDI_PHONE: /^(05|5)[0-9]{8}$/,

    // رقم الهاتف الدولي (يبدأ بـ + متبوعاً بأرقام)
    INTERNATIONAL_PHONE: /^\+[0-9]{1,4}[0-9]{7,14}$/,

    // رقم الهاتف العام (أرقام فقط، من 7 إلى 15 رقم)
    GENERAL_PHONE: /^[0-9]{7,15}$/,

    // المعرف (UUID v4)
    UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,

    // المعرف القصير (أحرف وأرقام وشرطة، 8-32 حرف)
    SHORT_ID: /^[a-zA-Z0-9\-_]{8,32}$/,

    // الاسم (أحرف عربية أو إنجليزية، مسافات، نقط، شرطة)
    NAME: /^[\u0621-\u064A\u0660-\u0669a-zA-Z\s\-\.]{2,100}$/,

    // العنوان (نصوص عربية أو إنجليزية، أرقام، مسافات، علامات ترقيم)
    ADDRESS: /^[\u0621-\u064A\u0660-\u0669a-zA-Z0-9\s\-\.\,\#\/]{5,200}$/,

    // الرمز البريدي (أرقام، 5 أو 10 أرقام مع شرطة اختيارية)
    POSTAL_CODE: /^[0-9]{5}(-[0-9]{4})?$/,

    // المبلغ المالي (رقم موجب، مع أو بدون كسور)
    AMOUNT: /^[0-9]+(\.[0-9]{1,2})?$/,

    // نسبة مئوية (0-100 مع كسور اختيارية)
    PERCENTAGE: /^(100(\.0{1,2})?|[0-9]{1,2}(\.[0-9]{1,2})?)$/,

    // التاريخ بصيغة YYYY-MM-DD
    DATE_ISO: /^\d{4}-\d{2}-\d{2}$/,

    // التاريخ والوقت بصيغة ISO 8601
    DATETIME_ISO: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+\-]\d{2}:\d{2})?$/,

    // رقم الطلب (مزيج من أحرف وأرقام وشرطة)
    ORDER_NUMBER: /^[A-Z0-9\-]{6,20}$/,

    // رقم الفاتورة (مزيج من أحرف وأرقام وشرطة)
    INVOICE_NUMBER: /^[A-Z0-9\-]{6,20}$/,

    // الرابط (URL)
    URL: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i,
};

// ============================================
//  2.  دوال التحقق الأساسية
// ============================================

/**
 * التحقق من أن القيمة غير فارغة
 * @param {*} value - القيمة
 * @param {string} fieldName - اسم الحقل (للرسائل)
 * @returns {Object} { valid: boolean, message: string }
 */
export function required(value, fieldName = 'الحقل') {
    const isValid = value !== undefined && value !== null && value !== '';
    return {
        valid: isValid,
        message: isValid ? '' : `${fieldName} مطلوب`,
    };
}

/**
 * التحقق من أن القيمة نصية
 * @param {*} value - القيمة
 * @param {string} fieldName - اسم الحقل (للرسائل)
 * @returns {Object} { valid: boolean, message: string }
 */
export function isString(value, fieldName = 'القيمة') {
    const isValid = typeof value === 'string' || value instanceof String;
    return {
        valid: isValid,
        message: isValid ? '' : `${fieldName} يجب أن يكون نصاً`,
    };
}

/**
 * التحقق من أن القيمة رقم
 * @param {*} value - القيمة
 * @param {string} fieldName - اسم الحقل (للرسائل)
 * @returns {Object} { valid: boolean, message: string }
 */
export function isNumber(value, fieldName = 'القيمة') {
    const isValid = typeof value === 'number' && !isNaN(value);
    return {
        valid: isValid,
        message: isValid ? '' : `${fieldName} يجب أن يكون رقماً`,
    };
}

/**
 * التحقق من أن القيمة عدد صحيح
 * @param {*} value - القيمة
 * @param {string} fieldName - اسم الحقل (للرسائل)
 * @returns {Object} { valid: boolean, message: string }
 */
export function isInteger(value, fieldName = 'القيمة') {
    const isValid = Number.isInteger(value);
    return {
        valid: isValid,
        message: isValid ? '' : `${fieldName} يجب أن يكون عدداً صحيحاً`,
    };
}

/**
 * التحقق من أن القيمة منطقية
 * @param {*} value - القيمة
 * @param {string} fieldName - اسم الحقل (للرسائل)
 * @returns {Object} { valid: boolean, message: string }
 */
export function isBoolean(value, fieldName = 'القيمة') {
    const isValid = typeof value === 'boolean';
    return {
        valid: isValid,
        message: isValid ? '' : `${fieldName} يجب أن يكون صحيحاً أو خطأ`,
    };
}

/**
 * التحقق من أن القيمة مصفوفة
 * @param {*} value - القيمة
 * @param {string} fieldName - اسم الحقل (للرسائل)
 * @returns {Object} { valid: boolean, message: string }
 */
export function isArray(value, fieldName = 'القيمة') {
    const isValid = Array.isArray(value);
    return {
        valid: isValid,
        message: isValid ? '' : `${fieldName} يجب أن يكون مصفوفة`,
    };
}

/**
 * التحقق من أن القيمة كائن
 * @param {*} value - القيمة
 * @param {string} fieldName - اسم الحقل (للرسائل)
 * @returns {Object} { valid: boolean, message: string }
 */
export function isObject(value, fieldName = 'القيمة') {
    const isValid = value !== null && typeof value === 'object' && !Array.isArray(value);
    return {
        valid: isValid,
        message: isValid ? '' : `${fieldName} يجب أن يكون كائناً`,
    };
}

// ============================================
//  3.  دوال التحقق حسب النوع
// ============================================

/**
 * التحقق من صحة البريد الإلكتروني
 * @param {string} email - البريد الإلكتروني
 * @param {string} fieldName - اسم الحقل (للرسائل)
 * @returns {Object} { valid: boolean, message: string }
 */
export function isValidEmail(email, fieldName = 'البريد الإلكتروني') {
    const result = required(email, fieldName);
    if (!result.valid) return result;

    const isValid = PATTERNS.EMAIL.test(email);
    return {
        valid: isValid,
        message: isValid ? '' : `${fieldName} غير صحيح`,
    };
}

/**
 * التحقق من صحة رقم الهاتف السعودي
 * @param {string} phone - رقم الهاتف
 * @param {string} fieldName - اسم الحقل (للرسائل)
 * @returns {Object} { valid: boolean, message: string }
 */
export function isValidSaudiPhone(phone, fieldName = 'رقم الهاتف') {
    const result = required(phone, fieldName);
    if (!result.valid) return result;

    const isValid = PATTERNS.SAUDI_PHONE.test(phone);
    return {
        valid: isValid,
        message: isValid ? '' : `${fieldName} يجب أن يكون 05xxxxxxxx أو 5xxxxxxxx`,
    };
}

/**
 * التحقق من صحة رقم الهاتف الدولي
 * @param {string} phone - رقم الهاتف
 * @param {string} fieldName - اسم الحقل (للرسائل)
 * @returns {Object} { valid: boolean, message: string }
 */
export function isValidInternationalPhone(phone, fieldName = 'رقم الهاتف') {
    const result = required(phone, fieldName);
    if (!result.valid) return result;

    const isValid = PATTERNS.INTERNATIONAL_PHONE.test(phone);
    return {
        valid: isValid,
        message: isValid ? '' : `${fieldName} يجب أن يبدأ بـ + متبوعاً برقم صحيح`,
    };
}

/**
 * التحقق من صحة رقم الهاتف العام (أرقام فقط 7-15)
 * @param {string} phone - رقم الهاتف
 * @param {string} fieldName - اسم الحقل (للرسائل)
 * @returns {Object} { valid: boolean, message: string }
 */
export function isValidPhone(phone, fieldName = 'رقم الهاتف') {
    const result = required(phone, fieldName);
    if (!result.valid) return result;

    const isValid = PATTERNS.GENERAL_PHONE.test(phone);
    return {
        valid: isValid,
        message: isValid ? '' : `${fieldName} يجب أن يحتوي على 7-15 أرقام فقط`,
    };
}

/**
 * التحقق من صحة UUID
 * @param {string} id - المعرف
 * @param {string} fieldName - اسم الحقل (للرسائل)
 * @returns {Object} { valid: boolean, message: string }
 */
export function isValidUUID(id, fieldName = 'المعرف') {
    const result = required(id, fieldName);
    if (!result.valid) return result;

    const isValid = PATTERNS.UUID.test(id);
    return {
        valid: isValid,
        message: isValid ? '' : `${fieldName} غير صحيح`,
    };
}

/**
 * التحقق من صحة المعرف القصير
 * @param {string} id - المعرف
 * @param {string} fieldName - اسم الحقل (للرسائل)
 * @returns {Object} { valid: boolean, message: string }
 */
export function isValidShortId(id, fieldName = 'المعرف') {
    const result = required(id, fieldName);
    if (!result.valid) return result;

    const isValid = PATTERNS.SHORT_ID.test(id);
    return {
        valid: isValid,
        message: isValid ? '' : `${fieldName} يجب أن يكون 8-32 حرفاً (أحرف، أرقام، شرطة)`,
    };
}

/**
 * التحقق من صحة الاسم
 * @param {string} name - الاسم
 * @param {string} fieldName - اسم الحقل (للرسائل)
 * @returns {Object} { valid: boolean, message: string }
 */
export function isValidName(name, fieldName = 'الاسم') {
    const result = required(name, fieldName);
    if (!result.valid) return result;

    const isValid = PATTERNS.NAME.test(name);
    return {
        valid: isValid,
        message: isValid ? '' : `${fieldName} يجب أن يحتوي على 2-100 حرف (عربي/إنجليزي، مسافات، نقط، شرطة)`,
    };
}

/**
 * التحقق من صحة العنوان
 * @param {string} address - العنوان
 * @param {string} fieldName - اسم الحقل (للرسائل)
 * @returns {Object} { valid: boolean, message: string }
 */
export function isValidAddress(address, fieldName = 'العنوان') {
    const result = required(address, fieldName);
    if (!result.valid) return result;

    const isValid = PATTERNS.ADDRESS.test(address);
    return {
        valid: isValid,
        message: isValid ? '' : `${fieldName} يجب أن يحتوي على 5-200 حرف`,
    };
}

/**
 * التحقق من صحة الرمز البريدي
 * @param {string} code - الرمز البريدي
 * @param {string} fieldName - اسم الحقل (للرسائل)
 * @returns {Object} { valid: boolean, message: string }
 */
export function isValidPostalCode(code, fieldName = 'الرمز البريدي') {
    const result = required(code, fieldName);
    if (!result.valid) return result;

    const isValid = PATTERNS.POSTAL_CODE.test(code);
    return {
        valid: isValid,
        message: isValid ? '' : `${fieldName} يجب أن يكون 5 أرقام أو 5+4 أرقام`,
    };
}

/**
 * التحقق من صحة المبلغ المالي
 * @param {number|string} amount - المبلغ
 * @param {string} fieldName - اسم الحقل (للرسائل)
 * @returns {Object} { valid: boolean, message: string }
 */
export function isValidAmount(amount, fieldName = 'المبلغ') {
    const result = required(amount, fieldName);
    if (!result.valid) return result;

    const strAmount = String(amount).trim();
    const isValid = PATTERNS.AMOUNT.test(strAmount) && parseFloat(strAmount) >= 0;
    return {
        valid: isValid,
        message: isValid ? '' : `${fieldName} يجب أن يكون رقماً موجباً مع كسور اختيارية (حد أقصى منزلتين)`,
    };
}

/**
 * التحقق من صحة النسبة المئوية (0-100)
 * @param {number|string} value - النسبة
 * @param {string} fieldName - اسم الحقل (للرسائل)
 * @returns {Object} { valid: boolean, message: string }
 */
export function isValidPercentage(value, fieldName = 'النسبة المئوية') {
    const result = required(value, fieldName);
    if (!result.valid) return result;

    const strValue = String(value).trim();
    const isValid = PATTERNS.PERCENTAGE.test(strValue);
    return {
        valid: isValid,
        message: isValid ? '' : `${fieldName} يجب أن تكون بين 0 و 100`,
    };
}

/**
 * التحقق من صحة التاريخ (YYYY-MM-DD)
 * @param {string} date - التاريخ
 * @param {string} fieldName - اسم الحقل (للرسائل)
 * @returns {Object} { valid: boolean, message: string }
 */
export function isValidDate(date, fieldName = 'التاريخ') {
    const result = required(date, fieldName);
    if (!result.valid) return result;

    if (!PATTERNS.DATE_ISO.test(date)) {
        return { valid: false, message: `${fieldName} يجب أن يكون بصيغة YYYY-MM-DD` };
    }

    const parts = date.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    const dateObj = new Date(year, month - 1, day);
    if (dateObj.getFullYear() !== year || dateObj.getMonth() !== month - 1 || dateObj.getDate() !== day) {
        return { valid: false, message: `${fieldName} غير صحيح` };
    }

    return { valid: true, message: '' };
}

/**
 * التحقق من صحة التاريخ والوقت (ISO 8601)
 * @param {string} datetime - التاريخ والوقت
 * @param {string} fieldName - اسم الحقل (للرسائل)
 * @returns {Object} { valid: boolean, message: string }
 */
export function isValidDateTime(datetime, fieldName = 'التاريخ والوقت') {
    const result = required(datetime, fieldName);
    if (!result.valid) return result;

    if (!PATTERNS.DATETIME_ISO.test(datetime)) {
        return { valid: false, message: `${fieldName} يجب أن يكون بصيغة ISO 8601` };
    }

    const dateObj = new Date(datetime);
    if (isNaN(dateObj.getTime())) {
        return { valid: false, message: `${fieldName} غير صحيح` };
    }

    return { valid: true, message: '' };
}

/**
 * التحقق من صحة رقم الطلب
 * @param {string} orderNumber - رقم الطلب
 * @param {string} fieldName - اسم الحقل (للرسائل)
 * @returns {Object} { valid: boolean, message: string }
 */
export function isValidOrderNumber(orderNumber, fieldName = 'رقم الطلب') {
    const result = required(orderNumber, fieldName);
    if (!result.valid) return result;

    const isValid = PATTERNS.ORDER_NUMBER.test(orderNumber);
    return {
        valid: isValid,
        message: isValid ? '' : `${fieldName} يجب أن يحتوي على 6-20 حرف (أحرف كبيرة، أرقام، شرطة)`,
    };
}

/**
 * التحقق من صحة رقم الفاتورة
 * @param {string} invoiceNumber - رقم الفاتورة
 * @param {string} fieldName - اسم الحقل (للرسائل)
 * @returns {Object} { valid: boolean, message: string }
 */
export function isValidInvoiceNumber(invoiceNumber, fieldName = 'رقم الفاتورة') {
    const result = required(invoiceNumber, fieldName);
    if (!result.valid) return result;

    const isValid = PATTERNS.INVOICE_NUMBER.test(invoiceNumber);
    return {
        valid: isValid,
        message: isValid ? '' : `${fieldName} يجب أن يحتوي على 6-20 حرف (أحرف كبيرة، أرقام، شرطة)`,
    };
}

/**
 * التحقق من صحة الرابط (URL)
 * @param {string} url - الرابط
 * @param {string} fieldName - اسم الحقل (للرسائل)
 * @returns {Object} { valid: boolean, message: string }
 */
export function isValidUrl(url, fieldName = 'الرابط') {
    const result = required(url, fieldName);
    if (!result.valid) return result;

    const isValid = PATTERNS.URL.test(url);
    return {
        valid: isValid,
        message: isValid ? '' : `${fieldName} غير صحيح`,
    };
}

// ============================================
//  4.  دوال التحقق من النطاق والطول
// ============================================

/**
 * التحقق من أن القيمة في نطاق معين (للأرقام)
 * @param {number} value - القيمة
 * @param {number} min - الحد الأدنى
 * @param {number} max - الحد الأقصى
 * @param {string} fieldName - اسم الحقل (للرسائل)
 * @returns {Object} { valid: boolean, message: string }
 */
export function isInRange(value, min, max, fieldName = 'القيمة') {
    const result = isNumber(value, fieldName);
    if (!result.valid) return result;

    const isValid = value >= min && value <= max;
    return {
        valid: isValid,
        message: isValid ? '' : `${fieldName} يجب أن يكون بين ${min} و ${max}`,
    };
}

/**
 * التحقق من أن طول النص في نطاق معين
 * @param {string} value - النص
 * @param {number} min - الحد الأدنى للطول
 * @param {number} max - الحد الأقصى للطول
 * @param {string} fieldName - اسم الحقل (للرسائل)
 * @returns {Object} { valid: boolean, message: string }
 */
export function isLengthInRange(value, min, max, fieldName = 'القيمة') {
    const result = required(value, fieldName);
    if (!result.valid) return result;

    const str = String(value);
    const isValid = str.length >= min && str.length <= max;
    return {
        valid: isValid,
        message: isValid ? '' : `${fieldName} يجب أن يكون طوله بين ${min} و ${max} حرفاً`,
    };
}

/**
 * التحقق من أن طول النص يساوي قيمة محددة
 * @param {string} value - النص
 * @param {number} length - الطول المطلوب
 * @param {string} fieldName - اسم الحقل (للرسائل)
 * @returns {Object} { valid: boolean, message: string }
 */
export function isExactLength(value, length, fieldName = 'القيمة') {
    const result = required(value, fieldName);
    if (!result.valid) return result;

    const str = String(value);
    const isValid = str.length === length;
    return {
        valid: isValid,
        message: isValid ? '' : `${fieldName} يجب أن يكون طوله ${length} حرفاً بالضبط`,
    };
}

/**
 * التحقق من أن النص لا يحتوي على مسافات
 * @param {string} value - النص
 * @param {string} fieldName - اسم الحقل (للرسائل)
 * @returns {Object} { valid: boolean, message: string }
 */
export function hasNoSpaces(value, fieldName = 'القيمة') {
    const result = required(value, fieldName);
    if (!result.valid) return result;

    const str = String(value);
    const isValid = !str.includes(' ');
    return {
        valid: isValid,
        message: isValid ? '' : `${fieldName} يجب ألا يحتوي على مسافات`,
    };
}

// ============================================
//  5.  دوال التحقق من التطابق
// ============================================

/**
 * التحقق من أن قيمتين متطابقتين
 * @param {*} value1 - القيمة الأولى
 * @param {*} value2 - القيمة الثانية
 * @param {string} fieldName1 - اسم الحقل الأول (للرسائل)
 * @param {string} fieldName2 - اسم الحقل الثاني (للرسائل)
 * @returns {Object} { valid: boolean, message: string }
 */
export function matches(value1, value2, fieldName1 = 'القيمة الأولى', fieldName2 = 'القيمة الثانية') {
    const isValid = value1 === value2;
    return {
        valid: isValid,
        message: isValid ? '' : `${fieldName1} و ${fieldName2} غير متطابقين`,
    };
}

/**
 * التحقق من تطابق كلمة المرور وتأكيدها
 * @param {string} password - كلمة المرور
 * @param {string} confirmPassword - تأكيد كلمة المرور
 * @param {string} fieldName - اسم الحقل (للرسائل)
 * @returns {Object} { valid: boolean, message: string }
 */
export function passwordsMatch(password, confirmPassword, fieldName = 'كلمة المرور') {
    const result = required(password, fieldName);
    if (!result.valid) return result;

    const result2 = required(confirmPassword, `تأكيد ${fieldName}`);
    if (!result2.valid) return result2;

    const isValid = password === confirmPassword;
    return {
        valid: isValid,
        message: isValid ? '' : `${fieldName} وتأكيدها غير متطابقين`,
    };
}

// ============================================
//  6.  دوال التحقق من القوائم والمجموعات
// ============================================

/**
 * التحقق من أن القيمة موجودة في قائمة مسموحة
 * @param {*} value - القيمة
 * @param {Array} allowedValues - القائمة المسموحة
 * @param {string} fieldName - اسم الحقل (للرسائل)
 * @returns {Object} { valid: boolean, message: string }
 */
export function isInList(value, allowedValues, fieldName = 'القيمة') {
    const result = required(value, fieldName);
    if (!result.valid) return result;

    const isValid = allowedValues.includes(value);
    return {
        valid: isValid,
        message: isValid ? '' : `${fieldName} غير مسموح به`,
    };
}

/**
 * التحقق من أن القيمة فريدة في مصفوفة (لا توجد مكررات)
 * @param {Array} array - المصفوفة
 * @param {string} fieldName - اسم الحقل (للرسائل)
 * @returns {Object} { valid: boolean, message: string }
 */
export function isUniqueArray(array, fieldName = 'القائمة') {
    const result = isArray(array, fieldName);
    if (!result.valid) return result;

    const unique = new Set(array);
    const isValid = unique.size === array.length;
    return {
        valid: isValid,
        message: isValid ? '' : `${fieldName} تحتوي على قيم مكررة`,
    };
}

// ============================================
//  7.  دوال التحقق المركبة (Composite)
// ============================================

/**
 * التحقق من صحة كائن كامل باستخدام قائمة من القواعد
 * @param {Object} data - الكائن المراد التحقق منه
 * @param {Object} rules - قواعد التحقق (مفتاح: اسم الحقل، قيمة: دالة تحقق)
 * @returns {Object} { valid: boolean, errors: Object }
 */
export function validateObject(data, rules) {
    const errors = {};
    let valid = true;

    Object.keys(rules).forEach(field => {
        const rule = rules[field];
        const value = data[field];
        let result;

        if (typeof rule === 'function') {
            result = rule(value);
        } else if (Array.isArray(rule)) {
            // تطبيق عدة قواعد على التوالي
            for (const r of rule) {
                result = r(value);
                if (!result.valid) break;
            }
        } else {
            result = { valid: true, message: '' };
        }

        if (!result.valid) {
            errors[field] = result.message;
            valid = false;
        }
    });

    return { valid, errors };
}

/**
 * التحقق من صحة كائن باستخدام مخطط (Schema) محدد
 * @param {Object} data - الكائن المراد التحقق منه
 * @param {Object} schema - مخطط التحقق (مفتاح: اسم الحقل، قيمة: كائن يحتوي على type, required, rules)
 * @returns {Object} { valid: boolean, errors: Object }
 */
export function validateSchema(data, schema) {
    const errors = {};
    let valid = true;

    Object.keys(schema).forEach(field => {
        const fieldSchema = schema[field];
        const value = data[field];
        const { type, required: isRequired, rules = [] } = fieldSchema;

        // التحقق من required
        if (isRequired) {
            const reqResult = required(value, field);
            if (!reqResult.valid) {
                errors[field] = reqResult.message;
                valid = false;
                return;
            }
        }

        // إذا كانت القيمة غير موجودة وغير مطلوبة، نتجاوز
        if (!isRequired && (value === undefined || value === null || value === '')) {
            return;
        }

        // التحقق من النوع
        let typeResult;
        switch (type) {
            case 'string':
                typeResult = isString(value, field);
                break;
            case 'number':
                typeResult = isNumber(value, field);
                break;
            case 'integer':
                typeResult = isInteger(value, field);
                break;
            case 'boolean':
                typeResult = isBoolean(value, field);
                break;
            case 'array':
                typeResult = isArray(value, field);
                break;
            case 'object':
                typeResult = isObject(value, field);
                break;
            default:
                typeResult = { valid: true, message: '' };
        }

        if (!typeResult.valid) {
            errors[field] = typeResult.message;
            valid = false;
            return;
        }

        // تطبيق القواعد الإضافية
        for (const rule of rules) {
            let ruleResult;
            if (typeof rule === 'function') {
                ruleResult = rule(value);
            } else {
                ruleResult = { valid: true, message: '' };
            }
            if (!ruleResult.valid) {
                errors[field] = ruleResult.message;
                valid = false;
                return;
            }
        }
    });

    return { valid, errors };
}

// ============================================
//  8.  دوال مساعدة للتحقق السريع
// ============================================

/**
 * التحقق من أن القيمة ليست فارغة وإرجاع رسالة خطأ مخصصة
 * @param {*} value - القيمة
 * @param {string} message - رسالة الخطأ المخصصة
 * @returns {Object} { valid: boolean, message: string }
 */
export function requiredWithMessage(value, message) {
    const isValid = value !== undefined && value !== null && value !== '';
    return {
        valid: isValid,
        message: isValid ? '' : message,
    };
}

/**
 * التحقق من تطابق نمط regex
 * @param {string} value - النص
 * @param {RegExp} pattern - النمط
 * @param {string} message - رسالة الخطأ
 * @returns {Object} { valid: boolean, message: string }
 */
export function matchesPattern(value, pattern, message = 'القيمة غير صحيحة') {
    const result = required(value);
    if (!result.valid) return result;

    const isValid = pattern.test(value);
    return {
        valid: isValid,
        message: isValid ? '' : message,
    };
}

/**
 * دالة تجميع للتحقق من عدة شروط
 * @param {Array<Function>} validators - قائمة دوال التحقق
 * @param {*} value - القيمة
 * @returns {Object} { valid: boolean, message: string }
 */
export function composeValidators(validators, value) {
    for (const validator of validators) {
        const result = validator(value);
        if (!result.valid) {
            return result;
        }
    }
    return { valid: true, message: '' };
}

// ============================================
//  9.  تصدير جميع الدوال
// ============================================

export const validation = {
    // الأنماط
    PATTERNS,

    // أساسيات
    required,
    isString,
    isNumber,
    isInteger,
    isBoolean,
    isArray,
    isObject,

    // حسب النوع
    isValidEmail,
    isValidSaudiPhone,
    isValidInternationalPhone,
    isValidPhone,
    isValidUUID,
    isValidShortId,
    isValidName,
    isValidAddress,
    isValidPostalCode,
    isValidAmount,
    isValidPercentage,
    isValidDate,
    isValidDateTime,
    isValidOrderNumber,
    isValidInvoiceNumber,
    isValidUrl,

    // النطاق والطول
    isInRange,
    isLengthInRange,
    isExactLength,
    hasNoSpaces,

    // التطابق
    matches,
    passwordsMatch,

    // القوائم والمجموعات
    isInList,
    isUniqueArray,

    // مركبة
    validateObject,
    validateSchema,

    // مساعدة
    requiredWithMessage,
    matchesPattern,
    composeValidators,
};

// تصدير validation كافتراضي
export default validation;

// ============================================
//  10. نهاية الملف
// ============================================
