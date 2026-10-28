<div align="center">

# 🏢 Enterprise HR Management System (HRMS)

**A high-performance, modern HR & Workforce Attendance Management System built with Next.js 16, TypeScript, Tailwind CSS, and MongoDB.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-hrms--sw.vercel.app-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://hrms-sw.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16.4.3-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB%20Atlas-Database-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

---

### 🌐 [Live Production URL: https://hrms-sw.vercel.app](https://hrms-sw.vercel.app)

</div>

---

## 📌 Table of Contents

- [Overview](#-overview)
- [System Architecture](#-system-architecture)
- [Key Features](#-key-features)
  - [👑 Administrator Portal](#-administrator-portal)
  - [👔 Supervisor Portal & Attendance Matrix](#-supervisor-portal--attendance-matrix)
- [Demo Credentials](#-demo-credentials)
- [Core Workflows](#-core-workflows)
  - [1. Single-Click Status Cycling Matrix](#1-single-click-status-cycling-matrix)
  - [2. Anti-Tamper Locking Architecture](#2-anti-tamper-locking-architecture)
  - [3. Zero-Timezone Shift Guarantee](#3-zero-timezone-shift-guarantee)
- [API Reference](#-api-reference)
- [Database Schema](#-database-schema)
- [Local Setup & Development](#-local-setup--development)
- [Deployment](#-deployment)
- [Security & Compliance](#-security--compliance)

---

## 🌟 Overview

The **Enterprise HRMS** platform solves critical operational bottlenecks in workforce management, daily team attendance tracking, supervisor delegation, and audit compliance. Engineered with a responsive modern UI, the platform separates administrative management from frontline supervisor workflows, eliminating attendance tampering, accidental duplicate entries, and multi-timezone date offset shifts.

---

## 🏗 System Architecture

```mermaid
graph TD
    Client[Web & Mobile Client] --> Edge[Vercel Global Edge]
    Edge --> AppRouter[Next.js 16 App Router]
    
    subgraph Security & Access Control
        AppRouter --> AuthMiddleware[Session & RBAC Middleware]
        AuthMiddleware -->|Role: ADMIN| AdminRoutes[/admin/*]
        AuthMiddleware -->|Role: SUPERVISOR| SupervisorRoutes[/supervisor/*]
    end

    subgraph Service Layer
        AdminRoutes --> AdminControllers[Admin APIs & Dashboard Stats]
        SupervisorRoutes --> SupervisorControllers[Attendance & Team APIs]
        AdminControllers --> AuditLogger[Immutable Audit Service]
        SupervisorControllers --> AuditLogger
    end

    subgraph Persistence Layer
        AdminControllers --> Mongoose[Mongoose ODM]
        SupervisorControllers --> Mongoose
        Mongoose --> MongoDB[(MongoDB Atlas Cluster)]
    end
```

---

## 🚀 Key Features

### 👑 Administrator Portal

- **Executive Analytics Dashboard**: Instant visibility into total workforce headcount, active supervisors, today's attendance breakdown (Present, Half Day, Leave, Absent), and department distribution.
- **Workforce Directory & Lifecycle**: Complete CRUD operations for employees with contact info, emergency contacts, designated supervisor, employment type, and department.
- **Supervisor Management**:
  - View, create, and manage supervisors.
  - Dedicated **Supervisor Profile View** (`/admin/supervisors/[id]`) showing assigned team roster, live team stats, and quick links to their team attendance.
- **Comprehensive Attendance Matrix**:
  - **Full Month Matrix View**: 31-day visual calendar grid for the entire organization with supervisor and department filtering.
  - **Daily Shift View**: Filter attendance by date, status, supervisor, and manually toggle individual locks.
  - **History Log**: Searchable audit log of every attendance record change.
- **CSV Data Export**: Export attendance sheets and employee directories to standard CSV format.
- **Enterprise Audit Trail**: Immutable logging of all sensitive administrative and supervisor actions (attendance lock, employee status change, supervisor assignments).

### 👔 Supervisor Portal & Attendance Matrix

- **Assigned Team View**: Supervisors strictly see only the employees assigned to their supervision roster.
- **Interactive Full Month Grid (Day 1 to Day 31)**:
  - Clean monthly calendar picker with `< Prev Month`, `Next Month >`, and `Go to Today` shortcuts.
  - Dynamic highlight for today's column (`ring-2 ring-indigo-500`).
  - Auto-scrolls horizontally to today's date upon loading.
- **Fast Status Cycling**:
  - Click any cell in today's column to cycle through statuses:
    $$\text{PRESENT} \rightarrow \text{HALF\_DAY} \rightarrow \text{LEAVE} \rightarrow \text{ABSENT} \rightarrow \text{PRESENT}$$
  - Operates entirely with zero-latency local state; no blocking API calls on every toggle.
- **One-Click "Save & Lock Today's Attendance"**:
  - Saves all team attendance in a single batch transaction.
  - Automatically locks the day (`isLocked: true`).
  - Immediately freezes the UI into a read-only locked state with badge confirmation.
- **Strict Role Boundaries**:
  - Past dates and future dates are strictly non-editable (muted cursor and disabled buttons).
  - Backend validation rejects any modification to past dates or locked entries.
- **Mobile Responsive Design**:
  - Slide-over mobile drawer navigation.
  - Floating sticky action bar on mobile screens.

---

## 🔑 Demo Credentials

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@hrms.com` | `Admin@123456` | Full system control, reports, employee management, all attendance |
| **Supervisor** | `supervisor@hrms.com` | `Supervisor@123456` | Assigned team view, month attendance grid, save & lock today's attendance |

---

## 💡 Core Workflows

### 1. Single-Click Status Cycling Matrix

Supervisors do not need to open tedious drop-down menus or modals for each employee:
1. Tap an employee's cell under today's date.
2. The cell instantly switches to the next status color and badge:
   - 🟢 **P** — Present (`#10B981`)
   - 🟡 **HD** — Half Day (`#F59E0B`)
   - 🟣 **L** — Leave (`#8B5CF6`)
   - 🔴 **A** — Absent (`#EF4444`)
3. Hit **"Save & Lock Today's Attendance"** when done.

### 2. Anti-Tamper Locking Architecture

```
[Supervisor Opens Attendance]
            │
            ▼
    [Is Date Today?] ──No──► [Cell Disabled / Read-Only]
            │ Yes
            ▼
   [Is Today Locked?] ──Yes──► [Show "Locked" Badge & Disable Edits]
            │ No
            ▼
 [Allow Single-Click Cycle]
            │
    [Click "Save & Lock"]
            │
            ▼
 [POST /api/attendance { bulk: true, lock: true }]
            │
            ▼
 [MongoDB: attendances.updateMany({ isLocked: true })]
            │
            ▼
[UI Updates: Frozen State + Lock Notification]
```

### 3. Zero-Timezone Shift Guarantee

A common flaw in HR applications is date shifting (e.g. marking attendance on `2026-10-28` in IST (+05:30) shifting to `2026-10-27` UTC). This system implements a canonical UTC Midnight standard:

$$\text{Canonical Timestamp} = \text{Date.UTC}(YYYY, MM - 1, DD, 0, 0, 0, 0)$$

- The API transmits and accepts normalized ISO date strings (`YYYY-MM-DD`).
- Mongoose queries strictly compare canonical 24-hour windows:
  ```ts
  { attendanceDate: { $gte: startOfDayUtc, $lt: endOfDayUtc } }
  ```
- Guaranteed identical date rendering in every client timezone.

---

## 📡 API Reference

### Authentication
- `POST /api/auth/login` — Authenticate and receive HTTP-only session cookie.
- `POST /api/auth/logout` — Invalidate session and destroy cookie.
- `GET /api/auth/session` — Retrieve current authenticated user context.

### Employees
- `GET /api/employees` — List employees (supports search, department, supervisor filters).
- `POST /api/employees` — Create new employee profile *(Admin only)*.
- `GET /api/employees/:id` — Get full employee details and history.
- `PATCH /api/employees/:id` — Update employee information.

### Supervisors
- `GET /api/supervisors` — List active supervisors with assigned team counts.
- `POST /api/supervisors` — Register new supervisor account *(Admin only)*.
- `GET /api/supervisors/:id` — Get supervisor profile with assigned team roster.
- `PATCH /api/supervisors/:id` — Update supervisor details and status.

### Attendance
- `GET /api/attendance` — Retrieve attendance records by date range, month, supervisor, or employee.
- `POST /api/attendance` — Save and lock attendance in single or bulk operations.
- `PATCH /api/attendance/:id` — Correct attendance record *(Admin only with mandatory reason)*.

### Dashboard & Analytics
- `GET /api/dashboard/stats` — Real-time metrics for executive dashboard.
- `GET /api/audit-logs` — Immutable system audit logs *(Admin only)*.
- `GET /api/reports/export` — Export attendance or workforce data to CSV.

---

## 🗄 Database Schema

The database utilizes optimized MongoDB collections:

- **`users`**: System credentials, hashed passwords (bcrypt salt 12), and role (`ADMIN` | `SUPERVISOR`).
- **`employees`**: Employee code, profile, department, designation, supervisor reference (`ObjectId`), employment status.
- **`attendances`**: 
  - `employeeId` (Ref to Employee)
  - `supervisorId` (Ref to User)
  - `attendanceDate` (UTC Midnight)
  - `status` (`PRESENT` | `HALF_DAY` | `LEAVE` | `ABSENT`)
  - `isLocked` (Boolean)
  - `markedBy` (Ref to User)
  - **Index**: Unique compound index `{ employeeId: 1, attendanceDate: 1 }`.
- **`auditlogs`**: Action type, actor details, entity reference, previous state, new state, timestamp.

---

## 💻 Local Setup & Development

### Prerequisites
- **Node.js** >= 18.18.0 or 20.x
- **npm** or **pnpm**
- **MongoDB Atlas** URI or local MongoDB server

### Installation Steps

1. **Clone repository**:
   ```bash
   git clone https://github.com/nitheeshdr/HR-Management.git
   cd HR-Management
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your `MONGODB_URI` and `AUTH_SECRET`.

4. **Initialize / Reset Database**:
   ```bash
   npx tsx scripts/reset-clean.ts
   ```
   *This seeds the default Admin, Supervisor, and initial roster with 0 attendance records.*

5. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚀 Deployment

The project is configured for deployment on **Vercel**:

```bash
# Deploy to Vercel via CLI
vercel --prod

# Assign production alias
vercel alias set <deployment-url> hrms-sw.vercel.app
```

### Production Environment Variables on Vercel:
- `MONGODB_URI`
- `AUTH_SECRET`
- `APP_URL` (`https://hrms-sw.vercel.app`)
- `BUSINESS_TIMEZONE` (`Asia/Kolkata`)
- `SESSION_DURATION` (`28800`)

---

## 🛡 Security & Compliance

- **Stateless HTTP-Only Cookies**: No tokens in `localStorage` or `sessionStorage` preventing XSS token theft.
- **CSRF & Injection Protection**: Strict input validation using Zod schemas on all API inputs.
- **RBAC Middleware**: Deep server-side permission checks preventing route tampering.
- **Audit Logging**: Every sensitive action records actor ID, role, IP, and state diff for audit compliance.

---

<div align="center">

Made with ❤️ by [Nitheesh Rajendran (@nitheeshdr)](https://github.com/nitheeshdr)

</div>
