# AttendEase — Project Plan

> Smart Attendance Management System with Face Verification & Network-Based Access Control

---

## 📌 Project Overview

**AttendEase** is a web-based attendance system where teachers/admins manage student attendance with two layers of verification:

1. **Network Verification** — the student's device must be on the same public IP / network as the workplace's registered network, so attendance can only be marked while physically on-premises (or on the same office/school WiFi).
2. **Face Verification** — the student's live face is matched against their enrolled biometric before attendance is accepted.

> **Note on trust boundary:** face and network checks in this version run client-side (in the browser) for speed of build. This is a strong UX/demo feature, but the server currently trusts the client's verification result rather than independently re-checking it. This is a known, documented trade-off — called out explicitly in [`docs/architecture.md`](docs/architecture.md) (§3, "Trust Model (v1)") and in the case study, with server-side re-verification listed as a roadmap item. Reviewers respect an acknowledged trade-off far more than an unstated one.

---

## 👥 User Roles

| Role              | Description                                                              |
| ----------------- | ------------------------------------------------------------------------ |
| **Admin/Teacher** | Creates and manages workplaces, opens attendance sessions, views records |
| **Student/User**  | Joins workplaces, registers face, marks attendance                       |

---

## 🗂️ Core Features

### 1. Authentication

- Separate register/login flows for Admin and Student
- JWT access + refresh tokens, stored in httpOnly, Secure, SameSite cookies
- Role-based route protection, enforced server-side in middleware (never trust a role sent from the client)
- Rate limit login/register: ~5 attempts / 15 min per IP+account

### 2. Workplace Management (Admin)

- Create / edit / delete a workplace (name, description, allowed network identifier)
- Add/remove students by email or student ID, or via a workplace join code
- Open / close attendance sessions
- View attendance per session, per student, per date range

### 3. Face Enrollment (Student, one-time)

- Camera-based capture (multiple angles) using face-api.js
- Extract 128-d descriptor client-side, send only the descriptor (never raw images) to the server for storage
- Re-enrollment supported if descriptor quality is poor or device changes

### 4. Joining a Workplace (Student)

- Face enrollment required before joining
- Join via workplace code or admin invite

### 5. Marking Attendance (Student)

When a session is open:

1. Client checks current public IP against the workplace's allowed network
2. Client opens camera, extracts a live face descriptor, compares against the stored one (distance threshold)
3. Both checks pass → `POST /api/attendance/mark` with the verification result
4. Server logs the record; admin dashboard updates via Socket.io

### 6. Admin Dashboard

- All workplaces + sessions, per-session attendance list, filters (date, workplace, student), CSV export

### 7. Student Dashboard

- Joined workplaces, personal attendance history + attendance %, face enrollment status, active "mark attendance" action

---

## 🏗️ Technical Architecture

> Full breakdown, including the trust-model write-up and edge-case table, now lives in [`docs/architecture.md`](docs/architecture.md). Summary below.

### Frontend

- **Framework:** React + Vite, **TypeScript strict mode** (no `any`)
- **Styling:** Tailwind CSS
- **Face detection:** face-api.js (browser-only, no raw images leave the client)
- **State:** Zustand
- **Data fetching:** Axios + TanStack Query (for caching, retries, loading/error state)
- **Routing:** React Router v6
- **Validation:** Zod schemas shared between client and server via a `shared/` types package

### Backend

- **Runtime:** Node.js + Express, **TypeScript**
- **Database:** MongoDB (Mongoose), or swap to Postgres/Prisma if you want stronger relational guarantees on `workplace ↔ student ↔ session ↔ attendance` — either is defensible, but document why you picked one
- **Auth:** JWT (access + refresh), bcrypt/Argon2id for passwords
- **Realtime:** Socket.io for live attendance updates
- **Validation:** Zod on every route boundary, mirroring the frontend schema exactly

### Security baseline (handbook non-negotiables)

- Secrets only in env vars, never committed; `.env.example` documents every var
- CSP, HSTS, X-Content-Type-Options headers; CSRF protection on state-changing routes
- Parameterized queries / ORM everywhere
- Rate-limit sensitive routes: auth, `/attendance/mark`, `/face/enroll`, exports — token bucket, 429 + `Retry-After`
- Face descriptors are biometric data: state a retention/deletion policy and require explicit consent before enrollment (one checkbox + one sentence is enough for this project, but it must exist)

---

## 🗃️ Database Schema

### `users`

```
{
  _id: ObjectId,
  name: string,
  email: string,
  passwordHash: string,
  role: "admin" | "student",
  faceDescriptor: number[] | null,
  faceEnrolled: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### `workplaces`

```
{
  _id: ObjectId,
  name: string,
  description: string,
  adminId: ObjectId, // → users
  allowedNetworkId: string, // public IP or CIDR range treated as "on-premises"
  workplaceCode: string, // 6-char unique
  students: ObjectId[], // → users
  createdAt: Date,
  deletedAt: Date | null // soft delete
}
```

### `sessions`

```
{
  _id: ObjectId,
  workplaceId: ObjectId,
  openedBy: ObjectId,
  openedAt: Date,
  closedAt: Date | null,
  isActive: boolean
}
```

### `attendance`

```
{
  _id: ObjectId,
  sessionId: ObjectId,
  studentId: ObjectId,
  workplaceId: ObjectId,
  markedAt: Date,
  networkVerified: boolean,
  faceVerified: boolean,
  status: "present" | "absent" | "late",
  createdAt: Date
}
```

Add a unique compound index on `(sessionId, studentId)` so a student can't be marked twice for the same session.

---

## 🔗 API Endpoints

### Auth

| Method | Endpoint                     | Access | Description            |
| ------ | ----------------------------- | ------ | ----------------------- |
| POST   | `/api/auth/register/admin`   | Public | Register admin/teacher |
| POST   | `/api/auth/register/student` | Public | Register student       |
| POST   | `/api/auth/login`            | Public | Login (both roles)     |
| POST   | `/api/auth/logout`           | Auth   | Clear session           |
| GET    | `/api/auth/me`               | Auth   | Current user profile    |

### Workplace (Admin)

| Method | Endpoint                            | Description                |
| ------ | ------------------------------------ | --------------------------- |
| POST   | `/api/workplaces`                   | Create workplace           |
| GET    | `/api/workplaces`                   | List admin's workplaces    |
| GET    | `/api/workplaces/:id`               | Workplace details          |
| PUT    | `/api/workplaces/:id`               | Update (network id, etc.)  |
| DELETE | `/api/workplaces/:id`               | Soft-delete workplace      |
| POST   | `/api/workplaces/:id/students`      | Add student                |
| DELETE | `/api/workplaces/:id/students/:sid` | Remove student             |

### Sessions (Admin)

| Method | Endpoint                        | Description               |
| ------ | -------------------------------- | -------------------------- |
| POST   | `/api/sessions`                 | Open session               |
| PATCH  | `/api/sessions/:id/close`       | Close session               |
| GET    | `/api/sessions/workplace/:wpId` | List sessions, paginated   |

### Attendance

| Method | Endpoint                                        | Description                                                  |
| ------ | ------------------------------------------------ | -------------------------------------------------------------- |
| POST   | `/api/attendance/mark`                          | Mark attendance                                                |
| GET    | `/api/attendance/session/:sessionId`            | Session's attendance list — supports filter/sort/pagination    |
| GET    | `/api/attendance/student/me`                    | Personal history                                                |
| GET    | `/api/attendance/export?workplaceId=&from=&to=` | Streamed CSV export                                             |

### Face

| Method | Endpoint           | Access  | Description                           |
| ------ | ------------------- | ------- | -------------------------------------- |
| POST   | `/api/face/enroll` | Student | Save descriptor (with consent flag)   |
| GET    | `/api/face/status` | Student | Enrollment status                      |

---

## 🎨 States & Edge Cases (design before styling)

| Screen                  | Empty                                | Loading                                                      | Error                                                                                 |
| ------------------------ | -------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Admin dashboard         | "No workplaces yet — create one" CTA | Skeleton cards                                                | Retry button, logged server-side                                                       |
| Attendance session list | "No sessions yet"                    | Skeleton rows                                                  | Retry                                                                                    |
| Mark attendance         | —                                     | Camera/network check spinner, disabled button while pending   | "Not on the right network" / "Face didn't match — try again", never a generic error   |
| Student history         | "No attendance recorded yet"         | Skeleton table                                                 | Retry                                                                                    |

Other edge cases to spec now, not discover later (full detail in `docs/architecture.md` §9):

- Session opened but student never enrolled a face → block with a clear message and link to Face Setup, not a silent failure
- Student's network check fails but face check passes (or vice versa) → attendance not marked, specific error per failure
- Duplicate mark attempt on the same session → server rejects via unique index, client shows "Already marked present"
- Admin closes a session mid-verification → in-flight mark attempts should fail gracefully, not create orphaned records
- Workplace deleted while a session is active → cascade rule must be explicit (block deletion with active sessions, or force-close them first)

---

## 📁 Project Folder Structure

```
AttendEase/
├── frontend/
│   ├── public/models/            # face-api.js model files
│   ├── src/
│   │   ├── components/{auth,face,workplace,shared}/
│   │   ├── pages/{auth,admin,student}/
│   │   ├── hooks/ (useFaceApi.ts, useNetworkCheck.ts)
│   │   ├── store/authStore.ts
│   │   ├── services/api.ts
│   │   ├── App.tsx / main.tsx
│   ├── tsconfig.json
│   └── package.json
├── backend/
│   ├── controllers/ (auth, workplace, attendance, session)
│   ├── middleware/ (auth, role, rateLimit)
│   ├── models/ (User, Workplace, Session, Attendance)
│   ├── routes/
│   ├── validators/            # Zod schemas, shared shape with frontend
│   ├── utils/
│   ├── tsconfig.json
│   └── package.json
├── shared/
│   └── types/                 # shared TS types + Zod schemas
├── docs/
│   ├── architecture.md        # ✅ written
│   └── screenshots/
├── .github/
│   ├── workflows/ci.yml       # ✅ written
│   └── PULL_REQUEST_TEMPLATE.md  # ✅ written
├── .env.example
├── LICENSE
├── CONTRIBUTING.md            # ✅ written
├── CHANGELOG.md                # ✅ written
└── README.md                   # ✅ written
```

---

## 🚀 Development Phases

### Phase 0 — Documentation & Project Hygiene ✅

- [x] `README.md` — project overview, stack, setup instructions
- [x] `docs/architecture.md` — components, trust model (§3), data model, API surface, security baseline, edge cases
- [x] `CONTRIBUTING.md` — setup, conventions, branch naming, commit style, PR process
- [x] `CHANGELOG.md` — Keep a Changelog format, `Unreleased` section seeded with phase plan
- [x] `.github/PULL_REQUEST_TEMPLATE.md` — type of change, edge cases checklist, security/privacy checklist
- [x] `.github/workflows/ci.yml` — lint + type-check + build (+ test if present) for `frontend` and `backend` on push/PR to `main`

### Phase 1 — Foundation (this doc + setup)

- [x] Spec written and reviewed
- [x] Docs scaffolding complete (Phase 0 above)
- [ ] Vite + Express scaffolded, both in strict TypeScript
- [ ] Shared Zod schemas package wired to both apps
- [ ] MongoDB connection, base models
- [ ] Auth (register/login both roles), JWT middleware, protected routes

### Phase 2 — Workplace Management

- [ ] CRUD for workplaces (soft delete)
- [ ] Student enrollment / join-code flow
- [ ] Search/filter/pagination on workplace + session lists

### Phase 3 — Face Enrollment (timeboxed spike: 2 days max)

- [ ] Integrate face-api.js models
- [ ] Capture + descriptor extraction, consent checkbox
- [ ] Enroll/status API endpoints
- [ ] **Checkpoint:** if not reliable by end of day 2, fall back to a manual-override flag for demo purposes and note it as roadmap

### Phase 4 — Attendance System

- [ ] Session open/close
- [ ] Network check + face verification on mark
- [ ] All error/edge cases from the table above handled explicitly
- [ ] Socket.io live updates to admin dashboard

### Phase 5 — Dashboards, Reports & Polish

- [ ] Admin dashboard + CSV export (streamed)
- [ ] Student history + attendance %
- [ ] Loading/empty/error states everywhere, mobile responsive
- [ ] Lighthouse pass, SEO tags, deployment

---

## ⚠️ Considerations to keep visible

- Face descriptors are biometric data — encrypt at rest if possible, state retention policy, require consent before enrollment
- Public-IP network check is a reasonable proxy for "same premises," but note in docs that it won't distinguish two devices behind the same NAT/VPN — that's a known limitation, not a bug
- Client-side verification trust boundary (noted above, detailed in `docs/architecture.md` §3) — decide before submission whether to add a lightweight server-side re-check of the face descriptor distance; even a simple version (server also runs the euclidean distance comparison on the descriptor it receives, not just trusting a boolean) meaningfully strengthens this
- HTTPS required in production for camera access

*Last updated: 2026-07-13*
