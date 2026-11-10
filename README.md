إليك ترجمة وتنسيق المحتوى كاملاً باللغة العربية:

---

# واجهة Lamma البرمجية (Lamma API) — الخلفية التقنية (Laravel Backend)

PHP / Laravel (11 أو 12) · MySQL · Sanctum (مصادقة جلسات SPA عبر ملفات تعريف الارتباط الكوكيز) · Reverb + Echo (اتصالات الويب سكت - WebSockets) · طوابير الانتظار (Queues).
هذا المجلد يعتبر **إضافة أساسية (Overlay)**: كود نظام Lamma الذي يُضاف فوق مشروع Laravel جديد تماماً (بحيث تحصل دائماً على الهيكل الرسمي المُحدث).

> **حالة المشروع بصراحة:** تم فحص كل ملف PHP من حيث صحة البناء البرمجي (`php -l`، مع PHP 8.3). وتم التحقق منها بالعمل الفعلي في بيئة PHP العادية: كود التحقق الثنائي 2FA/TOTP (معيار RFC 6238)، وحماية الثغرات SSRF (42 حالة لعناوين وروابط IP)، ومحلل Open Graph، وباني استعلامات البحث المتقدم FULLTEXT (تم إجراء 74 اختباراً ونجحت جميعها).
> لم أتمكن من **تشغيل إطار عمل Laravel نفسه** في بيئتي (لأن Composer/Packagist محظور هناك)، لذا فإن ملفات الترحيل (Migrations)، واجهات API، ومجموعة الاختبارات في مجلد `tests/` **لم يتم تنفيذها أو تشغيلها بعد**. قم بتشغيل الأمر `php artisan test` أولاً — وإذا فشل أي شيء، أرسل لي مخرجات الخطأ وسأقوم بإصلاحه.

## 1) المتطلبات الأساسية

| الأداة | الإصدار |
| --- | --- |
| PHP | الإصدار 8.2+ مع تفعيل الإضافات التالية: `mbstring, xml, curl, pdo_mysql, fileinfo, gd أو imagick` (للتحقق من الصور) |
| Composer | الإصدار 2.x |
| قاعدة بيانات MySQL | الإصدار 8+ (أو MariaDB 10.6+) — أنشئ قاعدة بيانات فارغة باسم `lamma` |
| Node.js | الإصدار 18+ (مطلوب فقط لأن الأمر `install:broadcasting` قد يقترح تثبيت حزم JavaScript — اختر "لا / no") |

أنظمة ويندوز: يمكنك استخدام Laragon أو XAMPP + Composer؛ قم بتشغيل الأوامر أدناه عبر نافذة Git Bash، أو اتبع الخطوات اليدوية.

## 2) التثبيت (التثبيت التلقائي)

```bash
bash setup.sh            # ينشئ المجلد ../lamma-api-app، ويُثبت Sanctum و Reverb، ونسخ هذا الكود، ثم يقوم بالترحيل (migrate) والبذر (seed)

```

### …أو التثبيت يدوياً

```bash
composer create-project laravel/laravel lamma-api-app
cd lamma-api-app
php artisan install:api                    # لتثبيت Sanctum
php artisan install:broadcasting --reverb    # Reverb + Echo، ويقوم بتوليد مفاتيح REVERB_*
# انسخ محتويات هذا المجلد إلى المشروع الجديد (اختر الاستبدال عند السؤال): app/ bootstrap/ config/ database/ routes/ tests/
# أضف محتويات الملف .env.additions إلى ملف .env (ثم احذف المفاتيح المكررة مثل DB_* و SESSION_DRIVER)
php artisan key:generate
php artisan migrate:fresh --seed
php artisan storage:link

```

الحزم المُستخدمة: فقط `laravel/sanctum` و `laravel/reverb` (وكلاهما يُثبت تلقائياً عبر الأوامر أعلاه). **لا توجد حاجة لأي حزم Composer أخرى.**

## 3) التشغيل (تتطلب 3 نوافذ طرفية / Terminals)

```bash
php artisan serve                    # http://localhost:8000
php artisan reverb:start --debug    # خادم الاتصالات الحية WebSockets على المنفذ :8080
php artisan queue:work              # معالجة البث والإشعارات (أو اجعل QUEUE_CONNECTION=sync في ملف .env خلال مرحلة التطوير)
php artisan schedule:work           # اختياري: لحذف الحالات منتهية الصلاحية أو الملفات المرفوعة اليتيمة

```

حسابات البذر الافتراضية (Seed accounts): **admin@lamma.test / password** (حساب المشرف) + 20 مستخدماً عشوائياً (كلمة المرور لجميعهم هي `password`).
الرسائل البريدية (مثل التحقق أو إعادة تعيين كلمة المرور) يتم توجيهها إلى الملف `storage/logs/laravel.log` طالما أن الإعداد `MAIL_MAILER=log`.

## 4) الاختبارات (Tests)

```bash
php artisan test

```

تغطي الاختبارات: `tests/Feature/AuthTest.php`, `MessagingTest.php` (التحقق من الصلاحيات/معرفات الموارد المتقاطعة IDOR، المعالجة الآمنة للتكرار Idempotency، الترقيم Pagination، الحظر، المرفقات…)، و `CallsTest.php` (إشارات الاتصال، حالة المشغولية، انتهاء الصلاحية، بيانات اعتماد TURN)، و `SearchAndLinksTest.php` (البحث، حماية SSRF، المعاينة الروابط، الرسائل العربية)، بالإضافة إلى `tests/Unit/TwoFactorTest.php`.
تستخدم الاختبارات قاعدة بيانات SQLite في الذاكرة (وهو الإعداد الافتراضي لـ Laravel في ملف `phpunit.xml`)، لذا تأكد من تثبيت امتداد `pdo_sqlite`.

## 5) الهيكل المعماري للنظام (Architecture)

```
app/
├── Models/              User, Conversation (+pivot), Message, Attachment, Reaction, PollOption/Vote, Contact, Status…, Call, Report, ActivityLog, Setting
├── Http/
│   ├── Controllers/Api/        Auth, Profile, User, Conversation, Message, Upload, Group, Contact, Notification, Status, Call, Search, Report
│   ├── Controllers/Api/Admin/  Stats, User, Group, Report, System
│   ├── Resources/              أشكال بيانات JSON التي يتوقعها تطبيق تفاعلي React (راجع مستندات docs/API.md)
│   └── Middleware/             EnsureUserIsAdmin, TouchLastSeen (التواجد النشط)، SetLocale
├── Policies/            ConversationPolicy (الإدارة/النشر)، MessagePolicy (التعديل/الحذف)
├── Services/            ConversationService, ReceiptService (تم التسليم/تمت القراءة)، TwoFactor (TOTP)، NotifyService
├── Events/              UserBroadcast أساسي + MessageSent/Edited/Deleted/ReactionAdded/Delivered/Read, UserJoinedGroup/LeftGroup
└── Support/Sql.php      مساعد للهروب من أحرف البحث LIKE (LIKE-escaping helper)
routes/api.php · routes/channels.php · routes/console.php (المجدول)
database/migrations (يستبدل جدول المستخدمين الافتراضي في لارافل) · factories · seeders

```

### القرارات التصميمية الرئيسية

* **الأمان والتحقق بالبناء (Authorization by construction):** يتم جلب المحادثات والرسائل دائماً من خلال عضويات المُستدعي نفسه -> الأشخاص الخارجيون يحصلون على خطأ **404** (بدون أي تسريب لوجود البيانات أو ثغرات IDOR)؛ وتتم مراجعة الأدوار الصارمة عبر السياسات Policies (وترجع **403**).
* **الإرسال الآمن والمتكرر (Idempotent sending):** الحقل المركب `(sender_id, client_id)` فريد (Unique)، مما يسمح للواجهة الأمامية ذات التحديث الاستباقي (Optimistic UI) بإعادة محاولة الإرسال بأمان دون تكرار.
* **محادثة خاصة واحدة لكل زوج من المستخدمين:** مفتاح فريد `conversations.private_key = "minId:maxId"`.
* **الحالة الخاصة بكل مستخدم:** (التثبيت Pin، كتم الصوت Moted، الأرشفة Archived، المسودة Draft، آخر رسالة مقروءة، المسح حتى تاريخ معين، الإخفاء) تخزن في الجدول الوسيط `conversation_user`؛ وحذف المحادثة أو مسح سجلها يؤثر على المُستدعي وحده.
* **إيصالات القراءة والاستلام:** صفوف مخصصة لكل مستقبل + أعمدة مجمعة `delivered_at / read_at` على الرسالة (لكل المستلمين) -> تظهر بعلامات الصح ✓ / ✓✓ / علامة الصح المزدوجة الزرقاء؛ ويمكن للمستخدمين تعطيل إرسال إيصالات القراءة.
* **عدادات الرسائل غير المقروءة:** يتم حسابها في استعلام مجمع واحد لكل استدعاء لقائمة المحادثات.
* **الملفات المرفوعة (Uploads):** أسماء عشوائية للملفات، قائمة حظر امتدادات صارمة (php, html, svg, exe…)، والحد الأقصى للحجم يُحدد من لوحة المشرف، ولا يمكن إرفاق الملف إلا بواسطة الشخص الذي رفعه ولمرة واحدة فقط؛ ويتم تنظيف الملفات اليتيمة يومياً.
* **الأساسيات الأمنية:** قوائم الحماية من التعبئة الجماعية (Mass-assignment whitelists) بحيث تكون الحقول `is_admin` و `blocked_at` غير قابلة للتعبئة المباشرة، كلمات مرور مشفرة، رموز استعادة أحادية الاستخدام ومشفرة، تجديد الجلسة عند تسجيل الدخول، مسح الجلسات عند إعادة تعيين كلمة المرور أو حظر المستخدم عبر المشرف، توقيت ثابت لعمليات تسجيل الدخول لمنع تخمين البريد الإلكتروني (No email enumeration)، معدلات طلبات محدودة ومحمية (Rate limits مثل: `login` بـ 5 طلبات/دقيقة، `auth-sensitive`، `messages`، `uploads`، `api`)، البريد الإلكتروني مرئي فقط للمالك أو المشرف، البحث مقصور حصراً على محادثاتك الخاصة، ويتم الهروب من رموز البحث الخاصة (LIKE wildcards).
* **الوقت الفعلي (Realtime):** يُبث كل حدث إلى القناة الخاصة `private-user.{id}` لكل مشارك (`->toOthers()`)؛ حالة الكتابة (Typing) تُدار عبر التنبيهات الحية (Client whispers) على قناة التواجد `presence-conversation.{id}`؛ و"متواجد الآن" تعتمد على علم تخزين مؤقت (Cache flag) مدته دقيقتين يتم تحديثه تلقائياً مع طلبات API.

---

## 5ب) الجديد في هذا الإصدار

**إشارات WebRTC للمكالمات (WebRTC signalling for calls)** — تتضمن `CallController` + `CallService` + الأحداث `CallIncoming / CallAnswered / CallIce / CallEnded`.
آلية العمل: المُتصل يُرسل `POST /api/calls/start {callee_id, kind, sdp}` -> يستقبل المُتلقي حدث `CallIncoming` (مُتضمنًا عرض الاتصال) -> يقوم المُتلقي بإرسال `POST /answer {sdp}` -> يستقبل المُتلقي الأول حدث `CallAnswered`؛ وتبادل معلومات الاتصال عبر الشبكة (ICE) يتم من خلال `POST /ice` ⇄ `CallIce`؛ وإنهاء المكالمة يتم عبر `POST /api/calls/end | /decline` -> `CallEnded`. تتدفق الوسائط (Media) مباشرة بين الأقران P2P (أو عبر خادم TURN).
فقط المشاركان الاثنان هما من يمكنهما التعامل مع المكالمة (يظهر خطأ 404 للآخرين)، والمستخدمون المشغولون يحصلون على الاستجابة `409 {reason:"busy"}`، والمستخدمون المحظورون يحصلون على `403`، وتتم مراجعة أحجام بيانات SDP و ICE بدقة والحد منها.
المكالمات التي لم يُرد عليها تتحول إلى حالة *فائتة (missed)* بعد 60 ثانية (يقوم المجدول `schedule:work` بتشغيل الأمر `calls:expire` كل دقيقة) ويتلقى المستقبل إشعالاً بذلك.
نقطة الاتصال `GET /api/calls/pending` تُرجع المكالمة التي لا تزال ترن بينما كان التطبيق مغلقاً أو جاري إعادة الاتصال به.

**خادم TURN** (مطلوب للمستخدمين خلف حواجز NAT الصارمة أو شبكات المحمول): قم بتشغيل خادم coturn باستخدام إعداد `use-auth-secret` وحدد متغيرات البيئة `TURN_HOST`, `TURN_PORT`, `TURN_SECRET` في ملف `.env`؛
بعدها تمنح نقطة الاتصال `GET /api/calls/ice-servers` **بيانات اعتماد محدودة المدة الزمنية** (عبر خوارزمية HMAC، `TURN_TTL`). وبدونها يتم الاكتفاء بخدمات STUN العامة فقط.
**حجم رسائل Reverb:** عروض الاتصال SDP التي تتضمن فيديو قد تتجاوز حجماً قدره 10 كيلوبايت. في ملف `config/reverb.php` قم بزيادة القيمة `apps.apps[0].max_message_size` إلى `65536` (وفي قسم `options` لضمان التوافق مع حدود Pusher).

**معاينة الروابط (Link previews)** — الطلب `GET /api/link-preview?url=` يقوم بجلب الصفحة *على مستوى الخادم* عبر خدمة (`LinkPreviewService`):
يقوم الحارس `UrlGuard` بحظر الروابط غير الداعمة لبروتوكول http/s، وحظر بيانات المصادقة المدمجة في الروابط، والمنافذ الغريبة، وعناوين loopback المحلية أو نطاقات الشبكات الداخلية أو عناوين الميتاداتا والشبكات المحجوزة IPv4 و IPv6 (بما في ذلك الأنواع المُحولة mapped/NAT64/6to4)؛
يتم **تثبيت عنوان IP** المُتحقق منه (`CURLOPT_RESOLVE` لتجنب هجمات DNS-rebinding)، ويتم تتبع عمليات إعادة التوجيه يدوياً وإعادة التحقق منها عند كل خطوة تحويل (بحد أقصى 3 مرات)، بمهلة زمنية 5 ثوانٍ، وبحد أقصى لحجم الملف 512 كيلوبايت، وملفات `text/html` حصراً، ويتم تخزين المعاينة مؤقتاً لمدة 24 ساعة.
صور المعاينة تُرجع كرابط (ويقوم المتصفح بتحميلها مع تفعيل رأسية `referrerPolicy=no-referrer`)؛ وإذا كنت ترغب بتجنب أي اتصال بأطراف ثالثة، أضف نقطة وكيل صور (image-proxy).

**البحث المتقدم FULLTEXT** — ترحيل قاعدة البيانات `2026_10_06_000002` يضيف فهارس بحث FULLTEXT (على حقول messages.body, attachments.name, users name+username, conversations.name) في قواعد بيانات MySQL/MariaDB.
تقوم الفئة `App\Support\FullText` ببناء استعلام منطقي آمن يدعم البحث بالمطابقة البادئة (`+launch* +cod*`) مع العودة تلقائياً للاستعلام البديل المُعالج `LIKE` عندما يتعذر على محرك قاعدة البيانات استيفاؤه بشكل صحيح (مثل محرك SQLite، أو الكلمات الأقصر من الحد الأدنى `innodb_ft_min_token_size`=3، أو الكلمات الشائعة stop-words فقط). تستخدم هذه التقنية في قائمة البحث عن المحادثات والبحث الشامل. بالنسبة للمحتوى بلغات الشرق الأقصى (CJK) أنشئ الفهارس باستخدام المعالج `WITH PARSER ngram`.
بعد تعديل قيمة `innodb_ft_min_token_size` قم بإعادة بناء الفهارس بتنفيذ الأمر (`OPTIMIZE TABLE messages`).

**رسائل خادم باللغة العربية** — تم توفير ملفات `lang/ar/{auth,passwords,pagination,validation}.php` (لتغطية كافة قواعد Laravel 11 مع أسماء الحقول) بالإضافة إلى ملف `lang/ar.json` للرسائل المخصصة.
يقوم الوسيط `SetLocale` باختيار لغة المستخدم المُفضلة (أو اعتماداً على ترويسة المتصفح `Accept-Language` للزوار؛ حيث يرسلها تطبيق React مع كل طلب). استجابات الأخطاء JSON مثل 404/403/401 لا تكشف أبداً عن أسماء النماذج البرمجية الداخلية.
يمكنك إضافة أي لغة لاحقاً بإنشاء مجلد `lang/<code>/` جديد وإضافة الرمز البرمجي إلى وسيط `SetLocale` / وقواعد التحقق `locale`.

---

## 6) ربط تطبيق React الخلفي

في ملف البيئة للواجهة الأمامية `.env`: اجعل القيم كالتالي `VITE_USE_MOCKS=false`، و `VITE_API_URL=http://localhost:8000`، و `VITE_REVERB_APP_KEY=<REVERB_APP_KEY>`، مع مطابقة إعدادات الخادم والمنفذ وبروتوكول الاتصال كما هي في لارافل.
افتح التطبيق على الرابط **`http://localhost:5173`** (نفس النطاق والموقع الخاص بواجهة API، وإلا فلن تنتقل ملفات تعريف الارتباط الكوكيز — استخدم `localhost` لكيهما، ولا تستخدم `127.0.0.1` لأحدهما والآخر `localhost`).

الواجهة الأمامية مهيأة مسبقاً وتتضمن التعديلات اللازمة لهذه واجهة البرمجة (مثل الصور الرمزية متعددة الأجزاء multipart، وسائط الحالة، إعدادات الخصوصية عبر `PUT /api/user/preferences`، النجوم على مستوى الخادم، التحقق من البريد الإلكتروني عبر الرابط، ترويسة `Accept-Language`، مكالمات WebRTC، ومعاينات الروابط).
الجزئية التي تفتقر لتكامل الخلفية حالياً: شاشة **التحقق من الجهاز الجديد** (`/verify-device`) — بينما تم تنفيذ المصادقة الثنائية 2FA ورموز الاستعادة بالكامل.

---

## 7) مهام لم تُنفذ بعد / الخطوات القادمة

* المكالمات الجماعية (إشارات الاتصال تدعم الاتصال الفردي 1-لـ-1؛ المكالمات الجماعية تتطلب خادم SFU مثل LiveKit أو mediasoup).
* تحدي التحقق من تسجيل الدخول عبر الأجهزة الجديدة، إشعارات الدفع (FCM/APNs/Web Push)، وملخصات الرسائل البريدية اليومية.
* تسوية عمليات البحث باللغة العربية (توحيد أشكال الهمزات، الياء، التاء المربوطة، والحركات) — ويُفضل إتمامها عند وقت الكتابة في عمود مخصص ومُهيكل (Normalised column).
* تحصين نظام الإنتاج (Production hardening): تفعيل بروتوكول HTTPS، وضبط `SESSION_SECURE_COOKIE=true`, واستخدام أداة Supervisor لإدارة `queue:work` + `reverb:start`, واستخدام Redis للتخزين المؤقت والطوابير، وتخزين الملفات على سحاب Amazon S3.
