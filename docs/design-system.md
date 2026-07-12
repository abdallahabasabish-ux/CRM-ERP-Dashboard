# نظام التصميم (Design System)
## نظام ERP + CRM المتكامل

**الإصدار:** 1.0  
**التاريخ:** 2026-07-12  
**الفريق:** فريق التطوير

---

## 1. مقدمة

يحدد هذا المستند نظام التصميم الموحد للتطبيق، المستوحى من **Notion Design System**، مع التركيز على البساطة، الحيادية، والحداثة. يغطي الألوان، الطباعة، التباعد، الأيقونات، المكونات، والتأثيرات، مع دعم كامل للوضع الليلي والنهاري، والاتجاه RTL.

---

## 2. الألوان (Colors)

### 2.1 الألوان الأساسية (Neutral Palette)
تعتمد على تدرجات الرمادي المحايدة، مع لمسة دافئة قليلاً.

| الاسم | القيمة (Light) | القيمة (Dark) | الاستخدام |
|-------|----------------|---------------|-----------|
| `--bg-primary` | `#ffffff` | `#1e1e1e` | خلفية الصفحة الرئيسية |
| `--bg-secondary` | `#f7f7f7` | `#2d2d2d` | خلفية البطاقات والقوائم الجانبية |
| `--bg-tertiary` | `#efefef` | `#3d3d3d` | خلفية العناصر التفاعلية (hover) |
| `--bg-card` | `#ffffff` | `#2a2a2a` | خلفية البطاقات |
| `--text-primary` | `#1a1a1a` | `#e8e8e8` | النصوص الرئيسية |
| `--text-secondary` | `#6b6b6b` | `#a0a0a0` | النصوص الثانوية (التواريخ، الوصف) |
| `--text-tertiary` | `#9e9e9e` | `#7a7a7a` | النصوص التوجيهية (placeholders) |
| `--border-color` | `#e0e0e0` | `#3a3a3a` | حدود العناصر |
| `--shadow-color` | `rgba(0,0,0,0.08)` | `rgba(0,0,0,0.4)` | ظلال البطاقات والقوائم |

### 2.2 الألوان الوظيفية (Functional Colors)

| الاسم | القيمة (Light) | القيمة (Dark) | الاستخدام |
|-------|----------------|---------------|-----------|
| `--color-primary` | `#2d7ff9` | `#4a8cf7` | الأزرار الرئيسية، الروابط، التحديد |
| `--color-primary-hover` | `#1a6bd4` | `#3a7ae0` | حالة التمرير للأزرار الرئيسية |
| `--color-success` | `#36b37e` | `#4caf8a` | النجاح، الإشعارات الإيجابية |
| `--color-warning` | `#ffab00` | `#f5b82e` | التحذيرات، التنبيهات |
| `--color-danger` | `#ff5630` | `#f55a4a` | الأخطاء، الحذف، الإجراءات الخطيرة |
| `--color-info` | `#00b8d4` | `#26c6da` | المعلومات، التوجيه |

### 2.3 ألوان الحالات (Status Colors)

| الحالة | القيمة (Light) | القيمة (Dark) |
|--------|----------------|---------------|
| جديد (New) | `#2d7ff9` | `#4a8cf7` |
| قيد التنفيذ (In Progress) | `#ffab00` | `#f5b82e` |
| مكتمل (Completed) | `#36b37e` | `#4caf8a` |
| ملغي (Cancelled) | `#ff5630` | `#f55a4a` |
| أولوية عالية (High Priority) | `#ff5630` | `#f55a4a` |
| أولوية متوسطة (Medium Priority) | `#ffab00` | `#f5b82e` |
| أولوية منخفضة (Low Priority) | `#36b37e` | `#4caf8a` |

---

## 3. الطباعة (Typography)

### 3.1 الخطوط (Fonts)
- **الخط الرئيسي:** نظام sans-serif، مع دعم اللغة العربية.
- **الخطوط المستخدمة:** `'Segoe UI', 'Tahoma', 'Arial', sans-serif` (مع أولوية للخطوط التي تدعم العربية).
- **الخط الاحتياطي:** `system-ui`.

### 3.2 أحجام الخطوط (Font Sizes)
تُستخدم وحدات `rem` لضمان قابلية التوسع.

| المستوى | الحجم | الاستخدام |
|---------|-------|-----------|
| `--font-xs` | `0.75rem` (12px) | النصوص الصغيرة جداً (التواريخ، التسميات) |
| `--font-sm` | `0.875rem` (14px) | النصوص الثانوية، الوصف |
| `--font-base` | `1rem` (16px) | النصوص الأساسية، الفقرات |
| `--font-lg` | `1.125rem` (18px) | العناوين الفرعية |
| `--font-xl` | `1.25rem` (20px) | العناوين المتوسطة |
| `--font-2xl` | `1.5rem` (24px) | العناوين الكبيرة |
| `--font-3xl` | `2rem` (32px) | العناوين الرئيسية في الصفحات |

### 3.3 أوزان الخطوط (Font Weights)
- `--font-light`: 300
- `--font-regular`: 400
- `--font-medium`: 500
- `--font-semibold`: 600
- `--font-bold`: 700

### 3.4 ارتفاعات السطر (Line Heights)
- `--line-height-tight`: 1.2 (للعناوين)
- `--line-height-normal`: 1.5 (للنصوص العادية)
- `--line-height-loose`: 1.8 (للنصوص الطويلة)

---

## 4. التباعد (Spacing)

يتبع نظام تباعد متدرج (8px كوحدة أساسية).

| الاسم | القيمة | الاستخدام |
|-------|--------|-----------|
| `--spacing-1` | `4px` | هوامش صغيرة جداً |
| `--spacing-2` | `8px` | هوامش بين العناصر المتجاورة |
| `--spacing-3` | `12px` | هوامش داخل البطاقات |
| `--spacing-4` | `16px` | هوامش قياسية |
| `--spacing-5` | `24px` | هوامش بين الأقسام |
| `--spacing-6` | `32px` | هوامش كبيرة |
| `--spacing-7` | `48px` | هوامش بين الصفحات |
| `--spacing-8` | `64px` | هوامش عريضة |

---

## 5. الزوايا الدائرية (Border Radius)

| الاسم | القيمة | الاستخدام |
|-------|--------|-----------|
| `--radius-sm` | `4px` | الأزرار الصغيرة، الحقول |
| `--radius-md` | `8px` | البطاقات، المودالات |
| `--radius-lg` | `12px` | البطاقات الكبيرة، القوائم |
| `--radius-full` | `50%` | الصور الدائرية، الأزرار المستديرة |

---

## 6. الظلال (Shadows)

| الاسم | القيمة (Light) | القيمة (Dark) | الاستخدام |
|-------|----------------|---------------|-----------|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.08)` | `0 1px 3px rgba(0,0,0,0.4)` | العناصر الصغيرة |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.1)` | `0 4px 12px rgba(0,0,0,0.5)` | البطاقات، القوائم المنسدلة |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.12)` | `0 8px 24px rgba(0,0,0,0.6)` | المودالات، القوائم المنبثقة |
| `--shadow-xl` | `0 16px 48px rgba(0,0,0,0.15)` | `0 16px 48px rgba(0,0,0,0.7)` | النوافذ العائمة الكبيرة |

---

## 7. التأثيرات (Effects)

### 7.1 التأثير الزجاجي (Glass Effect)
يُستخدم في البطاقات والقوائم الجانبية لإضافة عمق بسيط.

```css
.glass {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
/* في الوضع الليلي */
.dark .glass {
  background: rgba(30, 30, 30, 0.7);
  border-color: rgba(255, 255, 255, 0.1);
}
7.2 الانتقالات (Transitions)
--transition-fast: 0.15s ease

--transition-normal: 0.25s ease

--transition-slow: 0.4s ease

8. الأيقونات (Icons)
سيتم استخدام مكتبة Feather Icons أو Lucide Icons (SVG مفتوحة المصدر) مع إمكانية تخصيص الألوان عبر CSS.

الحجم الافتراضي: 20px (مع إمكانية تغيير إلى 16px، 24px، 32px).

الألوان: تتبع لون النص المحيط.

التنسيق: جميع الأيقونات SVG مع viewBox="0 0 24 24"، fill="none"، stroke="currentColor".

قائمة الأيقونات المطلوبة:
لوحة التحكم، العملاء، الطلبات، الخدمات، الموظفين، الحضور، المهام، المحاسبة، الفواتير، التقارير، الإشعارات، الرسائل، الملفات، الإعدادات، المساعدة.

إضافة، تعديل، حذف، عرض، بحث، فلتر، ترتيب، تنزيل، رفع، طباعة، تصدير، إرسال، إغلاق، رجوع، قائمة، شعار التطبيق، صورة المستخدم، إظهار/إخفاء كلمة المرور، حالة الطلب، الأولوية، نجوم التقييم، QR.

9. المكونات (Components)
9.1 الأزرار (Buttons)
الزر الرئيسي (Primary)
css
.btn-primary {
  background: var(--color-primary);
  color: #fff;
  border: none;
  padding: var(--spacing-3) var(--spacing-5);
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.btn-primary:hover {
  background: var(--color-primary-hover);
}
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
الزر الثانوي (Secondary)
css
.btn-secondary {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: var(--spacing-3) var(--spacing-5);
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.btn-secondary:hover {
  background: var(--bg-tertiary);
}
الزر الخطير (Danger)
css
.btn-danger {
  background: var(--color-danger);
  color: #fff;
  border: none;
  padding: var(--spacing-3) var(--spacing-5);
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.btn-danger:hover {
  background: #d9431e;
}
9.2 الحقول (Inputs)
css
.input {
  width: 100%;
  padding: var(--spacing-3) var(--spacing-4);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: var(--font-base);
  transition: border var(--transition-fast), box-shadow var(--transition-fast);
}
.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(45, 127, 249, 0.2);
}
.input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
9.3 البطاقات (Cards)
css
.card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: var(--spacing-5);
  transition: box-shadow var(--transition-normal);
}
.card:hover {
  box-shadow: var(--shadow-lg);
}
9.4 الجداول (Tables)
css
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-sm);
}
.table th {
  text-align: right;
  padding: var(--spacing-3) var(--spacing-4);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-weight: var(--font-semibold);
  border-bottom: 1px solid var(--border-color);
}
.table td {
  padding: var(--spacing-3) var(--spacing-4);
  border-bottom: 1px solid var(--border-color);
}
.table tbody tr:hover {
  background: var(--bg-tertiary);
}
9.5 المودالات (Modals)
css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}
.modal {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  padding: var(--spacing-6);
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}
9.6 الإشعارات (Toasts)
css
.toast {
  position: fixed;
  bottom: var(--spacing-5);
  right: var(--spacing-5); /* في RTL يكون left */
  background: var(--bg-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: var(--spacing-4) var(--spacing-5);
  border-right: 4px solid var(--color-primary);
  min-width: 300px;
  max-width: 500px;
  z-index: 2000;
  animation: slideInUp 0.3s ease;
}
.toast.success { border-color: var(--color-success); }
.toast.error { border-color: var(--color-danger); }
.toast.warning { border-color: var(--color-warning); }
10. التخطيط (Layout)
10.1 الشبكة (Grid)
استخدام CSS Grid للصفحات الرئيسية.

عدد الأعمدة: 12 عموداً مع فواصل gap: var(--spacing-5).

الأعمدة تستجيب تلقائياً.

10.2 القائمة الجانبية (Sidebar)
عرض ثابت: 240px.

قابلة للطي إلى 64px (تظهر الأيقونات فقط).

خلفية var(--bg-secondary)، مع تأثير زجاجي خفيف.

عناوين المجموعات بخط صغير ولون ثانوي.

10.3 الشريط العلوي (Navbar)
ارتفاع 60px.

خلفية var(--bg-primary) مع ظل سفلي خفيف.

ثابت في الأعلى.

11. الاستجابة (Responsive)
Desktop (>1200px): عرض كامل، قائمة جانبية مفتوحة.

Laptop (992-1200px): عرض كامل، قائمة جانبية مفتوحة.

Tablet (768-991px): قائمة جانبية قابلة للطي (تبدأ مطوية)، يتم فتحها عبر زر همبرغر.

Mobile (576-767px): قائمة جانبية مخفية، تظهر عبر زر همبرغر، محتوى بعرض كامل.

Large Mobile (400-575px): نفس التصميم مع تكييف النصوص والأزرار.

Small Mobile (<400px): تكييف إضافي (أحجام خطوط أصغر، هوامش أقل).

12. الوضع الليلي (Dark Mode)
يتم تطبيق الوضع الليلي عبر إضافة صنف .dark على عنصر <html>، ويتم تبديله عبر JavaScript بناءً على تفضيل المستخدم أو النظام.

css
.dark {
  --bg-primary: #1e1e1e;
  --bg-secondary: #2d2d2d;
  --bg-tertiary: #3d3d3d;
  --bg-card: #2a2a2a;
  --text-primary: #e8e8e8;
  --text-secondary: #a0a0a0;
  --text-tertiary: #7a7a7a;
  --border-color: #3a3a3a;
  --shadow-color: rgba(0,0,0,0.4);
  /* باقي المتغيرات مُحدّثة في الجداول أعلاه */
}
13. الوصولية (Accessibility)
تباين الألوان: يتم اختبار جميع التركيبات لتلبية WCAG AA (نسبة تباين 4.5:1 على الأقل).

حجم الخط: قابل للتكبير عبر المتصفح.

التنقل عبر لوحة المفاتيح: جميع العناصر التفاعلية قابلة للتركيز.

تسميات ARIA: تُضاف حيثما كان ذلك ضرورياً.

14. الأدوات (Tools)
CSS Variables: تُستخدم لتوحيد الألوان، الأحجام، والتباعد.

Sass/SCSS: اختياري لتنظيم الكود، لكن يمكن استخدام CSS الخام مع المتغيرات.

Icon Library: Feather Icons (تُحمّل عبر CDN أو تُضمّن كـ SVG).

15. الخلاصة
نظام التصميم هذا يضمن تجربة مستخدم متسقة، جذابة، وعملية في جميع صفحات التطبيق. يتبع مبادئ Notion في البساطة والحيادية، مع التركيز على الوظيفة وسهولة الاستخدام. سيتم تطبيقه بدقة في جميع ملفات CSS القادمة.

تمت المراجعة:
فريق التطوير
التاريخ: 2026-07-12
