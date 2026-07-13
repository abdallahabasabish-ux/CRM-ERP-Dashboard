/**
 * ======================================================
 * الملف: pages/login/login.js
 * الوصف: منطق صفحة تسجيل الدخول
 *         يدير المصادقة، التحقق من المدخلات،
 *         عرض الأخطاء، وتوجيه المستخدم بعد النجاح
 * الإصدار: 1.0.0
 * التاريخ: 2026-07-13
 * ======================================================
 */

import { validation } from '../../utils/validation.js';
import { api } from '../../utils/api.js';
import { toast } from '../../components/toast/toast.js';
import { modal } from '../../components/modal/modal.js';
import { loader } from '../../components/loader/loader.js';
import { getRouter, navigateTo } from '../../utils/router.js';
import { getItem, setItem } from '../../utils/storage.js';
import { STORAGE_KEYS } from '../../utils/constants.js';

// ============================================
//  1.  مراجع DOM
// ============================================

const elements = {
    form: document.getElementById('loginForm'),
    email: document.getElementById('email'),
    password: document.getElementById('password'),
    emailError: document.getElementById('emailError'),
    passwordError: document.getElementById('passwordError'),
    loginError: document.getElementById('loginError'),
    loginBtn: document.getElementById('loginBtn'),
    loginBtnText: document.getElementById('loginBtnText'),
    loginSpinner: document.getElementById('loginSpinner'),
    togglePassword: document.getElementById('togglePassword'),
    rememberMe: document.getElementById('rememberMe'),
    forgotLink: document.getElementById('forgotPassword'),
};

// ============================================
//  2.  دوال معالجة الأخطاء (Error Handling)
// ============================================

/**
 * عرض خطأ عام
 */
function showGeneralError(message) {
    elements.loginError.textContent = message;
    elements.loginError.classList.add('show');
}

/**
 * إخفاء الخطأ العام
 */
function hideGeneralError() {
    elements.loginError.classList.remove('show');
    elements.loginError.textContent = '';
}

/**
 * عرض خطأ لحقل معين
 */
function showFieldError(field, message) {
    const errorEl = field === 'email' ? elements.emailError : elements.passwordError;
    const inputEl = field === 'email' ? elements.email : elements.password;
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    inputEl.classList.add('is-invalid');
}

/**
 * إخفاء خطأ حقل معين
 */
function hideFieldError(field) {
    const errorEl = field === 'email' ? elements.emailError : elements.passwordError;
    const inputEl = field === 'email' ? elements.email : elements.password;
    errorEl.style.display = 'none';
    errorEl.textContent = '';
    inputEl.classList.remove('is-invalid');
}

/**
 * إخفاء جميع الأخطاء
 */
function hideAllErrors() {
    hideGeneralError();
    hideFieldError('email');
    hideFieldError('password');
}

// ============================================
//  3.  دوال التحقق من صحة المدخلات (Validation)
// ============================================

/**
 * التحقق من صحة البريد الإلكتروني
 */
function validateEmail(value) {
    const result = validation.isValidEmail(value, 'البريد الإلكتروني');
    if (!result.valid) {
        showFieldError('email', result.message);
        return false;
    }
    hideFieldError('email');
    return true;
}

/**
 * التحقق من صحة كلمة المرور
 */
function validatePassword(value) {
    if (!value || value.length < 6) {
        showFieldError('password', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        return false;
    }
    hideFieldError('password');
    return true;
}

/**
 * التحقق من جميع المدخلات
 */
function validateForm() {
    const email = elements.email.value.trim();
    const password = elements.password.value.trim();

    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    return isEmailValid && isPasswordValid;
}

// ============================================
//  4.  دوال العرض (UI Updates)
// ============================================

/**
 * تعيين حالة التحميل
 */
function setLoading(isLoading) {
    if (isLoading) {
        elements.loginBtn.disabled = true;
        elements.loginBtnText.textContent = 'جاري تسجيل الدخول...';
        elements.loginSpinner.style.display = 'inline';
        hideGeneralError();
    } else {
        elements.loginBtn.disabled = false;
        elements.loginBtnText.textContent = 'تسجيل الدخول';
        elements.loginSpinner.style.display = 'none';
    }
}

/**
 * عرض رسالة نجاح
 */
function showSuccess(message) {
    toast.success(message);
}

/**
 * عرض رسالة خطأ
 */
function showError(message) {
    toast.error(message);
    showGeneralError(message);
}

// ============================================
//  5.  دوال معالجة المصادقة (Authentication)
// ============================================

/**
 * معالج تسجيل الدخول
 */
async function handleLogin(e) {
    e.preventDefault();

    // إخفاء الأخطاء القديمة
    hideAllErrors();

    // التحقق من صحة المدخلات
    if (!validateForm()) {
        // التركيز على أول حقل به خطأ
        if (elements.email.classList.contains('is-invalid')) {
            elements.email.focus();
        } else if (elements.password.classList.contains('is-invalid')) {
            elements.password.focus();
        }
        return;
    }

    // الحصول على البيانات
    const email = elements.email.value.trim();
    const password = elements.password.value.trim();
    const rememberMe = elements.rememberMe.checked;

    // عرض حالة التحميل
    setLoading(true);

    try {
        // محاولة تسجيل الدخول
        const result = await api.auth.login(email, password);

        if (result.success) {
            // حفظ تذكرني (إذا كان مفعلاً)
            if (rememberMe) {
                setItem(STORAGE_KEYS.REMEMBER_ME, { email, remember: true });
            } else {
                localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
            }

            // عرض رسالة نجاح
            showSuccess('تم تسجيل الدخول بنجاح');

            // الحصول على كائن التوجيه
            const router = getRouter();

            // الانتظار قليلاً قبل التوجيه
            setTimeout(() => {
                // التوجيه إلى لوحة التحكم
                navigateTo('/dashboard');
            }, 300);

        } else {
            // عرض رسالة الخطأ
            showError(result.message || 'فشل تسجيل الدخول. يرجى التحقق من بياناتك.');
        }

    } catch (error) {
        console.error('Login error:', error);
        showError(error.message || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
    } finally {
        // إزالة حالة التحميل
        setLoading(false);
    }
}

/**
 * معالج عرض/إخفاء كلمة المرور
 */
function handleTogglePassword() {
    const type = elements.password.getAttribute('type');
    if (type === 'password') {
        elements.password.setAttribute('type', 'text');
        elements.togglePassword.textContent = '🙈';
        elements.togglePassword.setAttribute('aria-label', 'إخفاء كلمة المرور');
    } else {
        elements.password.setAttribute('type', 'password');
        elements.togglePassword.textContent = '👁️';
        elements.togglePassword.setAttribute('aria-label', 'إظهار كلمة المرور');
    }
}

/**
 * معالج نسيان كلمة المرور
 */
async function handleForgotPassword(e) {
    e.preventDefault();

    // طلب البريد الإلكتروني عبر مودال
    const email = await modal.prompt('أدخل بريدك الإلكتروني لإعادة تعيين كلمة المرور:', {
        title: 'نسيت كلمة المرور',
        placeholder: 'البريد الإلكتروني',
        defaultValue: elements.email.value.trim(),
        inputType: 'email',
    });

    if (email === null) return; // المستخدم ألغى

    // التحقق من صحة البريد
    if (!email || !validation.isValidEmail(email).valid) {
        toast.error('يرجى إدخال بريد إلكتروني صحيح');
        return;
    }

    try {
        // إرسال طلب إعادة التعيين
        // (في التطبيق الفعلي، سيتم استدعاء API)
        // const response = await api.auth.forgotPassword(email);
        // if (response.success) {
        //     toast.success('تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني');
        // }

        // محاكاة مؤقتة
        toast.info('سيتم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني');
        await new Promise(resolve => setTimeout(resolve, 1500));

        // عرض رسالة نجاح
        toast.success(`تم إرسال رابط إعادة التعيين إلى ${email}`);
    } catch (error) {
        toast.error('حدث خطأ أثناء إرسال رابط إعادة التعيين');
        console.error('Forgot password error:', error);
    }
}

/**
 * تحميل البريد الإلكتروني المحفوظ (تذكرني)
 */
function loadRememberedEmail() {
    try {
        const data = getItem(STORAGE_KEYS.REMEMBER_ME);
        if (data && data.email && data.remember) {
            elements.email.value = data.email;
            elements.rememberMe.checked = true;
        }
    } catch (e) {
        // تجاهل
    }
}

// ============================================
//  6.  دوال التهيئة (Initialization)
// ============================================

/**
 * التحقق من وجود جلسة نشطة وإعادة التوجيه
 */
function checkActiveSession() {
    const token = api.getAuthToken();
    if (token) {
        // محاولة التحقق من الجلسة
        api.auth.verify().then(result => {
            if (result.valid) {
                // الجلسة صالحة، إعادة توجيه إلى لوحة التحكم
                navigateTo('/dashboard');
            }
        }).catch(() => {
            // الجلسة غير صالحة، نبقى في صفحة الدخول
        });
    }
}

/**
 * تهيئة صفحة تسجيل الدخول
 */
export function initLoginPage() {
    // تحميل البريد المحفوظ
    loadRememberedEmail();

    // التحقق من الجلسة النشطة
    checkActiveSession();

    // ربط الأحداث
    elements.form.addEventListener('submit', handleLogin);
    elements.togglePassword.addEventListener('click', handleTogglePassword);
    elements.forgotLink.addEventListener('click', handleForgotPassword);

    // التحقق الفوري عند فقدان التركيز
    elements.email.addEventListener('blur', (e) => {
        const value = e.target.value.trim();
        if (value) {
            validateEmail(value);
        } else {
            hideFieldError('email');
        }
    });

    elements.password.addEventListener('blur', (e) => {
        const value = e.target.value.trim();
        if (value) {
            validatePassword(value);
        } else {
            hideFieldError('password');
        }
    });

    // مسح الأخطاء عند الكتابة
    elements.email.addEventListener('input', () => {
        hideFieldError('email');
        hideGeneralError();
    });

    elements.password.addEventListener('input', () => {
        hideFieldError('password');
        hideGeneralError();
    });

    // إضافة اختصار لوحة المفاتيح (Enter)
    elements.password.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            elements.form.dispatchEvent(new Event('submit'));
        }
    });

    console.log('✅ Login page initialized successfully');
}

// ============================================
//  7.  تهيئة الصفحة عند تحميل الوحدة
// ============================================

// بدء التهيئة عند تحميل DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoginPage);
} else {
    initLoginPage();
}

// تصدير الدوال للاستخدام الخارجي
export default {
    init: initLoginPage,
    handleLogin,
    validateEmail,
    validatePassword,
};

// ============================================
//  8.  نهاية الملف
// ============================================
