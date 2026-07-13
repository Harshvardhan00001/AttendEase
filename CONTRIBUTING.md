# Contributing to AttendEase

Thanks for your interest in contributing to AttendEase! This document covers everything you need to get set up and submit changes.

## Code of Conduct

Be respectful, constructive, and assume good intent. Disagreements about approach are fine; personal attacks are not.

## Getting Started

1. Fork the repository and clone your fork.
2. Install dependencies in both `frontend/` and `backend/`:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```
3. Copy `.env.example` to `.env` in `backend/` and fill in the required values (MongoDB URI, JWT secrets, etc.). Never commit `.env`.
4. Run both dev servers (`npm run dev` in each folder) and confirm the app loads at `http://localhost:5173`.

## Project Conventions

- **TypeScript strict mode** everywhere — no `any` in new code.
- **Validation:** every API route boundary must validate with a Zod schema from `shared/types`, mirrored on the frontend.
- **Auth:** never trust a role or user ID sent from the client — resolve it server-side from the verified JWT.
- **Secrets:** only in environment variables, never hardcoded or committed. Update `.env.example` whenever you add a new variable.
- **Biometric data:** any change touching face descriptors must preserve the consent flow and retention/deletion policy described in `docs/architecture.md`.

## Branch Naming

Use a prefix that matches the change type:

```
feat/short-description
fix/short-description
chore/short-description
docs/short-description
refactor/short-description
```

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(attendance): add duplicate-mark guard on session close
fix(auth): correct refresh token expiry check
docs(readme): update setup instructions
```

## Pull Requests

1. Keep PRs focused — one logical change per PR.
2. Fill out the PR template completely, including the edge cases you tested.
3. Ensure CI passes (lint, type-check, build) for both `frontend` and `backend`.
4. Update `CHANGELOG.md` under the `Unreleased` section for any user-facing change.
5. Request review before merging; at least one approval is required.

## Reporting Bugs / Requesting Features

Open an issue with:
- A clear title and description
- Steps to reproduce (for bugs) or the use case (for features)
- Expected vs. actual behavior
- Screenshots or logs if relevant

## Security Issues

Please do **not** open a public issue for security vulnerabilities (especially anything touching auth, face descriptors, or the network-verification trust boundary). Instead, contact the maintainer directly.

## Questions

Open a discussion or issue and tag it appropriately — happy to help you get oriented in the codebase.