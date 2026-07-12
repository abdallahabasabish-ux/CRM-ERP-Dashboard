# مخطط قاعدة البيانات (ERD + Schema)
## نظام ERP + CRM المتكامل

**الإصدار:** 1.0  
**التاريخ:** 2026-07-12  
**الفريق:** فريق التطوير

---

## 1. مقدمة

تعتمد قاعدة البيانات على **Google Sheets**، حيث يمثل كل جدول (Sheet) كياناً مستقلاً. يتم التعامل مع البيانات كصفائف (صفوف) وأعمدة، مع وجود عمود `id` فريد لكل صف (يُستخدم كمعرّف رئيسي). تم تصميم العلاقات بحيث يتم ربط الجداول عبر معرفات (Foreign Keys) مخزنة في أعمدة مناسبة.

---

## 2. قائمة الجداول (Sheets)

1. **Users**
2. **Customers**
3. **Employees**
4. **Services**
5. **Orders**
6. **OrderItems**
7. **Invoices**
8. **InvoiceItems**
9. **Transactions**
10. **Attendance**
11. **Tasks**
12. **Messages**
13. **Notifications**
14. **Files**
15. **Logs**
16. **Settings**
17. **Archive**

---

## 3. وصف كل جدول مع الأعمدة والأنواع

### 3.1 Users
يخزن بيانات المستخدمين (الموظفين الذين لديهم صلاحية دخول للنظام).

| اسم العمود       | النوع     | الوصف                                           | ملاحظات                     |
|------------------|-----------|-------------------------------------------------|-----------------------------|
| id               | string    | معرف فريد (UUID)                                | المفتاح الرئيسي             |
| name             | string    | الاسم الكامل                                    |                             |
| email            | string    | البريد الإلكتروني (فريد)                        | يستخدم لتسجيل الدخول        |
| password_hash    | string    | كلمة المرور مشفرة (bcrypt)                      |                             |
| role             | string    | الدور (admin, manager, employee, accountant)   |                             |
| avatar           | string    | رابط الصورة الشخصية (من Drive)                  |                             |
| phone            | string    | رقم الهاتف                                      |                             |
| department       | string    | القسم                                           |                             |
| is_active        | boolean   | حالة الحساب (نشط/غير نشط)                       |                             |
| last_login       | datetime  | آخر تاريخ تسجيل دخول                            |                             |
| created_at       | datetime  | تاريخ الإنشاء                                   |                             |
| updated_at       | datetime  | تاريخ آخر تحديث                                 |                             |

**العلاقات:** يرتبط بـ `Employees` (ربط 1-1 عبر `user_id`).

---

### 3.2 Customers
يخزن بيانات العملاء.

| اسم العمود       | النوع     | الوصف                                           | ملاحظات                     |
|------------------|-----------|-------------------------------------------------|-----------------------------|
| id               | string    | معرف فريد (UUID)                                | المفتاح الرئيسي             |
| name             | string    | الاسم الكامل                                    |                             |
| phone            | string    | رقم الهاتف                                      |                             |
| email            | string    | البريد الإلكتروني                               |                             |
| address          | string    | العنوان                                         |                             |
| balance          | number    | الرصيد (مدين/دائن)                              |                             |
| rating           | number    | التقييم (من 1 إلى 5)                            |                             |
| notes            | text      | ملاحظات إضافية                                  |                             |
| avatar           | string    | رابط الصورة الشخصية (من Drive)                  |                             |
| created_at       | datetime  | تاريخ الإنشاء                                   |                             |
| updated_at       | datetime  | تاريخ آخر تحديث                                 |                             |

**العلاقات:** يرتبط بـ `Orders` (1-م) و `Files` (1-م).

---

### 3.3 Employees
يخزن بيانات الموظفين الإضافية (المرتبطة بـ Users).

| اسم العمود       | النوع     | الوصف                                           | ملاحظات                     |
|------------------|-----------|-------------------------------------------------|-----------------------------|
| id               | string    | معرف فريد (UUID)                                | المفتاح الرئيسي             |
| user_id          | string    | معرف المستخدم (من جدول Users)                   | Foreign Key                 |
| position         | string    | المنصب الوظيفي                                  |                             |
| salary           | number    | الراتب الأساسي                                  |                             |
| hire_date        | date      | تاريخ التعيين                                   |                             |
| department       | string    | القسم                                           |                             |
| emergency_contact| string    | رقم هاتف طارئ                                   |                             |
| notes            | text      | ملاحظات إضافية                                  |                             |
| created_at       | datetime  | تاريخ الإنشاء                                   |                             |
| updated_at       | datetime  | تاريخ آخر تحديث                                 |                             |

**العلاقات:** يرتبط بـ `Users` (1-1)، و `Attendance` (1-م)، و `Tasks` (1-م كمُعيَّن له)، و `Orders` (1-م كموظف مسؤول).

---

### 3.4 Services
يخزن قائمة الخدمات المقدمة.

| اسم العمود       | النوع     | الوصف                                           | ملاحظات                     |
|------------------|-----------|-------------------------------------------------|-----------------------------|
| id               | string    | معرف فريد (UUID)                                | المفتاح الرئيسي             |
| name             | string    | اسم الخدمة                                      |                             |
| description      | text      | وصف الخدمة                                      |                             |
| price            | number    | السعر                                           |                             |
| duration         | number    | المدة المتوقعة (بالدقائق)                       |                             |
| category         | string    | التصنيف                                         |                             |
| is_active        | boolean   | متاحة/غير متاحة                                 |                             |
| created_at       | datetime  | تاريخ الإنشاء                                   |                             |
| updated_at       | datetime  | تاريخ آخر تحديث                                 |                             |

**العلاقات:** يرتبط بـ `OrderItems` (1-م).

---

### 3.5 Orders
يخزن بيانات الطلبات.

| اسم العمود       | النوع     | الوصف                                           | ملاحظات                     |
|------------------|-----------|-------------------------------------------------|-----------------------------|
| id               | string    | معرف فريد (UUID)                                | المفتاح الرئيسي             |
| order_number     | string    | رقم الطلب (فريد، تلقائي)                        |                             |
| customer_id      | string    | معرف العميل (من Customers)                      | Foreign Key                 |
| employee_id      | string    | معرف الموظف المسؤول (من Employees)             | Foreign Key                 |
| service_id       | string    | معرف الخدمة الأساسية (اختياري)                  | Foreign Key                 |
| status           | string    | الحالة (new, in_progress, completed, cancelled) |                             |
| priority         | string    | الأولوية (low, medium, high, urgent)            |                             |
| created_date     | datetime  | تاريخ الإنشاء                                   |                             |
| delivery_date    | datetime  | موعد التسليم المتوقع                            |                             |
| total            | number    | الإجمالي                                        |                             |
| paid             | number    | المدفوع                                         |                             |
| notes            | text      | ملاحظات                                         |                             |
| qr_code          | string    | رمز QR (نص أو رابط)                             |                             |
| created_at       | datetime  | تاريخ الإنشاء (نسخة احتياطية)                   |                             |
| updated_at       | datetime  | تاريخ آخر تحديث                                 |                             |

**العلاقات:** يرتبط بـ `Customers` (م-1)، `Employees` (م-1)، `OrderItems` (1-م)، `Invoices` (1-1)، `Transactions` (1-م)، `Files` (1-م).

---

### 3.6 OrderItems
يخزن تفاصيل عناصر الطلب (الخدمات المتعددة داخل طلب واحد).

| اسم العمود       | النوع     | الوصف                                           | ملاحظات                     |
|------------------|-----------|-------------------------------------------------|-----------------------------|
| id               | string    | معرف فريد (UUID)                                | المفتاح الرئيسي             |
| order_id         | string    | معرف الطلب (من Orders)                          | Foreign Key                 |
| service_id       | string    | معرف الخدمة (من Services)                       | Foreign Key                 |
| quantity         | number    | الكمية                                          |                             |
| price            | number    | السعر (قد يختلف عن سعر الخدمة الأساسي)          |                             |
| total            | number    | الإجمالي (quantity * price)                     |                             |
| notes            | text      | ملاحظات                                         |                             |
| created_at       | datetime  | تاريخ الإنشاء                                   |                             |
| updated_at       | datetime  | تاريخ آخر تحديث                                 |                             |

**العلاقات:** يرتبط بـ `Orders` (م-1)، `Services` (م-1).

---

### 3.7 Invoices
يخزن بيانات الفواتير (مرتبطة بالطلبات).

| اسم العمود       | النوع     | الوصف                                           | ملاحظات                     |
|------------------|-----------|-------------------------------------------------|-----------------------------|
| id               | string    | معرف فريد (UUID)                                | المفتاح الرئيسي             |
| invoice_number   | string    | رقم الفاتورة (فريد، تلقائي)                     |                             |
| order_id         | string    | معرف الطلب (من Orders)                          | Foreign Key (1-1)           |
| issue_date       | date      | تاريخ الإصدار                                   |                             |
| due_date         | date      | تاريخ الاستحقاق                                 |                             |
| subtotal         | number    | المجموع الفرعي (قبل الضريبة والخصم)             |                             |
| tax              | number    | الضريبة                                         |                             |
| discount         | number    | الخصم                                           |                             |
| total            | number    | الإجمالي النهائي                                |                             |
| status           | string    | الحالة (paid, unpaid, partially_paid)           |                             |
| notes            | text      | ملاحظات                                         |                             |
| created_at       | datetime  | تاريخ الإنشاء                                   |                             |
| updated_at       | datetime  | تاريخ آخر تحديث                                 |                             |

**العلاقات:** يرتبط بـ `Orders` (1-1)، `InvoiceItems` (1-م)، `Transactions` (1-م).

---

### 3.8 InvoiceItems
يخزن تفاصيل بنود الفاتورة.

| اسم العمود       | النوع     | الوصف                                           | ملاحظات                     |
|------------------|-----------|-------------------------------------------------|-----------------------------|
| id               | string    | معرف فريد (UUID)                                | المفتاح الرئيسي             |
| invoice_id       | string    | معرف الفاتورة (من Invoices)                     | Foreign Key                 |
| description      | string    | وصف البند                                       |                             |
| quantity         | number    | الكمية                                          |                             |
| price            | number    | السعر                                           |                             |
| total            | number    | الإجمالي (quantity * price)                     |                             |
| created_at       | datetime  | تاريخ الإنشاء                                   |                             |

**العلاقات:** يرتبط بـ `Invoices` (م-1).

---

### 3.9 Transactions
يخزن جميع المعاملات المالية (إيرادات ومصروفات).

| اسم العمود       | النوع     | الوصف                                           | ملاحظات                     |
|------------------|-----------|-------------------------------------------------|-----------------------------|
| id               | string    | معرف فريد (UUID)                                | المفتاح الرئيسي             |
| type             | string    | النوع (income, expense)                         |                             |
| category         | string    | التصنيف (مثل: مبيعات، رواتب، إيجار، إلخ)       |                             |
| amount           | number    | المبلغ                                          |                             |
| date             | datetime  | تاريخ المعاملة                                  |                             |
| description      | text      | وصف المعاملة                                    |                             |
| reference        | string    | مرجع (رقم فاتورة، رقم طلب، إلخ)                |                             |
| related_id       | string    | معرف الكيان المرتبط (order_id أو invoice_id)    | اختياري                     |
| created_at       | datetime  | تاريخ الإنشاء                                   |                             |
| updated_at       | datetime  | تاريخ آخر تحديث                                 |                             |

**العلاقات:** يرتبط بـ `Orders` و `Invoices` اختيارياً.

---

### 3.10 Attendance
يخزن سجل الحضور والانصراف للموظفين.

| اسم العمود       | النوع     | الوصف                                           | ملاحظات                     |
|------------------|-----------|-------------------------------------------------|-----------------------------|
| id               | string    | معرف فريد (UUID)                                | المفتاح الرئيسي             |
| employee_id      | string    | معرف الموظف (من Employees)                      | Foreign Key                 |
| date             | date      | التاريخ                                         |                             |
| check_in         | datetime  | وقت الحضور                                      |                             |
| check_out        | datetime  | وقت الانصراف                                    |                             |
| hours            | number    | عدد الساعات (محسوب)                             |                             |
| overtime         | number    | ساعات إضافية                                    |                             |
| late_minutes     | number    | دقائق التأخير                                   |                             |
| status           | string    | الحالة (present, absent, late, excused)         |                             |
| notes            | text      | ملاحظات                                         |                             |
| created_at       | datetime  | تاريخ الإنشاء                                   |                             |
| updated_at       | datetime  | تاريخ آخر تحديث                                 |                             |

**العلاقات:** يرتبط بـ `Employees` (م-1).

---

### 3.11 Tasks
يخزن المهام الموكلة للموظفين.

| اسم العمود       | النوع     | الوصف                                           | ملاحظات                     |
|------------------|-----------|-------------------------------------------------|-----------------------------|
| id               | string    | معرف فريد (UUID)                                | المفتاح الرئيسي             |
| title            | string    | عنوان المهمة                                    |                             |
| description      | text      | وصف المهمة                                      |                             |
| assigned_to      | string    | معرف الموظف المُعيَّن له (من Employees)         | Foreign Key                 |
| created_by       | string    | معرف المستخدم الذي أنشأ المهمة (من Users)       | Foreign Key                 |
| due_date         | datetime  | تاريخ الاستحقاق                                 |                             |
| priority         | string    | الأولوية (low, medium, high, urgent)            |                             |
| status           | string    | الحالة (open, in_progress, done)                |                             |
| kanban_order     | number    | ترتيب البطاقة في لوحة كانبان                    |                             |
| notes            | text      | ملاحظات                                         |                             |
| created_at       | datetime  | تاريخ الإنشاء                                   |                             |
| updated_at       | datetime  | تاريخ آخر تحديث                                 |                             |

**العلاقات:** يرتبط بـ `Employees` (م-1)، `Users` (م-1).

---

### 3.12 Messages
يخزن الرسائل الداخلية بين المستخدمين.

| اسم العمود       | النوع     | الوصف                                           | ملاحظات                     |
|------------------|-----------|-------------------------------------------------|-----------------------------|
| id               | string    | معرف فريد (UUID)                                | المفتاح الرئيسي             |
| sender_id        | string    | معرف المرسل (من Users)                          | Foreign Key                 |
| receiver_id      | string    | معرف المستقبل (من Users)                        | Foreign Key                 |
| subject          | string    | موضوع الرسالة                                   |                             |
| body             | text      | نص الرسالة                                      |                             |
| attachments      | string    | معرفات الملفات المرفقة (مفصولة بفواصل)          |                             |
| read             | boolean   | هل تمت قراءتها؟                                 |                             |
| archived         | boolean   | هل تم أرشفتها؟                                  |                             |
| created_at       | datetime  | تاريخ الإرسال                                   |                             |
| updated_at       | datetime  | تاريخ آخر تحديث                                 |                             |

**العلاقات:** يرتبط بـ `Users` (مرسل ومستقبل).

---

### 3.13 Notifications
يخزن إشعارات النظام للمستخدمين.

| اسم العمود       | النوع     | الوصف                                           | ملاحظات                     |
|------------------|-----------|-------------------------------------------------|-----------------------------|
| id               | string    | معرف فريد (UUID)                                | المفتاح الرئيسي             |
| user_id          | string    | معرف المستخدم (من Users)                        | Foreign Key                 |
| type             | string    | نوع الإشعار (order, task, system, إلخ)          |                             |
| message          | text      | نص الإشعار                                      |                             |
| link             | string    | رابط للانتقال إلى التفاصيل                      |                             |
| read             | boolean   | هل تمت قراءته؟                                  |                             |
| created_at       | datetime  | تاريخ الإنشاء                                   |                             |
| updated_at       | datetime  | تاريخ آخر تحديث                                 |                             |

**العلاقات:** يرتبط بـ `Users` (م-1).

---

### 3.14 Files
يخزن بيانات الملفات المرفوعة على Google Drive.

| اسم العمود       | النوع     | الوصف                                           | ملاحظات                     |
|------------------|-----------|-------------------------------------------------|-----------------------------|
| id               | string    | معرف فريد (UUID)                                | المفتاح الرئيسي             |
| name             | string    | اسم الملف                                       |                             |
| type             | string    | نوع الملف (صورة، PDF، مستند، إلخ)               |                             |
| size             | number    | حجم الملف بالبايت                               |                             |
| drive_file_id    | string    | معرف الملف في Google Drive                      |                             |
| parent_type      | string    | نوع الكيان المرتبط (customer, order, task)      |                             |
| parent_id        | string    | معرف الكيان المرتبط                             | Foreign Key (اختياري)       |
| uploaded_by      | string    | معرف المستخدم الذي رفع الملف (من Users)         | Foreign Key                 |
| created_at       | datetime  | تاريخ الرفع                                     |                             |
| updated_at       | datetime  | تاريخ آخر تحديث                                 |                             |

**العلاقات:** يرتبط بـ `Customers` أو `Orders` أو `Tasks` (اختياري).

---

### 3.15 Logs
يخزن سجل التدقيق (Audit Logs) لجميع العمليات المهمة.

| اسم العمود       | النوع     | الوصف                                           | ملاحظات                     |
|------------------|-----------|-------------------------------------------------|-----------------------------|
| id               | string    | معرف فريد (UUID)                                | المفتاح الرئيسي             |
| user_id          | string    | معرف المستخدم (من Users)                        | Foreign Key (قد يكون null)  |
| action           | string    | نوع الإجراء (create, update, delete, login, إلخ)|                             |
| details          | text      | تفاصيل الإجراء (JSON)                           |                             |
| ip               | string    | عنوان IP للمستخدم                               |                             |
| timestamp        | datetime  | تاريخ ووقت الإجراء                              |                             |

**العلاقات:** يرتبط بـ `Users` (اختياري).

---

### 3.16 Settings
يخزن إعدادات النظام العامة وإعدادات المستخدمين.

| اسم العمود       | النوع     | الوصف                                           | ملاحظات                     |
|------------------|-----------|-------------------------------------------------|-----------------------------|
| id               | string    | معرف فريد (UUID)                                | المفتاح الرئيسي             |
| key              | string    | مفتاح الإعداد (فريد)                            |                             |
| value            | text      | قيمة الإعداد (JSON أو نص)                       |                             |
| description      | text      | وصف الإعداد                                     |                             |
| updated_at       | datetime  | تاريخ آخر تحديث                                 |                             |

**لا توجد علاقات.**

---

### 3.17 Archive
يخزن البيانات المؤرشفة من جداول أخرى.

| اسم العمود       | النوع     | الوصف                                           | ملاحظات                     |
|------------------|-----------|-------------------------------------------------|-----------------------------|
| id               | string    | معرف فريد (UUID)                                | المفتاح الرئيسي             |
| original_table   | string    | اسم الجدول الأصلي                               |                             |
| original_id      | string    | المعرف الأصلي للصف                              |                             |
| data             | text      | البيانات الكاملة للصف (JSON)                    |                             |
| archived_at      | datetime  | تاريخ الأرشفة                                   |                             |
| archived_by      | string    | معرف المستخدم الذي أرشف (من Users)              | Foreign Key                 |

**العلاقات:** يرتبط بـ `Users` (اختياري).

---

## 4. العلاقات (ERD)
Users (1) ---- (1) Employees
Users (1) ---- (0..) Messages (as sender/receiver)
Users (1) ---- (0..) Notifications
Users (1) ---- (0..) Logs
Users (1) ---- (0..) Archive

Employees (1) ---- (0..) Orders (as responsible)
Employees (1) ---- (0..) Attendance
Employees (1) ---- (0..*) Tasks (as assigned_to)

Customers (1) ---- (0..) Orders
Customers (1) ---- (0..) Files (as parent)

Services (1) ---- (0..*) OrderItems

Orders (1) ---- (0..) OrderItems
Orders (1) ---- (1) Invoices
Orders (1) ---- (0..) Transactions
Orders (1) ---- (0..*) Files (as parent)

Invoices (1) ---- (0..) InvoiceItems
Invoices (1) ---- (0..) Transactions

Tasks (1) ---- (0..*) Files (as parent)


---

## 5. أنواع البيانات المستخدمة في Google Sheets

- **string**: نص عادي.
- **number**: رقم عشري (يمكن استخدامه للحسابات).
- **boolean**: صحيح/خطأ (يُخزن كنص "TRUE"/"FALSE" أو 1/0).
- **datetime**: تنسيق تاريخ ووقت (مثل `2026-07-12 14:30:00`).
- **date**: تاريخ فقط (مثل `2026-07-12`).
- **text**: نص طويل (قد يحتوي على سطور متعددة).

جميع التواريخ والتوقيتات تُخزن بتوقيت UTC، ويتم تحويلها في الواجهة حسب المنطقة الزمنية للمستخدم.

---

## 6. فهارس (مفاتيح بحث)

لتسريع البحث والتصفية في Google Sheets، سيتم استخدام وظائف `QUERY` أو `FILTER` مع أعمدة محددة، وسيتم إنشاء أوراق مساعدة (Helper Sheets) إذا لزم الأمر لتخزين الفهارس (مثل: فهرس العملاء حسب الاسم، فهرس الطلبات حسب الحالة).

---

## 7. ملاحظات إضافية

- **المعرفات (IDs):** سيتم استخدام UUID (الإصدار 4) لضمان التفرد عالمياً.
- **الأرقام التلقائية:** مثل `order_number` و `invoice_number` سيتم توليدها بتسلسل رقمي متزايد يتم تخزينه في جدول `Settings` (مفتاح `next_order_number` و `next_invoice_number`).
- **التحديثات:** جميع الجداول تحتوي على `created_at` و `updated_at` لتتبع التغييرات.
- **الأرشفة:** عند حذف سجل من جدول رئيسي، يتم نقله إلى جدول `Archive` مع الاحتفاظ بجميع البيانات.
- **الصلاحيات:** لا توجد أعمدة صلاحيات في الجداول، بل يتم إدارتها عبر دور المستخدم في جدول `Users`.

---

**تمت المراجعة:**  
فريق التطوير  
**التاريخ:** 2026-07-12
