# AttendEase

> Smart Attendance Management System with Face Verification & Network-Based Access Control

LIVE LINK:https://attend-ease-ebon.vercel.app

AttendEase is a web-based attendance system where teachers/admins manage student attendance using two layers of verification:

1. **Network Verification** — the student's device must be on the same public IP / registered network as the workplace, so attendance can only be marked while physically on-premises (or on the same office/school WiFi).
2. **Face Verification** — the student's live face is matched against their enrolled biometric before attendance is accepted.

> **Trust boundary note:** face and network checks currently run client-side (in the browser) for speed of build. The server trusts the client's verification result rather than independently re-checking it. This is a documented **v1 trade-off** — see [`docs/architecture.md`](docs/architecture.md) for details and the server-side re-verification roadmap item.

---

## ✨ Features

- Separate Admin/Teacher and Student authentication flows (JWT, httpOnly cookies)
- Workplace creation and management, with join codes and network-based access rules
- One-time face enrollment (client-side descriptor extraction via `face-api.js` — raw images never leave the browser)
- Attendance sessions with combined network + face verification
- Live attendance updates via Socket.io
- Admin dashboard with filtering and streamed CSV export
- Student dashboard with personal attendance history and percentage

## 🏗️ Tech Stack

| Layer | Stack |
|---|---|
| Frontend | React + Vite, TypeScript (strict), Tailwind CSS, Zustand, TanStack Query, React Router v6, Zod |
| Backend | Node.js + Express, TypeScript, MongoDB (Mongoose), Socket.io, JWT, bcrypt/Argon2id |
| Face detection | face-api.js (browser-only) |
| Validation | Zod schemas shared between frontend and backend via `shared/types` |

## 📁 Project Structure

```
AttendEase/
├── frontend/          # React + Vite client
├── backend/           # Express API server
├── shared/types/      # Shared TS types + Zod schemas
├── docs/              # architecture.md, screenshots
├── .github/workflows/ # CI pipeline
├── .env.example
├── CONTRIBUTING.md
├── CHANGELOG.md
└── plan.md            # Full project spec
```

See [`plan.md`](plan.md) for the full project spec (data models, API endpoints, phases) and [`docs/architecture.md`](docs/architecture.md) for a deeper technical breakdown.

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- MongoDB instance (local or Atlas)

### Setup

```bash
git clone https://github.com/Harshvardhan00001/AttendEase.git
cd AttendEase

# Backend
cd backend
npm install
cp .env.example .env   # fill in MONGO_URI, JWT secrets, etc.
npm run dev

# Frontend (new terminal)
cd ../frontend
npm install
npm run dev
```

The frontend dev server runs on `http://localhost:5173` and proxies API requests to the backend on `http://localhost:5000` (adjust as configured in `vite.config.ts`).

### Environment Variables

See `.env.example` in `backend/` for the full list. At minimum you'll need:

```
MONGO_URI=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
CLIENT_ORIGIN=
```

## 🧪 Testing & CI

Every push and pull request runs lint, type-check, and build for both `frontend` and `backend` via GitHub Actions — see [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## 🔒 Security Notes

- Face descriptors are biometric data: retention/deletion policy and explicit consent are required before enrollment.
- Public-IP network check is a reasonable proxy for "same premises" but won't distinguish two devices behind the same NAT/VPN.
- Secrets live only in environment variables — see `.env.example`.
- HTTPS is required in production for camera access.

## 🤝 Contributing

Contributions are welcome — see [`CONTRIBUTING.md`](CONTRIBUTING.md) for setup, branch naming, commit conventions, and the PR process.

## 📄 License

Licensed under the [MIT License](LICENSE).
