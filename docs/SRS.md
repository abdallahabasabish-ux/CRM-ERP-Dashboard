# متطلبات النظام البرمجية (SRS)
## نظام ERP + CRM المتكامل

**الإصدار:** 1.0  
**التاريخ:** 2026-07-12  
**الفريق:** فريق التطوير (Senior Software Architect, Senior Front-End Engineer, Senior JavaScript Engineer, UI/UX Designer, Google Apps Script Expert, Database Architect, PWA Engineer, Security Engineer, Performance Engineer, QA Engineer)

---

## 1. مقدمة

### 1.1 الغرض
هذه الوثيقة تحدد المتطلبات الوظيفية وغير الوظيفية لنظام ERP + CRM متكامل، يعمل كتطبيق ويب تقدمي (PWA) بواجهة مستخدم عربية (RTL) مستوحاة من تصميم Notion، ويعتمد على Google Sheets كقاعدة بيانات، و Google Apps Script كطبقة خلفية، ويستضاف على GitHub Pages.

### 1.2 نطاق النظام
يشمل النظام إدارة العملاء، الطلبات، الموظفين، الحضور، المهام، المحاسبة، الفواتير، التقارير، الإشعارات، الرسائل الداخلية، الملفات، الإعدادات، والملف الشخصي. يوفر لوحة تحكم شاملة مع رسوم بيانية وتقويم وجدول زمني.

### 1.3 التعريفات والمختصرات
- **ERP:** تخطيط موارد المؤسسات.
- **CRM:** إدارة علاقات العملاء.
- **PWA:** تطبيق ويب تقدمي.
- **RTL:** من اليمين لليسار.
- **API:** واجهة برمجة التطبيقات.
- **JWT:** JSON Web Token.

---

## 2. المتطلبات العامة

### 2.1 واجهة المستخدم
- اللغة: العربية فقط (RTL).
- التصميم: مستوحى من Notion (محايد، بسيط، عصري، بزوايا دائرية، تأثير زجاجي بسيط، تباعد احترافي).
- الوضع الليلي والنهاري والتلقائي.
- استجابة كاملة لجميع أحجام الشاشات (Desktop، Laptop، Tablet، Mobile، Large Mobile، Small Mobile).
- استخدام SVG للأيقونات.

### 2.2 التقنيات المسموح بها
- Frontend: HTML5، CSS3، Vanilla JavaScript (ES2023) – بدون أي إطار عمل (لا React، Vue، Angular، Bootstrap، Tailwind، jQuery).
- Backend: Google Apps Script (تقديم REST API).
- قاعدة البيانات: Google Sheets (جداول منفصلة لكل كيان).
- التخزين: Google Drive للملفات.
- PWA: Manifest، Service Worker، دعم غير متصل، مزامنة خلفية، إشعارات Push.

### 2.3 البنية المعمارية
- معمارية وحداتية (Modular Architecture).
- الفصل التام بين HTML و CSS و JavaScript.
- كل مكون مستقل (Component-based).
- استخدام IndexedDB للتخزين المؤقت والمزامنة في وضع عدم الاتصال.

### 2.4 الأمان
- تشفير كلمات المرور (باستخدام خوارزمية قوية).
- مصادقة آمنة (JWT أو جلسات).
- حماية من XSS و CSRF.
- التحقق من صحة المدخلات وتنقية المخرجات.
- نظام صلاحيات (أدوار: مدير، موظف، محاسب، إلخ).
- سجل تدقيق شامل (Audit Logs).

### 2.5 الأداء
- تحميل كسول (Lazy Loading).
- تقسيم الكود (Code Splitting).
- تحسين الصور واستخدام SVG.
- تخزين مؤقت باستخدام IndexedDB.
- مزامنة خلفية (Background Sync).
- الاستعداد للتصغير (Minification).

---

## 3. المتطلبات الوظيفية

### 3.1 المصادقة والتفويض
- **تسجيل الدخول:** صفحة تسجيل دخول باسم مستخدم وكلمة مرور.
- **تسجيل الخروج:** إنهاء الجلسة.
- **استعادة كلمة المرور:** إعادة تعيين عبر البريد الإلكتروني (اختياري).
- **الصلاحيات:** أدوار مختلفة (Admin، Manager، Employee، Accountant) مع صلاحيات محددة لكل صفحة/وظيفة.

### 3.2 لوحة التحكم (Dashboard)
- إجمالي الأرباح، إجمالي العملاء، إجمالي الموظفين، الطلبات، الإيرادات، المصروفات، الخزينة.
- أفضل الخدمات، أفضل الموظفين، أفضل العملاء.
- آخر النشاطات، آخر الطلبات، آخر الفواتير.
- رسم بياني (مخطط خطي/شريطي) للإيرادات والمصروفات.
- تقويم يعرض الأحداث والمهام.
- جدول زمني (Timeline) للأنشطة الأخيرة.
- لوحة الإشعارات (مع شارة).

### 3.3 إدارة العملاء (Customers)
- قائمة العملاء مع البحث والتصفية.
- إضافة/تعديل/حذف عميل.
- صفحة تفاصيل العميل تشمل: الاسم، الصورة، الهاتف، البريد، العنوان، الرصيد، عدد الطلبات، الفواتير، الرسائل، الملفات، التقييم، جدول زمني (Timeline) وسجل (Logs).

### 3.4 إدارة الطلبات (Orders)
- قائمة الطلبات مع البحث والتصفية (حسب الحالة، الأولوية، الخدمة، العميل، الموظف).
- إنشاء طلب جديد (رقم الطلب تلقائي، QR، حالة، أولوية، خدمة، عميل، موظف، تاريخ الإنشاء، موعد التسليم).
- صفحة تفاصيل الطلب: معلومات الطلب، جدول زمني، تعليقات، مرفقات، فاتورة، معلومات الدفع، سجل.
- تحديث حالة الطلب.
- إرفاق ملفات بالطلب.

### 3.5 إدارة الخدمات (Services)
- قائمة الخدمات (إضافة، تعديل، حذف).
- ربط الخدمات بالطلبات.

### 3.6 إدارة الموظفين (Employees)
- قائمة الموظفين مع البحث.
- إضافة/تعديل/حذف موظف.
- صفحة تفاصيل الموظف (معلومات شخصية، الراتب، القسم، سجل الحضور، المهام).

### 3.7 الحضور والانصراف (Attendance)
- تسجيل الحضور والانصراف (يدوي أو عبر زر).
- حساب عدد الساعات، التأخير، والإضافي.
- عرض سجل كامل للموظف مع إمكانية التصفية.

### 3.8 المهام (Tasks)
- قائمة المهام (عرض، إضافة، تعديل، حذف).
- عرض Kanban (حسب الحالة: مفتوحة، قيد التنفيذ، منتهية).
- تعيين مهام للموظفين، تحديد موعد، أولوية، وصف.

### 3.9 المحاسبة (Accounting)
- الخزينة (الرصيد الحالي).
- إدارة المصروفات والإيرادات (تسجيل، تصنيف، تقارير).
- الرواتب (احتساب، صرف، سجل).
- السلف والتحويلات.
- الأرباح (إجمالي الأرباح، صافي الأرباح).
- تقارير مالية.

### 3.10 الفواتير (Invoices)
- إنشاء فاتورة للطلب.
- عرض قائمة الفواتير، تفاصيل الفاتورة، حالة الدفع.
- طباعة الفاتورة أو تصديرها PDF.

### 3.11 التقارير (Reports)
- تقارير يومية، أسبوعية، شهرية، سنوية.
- تصدير إلى PDF و Excel.
- تقارير مخصصة (حسب الفلترة).

### 3.12 الإشعارات (Notifications)
- إشعارات داخل النظام (عند إنشاء طلب، تغيير حالة، مهمة جديدة، إلخ).
- شارة (Badge) تعرض عدد الإشعارات غير المقروءة.
- صوت عند وصول إشعار جديد.
- تحديث لحظي (Realtime) عبر Polling أو WebSocket (حسب الإمكانيات).

### 3.13 الرسائل (Messages)
- محادثات داخلية بين المستخدمين.
- إرسال رسائل نصية وملفات.
- البحث في المحادثات.
- حذف الرسائل أو أرشفتها.

### 3.14 الملفات (Files)
- رفع الملفات إلى Google Drive (مرتبطة بالعملاء أو الطلبات).
- معاينة الملفات (صور، PDF، مستندات).
- تحميل الملفات.
- حذف الملفات.
- عرض قائمة الملفات مع البحث والتصفية.

### 3.15 الإعدادات (Settings)
- إعدادات عامة (اسم الشركة، الشعار، المنطقة الزمنية، تنسيق التاريخ).
- إعدادات المستخدم (تغيير كلمة المرور، اللغة، الوضع الليلي).
- إعدادات الإشعارات.

### 3.16 الملف الشخصي (Profile)
- عرض وتعديل معلومات المستخدم الشخصية.
- تغيير الصورة الشخصية.

### 3.17 البحث (Search)
- بحث عام في جميع الكيانات (عملاء، طلبات، موظفين، مهام، إلخ).
- نتائج مفهرسة مع روابط مباشرة.

### 3.18 الأرشيف (Archive)
- أرشفة العناصر المكتملة أو القديمة (طلبات، عملاء، إلخ).
- إمكانية استرجاع من الأرشيف.

### 3.19 سجل النشاطات (Activity Logs)
- سجل تفصيلي لجميع الإجراءات (من قام بماذا ومتى).
- تصفية حسب المستخدم، النوع، التاريخ.

### 3.20 النسخ الاحتياطي (Backup)
- إنشاء نسخة احتياطية يدوية للبيانات (تصدير إلى ملف CSV أو JSON).
- استعادة نسخة احتياطية.

### 3.21 مراقبة النظام (System Monitor)
- عرض حالة النظام، أداء API، وقت الاستجابة، استخدام التخزين.

### 3.22 الدعم ومركز المساعدة (Support / Help Center)
- صفحة دعم (تواصل مع الدعم).
- مركز مساعدة (أسئلة شائعة، دليل استخدام).

---

## 4. المتطلبات غير الوظيفية

### 4.1 الأداء
- زمن تحميل الصفحة الأولي أقل من 3 ثوانٍ.
- زمن استجابة API أقل من 500 مللي ثانية لمعظم الطلبات.
- دعم ما لا يقل عن 100 مستخدم متزامن.

### 4.2 التوافق
- التوافق مع أحدث إصدارات المتصفحات: Chrome، Firefox، Safari، Edge.
- التوافق مع أنظمة التشغيل: Windows، macOS، Linux، Android، iOS.

### 4.3 قابلية التوسع
- إمكانية إضافة وحدات جديدة دون التأثير على الوحدات الحالية.
- تصميم قاعدة البيانات يتيح إضافة حقول جديدة بسهولة.

### 4.4 التوثيق
- توثيق كامل للكود (تعليمات برمجية).
- README يحتوي على تعليمات الإعداد والتشغيل.
- توثيق API (باستخدام Google Apps Script).

### 4.5 الاختبار
- اختبار الوحدات (Unit Testing) للمنطق الأساسي.
- اختبار التكامل (Integration Testing) للـ API.
- اختبار واجهة المستخدم (UI Testing).
- اختبار الأداء والأمان.

---

## 5. نموذج البيانات (الكيانات)

(سيتم تفصيلها في وثيقة ERD)

- **Users:** id، name، email، password، role، avatar، created_at، updated_at.
- **Customers:** id، name، phone، email، address، balance، rating، notes، created_at، updated_at.
- **Employees:** id، user_id (ربط مع Users)، position، salary، hire_date، department، attendance_details.
- **Services:** id، name، description، price، duration، category.
- **Orders:** id، order_number، customer_id، employee_id، service_id، status، priority، created_date، delivery_date، total، paid، notes، qr_code.
- **OrderItems:** id، order_id، service_id، quantity، price، total.
- **Invoices:** id، order_id، invoice_number، issue_date، due_date، subtotal، tax، discount، total، status (paid/unpaid).
- **InvoiceItems:** id، invoice_id، description، quantity، price، total.
- **Transactions:** id، type (income/expense)، category، amount، date، description، reference، related_id (order_id or invoice_id).
- **Attendance:** id، employee_id، date، check_in، check_out، hours، overtime، late_minutes، status.
- **Tasks:** id، title، description، assigned_to، created_by، due_date، priority، status (open/in_progress/done)، kanban_order.
- **Messages:** id، sender_id، receiver_id، subject، body، attachments، read، archived، created_at.
- **Notifications:** id، user_id، type، message، link، read، created_at.
- **Files:** id، name، type، size، drive_file_id، parent_type (customer/order/task)، parent_id، uploaded_by، created_at.
- **Logs:** id، user_id، action، details، ip، timestamp.
- **Settings:** id، key، value، description.
- **Archive:** id، original_table، original_id، data (JSON)، archived_at.

---

## 6. واجهات برمجة التطبيقات (API)

سيتم توفير REST API عبر Google Apps Script مع النقاط التالية (مبدئياً):

- **Auth:** `/api/auth/login` (POST)، `/api/auth/logout` (POST)، `/api/auth/verify` (GET).
- **Users:** `/api/users` (GET, POST)، `/api/users/{id}` (GET, PUT, DELETE).
- **Customers:** `/api/customers` (GET, POST)، `/api/customers/{id}` (GET, PUT, DELETE).
- **Employees:** `/api/employees` (GET, POST)، `/api/employees/{id}` (GET, PUT, DELETE).
- **Services:** `/api/services` (GET, POST)، `/api/services/{id}` (GET, PUT, DELETE).
- **Orders:** `/api/orders` (GET, POST)، `/api/orders/{id}` (GET, PUT, DELETE)، `/api/orders/{id}/status` (PUT).
- **Invoices:** `/api/invoices` (GET, POST)، `/api/invoices/{id}` (GET, PUT, DELETE).
- **Transactions:** `/api/transactions` (GET, POST)، `/api/transactions/{id}` (GET, PUT, DELETE).
- **Attendance:** `/api/attendance` (GET, POST)، `/api/attendance/{id}` (GET, PUT, DELETE).
- **Tasks:** `/api/tasks` (GET, POST)، `/api/tasks/{id}` (GET, PUT, DELETE).
- **Messages:** `/api/messages` (GET, POST)، `/api/messages/{id}` (GET, PUT, DELETE).
- **Notifications:** `/api/notifications` (GET, POST)، `/api/notifications/{id}` (PUT – لتحديث حالة القراءة).
- **Files:** `/api/files` (POST – رفع)، `/api/files/{id}` (GET – تحميل، DELETE).
- **Reports:** `/api/reports/{type}` (GET).
- **Settings:** `/api/settings` (GET, PUT).
- **Logs:** `/api/logs` (GET).
- **Archive:** `/api/archive` (GET, POST), `/api/archive/{id}` (DELETE – استرجاع).

جميع نقاط API تتطلب مصادقة (باستثناء login) وتدعم الصلاحيات.

---

## 7. متطلبات PWA
- ملف Manifest (مع أيقونات، ألوان، اسم التطبيق).
- Service Worker لتخزين الموارد الثابتة مؤقتاً.
- استراتيجية Offline: عرض صفحة غير متصل عند عدم وجود شبكة، مع إمكانية عرض البيانات المخزنة محلياً.
- Background Sync: عند استعادة الاتصال، تتم مزامنة العمليات المعلقة.
- Push Notifications: إرسال إشعارات للمستخدمين (عبر خدمة Push).
- تحميل التطبيق (Install Prompt) عبر المتصفح.

---

## 8. متطلبات النشر والاستضافة
- استضافة Frontend على GitHub Pages.
- نشر Google Apps Script كـ Web App.
- إعداد النطاق (Domain) اختياري.

---

## 9. قيود
- الحد الأقصى لعدد الصفوف في Google Sheets (حوالي 5 ملايين خلية) يجب مراعاته.
- زمن استجابة Google Apps Script قد يكون محدوداً (6 دقائق كحد أقصى لكل تنفيذ).
- يجب تحسين الاستعلامات لتجنب تجاوز حدود التنفيذ.

---

## 10. مراجع
- Notion Design System (مستوحى).
- Google Apps Script Documentation.
- PWA Documentation (MDN).

---

**تمت الموافقة:**  
فريق التطوير  
**التاريخ:** 2026-07-12
