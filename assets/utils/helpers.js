/**
 * ======================================================
 * الملف: utils/helpers.js
 * الوصف: دوال مساعدة عامة (Helper Functions)
 *         تشمل معالجة النصوص، التواريخ، الأرقام،
 *         المصفوفات، الكائنات، المعرفات، التنسيق،
 *         التحويل، والعمل مع DOM
 * الإصدار: 1.0.0
 * التاريخ: 2026-07-12
 * ======================================================
 */

// ============================================
//  1.  المعرفات (IDs)
// ============================================

/**
 * توليد معرف فريد (UUID v4)
 * @returns {string} UUID v4
 */
export function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * توليد معرف قصير (8-12 حرفاً عشوائياً)
 * @param {number} length - طول المعرف (افتراضي: 10)
 * @returns {string} معرف قصير
 */
export function generateShortId(length = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * توليد رقم عشوائي في نطاق معين
 * @param {number} min - الحد الأدنى
 * @param {number} max - الحد الأقصى
 * @returns {number} رقم عشوائي
 */
export function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * توليد رمز QR كاذب (للتجربة)
 * @param {string} data - البيانات المراد ترميزها
 * @returns {string} نص رمز QR (سيناريو مؤقت)
 */
export function generateQRCode(data) {
    // في التطبيق الفعلي، سيتم استخدام مكتبة مثل QRCode.js
    // هنا نعيد نصاً بسيطاً للتجربة
    return `QR:${data}`;
}

// ============================================
//  2.  التواريخ والأوقات
// ============================================

/**
 * تنسيق التاريخ إلى صيغة YYYY-MM-DD
 * @param {Date|string} date - التاريخ
 * @returns {string} التاريخ بصيغة YYYY-MM-DD
 */
export function formatDate(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * تنسيق التاريخ والوقت إلى صيغة ISO 8601
 * @param {Date|string} date - التاريخ
 * @returns {string} التاريخ والوقت بصيغة ISO
 */
export function formatDateTime(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString();
}

/**
 * تنسيق التاريخ والوقت إلى صيغة محلية (حسب إعدادات المستخدم)
 * @param {Date|string} date - التاريخ
 * @param {Object} options - خيارات التنسيق
 * @returns {string} التاريخ والوقت بصيغة محلية
 */
export function formatLocaleDateTime(date, options = {}) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    };
    return d.toLocaleString('ar-SA', { ...defaultOptions, ...options });
}

/**
 * تنسيق التاريخ فقط بصيغة محلية
 * @param {Date|string} date - التاريخ
 * @param {Object} options - خيارات التنسيق
 * @returns {string} التاريخ بصيغة محلية
 */
export function formatLocaleDate(date, options = {}) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    };
    return d.toLocaleDateString('ar-SA', { ...defaultOptions, ...options });
}

/**
 * تنسيق الوقت فقط بصيغة محلية
 * @param {Date|string} date - التاريخ
 * @param {Object} options - خيارات التنسيق
 * @returns {string} الوقت بصيغة محلية
 */
export function formatLocaleTime(date, options = {}) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const defaultOptions = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    };
    return d.toLocaleTimeString('ar-SA', { ...defaultOptions, ...options });
}

/**
 * الحصول على الفرق بين تاريخين بالأيام
 * @param {Date|string} date1 - التاريخ الأول
 * @param {Date|string} date2 - التاريخ الثاني (اختياري، افتراضي: الآن)
 * @returns {number} عدد الأيام
 */
export function daysDiff(date1, date2 = new Date()) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
    const diffTime = d2.getTime() - d1.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * إضافة أيام إلى تاريخ
 * @param {Date|string} date - التاريخ
 * @param {number} days - عدد الأيام
 * @returns {Date} التاريخ الجديد
 */
export function addDays(date, days) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return new Date();
    d.setDate(d.getDate() + days);
    return d;
}

/**
 * إضافة أشهر إلى تاريخ
 * @param {Date|string} date - التاريخ
 * @param {number} months - عدد الأشهر
 * @returns {Date} التاريخ الجديد
 */
export function addMonths(date, months) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return new Date();
    d.setMonth(d.getMonth() + months);
    return d;
}

/**
 * الحصول على بداية اليوم (الساعة 00:00:00)
 * @param {Date|string} date - التاريخ
 * @returns {Date} بداية اليوم
 */
export function startOfDay(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * الحصول على نهاية اليوم (الساعة 23:59:59.999)
 * @param {Date|string} date - التاريخ
 * @returns {Date} نهاية اليوم
 */
export function endOfDay(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return new Date();
    d.setHours(23, 59, 59, 999);
    return d;
}

/**
 * التحقق من أن التاريخ في الماضي
 * @param {Date|string} date - التاريخ
 * @returns {boolean} true إذا كان في الماضي
 */
export function isPastDate(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return false;
    return d.getTime() < Date.now();
}

/**
 * التحقق من أن التاريخ في المستقبل
 * @param {Date|string} date - التاريخ
 * @returns {boolean} true إذا كان في المستقبل
 */
export function isFutureDate(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return false;
    return d.getTime() > Date.now();
}

/**
 * التحقق من أن التاريخ اليوم
 * @param {Date|string} date - التاريخ
 * @returns {boolean} true إذا كان اليوم
 */
export function isToday(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return false;
    const today = new Date();
    return d.getFullYear() === today.getFullYear() &&
           d.getMonth() === today.getMonth() &&
           d.getDate() === today.getDate();
}

// ============================================
//  3.  الأرقام والعملات
// ============================================

/**
 * تنسيق رقم كعملة (ريال سعودي)
 * @param {number} amount - المبلغ
 * @param {string} currency - رمز العملة (افتراضي: ر.س)
 * @returns {string} المبلغ المنسق
 */
export function formatCurrency(amount, currency = 'ر.س') {
    if (amount === undefined || amount === null || isNaN(amount)) {
        return `0.00 ${currency}`;
    }
    const formatted = Number(amount).toLocaleString('ar-SA', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    return `${formatted} ${currency}`;
}

/**
 * تنسيق رقم مع فواصل الآلاف
 * @param {number} number - الرقم
 * @param {number} decimals - عدد المنازل العشرية (افتراضي: 0)
 * @returns {string} الرقم المنسق
 */
export function formatNumber(number, decimals = 0) {
    if (number === undefined || number === null || isNaN(number)) {
        return '0';
    }
    return Number(number).toLocaleString('ar-SA', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

/**
 * تقريب رقم إلى منزلة عشرية محددة
 * @param {number} number - الرقم
 * @param {number} decimals - عدد المنازل العشرية
 * @returns {number} الرقم المقرب
 */
export function roundNumber(number, decimals = 2) {
    if (number === undefined || number === null || isNaN(number)) {
        return 0;
    }
    const factor = Math.pow(10, decimals);
    return Math.round(number * factor) / factor;
}

/**
 * حساب النسبة المئوية
 * @param {number} value - القيمة
 * @param {number} total - الإجمالي
 * @param {number} decimals - عدد المنازل العشرية
 * @returns {number} النسبة المئوية
 */
export function percentage(value, total, decimals = 2) {
    if (total === 0) return 0;
    return roundNumber((value / total) * 100, decimals);
}

/**
 * إضافة علامة زائد أو ناقص للرقم
 * @param {number} number - الرقم
 * @returns {string} الرقم مع الإشارة
 */
export function formatChange(number) {
    if (number === undefined || number === null || isNaN(number)) {
        return '0';
    }
    if (number > 0) {
        return `+${formatNumber(number)}`;
    }
    if (number < 0) {
        return `-${formatNumber(Math.abs(number))}`;
    }
    return '0';
}

/**
 * تحويل الأرقام العربية إلى إنجليزية (والعكس)
 * @param {string} text - النص
 * @param {string} direction - 'arToEn' أو 'enToAr'
 * @returns {string} النص المحول
 */
export function convertArabicNumbers(text, direction = 'arToEn') {
    const arDigits = '٠١٢٣٤٥٦٧٨٩';
    const enDigits = '0123456789';

    if (direction === 'arToEn') {
        return text.replace(/[٠-٩]/g, (char) => {
            return enDigits[arDigits.indexOf(char)];
        });
    } else {
        return text.replace(/[0-9]/g, (char) => {
            return arDigits[enDigits.indexOf(char)];
        });
    }
}

// ============================================
//  4.  النصوص والسلاسل
// ============================================

/**
 * اقتطاع النص مع إضافة ثلاث نقاط
 * @param {string} text - النص
 * @param {number} maxLength - الحد الأقصى للطول
 * @param {string} suffix - اللاحقة (افتراضي: ...)
 * @returns {string} النص المقتطع
 */
export function truncateText(text, maxLength = 100, suffix = '...') {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * تحويل النص إلى عنوان URL صديق (Slug)
 * @param {string} text - النص
 * @returns {string} النص كـ Slug
 */
export function slugify(text) {
    if (!text) return '';
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

/**
 * تحويل النص إلى حالة العنوان (Title Case)
 * @param {string} text - النص
 * @returns {string} النص بحالة العنوان
 */
export function titleCase(text) {
    if (!text) return '';
    return text
        .toString()
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * تحويل النص إلى أحرف كبيرة في بداية كل كلمة (للغة العربية)
 * @param {string} text - النص
 * @returns {string} النص المحول
 */
export function properCase(text) {
    if (!text) return '';
    return text
        .toString()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * إزالة التشكيل من النص العربي
 * @param {string} text - النص
 * @returns {string} النص بدون تشكيل
 */
export function removeDiacritics(text) {
    if (!text) return '';
    return text.replace(/[\u064B-\u065F\u0670]/g, '');
}

/**
 * الحصول على الأحرف الأولى من النص (اختصار)
 * @param {string} text - النص
 * @param {number} count - عدد الأحرف (افتراضي: 2)
 * @returns {string} الأحرف الأولى
 */
export function getInitials(text, count = 2) {
    if (!text) return '';
    const words = text.toString().trim().split(/\s+/);
    let initials = '';
    for (let i = 0; i < Math.min(words.length, count); i++) {
        initials += words[i].charAt(0);
    }
    return initials.toUpperCase();
}

/**
 * عكس النص
 * @param {string} text - النص
 * @returns {string} النص المعكوس
 */
export function reverseText(text) {
    if (!text) return '';
    return text.split('').reverse().join('');
}

/**
 * التحقق من أن النص يحتوي على كلمة أو عبارة معينة (غير حساس لحالة الأحرف)
 * @param {string} text - النص
 * @param {string} search - الكلمة المطلوبة
 * @returns {boolean} true إذا كانت موجودة
 */
export function containsText(text, search) {
    if (!text || !search) return false;
    return text.toString().toLowerCase().includes(search.toString().toLowerCase());
}

/**
 * إزالة علامات HTML من النص
 * @param {string} html - النص المحتوي على HTML
 * @returns {string} النص النظيف
 */
export function stripHtml(html) {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
}

/**
 * ترميز النص لاستخدامه في HTML (منع XSS)
 * @param {string} text - النص
 * @returns {string} النص المرمز
 */
export function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

/**
 * فك ترميز النص من HTML
 * @param {string} html - النص المرمز
 * @returns {string} النص المفكوك
 */
export function unescapeHtml(html) {
    if (!html) return '';
    const map = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#039;': "'",
    };
    return html.replace(/&amp;|&lt;|&gt;|&quot;|&#039;/g, function(m) { return map[m]; });
}

// ============================================
//  5.  المصفوفات
// ============================================

/**
 * إزالة العناصر المكررة من المصفوفة
 * @param {Array} array - المصفوفة
 * @returns {Array} مصفوفة بدون مكررات
 */
export function uniqueArray(array) {
    if (!Array.isArray(array)) return [];
    return [...new Set(array)];
}

/**
 * خلط عناصر المصفوفة عشوائياً
 * @param {Array} array - المصفوفة
 * @returns {Array} مصفوفة مخلوطة
 */
export function shuffleArray(array) {
    if (!Array.isArray(array)) return [];
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * تقسيم المصفوفة إلى أجزاء (Chunks)
 * @param {Array} array - المصفوفة
 * @param {number} size - حجم الجزء
 * @returns {Array[]} مصفوفة من الأجزاء
 */
export function chunkArray(array, size) {
    if (!Array.isArray(array) || size < 1) return [];
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

/**
 * تجميع عناصر المصفوفة حسب مفتاح معين
 * @param {Array} array - المصفوفة
 * @param {string|Function} key - المفتاح أو دالة التجميع
 * @returns {Object} كائن مجمع
 */
export function groupBy(array, key) {
    if (!Array.isArray(array)) return {};
    return array.reduce((result, item) => {
        const groupKey = typeof key === 'function' ? key(item) : item[key];
        if (!result[groupKey]) {
            result[groupKey] = [];
        }
        result[groupKey].push(item);
        return result;
    }, {});
}

/**
 * فرز المصفوفة حسب مفتاح معين
 * @param {Array} array - المصفوفة
 * @param {string} key - المفتاح
 * @param {string} order - 'asc' أو 'desc'
 * @returns {Array} مصفوفة مرتبة
 */
export function sortByKey(array, key, order = 'asc') {
    if (!Array.isArray(array)) return [];
    return [...array].sort((a, b) => {
        let valA = a[key];
        let valB = b[key];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return order === 'asc' ? -1 : 1;
        if (valA > valB) return order === 'asc' ? 1 : -1;
        return 0;
    });
}

/**
 * البحث في المصفوفة باستخدام دالة مقارنة (غير حساسة لحالة الأحرف للنصوص)
 * @param {Array} array - المصفوفة
 * @param {string|Function} searchTerm - مصطلح البحث
 * @param {string|string[]} keys - المفاتيح للبحث فيها (إذا كانت مصفوفة من كائنات)
 * @returns {Array} النتائج
 */
export function searchInArray(array, searchTerm, keys = null) {
    if (!Array.isArray(array) || !searchTerm) return array;
    const term = searchTerm.toString().toLowerCase();

    return array.filter(item => {
        if (typeof item === 'string') {
            return item.toLowerCase().includes(term);
        }
        if (typeof item === 'object' && item !== null && keys) {
            const searchKeys = Array.isArray(keys) ? keys : [keys];
            return searchKeys.some(key => {
                const value = item[key];
                if (!value) return false;
                return value.toString().toLowerCase().includes(term);
            });
        }
        return false;
    });
}

/**
 * الحصول على العنصر الأخير في المصفوفة
 * @param {Array} array - المصفوفة
 * @returns {*} العنصر الأخير أو null
 */
export function lastItem(array) {
    if (!Array.isArray(array) || array.length === 0) return null;
    return array[array.length - 1];
}

/**
 * الحصول على العنصر الأول في المصفوفة
 * @param {Array} array - المصفوفة
 * @returns {*} العنصر الأول أو null
 */
export function firstItem(array) {
    if (!Array.isArray(array) || array.length === 0) return null;
    return array[0];
}

// ============================================
//  6.  الكائنات
// ============================================

/**
 * نسخ كائن (Deep Clone)
 * @param {Object} obj - الكائن
 * @returns {Object} نسخة عميقة
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (Array.isArray(obj)) {
        return obj.map(item => deepClone(item));
    }
    const cloned = {};
    Object.keys(obj).forEach(key => {
        cloned[key] = deepClone(obj[key]);
    });
    return cloned;
}

/**
 * دمج كائنين (Deep Merge)
 * @param {Object} target - الكائن الهدف
 * @param {Object} source - الكائن المصدر
 * @returns {Object} الكائن المدمج
 */
export function deepMerge(target, source) {
    if (!source) return target;
    const result = { ...target };
    Object.keys(source).forEach(key => {
        const sourceVal = source[key];
        const targetVal = target[key];
        if (sourceVal && typeof sourceVal === 'object' && !Array.isArray(sourceVal)) {
            result[key] = deepMerge(targetVal || {}, sourceVal);
        } else if (Array.isArray(sourceVal)) {
            result[key] = [...sourceVal];
        } else {
            result[key] = sourceVal;
        }
    });
    return result;
}

/**
 * حذف المفاتيح التي تكون قيمتها فارغة (null, undefined, '')
 * @param {Object} obj - الكائن
 * @returns {Object} كائن بدون قيم فارغة
 */
export function cleanObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const result = {};
    Object.keys(obj).forEach(key => {
        const value = obj[key];
        if (value !== undefined && value !== null && value !== '') {
            if (typeof value === 'object' && !Array.isArray(value)) {
                const cleaned = cleanObject(value);
                if (Object.keys(cleaned).length > 0) {
                    result[key] = cleaned;
                }
            } else {
                result[key] = value;
            }
        }
    });
    return result;
}

/**
 * الحصول على قيمة من كائن باستخدام مسار (Dot Notation)
 * @param {Object} obj - الكائن
 * @param {string} path - المسار (مثل: 'user.address.city')
 * @param {*} defaultValue - القيمة الافتراضية
 * @returns {*} القيمة
 */
export function getValueByPath(obj, path, defaultValue = null) {
    if (!obj || !path) return defaultValue;
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
        if (current === undefined || current === null || typeof current !== 'object') {
            return defaultValue;
        }
        current = current[key];
    }
    return current !== undefined ? current : defaultValue;
}

/**
 * تعيين قيمة في كائن باستخدام مسار (Dot Notation)
 * @param {Object} obj - الكائن
 * @param {string} path - المسار
 * @param {*} value - القيمة
 * @returns {Object} الكائن المعدل
 */
export function setValueByPath(obj, path, value) {
    if (!obj || !path) return obj;
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!current[key] || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }
    current[keys[keys.length - 1]] = value;
    return obj;
}

/**
 * استخراج المفاتيح المحددة من كائن
 * @param {Object} obj - الكائن
 * @param {string[]} keys - المفاتيح
 * @returns {Object} كائن جزئي
 */
export function pickKeys(obj, keys) {
    if (!obj || !Array.isArray(keys)) return {};
    const result = {};
    keys.forEach(key => {
        if (obj.hasOwnProperty(key)) {
            result[key] = obj[key];
        }
    });
    return result;
}

/**
 * استبعاد المفاتيح المحددة من كائن
 * @param {Object} obj - الكائن
 * @param {string[]} keys - المفاتيح المستبعدة
 * @returns {Object} كائن بدون المفاتيح المستبعدة
 */
export function omitKeys(obj, keys) {
    if (!obj || !Array.isArray(keys)) return { ...obj };
    const result = { ...obj };
    keys.forEach(key => {
        delete result[key];
    });
    return result;
}

// ============================================
//  7.  العمل مع DOM
// ============================================

/**
 * إنشاء عنصر DOM
 * @param {string} tag - اسم الوسم
 * @param {Object} attributes - السمات
 * @param {string|Node|Array} children - الأطفال
 * @returns {HTMLElement} العنصر المنشأ
 */
export function createElement(tag, attributes = {}, children = null) {
    const el = document.createElement(tag);
    Object.keys(attributes).forEach(key => {
        if (key === 'className') {
            el.className = attributes[key];
        } else if (key === 'style' && typeof attributes[key] === 'object') {
            Object.assign(el.style, attributes[key]);
        } else if (key.startsWith('on') && typeof attributes[key] === 'function') {
            const eventName = key.slice(2).toLowerCase();
            el.addEventListener(eventName, attributes[key]);
        } else if (key === 'innerHTML') {
            el.innerHTML = attributes[key];
        } else if (key === 'textContent') {
            el.textContent = attributes[key];
        } else {
            el.setAttribute(key, attributes[key]);
        }
    });
    if (children) {
        if (Array.isArray(children)) {
            children.forEach(child => {
                if (child instanceof Node) {
                    el.appendChild(child);
                } else {
                    el.appendChild(document.createTextNode(String(child)));
                }
            });
        } else if (children instanceof Node) {
            el.appendChild(children);
        } else {
            el.appendChild(document.createTextNode(String(children)));
        }
    }
    return el;
}

/**
 * إضافة عنصر إلى DOM
 * @param {string|HTMLElement} selector - المحدد أو العنصر
 * @param {string|HTMLElement} child - العنصر المضاف
 * @param {string} position - الموقع ('append', 'prepend', 'before', 'after')
 * @returns {HTMLElement} العنصر المضاف
 */
export function appendTo(selector, child, position = 'append') {
    const parent = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!parent) return null;
    const element = typeof child === 'string' ? createElement('div', { innerHTML: child }) : child;
    switch (position) {
        case 'append':
            parent.appendChild(element);
            break;
        case 'prepend':
            parent.prepend(element);
            break;
        case 'before':
            parent.parentNode.insertBefore(element, parent);
            break;
        case 'after':
            parent.parentNode.insertBefore(element, parent.nextSibling);
            break;
        default:
            parent.appendChild(element);
    }
    return element;
}

/**
 * إزالة عنصر من DOM
 * @param {string|HTMLElement} selector - المحدد أو العنصر
 * @returns {boolean} نجاح العملية
 */
export function removeElement(selector) {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el || !el.parentNode) return false;
    el.parentNode.removeChild(el);
    return true;
}

/**
 * تبديل صنف CSS على عنصر
 * @param {string|HTMLElement} selector - المحدد أو العنصر
 * @param {string} className - اسم الصنف
 * @param {boolean} force - إجبار الإضافة أو الإزالة (اختياري)
 * @returns {boolean} الحالة الجديدة
 */
export function toggleClass(selector, className, force = undefined) {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) return false;
    el.classList.toggle(className, force);
    return el.classList.contains(className);
}

/**
 * إضافة صنف CSS على عنصر
 * @param {string|HTMLElement} selector - المحدد أو العنصر
 * @param {string} className - اسم الصنف
 * @returns {boolean} نجاح العملية
 */
export function addClass(selector, className) {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) return false;
    el.classList.add(className);
    return true;
}

/**
 * إزالة صنف CSS على عنصر
 * @param {string|HTMLElement} selector - المحدد أو العنصر
 * @param {string} className - اسم الصنف
 * @returns {boolean} نجاح العملية
 */
export function removeClass(selector, className) {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) return false;
    el.classList.remove(className);
    return true;
}

/**
 * الحصول على قيمة عنصر الإدخال
 * @param {string|HTMLElement} selector - المحدد أو العنصر
 * @param {string} type - نوع القيمة ('value', 'text', 'html', 'checked')
 * @returns {string|boolean|null} القيمة
 */
export function getValue(selector, type = 'value') {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) return null;
    switch (type) {
        case 'value':
            return el.value || '';
        case 'text':
            return el.textContent || '';
        case 'html':
            return el.innerHTML || '';
        case 'checked':
            return el.checked || false;
        default:
            return el.value || '';
    }
}

/**
 * تعيين قيمة عنصر الإدخال
 * @param {string|HTMLElement} selector - المحدد أو العنصر
 * @param {*} value - القيمة
 * @param {string} type - نوع القيمة ('value', 'text', 'html', 'checked')
 * @returns {boolean} نجاح العملية
 */
export function setValue(selector, value, type = 'value') {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) return false;
    switch (type) {
        case 'value':
            el.value = value;
            break;
        case 'text':
            el.textContent = value;
            break;
        case 'html':
            el.innerHTML = value;
            break;
        case 'checked':
            el.checked = Boolean(value);
            break;
        default:
            el.value = value;
    }
    return true;
}

/**
 * إخفاء عنصر
 * @param {string|HTMLElement} selector - المحدد أو العنصر
 * @returns {boolean} نجاح العملية
 */
export function hideElement(selector) {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) return false;
    el.style.display = 'none';
    return true;
}

/**
 * إظهار عنصر
 * @param {string|HTMLElement} selector - المحدد أو العنصر
 * @param {string} display - نوع العرض (افتراضي: 'block')
 * @returns {boolean} نجاح العملية
 */
export function showElement(selector, display = 'block') {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) return false;
    el.style.display = display;
    return true;
}

/**
 * تبديل إظهار/إخفاء عنصر
 * @param {string|HTMLElement} selector - المحدد أو العنصر
 * @param {string} displayOnShow - نوع العرض عند الإظهار
 * @returns {boolean} الحالة الجديدة (true: ظاهر, false: مخفي)
 */
export function toggleVisibility(selector, displayOnShow = 'block') {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) return false;
    const isHidden = el.style.display === 'none' || getComputedStyle(el).display === 'none';
    if (isHidden) {
        el.style.display = displayOnShow;
        return true;
    } else {
        el.style.display = 'none';
        return false;
    }
}

// ============================================
//  8.  دوال مساعدة أخرى
// ============================================

/**
 * تأخير تنفيذ دالة (Debounce)
 * @param {Function} fn - الدالة
 * @param {number} delay - التأخير بالمللي ثانية
 * @returns {Function} الدالة المؤجلة
 */
export function debounce(fn, delay = 300) {
    let timer = null;
    return function(...args) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            fn.apply(this, args);
            timer = null;
        }, delay);
    };
}

/**
 * منع التنفيذ المتكرر (Throttle)
 * @param {Function} fn - الدالة
 * @param {number} limit - الحد الأدنى للفاصل الزمني
 * @returns {Function} الدالة المحددة
 */
export function throttle(fn, limit = 300) {
    let inThrottle = false;
    return function(...args) {
        if (!inThrottle) {
            fn.apply(this, args);
            inThrottle = true;
            setTimeout(() => {
                inThrottle = false;
            }, limit);
        }
    };
}

/**
 * تأخير (Promise based)
 * @param {number} ms - عدد المللي ثانية
 * @returns {Promise} Promise
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * محاولة تنفيذ دالة مع إعادة المحاولة
 * @param {Function} fn - الدالة
 * @param {number} attempts - عدد المحاولات
 * @param {number} delayMs - التأخير بين المحاولات
 * @returns {Promise} نتيجة الدالة
 */
export async function retry(fn, attempts = 3, delayMs = 1000) {
    let lastError = null;
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (i < attempts - 1) {
                await delay(delayMs * (i + 1));
            }
        }
    }
    throw lastError;
}

/**
 * التحقق من أن القيمة موجودة في التخزين المحلي
 * @param {string} key - المفتاح
 * @returns {boolean} true إذا كانت موجودة
 */
export function hasLocalStorageItem(key) {
    try {
        return localStorage.getItem(key) !== null;
    } catch (e) {
        return false;
    }
}

/**
 * الحصول على حجم التخزين المحلي المستخدم (بالبايت)
 * @returns {number} الحجم المستخدم
 */
export function getLocalStorageSize() {
    let total = 0;
    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            total += localStorage[key].length + key.length;
        }
    }
    return total;
}

/**
 * نسخ النص إلى الحافظة
 * @param {string} text - النص
 * @returns {Promise<boolean>} نجاح العملية
 */
export async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
        // طريقة احتياطية
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
    } catch (error) {
        console.error('Copy to clipboard failed:', error);
        return false;
    }
}

/**
 * تحويل ملف إلى Base64
 * @param {File} file - الملف
 * @returns {Promise<string>} النص Base64
 */
export function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * تحويل Base64 إلى Blob
 * @param {string} base64 - النص Base64
 * @param {string} mimeType - نوع MIME
 * @returns {Blob} الكائن Blob
 */
export function base64ToBlob(base64, mimeType = 'application/octet-stream') {
    const byteString = atob(base64.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeType });
}

/**
 * تنزيل ملف من الرابط
 * @param {string} url - الرابط
 * @param {string} filename - اسم الملف
 * @returns {void}
 */
export function downloadFile(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

/**
 * فتح رابط في نافذة جديدة
 * @param {string} url - الرابط
 * @param {Object} options - خيارات النافذة
 * @returns {Window|null} النافذة المفتوحة
 */
export function openWindow(url, options = {}) {
    const defaultOptions = {
        width: 800,
        height: 600,
        menubar: 'no',
        toolbar: 'no',
        location: 'yes',
        status: 'no',
        scrollbars: 'yes',
    };
    const opts = { ...defaultOptions, ...options };
    const features = Object.keys(opts).map(key => `${key}=${opts[key]}`).join(',');
    return window.open(url, '_blank', features);
}

// ============================================
//  9.  تصدير جميع الدوال
// ============================================

export const helpers = {
    // المعرفات
    generateId,
    generateShortId,
    randomNumber,
    generateQRCode,

    // التواريخ
    formatDate,
    formatDateTime,
    formatLocaleDateTime,
    formatLocaleDate,
    formatLocaleTime,
    daysDiff,
    addDays,
    addMonths,
    startOfDay,
    endOfDay,
    isPastDate,
    isFutureDate,
    isToday,

    // الأرقام والعملات
    formatCurrency,
    formatNumber,
    roundNumber,
    percentage,
    formatChange,
    convertArabicNumbers,

    // النصوص
    truncateText,
    slugify,
    titleCase,
    properCase,
    removeDiacritics,
    getInitials,
    reverseText,
    containsText,
    stripHtml,
    escapeHtml,
    unescapeHtml,

    // المصفوفات
    uniqueArray,
    shuffleArray,
    chunkArray,
    groupBy,
    sortByKey,
    searchInArray,
    lastItem,
    firstItem,

    // الكائنات
    deepClone,
    deepMerge,
    cleanObject,
    getValueByPath,
    setValueByPath,
    pickKeys,
    omitKeys,

    // DOM
    createElement,
    appendTo,
    removeElement,
    toggleClass,
    addClass,
    removeClass,
    getValue,
    setValue,
    hideElement,
    showElement,
    toggleVisibility,

    // دوال مساعدة أخرى
    debounce,
    throttle,
    delay,
    retry,
    hasLocalStorageItem,
    getLocalStorageSize,
    copyToClipboard,
    fileToBase64,
    base64ToBlob,
    downloadFile,
    openWindow,
};

// تصدير helpers كافتراضي
export default helpers;

// ============================================
//  10. نهاية الملف
// ============================================
