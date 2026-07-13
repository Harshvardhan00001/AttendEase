# Changelog

All notable changes to AttendEase will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Project plan and full technical specification (`plan.md`).
- Initial repository scaffolding (`frontend/`, `backend/`).

### Planned (see `plan.md` for phase breakdown)
- Phase 1 — Vite + Express scaffolding in strict TypeScript, shared Zod schema package, MongoDB connection, JWT auth with role-based route protection.
- Phase 2 — Workplace CRUD (soft delete), student join-code flow, search/filter/pagination.
- Phase 3 — Face enrollment via `face-api.js`, descriptor extraction, consent flow.
- Phase 4 — Attendance sessions, combined network + face verification, Socket.io live updates.
- Phase 5 — Admin/student dashboards, CSV export, loading/empty/error states, mobile responsiveness.

## [0.1.0] - 2026-07-09

### Added
- Repository initialized with MIT license.
- `plan.md`: full project specification, including user roles, database schema, API endpoint list, states/edge cases, and security baseline.

[Unreleased]: https://github.com/Harshvardhan00001/AttendEase/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Harshvardhan00001/AttendEase/releases/tag/v0.1.0