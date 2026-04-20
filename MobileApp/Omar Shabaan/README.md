# GeoTrack — 

<div align="center">

![React Native](https://img.shields.io/badge/React_Native-0.74-blue?logo=react)
![Expo](https://img.shields.io/badge/Expo-51-black?logo=expo)
![Firebase](https://img.shields.io/badge/Firebase-10-orange?logo=firebase)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green)

تطبيق موبايل لتسجيل حضور الطلاب في المحاضرات الجامعية باستخدام QR Code و GPS و السيلفي والتحقق العشوائي

</div>

---

## المحتويات

- [نظرة عامة](#نظرة-عامة)
- [المميزات](#المميزات)
- [هيكل المشروع](#هيكل-المشروع)
- [المتطلبات](#المتطلبات)
- [التثبيت](#التثبيت)
- [إعداد Firebase](#إعداد-firebase)
- [تشغيل المشروع](#تشغيل-المشروع)
- [شاشات التطبيق](#شاشات-التطبيق)
- [قاعدة البيانات](#قاعدة-البيانات)
- [الأمان](#الأمان)
- [البناء والنشر](#البناء-والنشر)

---

## نظرة عامة

GeoTrack هو تطبيق React Native يحل مشكلة تسجيل الحضور اليدوي في الجامعات. يوفر نظاماً متكاملاً للدكاترة والطلاب مع تحقق متعدد الطبقات يضمن دقة الحضور.

```
الدكتور يبدأ جلسة  →  الطالب يمسح QR  →  GPS يتحقق من الموقع  →  سيلفي للتأكيد البصري
                                        ↓
                           تحقق عشوائي أثناء المحاضرة
```

---

## المميزات

### للدكتور
| الميزة | الوصف |
|--------|-------|
| **بدء جلسة** | إنشاء جلسة محاضرة مع QR Code فوري |
| **GPS Geofencing** | تحديد نطاق القاعة بالمتر، الطلاب خارجه يُسجَّلون غائبين |
| **التحقق العشوائي** | إرسال تحقق مفاجئ أثناء المحاضرة، من لا يرد خلال 120 ثانية يُغيَّب |
| **سيلفي الحضور** | إلزام الطالب بالتقاط صورة عند التسجيل للتأكيد البصري |
| **اختبار AI** | توليد اختبار MCQ بالذكاء الاصطناعي من ملف PDF المحاضرة |
| **تصدير التقارير** | تصدير كشف الحضور PDF أو CSV مع الإحصائيات |
| **تتبع المواقع** | رؤية مواقع الطلاب real-time على خريطة الجلسة |

### للطالب
| الميزة | الوصف |
|--------|-------|
| **مسح QR** | تسجيل الحضور بمسح كود الدكتور |
| **إدخال يدوي** | إدخال كود الجلسة يدوياً كبديل |
| **إشعارات فورية** | إشعار عند بدء محاضرة في مادة مسجّل فيها |
| **بادج التحقق العشوائي** | تنبيه فوري مع عداد تنازلي عند إرسال الدكتور تحققاً |
| **نسب الحضور** | عرض نسبة الحضور لكل مادة مع progress bar |
| **ملف PDF** | تحميل ملف المحاضرة مباشرة من التطبيق |
| **الاختبار** | حل اختبار MCQ أثناء المحاضرة |

---

## هيكل المشروع

```
app/
├── professor/                      # شاشات وخدمات الدكتور
│   ├── ProfessorPanel.tsx          # لوحة التحكم الرئيسية
│   ├── ProfessorCoursesScreen.tsx  # عرض المواد
│   ├── ProfessorAttendanceScreen.tsx # كشوف الحضور + التصدير
│   ├── ProfessorSessionsScreen.tsx # إنشاء جلسة جديدة
│   ├── ProfessorScheduleScreen.tsx # الجدول الدراسي
│   ├── ProfessorMaterialsScreen.tsx # رفع PDF
│   ├── ProfessorQuizScreen.tsx     # إدارة الاختبارات
│   ├── LectureDetailScreen.tsx     # تفاصيل جلسة نشطة + QR + GPS
│   ├── professorService.ts         # Firestore queries للدكتور
│   ├── quizService.ts              # Gemini AI + quiz logic
│   ├── reportService.ts            # تصدير PDF/CSV
│   ├── randomCheckService.ts       # التحقق العشوائي
│   ├── notificationService.ts      # Push notifications
│   ├── selfieService.ts            # التقاط وتحميل السيلفي
│   ├── SelfieCapture.tsx           # مكوّن السيلفي
│   ├── geoService.ts               # GPS + Haversine distance
│   └── types.ts                    # TypeScript interfaces
│
├── student/                        # شاشات الطالب
│   ├── StudentPanel.tsx            # لوحة الطالب الرئيسية
│   ├── StudentCoursesScreen.tsx    # مواد الطالب
│   ├── StudentQRScanner.tsx        # كاميرا مسح QR
│   ├── StudentQuizScreen.tsx       # حل الاختبار
│   ├── LectureJoinScreen.tsx       # تأكيد الانضمام للجلسة
│   ├── ManualEntryScreen.tsx       # إدخال كود يدوي
│   ├── ScanHistoryScreen.tsx       # سجل المسح
│   └── studentService.ts           # Firestore writes للطالب
│
└── _layout.tsx                     # App root + notification setup
```

---

## المتطلبات

```
Node.js          >= 18.0
npm / yarn       latest
Expo CLI         >= 0.18
```

**حسابات مطلوبة:**
- [Firebase Console](https://console.firebase.google.com) — مجاني للبداية
- [Expo Account](https://expo.dev) — مجاني
- [Google AI Studio](https://aistudio.google.com) — للحصول على Gemini API key

---

## التثبيت

```bash
npm install

npx expo install expo-location
npx expo install expo-camera
npx expo install expo-image-picker
npx expo install expo-notifications
npx expo install expo-print
npx expo install expo-sharing
npx expo install expo-file-system
npx expo install expo-device
npx expo install @react-native-async-storage/async-storage

```
---

## تشغيل المشروع

```bash
# تشغيل على Android
npx expo start --android
```

---اريد اضافة اى جزء من تلك ال feature ناقص 
push notification - send session start alert to student
random check - impealment random attendance verification trigger
selfie upload - storage integration for attendance reports 
attendance reports - export to excel/pdf endpoint
### تدفق الدكتور
```
تسجيل الدخول
    ↓
ProfessorPanel (Dashboard)
    ├── بدء جلسة جديدة
    │       ├── اختيار المادة
    │       ├── تفعيل GPS (اختياري) → تحديد النطاق بالمتر
    │       ├── تفعيل التحقق العشوائي (اختياري)
    │       └── تفعيل سيلفي الحضور (اختياري)
    │
    ├── تفاصيل جلسة نشطة
    │       ├── تاب QR  → عرض الكود + زر التحقق العشوائي
    │       ├── تاب الحضور → قائمة الطلاب real-time
    │       └── تاب GPS → مواقع الطلاب + من خرج من النطاق
    │
    ├── كشف الحضور → تصدير PDF / CSV
    ├── رفع PDF المحاضرة
    └── توليد اختبار بالذكاء الاصطناعي
```

### تدفق الطالب
```
تسجيل الدخول
    ↓
StudentPanel
    ├── جلسة نشطة
    │       ├── مسح QR → تأكيد الجلسة → سيلفي (إذا مفعّل)
    │       ├── إدخال كود يدوي
    │       ├── تحقق عشوائي → banner + عداد + تأكيد
    │       ├── تنزيل PDF المحاضرة
    │       └── حل الاختبار
    │
    ├── نسب الحضور لكل مادة
    └── الجدول الدراسي
```

---

## الأمان

| الطبقة | الآلية |
|--------|--------|
| **المصادقة** | Firebase Auth — كل request يحتاج token |
| **قاعدة البيانات** | Firestore Rules — المستخدم يقرأ/يكتب بياناته فقط |
| **التخزين** | Storage Rules — الصور تُرفع من مستخدمين مصادق عليهم فقط |
| **GPS** | التحقق يتم server-side من إحداثيات الدكتور عند بدء الجلسة |
| **QR** | الكود يحتوي sessionId فريد ويبطل فور إغلاق الجلسة |
| **السيلفي** | الصورة تُحفظ في Firebase Storage وتُربط بسجل الحضور |

---

## التقنيات المستخدمة

| التقنية | الإصدار | الغرض |
|---------|---------|-------|
| React Native | 0.74 | إطار العمل الأساسي |
| Expo | 51 | SDK والأدوات |
| TypeScript | 5 | Type safety |
| Firebase Firestore | 10 | قاعدة البيانات real-time |
| Firebase Storage | 10 | تخزين صور السيلفي |
| Firebase Auth | 10 | المصادقة |
| Expo Location | latest | GPS و Geofencing |
| Expo Camera | latest | مسح QR |
| Expo Notifications | latest | Push notifications |
| Expo Image Picker | latest | التقاط السيلفي |
| Expo Print | latest | توليد PDF |
| Google Gemini AI | 2.5 Flash | توليد الاختبارات |
| React Navigation | 6 | التنقل بين الشاشات |

---