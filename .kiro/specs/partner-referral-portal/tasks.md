# Implementation Plan: Partner Referral Portal

## Overview

This plan implements the Partner Referral Portal as a monolithic application with a Node.js/Express/TypeScript backend, React/Vite frontend, and PostgreSQL database, all orchestrated via Docker Compose. Tasks are ordered for incremental development: infrastructure first, then backend core, frontend pages, testing, and final integration.

## Tasks

- [x] 1. Project scaffolding and Docker setup
  - [x] 1.1 Create root project structure with docker-compose.yml
    - Create `docker-compose.yml` with PostgreSQL, backend, and frontend services as specified in the design
    - Create root `README.md` documenting architecture, seed credentials, and startup instructions
    - Create `.env.example` with required environment variables
    - _Requirements: 9.4, 9.6_

  - [x] 1.2 Scaffold backend project with TypeScript and dependencies
    - Create `backend/package.json` with Express, Prisma, bcrypt, jsonwebtoken, zod, cors dependencies
    - Create `backend/tsconfig.json` with strict TypeScript configuration
    - Create `backend/Dockerfile` for production build (multi-stage: build + runtime)
    - Create `backend/src/index.ts` with Express app entry point, CORS config, and route mounting
    - Create `backend/src/config.ts` with environment variable parsing (DATABASE_URL, JWT_SECRET, PORT, FRONTEND_URL)
    - _Requirements: 9.4_

  - [x] 1.3 Scaffold frontend project with React, Vite, and dependencies
    - Create `frontend/package.json` with React, React Router, Axios dependencies
    - Create `frontend/vite.config.ts` with API proxy configuration
    - Create `frontend/Dockerfile` with multi-stage build (Vite build + Nginx serve)
    - Create `frontend/src/main.tsx` and `frontend/src/App.tsx` with router setup
    - _Requirements: 9.4_

- [x] 2. Database schema and seed data
  - [x] 2.1 Define Prisma schema with User, Supplier, and Client models
    - Create `backend/prisma/schema.prisma` with Role enum, SupplierStatus enum, and all three models
    - Define all constraints: unique emails, unique referralCode, FK relationships
    - Configure UUID default IDs and timestamp defaults
    - _Requirements: 1.2, 1.4, 4.5_

  - [x] 2.2 Create seed script with persona data
    - Create `backend/prisma/seed.ts` implementing idempotent seeding logic
    - Seed Admin (Lina: lina@aajil.sa / admin123), Suppliers (Khaled: khaled@supplier.sa, Mona: mona@supplier.sa / supplier123), and Client (Yasser attributed to Khaled)
    - Use bcrypt for password hashing, generate referral codes for Khaled and Mona
    - Check for existing data before inserting (idempotent)
    - Log credentials to console on first seed
    - _Requirements: 9.1, 9.2, 9.3, 9.5, 9.6_

- [x] 3. Backend authentication
  - [x] 3.1 Implement JWT auth middleware and RBAC middleware
    - Create `backend/src/middleware/auth.ts` — verify JWT from Authorization header, attach decoded payload to request
    - Create `backend/src/middleware/rbac.ts` — role-checking middleware factory that returns 403 for insufficient permissions
    - _Requirements: 8.1, 8.6, 8.7_

  - [x] 3.2 Implement auth service and login route
    - Create `backend/src/services/auth.service.ts` with login (bcrypt compare) and verifyToken methods
    - Create `backend/src/routes/auth.routes.ts` with POST `/api/auth/login` endpoint
    - JWT payload: `{ userId, role, email }`, 24-hour expiry
    - Return 401 for invalid credentials
    - _Requirements: 8.1, 8.4, 8.7_

  - [x] 3.3 Write unit tests for auth middleware
    - Test valid JWT passes through
    - Test expired JWT returns 401
    - Test missing header returns 401
    - Test role mismatch returns 403
    - _Requirements: 8.1, 8.6, 8.7_

- [x] 4. Backend core features — Supplier management
  - [x] 4.1 Implement referral code generation utility
    - Create `backend/src/utils/referralCode.ts` — generate 8-character alphanumeric codes
    - Use cryptographically random generation (crypto.randomBytes)
    - Create `backend/src/utils/validation.ts` — Zod schemas for supplier input, client input, email, phone (E.164)
    - _Requirements: 1.2, 1.5, 4.6_

  - [x] 4.2 Implement supplier service (CRUD + deactivation)
    - Create `backend/src/services/supplier.service.ts` with create, findAll (with referral count, sorted desc), findById, findByReferralCode, deactivate, reactivate
    - Supplier creation: validate input, check duplicate email (409), generate referral code, set status=active, log to console
    - Deactivate: set status to "deactivated", return 409 if already deactivated
    - Reactivate: set status to "active"
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 6.2, 7.1, 7.3, 7.5, 7.6_

  - [x] 4.3 Implement admin routes for supplier management
    - Create `backend/src/routes/admin.routes.ts` with all admin endpoints
    - POST `/api/admin/suppliers` — create supplier (admin only)
    - GET `/api/admin/suppliers` — list all suppliers with stats, sorted by referral count desc
    - GET `/api/admin/suppliers/:id/clients` — list clients for a supplier (paginated, sorted by date desc)
    - PATCH `/api/admin/suppliers/:id/deactivate` — deactivate supplier
    - PATCH `/api/admin/suppliers/:id/reactivate` — reactivate supplier
    - Apply auth + admin role middleware to all routes
    - _Requirements: 1.1, 6.1, 6.2, 6.3, 7.1, 7.4, 7.5, 7.6, 8.2_

  - [x] 4.4 Write property tests for referral code generation
    - **Property 1: Referral code format and uniqueness** — verify 8 alphanumeric chars, all distinct in batch
    - **Property 2: Referral link is a valid URL containing the code** — verify URL parseable, contains code
    - **Validates: Requirements 1.2, 2.3**

  - [x] 4.5 Write property tests for supplier creation and validation
    - **Property 3: Supplier creation yields active status** — valid inputs always produce active supplier with non-null code
    - **Property 4: Invalid supplier input is always rejected** — empty/long name or bad email always rejected
    - **Validates: Requirements 1.1, 1.5**

- [x] 5. Backend core features — Client registration and referral tracking
  - [x] 5.1 Implement client service (registration + queries)
    - Create `backend/src/services/client.service.ts` with register, findBySupplier (paginated, sorted desc), countBySupplier
    - Registration: validate referral code exists and supplier is active, validate input, check duplicate email (409), create client with attribution
    - Reject if supplier deactivated (404 with message)
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6, 7.2_

  - [x] 5.2 Implement referral service and referral/supplier routes
    - Create `backend/src/services/referral.service.ts` with generateCode, buildLink, validateCode
    - Create `backend/src/routes/client.routes.ts` — GET `/api/referral/:code` (validate code, return supplier name), POST `/api/referral/:code/register` (register client)
    - Create `backend/src/routes/supplier.routes.ts` — GET `/api/supplier/me` (own profile + referral info), GET `/api/supplier/me/clients` (own clients, paginated)
    - Apply auth + supplier role middleware to supplier routes
    - _Requirements: 2.3, 3.1, 3.2, 3.3, 4.2, 4.3, 5.1, 5.2, 5.3, 8.3, 8.5_

  - [x] 5.3 Write property tests for client registration and attribution
    - **Property 5: Client registration attributes to correct supplier** — valid data through active code always links to correct supplier
    - **Property 6: Invalid client input is rejected** — bad phone/email/empty fields always rejected
    - **Property 7: Referral count accuracy** — count always equals actual client records
    - **Validates: Requirements 4.2, 4.4, 4.6, 5.1, 6.1**

- [x] 6. Checkpoint — Backend core complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Backend — Deactivation logic and data isolation
  - [x] 7.1 Implement deactivation behavior enforcement in client registration
    - Ensure client registration rejects attempts through deactivated supplier codes
    - Ensure deactivation preserves all existing client attribution records
    - Ensure reactivation restores ability to accept new registrations
    - _Requirements: 7.2, 7.3, 7.5_

  - [x] 7.2 Write property tests for deactivation behavior
    - **Property 10: Deactivated supplier rejects registrations** — any registration through deactivated code fails
    - **Property 11: Deactivation preserves attributions** — N clients remain N after deactivation
    - **Property 12: Deactivate/reactivate round-trip** — deactivate then reactivate restores active + same code
    - **Property 13: Deactivation idempotence** — deactivating already-deactivated is a no-op
    - **Validates: Requirements 7.2, 7.3, 7.5, 7.6**

  - [x] 7.3 Write property test for supplier data isolation
    - **Property 14: Supplier data isolation** — supplier A never sees supplier B's clients
    - **Validates: Requirements 8.3, 8.5**

- [x] 8. Frontend — Auth context and Login page
  - [x] 8.1 Create API client and auth context
    - Create `frontend/src/api/client.ts` — Axios instance with JWT interceptor, base URL config
    - Create `frontend/src/contexts/AuthContext.tsx` — manage token in localStorage, expose user/login/logout
    - Create `frontend/src/hooks/useAuth.ts` — convenience hook for AuthContext
    - _Requirements: 8.1, 8.4, 8.7_

  - [x] 8.2 Implement Login page and protected route wrapper
    - Create `frontend/src/pages/Login.tsx` — email/password form, error display, redirect on success based on role
    - Create route guard component that checks auth state and role, redirects unauthenticated to /login
    - Wire up routes in App.tsx with protected wrappers
    - _Requirements: 8.1, 8.4, 8.6_

- [x] 9. Frontend — Admin Dashboard
  - [x] 9.1 Implement Admin Dashboard page
    - Create `frontend/src/pages/AdminDashboard.tsx` with supplier list sorted by referral count
    - Create `frontend/src/components/SupplierList.tsx` — show name, referral count, status (muted style for deactivated)
    - Implement invite supplier form (name + email fields) with inline validation
    - Add deactivate/reactivate action buttons per supplier
    - _Requirements: 1.1, 6.1, 6.2, 6.4, 6.5, 7.1, 7.4, 7.5, 7.6_

  - [x] 9.2 Implement client list view for admin
    - Create `frontend/src/components/ClientList.tsx` — show business name, contact name, registration date
    - Wire supplier row click/expand to fetch and display attributed clients (sorted by date desc)
    - Display empty state messages when no clients exist for a supplier
    - _Requirements: 6.3, 6.5_

- [x] 10. Frontend — Supplier Dashboard
  - [x] 10.1 Implement Supplier Dashboard page
    - Create `frontend/src/pages/SupplierDashboard.tsx` with referral link display, copy button, status label
    - Create `frontend/src/components/ReferralLink.tsx` — read-only text field + copy action with 3-second confirmation
    - Display total referral count and client list (business name + registration date, paginated 20/page, sorted desc)
    - Show empty state when no referrals exist
    - Handle clipboard copy failure gracefully
    - _Requirements: 2.1, 2.2, 2.4, 3.2, 5.1, 5.2, 5.3_

- [x] 11. Frontend — Client Registration page
  - [x] 11.1 Implement Client Registration page
    - Create `frontend/src/pages/ClientRegister.tsx` — public page at `/r/:code`
    - Validate referral code on mount (GET `/api/referral/:code`), show supplier name or error if invalid/inactive
    - Display registration form: business name, contact name, phone, email with inline validation
    - Handle submission: show success confirmation or field-level errors (preserve entered data)
    - Handle duplicate email (409) with clear message
    - _Requirements: 3.1, 3.3, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 12. Checkpoint — Full feature integration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Property-based tests — Sorting and pagination
  - [x] 13.1 Write property tests for sorting and pagination
    - **Property 8: Client list sorting invariant** — clients always sorted by registeredAt desc, max 20 per page
    - **Property 9: Supplier list sorted by referral count** — admin view always sorted by count desc
    - **Validates: Requirements 5.2, 6.2, 6.3**

- [x] 14. Integration wiring and polish
  - [x] 14.1 Wire all backend routes into Express app and verify Docker Compose startup
    - Ensure `backend/src/index.ts` mounts all route files with correct prefixes
    - Verify docker-compose up builds all containers, runs migrations, seeds data, and reaches usable state
    - Verify frontend Nginx config proxies `/api` to backend
    - Test login with seeded credentials end-to-end
    - _Requirements: 9.4, 9.6_

  - [x] 14.2 Create NotFound page and finalize frontend routing
    - Create `frontend/src/pages/NotFound.tsx` — catch-all 404 page
    - Ensure all routes are correctly mapped in App.tsx
    - Verify role-based redirects after login (admin → /admin, supplier → /dashboard)
    - _Requirements: 8.2, 8.3, 8.4, 8.6_

- [x] 15. Final checkpoint — All tests pass and Docker Compose runs clean
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design uses TypeScript for both backend and frontend — all code examples should use TypeScript
- Docker Compose provides single-command startup (`docker-compose up`) as required by Requirement 9.4
- fast-check is the PBT library; Vitest is the test runner

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1"] },
    { "id": 3, "tasks": ["3.2", "4.1"] },
    { "id": 4, "tasks": ["3.3", "4.2"] },
    { "id": 5, "tasks": ["4.3", "4.4", "4.5"] },
    { "id": 6, "tasks": ["5.1", "5.2"] },
    { "id": 7, "tasks": ["5.3", "7.1", "8.1"] },
    { "id": 8, "tasks": ["7.2", "7.3", "8.2"] },
    { "id": 9, "tasks": ["9.1", "10.1"] },
    { "id": 10, "tasks": ["9.2", "11.1"] },
    { "id": 11, "tasks": ["13.1", "14.1"] },
    { "id": 12, "tasks": ["14.2"] }
  ]
}
```
