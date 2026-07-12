# نظام ERP + CRM المتكامل

**الإصدار:** 1.0.0  
**الحالة:** قيد التطوير  
**التاريخ:** 2026-07-12

---

## نظرة عامة

نظام إدارة موارد المؤسسات (ERP) وإدارة علاقات العملاء (CRM) متكامل، يعمل كتطبيق ويب تقدمي (PWA) بواجهة عربية (RTL) مستوحاة من تصميم Notion. يعتمد على Google Sheets كقاعدة بيانات، و Google Apps Script كطبقة خلفية، ويستضاف على GitHub Pages.

---

## الميزات الرئيسية

- **لوحة تحكم شاملة** مع إحصائيات، رسوم بيانية، تقويم، وجدول زمني.
- **إدارة العملاء** مع تفاصيل كاملة، سجل، وملفات.
- **إدارة الطلبات** مع QR، حالة، أولوية، خدمات، وتعليقات.
- **إدارة الموظفين** والحضور والانصراف.
- **المهام** مع عرض كانبان.
- **المحاسبة** (الخزينة، الإيرادات، المصروفات، الرواتب، الفواتير).
- **التقارير** اليومية، الأسبوعية، الشهرية، والسنوية مع تصدير PDF و Excel.
- **الإشعارات** داخل النظام مع شارة وصوت.
- **الرسائل** الداخلية مع إرفاق ملفات.
- **إدارة الملفات** عبر Google Drive.
- **الأرشيف** وسجل النشاطات والنسخ الاحتياطي.
- **دعم كامل للوضع الليلي** (يدوي أو تلقائي).
- **توافق كامل مع جميع أحجام الشاشات** (Desktop، Laptop، Tablet، Mobile).
- **PWA** (عمل دون اتصال، مزامنة خلفية، إشعارات Push، تثبيت).

---

## التقنيات المستخدمة

- **Frontend:** HTML5، CSS3، Vanilla JavaScript (ES2023) – بدون إطارات عمل.
- **Backend:** Google Apps Script (REST API).
- **قاعدة البيانات:** Google Sheets (جداول منفصلة لكل كيان).
- **التخزين:** Google Drive للملفات.
- **PWA:** Manifest، Service Worker، IndexedDB، Background Sync.
- **الاستضافة:** GitHub Pages.

---

## هيكل المشروع
/
├── assets/
│ ├── css/
│ ├── js/
│ ├── images/
│ ├── icons/
│ └── fonts/
├── components/
│ ├── header/
│ ├── sidebar/
│ ├── navbar/
│ ├── footer/
│ ├── modal/
│ ├── toast/
│ ├── loader/
│ ├── table/
│ ├── form/
│ ├── cards/
│ ├── timeline/
│ ├── calendar/
│ ├── kanban/
│ ├── charts/
│ └── search/
├── pages/
│ ├── login/
│ ├── dashboard/
│ ├── customers/
│ ├── customer/
│ ├── services/
│ ├── orders/
│ ├── order/
│ ├── employees/
│ ├── attendance/
│ ├── tasks/
│ ├── accounting/
│ ├── invoices/
│ ├── reports/
│ ├── notifications/
│ ├── messages/
│ ├── files/
│ ├── settings/
│ └── profile/
├── modules/
│ ├── auth/
│ ├── customers/
│ ├── orders/
│ ├── services/
│ ├── employees/
│ ├── attendance/
│ ├── tasks/
│ ├── reports/
│ ├── notifications/
│ ├── messages/
│ ├── files/
│ ├── accounting/
│ └── dashboard/
├── utils/
│ ├── api.js
│ ├── storage.js
│ ├── validation.js
│ ├── helpers.js
│ ├── router.js
│ ├── theme.js
│ └── constants.js
├── pwa/
│ ├── manifest.json
│ ├── service-worker.js
│ └── offline.html
├── backend/
│ └── google-apps-script/
│ ├── Code.gs
│ ├── auth.gs
│ ├── customers.gs
│ ├── orders.gs
│ ├── employees.gs
│ ├── attendance.gs
│ ├── tasks.gs
│ ├── accounting.gs
│ ├── invoices.gs
│ ├── reports.gs
│ ├── messages.gs
│ ├── notifications.gs
│ ├── files.gs
│ ├── settings.gs
│ ├── logs.gs
│ └── utils.gs
├── database/
│ └── google-sheets-schema/
│ ├── users-schema.json
│ ├── customers-schema.json
│ ├── employees-schema.json
│ ├── services-schema.json
│ ├── orders-schema.json
│ ├── order-items-schema.json
│ ├── invoices-schema.json
│ ├── invoice-items-schema.json
│ ├── transactions-schema.json
│ ├── attendance-schema.json
│ ├── tasks-schema.json
│ ├── messages-schema.json
│ ├── notifications-schema.json
│ ├── files-schema.json
│ ├── logs-schema.json
│ ├── settings-schema.json
│ └── archive-schema.json
├── docs/
│ ├── SRS.md
│ ├── architecture.md
│ ├── database-schema.md
│ ├── user-flow.md
│ ├── wireframes.md
│ └── design-system.md
├── index.html
└── README.md



---

## تعليمات الإعداد والتشغيل

### 1. استنساخ المستودع
git clone https://github.com/your-username/erp-crm-dashboard.git
cd erp-crm-dashboard
2. إعداد Google Sheets
أنشئ ملف Google Sheets جديداً.

أنشئ الأوراق (Sheets) وفقاً للمخطط الموجود في database/google-sheets-schema/.

حدّد معرف الملف (Spreadsheet ID) من الرابط.

3. إعداد Google Apps Script
افتح ملف Google Sheets.

اذهب إلى Extensions > Apps Script.

انسخ محتويات مجلد backend/google-apps-script/ إلى مشروع Apps Script.

عدّل الثوابت في Code.gs (مثل معرف الـ Spreadsheet، مفتاح JWT).

انشر المشروع كـ Web App (مع إعداد الوصول "Anyone" أو مقيد حسب الحاجة).

احصل على رابط الـ Web App.

4. إعداد Frontend
افتح ملف utils/constants.js.

عيّن API_BASE_URL إلى رابط Web App الخاص بك.

تأكد من أن جميع المسارات في index.html و pwa/manifest.json صحيحة.

5. تشغيل محلياً
استخدم أي خادم محلي (مثل Live Server في VS Code).

افتح المتصفح على http://localhost:5500.

6. النشر على GitHub Pages
ادفع الكود إلى مستودع GitHub.

اذهب إلى Settings > Pages واختر الفرع الرئيسي كـ Source.

سيصبح التطبيق متاحاً على https://your-username.github.io/erp-crm-dashboard.

التوثيق
جميع وثائق التصميم والتخطيط موجودة في مجلد docs/:

متطلبات النظام (SRS)

هندسة النظام

مخطط قاعدة البيانات

تدفق المستخدم

الإطارات السلكية

نظام التصميم

المساهمة
هذا المشروع يُطوَّر بواسطة فريق داخلي. للمساهمة، يرجى التواصل مع الفريق عبر البريد الإلكتروني: team@example.com

الترخيص
جميع الحقوق محفوظة © 2026. هذا المشروع خاص ولا يُسمح باستخدامه أو توزيعه بدون إذن كتابي مسبق.

فريق التطوير
Senior Software Architect: [الاسم]

Senior Front-End Engineer: [الاسم]

Senior JavaScript Engineer: [الاسم]

UI/UX Designer: [الاسم]

Google Apps Script Expert: [الاسم]

Database Architect: [الاسم]

PWA Engineer: [الاسم]

Security Engineer: [الاسم]

Performance Engineer: [الاسم]

QA Engineer: [الاسم]

آخر تحديث: 2026-07-12
