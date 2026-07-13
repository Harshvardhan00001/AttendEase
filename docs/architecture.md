# AttendEase — Architecture

## 1. Overview

AttendEase is a two-role (Admin/Teacher and Student) attendance system built around two independent verification signals that gate whether an attendance mark is accepted:

1. **Network verification** — the student's current public IP/network is checked against the workplace's registered network identifier.
2. **Face verification** — a live face descriptor captured in the browser is compared against the student's enrolled descriptor.

The system is a standard client/server web app: a React SPA talking to an Express/MongoDB API, with Socket.io for realtime dashboard updates.

```
┌─────────────────┐        HTTPS/REST        ┌──────────────────┐        ┌─────────────┐
│   Frontend       │ ───────────────────────► │   Backend API     │ ─────► │  MongoDB     │
│ React + Vite/TS  │ ◄─────────────────────── │ Express + TS      │ ◄───── │  (Mongoose)  │
│ face-api.js      │        Socket.io         │ JWT / Zod         │        └─────────────┘
└─────────────────┘ ◄─────────────────────── └──────────────────┘
```

## 2. Components

### 2.1 Frontend (`frontend/`)

- **Framework:** React + Vite, TypeScript in strict mode (no `any`).
- **Styling:** Tailwind CSS.
- **State:** Zustand for local/global client state (e.g. `authStore`).
- **Data fetching:** Axios + TanStack Query for caching, retries, and loading/error state.
- **Routing:** React Router v6, with role-aware route guards.
- **Validation:** Zod schemas imported from `shared/types`, mirroring backend validation exactly so client and server never disagree on shape.
- **Face detection:** `face-api.js`, running entirely in-browser. Only the derived 128-d descriptor is ever sent to the server — raw images never leave the client.

### 2.2 Backend (`backend/`)

- **Runtime:** Node.js + Express, TypeScript.
- **Database:** MongoDB via Mongoose. (Postgres/Prisma is a documented alternative if stronger relational guarantees on `workplace ↔ student ↔ session ↔ attendance` are preferred — either is defensible, but the choice should be recorded.)
- **Auth:** JWT access + refresh tokens, stored in httpOnly, Secure, SameSite cookies. Passwords hashed with bcrypt/Argon2id.
- **Realtime:** Socket.io pushes attendance events to the admin dashboard as sessions are marked.
- **Validation:** Zod schemas validate every route boundary, mirroring the frontend schema exactly.

### 2.3 Shared (`shared/types/`)

A shared package of TypeScript types and Zod schemas consumed by both `frontend` and `backend`, so request/response shapes cannot silently drift between client and server.

## 3. Trust Model (v1) — read this before reviewing security

Both the network check and the face check are performed **client-side**, and the server currently **trusts the client's boolean verification result** rather than independently re-deriving it. This is a deliberate, documented v1 trade-off made for speed of build, not an oversight.

**Why this matters:** a malicious or modified client could, in principle, send `faceVerified: true` / `networkVerified: true` without actually passing either check.

**Roadmap mitigation:** the server should independently re-check at least the face comparison — it already receives the live descriptor, so it can re-run the same Euclidean-distance comparison against the stored descriptor server-side rather than trusting a boolean flag. Server-side re-verification of network origin (matching request IP against the workplace's `allowedNetworkId`) is the equivalent hardening step for the network check. Both are called out explicitly as roadmap items rather than shipped silently as "done."

## 4. Data Model

### `users`
```ts
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
```ts
{
  _id: ObjectId,
  name: string,
  description: string,
  adminId: ObjectId,        // → users
  allowedNetworkId: string, // public IP or CIDR range treated as "on-premises"
  workplaceCode: string,    // 6-char unique join code
  students: ObjectId[],     // → users
  createdAt: Date,
  deletedAt: Date | null    // soft delete
}
```

### `sessions`
```ts
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
```ts
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
A unique compound index on `(sessionId, studentId)` prevents a student from being marked twice in the same session.

## 5. API Surface

| Area | Method | Endpoint | Access | Notes |
|---|---|---|---|---|
| Auth | POST | `/api/auth/register/admin` | Public | |
| Auth | POST | `/api/auth/register/student` | Public | |
| Auth | POST | `/api/auth/login` | Public | Both roles |
| Auth | POST | `/api/auth/logout` | Auth | Clears session cookies |
| Auth | GET | `/api/auth/me` | Auth | Current user profile |
| Workplace | POST | `/api/workplaces` | Admin | Create |
| Workplace | GET | `/api/workplaces` | Admin | List own workplaces |
| Workplace | GET | `/api/workplaces/:id` | Admin | Details |
| Workplace | PUT | `/api/workplaces/:id` | Admin | Update (network id, etc.) |
| Workplace | DELETE | `/api/workplaces/:id` | Admin | Soft-delete |
| Workplace | POST | `/api/workplaces/:id/students` | Admin | Add student |
| Workplace | DELETE | `/api/workplaces/:id/students/:sid` | Admin | Remove student |
| Sessions | POST | `/api/sessions` | Admin | Open session |
| Sessions | PATCH | `/api/sessions/:id/close` | Admin | Close session |
| Sessions | GET | `/api/sessions/workplace/:wpId` | Admin | Paginated list |
| Attendance | POST | `/api/attendance/mark` | Student | Mark attendance |
| Attendance | GET | `/api/attendance/session/:sessionId` | Admin | Filter/sort/paginate |
| Attendance | GET | `/api/attendance/student/me` | Student | Personal history |
| Attendance | GET | `/api/attendance/export` | Admin | Streamed CSV export |
| Face | POST | `/api/face/enroll` | Student | Save descriptor + consent flag |
| Face | GET | `/api/face/status` | Student | Enrollment status |

## 6. Security Baseline

- Secrets only in environment variables, never committed; `.env.example` documents every variable.
- CSP, HSTS, and X-Content-Type-Options headers set on all responses; CSRF protection on state-changing routes.
- Parameterized queries / ORM (Mongoose) everywhere — no raw string-built queries.
- Rate limiting on sensitive routes (auth, `/attendance/mark`, `/face/enroll`, exports) via token bucket, returning `429` with `Retry-After`.
- Login/register limited to ~5 attempts / 15 minutes per IP + account.
- Face descriptors are treated as biometric data: a retention/deletion policy is defined, and explicit consent is required before enrollment.
- Role-based route protection is enforced server-side in middleware — the server never trusts a role claimed by the client.
- HTTPS is required in production (camera access requires a secure context).

## 7. Known Limitations

- **Client-side trust boundary** (§3) — server does not yet independently re-verify face or network checks.
- **NAT/VPN ambiguity** — a public-IP network check cannot distinguish two devices behind the same NAT/VPN; this is a known limitation of the "same premises" proxy, not a bug.
- **Face enrollment reliability** — treated as a timeboxed spike; if not reliable within scope, a manual-override flag is the documented fallback for demo purposes.

## 8. Realtime Updates

Socket.io connects admin dashboard clients to a workplace/session room. When `POST /api/attendance/mark` succeeds, the server emits an event to that room so the admin's attendance list updates live without polling.

## 9. Edge Cases Handled by Design

| Scenario | Behavior |
|---|---|
| Session opened but student never enrolled a face | Block with a clear message linking to Face Setup — not a silent failure |
| Network check fails but face check passes (or vice versa) | Attendance not marked; a specific error is returned per failed check |
| Duplicate mark attempt on the same session | Rejected server-side via the unique `(sessionId, studentId)` index; client shows "Already marked present" |
| Admin closes a session mid-verification | In-flight mark attempts fail gracefully; no orphaned records |
| Workplace deleted while a session is active | Deletion is blocked while active sessions exist, or sessions are force-closed first — the cascade rule is explicit, not implicit |

## 10. Deployment Notes

- Frontend is a static build (Vite output) servable from any static host / CDN.
- Backend requires a persistent Node process (Express) with a MongoDB connection and Socket.io support (sticky sessions if load-balanced).
- HTTPS is mandatory in production for camera access to work in the browser.