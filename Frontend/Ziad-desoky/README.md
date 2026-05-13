# 📍 GeoAttend — Frontend

> Smart Geo-Based Attendance & Quiz Management System

GeoAttend is a full-featured web application built with **React 19 + TypeScript + Vite** that handles attendance tracking, live session management, and AI-powered quizzes — across three distinct roles: **Student**, **Doctor (Professor)**, and **Admin**.

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build Tool | Vite 8 |
| Styling | Tailwind CSS v3 + shadcn/ui |
| Routing | React Router v7 |
| Backend / Auth | Firebase (Firestore + Auth + Storage) |
| Icons | Lucide React |
| Testing | Playwright |
| PWA | Service Worker + Web Manifest |

---

## ✨ Features by Role

### 🎓 Student
- View enrolled courses and weekly schedule
- Join live sessions via **QR Code scanner** (jsQR via webcam) or manual session code
- GPS-based geo-verification on attendance
- **Selfie capture** → uploaded to Firebase Storage and linked to attendance record
- **Random check modal** — real-time banner with countdown timer; no response = marked absent
- **Browser push notifications** — instant alert when a session starts in an enrolled course
- Real-time attendance trend charts
- Quiz alerts, quiz history, and performance charts
- Badges & streak tracking
- Attendance history with per-lecture details

### 👨‍🏫 Doctor (Professor)
- Create and manage courses and weekly schedules
- Start / stop live sessions with a single click
- Control session settings: geo-radius, selfie verification, random checks
- **Live Dashboard** — real-time view of who attended (Firestore `onSnapshot`)
- QR code display for students to scan from the screen
- Selfie review: approve / reject pending selfies with photo preview
- **Trigger random check** — sends a verification event to all active students; auto-marks absent after timeout
- **Export attendance reports** — download as PDF or Excel directly from the browser
- Upload lecture PDFs → AI generates quiz questions automatically
- Analytics: attendance rates, trends, student engagement
- Session history with detailed breakdowns

### 🛡️ Admin
- Full user management (create, ban, delete users)
- Course and schedule management
- Enrollment hub: bulk-enroll students into courses
- Live session monitoring
- Quiz management across all courses
- System settings
- Real-time dashboard with platform-wide stats

---

## 🔩 Core Feature Implementation

### 🔔 Push Notifications (Browser)
Web push is handled via the **FCM Web SDK** (`firebase/messaging`) initialized in `firebase.ts`. When a doctor starts a session, the backend (`fcm.utils.js`) fans out a notification to all enrolled students' browser tokens. The Service Worker (`public/sw.js`) intercepts and displays the notification even when the tab is in the background.

```
Doctor starts session
    → backend writes to Firestore + calls FCM REST API
    → sw.js receives push event
    → browser shows notification to student
    → student clicks → opens /live page
```

### ⚡ Random Check
Triggered from the Doctor's Live Dashboard. The flow is fully Firestore-driven so no WebSocket server is needed:

```
Doctor clicks "Send Random Check"
    → backend writes randomCheck: { triggeredAt, expiresAt } on the session doc
    → student's Firestore onSnapshot listener fires (SocketContext.tsx)
    → RandomCheckModal.tsx appears with a live countdown
    → student confirms → writes confirmation to Firestore
    → backend job marks non-responders ABSENT after expiresAt
```

### 🤳 Selfie Upload
Handled entirely in `SelfieCaptureModal.tsx` using the browser's `getUserMedia` API:

1. Opens webcam stream in a `<video>` element
2. Captures a frame onto a `<canvas>` → converts to base64
3. Uploads to Firebase Storage at `selfies/{sessionId}/{studentId}.jpg` via `uploadString`
4. Stores the download URL in the attendance record in Firestore
5. Doctor sees the selfie thumbnail in the Live Dashboard for manual review

### 📊 Attendance Reports Export
The backend exposes export endpoints in `export.service.js`. The frontend triggers a download via a direct `fetch` call with the auth token, then pipes the binary response into a browser download:

| Format | Endpoint | Library (backend) |
|---|---|---|
| Excel (.xlsx) | `GET /api/sessions/:id/export/excel` | `exceljs` |
| PDF | `GET /api/sessions/:id/export/pdf` | `pdfkit` |

The download button lives in `DoctorAttendanceReport.tsx` and `AdminSessionHistory.tsx`.

---

## 🗂️ Project Structure

```
src/
├── components/          # Shared UI components
│   ├── Breadcrumbs.tsx
│   ├── ConnectionStatus.tsx
│   ├── ErrorBoundary.tsx
│   ├── RandomCheckModal.tsx     # ⚡ Random check countdown UI
│   ├── SelfieCaptureModal.tsx   # 🤳 Webcam capture + Storage upload
│   └── Skeleton.tsx
├── context/             # React Contexts
│   ├── AuthContext.tsx      # Auth state (Student / Doctor / Admin)
│   ├── MockDataContext.tsx  # Local data layer (courses, schedules, etc.)
│   ├── QuizContext.tsx      # Active quiz state
│   ├── SocketContext.tsx    # 🔁 Firestore real-time listeners (random check, attendance)
│   └── ToastContext.tsx     # Global notifications
├── pages/
│   ├── auth/            # Login, Register, ForgotPassword
│   ├── student/         # StudentDashboard + sub-components
│   ├── doctor/
│   │   ├── DoctorDashboard.tsx
│   │   ├── DoctorLiveDashboard.tsx    # 🔁 Real-time attendance view
│   │   ├── DoctorAttendanceReport.tsx # 📊 Export PDF / Excel
│   │   ├── DoctorQuizPanel.tsx
│   │   ├── DoctorAnalytics.tsx
│   │   └── DoctorMaterials.tsx
│   ├── admin/           # Admin layout + all admin pages
│   └── shared/          # LiveDashboard, AttendanceView, ProfileModal
├── services/
│   └── api.ts           # All REST API calls + auto token refresh
├── firebase.ts          # Firebase SDK init (Auth + Firestore + Storage + FCM)
└── App.tsx              # Routes + providers
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js ≥ 18
- Backend server running on port `5000` (see backend repo)
- Firebase project configured

### 1. Clone and install

```bash
git clone <repo-url>
cd frontend_output
npm install
```

### 2. Configure environment variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

```env
# .env
VITE_API_URL=http://localhost:5000/api

VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

> **Tip:** To access from a phone on the same network, set `VITE_API_URL=http://<your-pc-ip>:5000/api`

### 3. Run the dev server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`  
Accessible from other devices on the same network automatically (Vite `host: true`).

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Type-check + build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Playwright e2e tests |
| `npm run test:ui` | Run tests with interactive UI |
| `npm run test:report` | Show last test report |

---

## 🔐 Authentication

- Firebase ID tokens stored in `localStorage` + `sessionStorage`
- **Auto token refresh** every 60 seconds (5-minute expiry buffer)
- Role-based route protection: `STUDENT`, `DOCTOR`, `ADMIN`
- Each tab can be logged in as a different user (useful for testing)

## 🛡️ Security

| Layer | Mechanism |
|---|---|
| **Auth** | Firebase Auth — every API request requires a Bearer token |
| **Database** | Firestore Security Rules — users read/write only their own data |
| **Storage** | Firebase Storage Rules — selfie uploads require authenticated user |
| **GPS** | Geo-check is server-side using the session's center coordinates |
| **QR Code** | Contains a unique `sessionId`; invalidated when session closes |
| **Selfies** | Stored in Firebase Storage, URL linked to the attendance record |
| **Exports** | Report endpoints require `DOCTOR` or `ADMIN` role token |

---

## 📱 PWA Support

GeoAttend ships as a Progressive Web App:
- Installable on Android / iOS (Add to Home Screen)
- Service Worker for offline shell caching
- Theme color: `#00D084` | Background: `#0B1120`

---

## 🧪 Testing

End-to-end tests are written with [Playwright](https://playwright.dev/):

```bash
# Run all tests
npm run test

# Open interactive test UI
npm run test:ui
```

Test files are in `tests/`: `auth.spec.ts`, `doctor.spec.ts`, `student.spec.ts`

---

## 🌐 Routes Overview

| Path | Role | Page |
|---|---|---|
| `/login` | Public | Login |
| `/register` | Public | Register |
| `/forgot-password` | Public | Forgot Password |
| `/student` | STUDENT | Student Dashboard |
| `/doctor` | DOCTOR | Doctor Dashboard |
| `/live` | All | Live Session Dashboard |
| `/attend` | STUDENT | Attendance View |
| `/quiz/:sessionId` | STUDENT | Quiz Page |
| `/admin` | ADMIN | Admin Dashboard |
| `/admin/users` | ADMIN | User Management |
| `/admin/courses` | ADMIN | Course Management |
| `/admin/schedule` | ADMIN | Schedule Management |
| `/admin/enrollment` | ADMIN | Enrollment Hub |
| `/admin/lectures` | ADMIN | Lecture Management |
| `/admin/live` | ADMIN | Live Monitoring |
| `/admin/sessions` | ADMIN | Session History |
| `/admin/quizzes` | ADMIN | Quiz Management |
| `/admin/settings` | ADMIN | System Settings |

---

## 👥 Team

GeoAttend — Cairo University, Faculty of Science, Mathematics Department  
Built as a collaborative software engineering project.
