إليك ترجمة متكاملة وواضحة للنص إلى اللغة العربية:

---

### لمّة (Lamma) — العميل البرمجي لشبكة الويب (Web client)

واجهة متبادلة (أمامية) للرسائل الفورية في الوقت الفعلي، ثنائية اللغة (عربي من اليمين إلى اليسار RTL / إنجليزي من اليسار إلى اليمين LTR). مبنية باستخدام React (JavaScript + JSX) و Vite و Tailwind CSS. تعمل مباشرة ببيئة خادم تحاكي البيانات في الذاكرة (in-memory mock backend)، ويمكن ربطها بـ Laravel API (راجع مشروع lamma-api) بمجرد تغيير مفتاح تشغيل واحد.

#### 1) التثبيت والتشغيل

يتطلب وجود بيئة Node.js بإصدار 18.18+ (يُوصى بإصدار 20 LTS الممتد الدعم).

```bash
npm install
npm run dev          # التشغيل المحلي على http://localhost:5173
npm run build        # حزمة الإنتاج النهائي ← dist/
npm run check:i18n   # يعرض مفاتيح t('…') المفقودة من src/locales (يتطلب python3)

```

**الحزم المعتمدة (مذكورة في package.json):**
`react`, `react-dom`, `react-router-dom@6`, `zustand`, `axios`, `laravel-echo`, `pusher-js`, `lucide-react`؛ **وأدوات التطوير:** `vite`, `@vitejs/plugin-react`, `tailwindcss@3`, `postcss`, `autoprefixer`.

**تسجيل الدخول في وضع المحاكاة (Mock mode):**

* أعدّ تسجيل الدخول بأي بريد إلكتروني + كلمة المرور: `password`.
* إذا كان البريد يحتوي على كلمة `2fa` ← رمز التحقق هو `123456` (ورمز الاستعادة `recovery-1234`).
* مسار التوثيق `/verify-device` الرمز الخاص به هو `654321`.
* مستخدم المحاكاة يملك صلاحيات المسؤول `/admin`.
* **المكالمات في وضع المحاكاة:** انتقل إلى Calls ← اختار "Simulate incoming call" (محاكاة مكالمة واردة)، أو اتصل بأي شخص من المحادثة (سيتم تدوير الكاميرا الخاصة بك لتظهر كفيديو "طرف آخر"، أما المستخدم رقم #9 فسينهي الاتصال بحالة "مشغول").

---

#### 2) استخدام خادم Laravel الحقيقي (Backend)

قم بنسخ الملف من `.env.example` إلى `.env`:

```env
VITE_USE_MOCKS=false
VITE_API_URL=http://localhost:8000
VITE_REVERB_APP_KEY=<REVERB_APP_KEY من مشروع Laravel>
VITE_REVERB_HOST=localhost
VITE_REVERB_PORT=8080
VITE_REVERB_SCHEME=http

```

افتَح التطبيق عبر `http://localhost:5173` وقم بتشغيل واجهة البرمجة (API) على `http://localhost:8000` (كلاهما على localhost ضمن نفس الموقع ← مما يضمن عمل ملفات تعريف الارتباط الخاص بـ Sanctum تلقائيًا). لن تحتاج لتغيير أي شيء داخل المكونات أو الصفحات أو المتاجر ضمن الميزات `features/*/`.

---

#### 3) هيكلية المجلدات (Feature-Sliced Architecture مع المسار المختصر `@` لـ `src`)

```text
src/
├── main.jsx                 نقطة الدخول الرئيسية (المزودات + الموجه)
├── app/                     جذر التجميع: App، AppRoutes، الحمايات (guards)، التخطيط AppLayout، الخطافات (بدء التشغيل اللحظي، تنبيهات API)، وسطحةNotFound
├── shared/                  أكواد برمجية قابلة للإعادة الاستخدام وغير مرتبطة بميزة محددة:
│   ├── ui/                  عناصر نظام التصميم الأساسية (Button, Input, Modal, Menu, Toggle, Avatar, Logo …)
│   ├── components/          مبدل اللغة LanguageSwitcher، مبدل المظهر ThemeSwitcher
│   ├── context/             مزودات اللغة والمظهر والتنبيهات (Toast)
│   ├── i18n/                الإعدادات، الترجمة (الجمع والتضمين)، ومنسقات Intl
│   ├── hooks/ lib/ api/ models/ store/
│   │                        useApiForm, useAsync … · ApiError, apiEvents · عميل axios · نماذج JSDoc · حالات الواجهة والنوافذ
├── features/                مجلد لكل ميزة في المنتج، يحتوي كل منها على نفس المجلدات الفرعية عند الحاجة:
│   │                        components/ · pages/ · hooks/ · store/ · services/ · lib/
│   ├── auth  users  chat  groups  contacts  status  calls  notifications  search  profile  settings  admin
│   └── calls/webrtc/        جلسة PeerSession (اتصال WebRTC حقيقي) · جلسة LoopbackSession (محاكاة) · دالة createSession()
├── realtime/                خدمة realtimeService (الواجهة الوحيدة التي يتعامل معها React للوقت الفعلي) + الموصلات echoDriver | mockDriver
├── mocks/                   محاكي خادم Laravel داخل الذاكرة (البيانات + محول axios + المسارات)
├── locales/{ar,en}/*.json   جميع نصوص واجهة المستخدم
└── config/env.js

```

**القواعد:**

* يمكن للميزات (`features`) استخدام مجلد `shared/` والخدمات/المتاجر الخاصة بالميزات الأخرى.
* يُمنع لمجلد `shared/` الاستيراد من أي ميزة (`features`).
* الخدمات (`services/`) هي الوحيدة المسؤولة عن بروتوكول HTTP.
* مجلد `realtime/` هو المسؤول الوحيد عن اتصالات WebSockets.

---

#### 4) ما الجديد في هذا الإصدار؟

* **مكالمات WebRTC الصوتية والمرئية (`features/calls`):** تبادل الإشارات عبر API و Reverb (إحداثيات: CallIncoming / Answered / Ice / Ended)، استخدام تقنية Trickle ICE مع إدارة الطوابير، استخراج خوادم STUN/TURN من `/api/calls/ice-servers`، كتم الصوت، تشغيل/إيقاف الكاميرا، التبديل بين الكاميرات، مشاركة الشاشة، المهلة الزمنية للرنين (60 ثانية)، التعامل مع حالة المشغول، إدارة أخطاء الصلاحيات، واستعادة المكالمات الواردة بعد إعادة الاتصال عبر `/calls/pending`.
* **معاينة الروابط:** إنشاء معاينات من الخادم عبر `/api/link-preview` مع خيار بديل (domain-chip) في حال تعذر الجلب.
* **رفع الملفات متعددة الأجزاء (Multipart uploads):** للصور الشخصية، صور المجموعات، والحالات (صور وفيديوهات).
* **إعدادات الخصوصية من جانب الخادم:** الرسائل المميزة بنجمة، التوثيق عبر رابط البريد الإلكتروني، وتمرير ترويسة `Accept-Language` مع كل طلب (ليجيب الـ API باللغة العربية أو الإنجليزية حسب الطلب).
* **بنية مجلدات نظيفة مقسمة حسب الميزات:** الاعتماد على الاستيراد عبر المسار المختصر `@/` (تم نقل 114 ملفًا وإعادة كتابة مسارات الاستيراد تلقائيًا).

--- scroll) دون استخدام التقنيات الشبيهة بـ (windowed virtualization).
