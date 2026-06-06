# AI Usage Log

## Tools Used

- **Kiro** (AI-powered IDE) — Spec-driven development mode for requirements → design → tasks → implementation workflow
- **Claude** (via Kiro) — Code generation, architecture decisions, debugging Docker issues

## Workflow: Kiro Spec Mode

I used Kiro's structured spec workflow which breaks development into phases:

1. **Requirements** — Defined 9 formal requirements with EARS-format acceptance criteria, mapped to personas
2. **Design** — Generated a technical design document covering architecture, data models, API routes, error handling, and correctness properties
3. **Tasks** — Created a dependency-ordered task list (43 tasks across 15 groups) with a DAG for parallel execution
4. **Implementation** — Kiro executed tasks wave-by-wave, running tests after each wave

This structured approach meant I spent my time on product decisions (what to build, for whom, what to cut) rather than boilerplate implementation.

## 2–3 Prompts That Mattered Most

### 1. Initial Spec Prompt
> "Build a partner referral portal: suppliers are invite-only, get referral codes, clients register via links with attribution, admin sees who referred whom."

This kicked off the requirements phase. Kiro asked clarifying questions about validation rules, deactivation behavior, and seed data personas — which forced me to make product decisions upfront rather than discovering gaps during implementation.

### 2. Property-Based Testing Prompt
> "Write property tests for deactivation behavior: deactivated supplier rejects registrations, preserves attributions, round-trip deactivate/reactivate restores state, idempotence."

I directed Kiro to use fast-check for property-based tests on the core business invariants (attribution, deactivation, data isolation) rather than example-based tests. This caught edge cases around the deactivation flow that unit tests alone would miss.

### 3. Docker Debugging
> "The backend container fails with 'Could not parse schema engine response' and 'database aajil does not exist'"

After the initial Docker build failed, I pasted the raw logs and directed the fix: OpenSSL missing on Alpine for Prisma, healthcheck targeting wrong database name, missing migration files, and `tsx` not available in the production container.

## Moments I Overrode or Steered the AI

### 1. Scope Control — Rejected Over-Engineering
Kiro's initial design included refresh tokens, rate limiting, and webhook integrations. I cut these because the brief explicitly says "Simple session cookies or a basic JWT is fine" and "Don't invest too much time in things that is existing infra." The AI tends to add production hardening by default — I had to actively constrain it to assessment scope.

### 2. Seed Data — Fixed for Persona Accuracy
Kiro generated random UUIDs for referral codes in the seed script. I overrode this to use human-readable codes (`KHALED01`, `MONA0001`) because:
- The brief emphasizes Khaled wants to paste links into WhatsApp
- Evaluators need to manually test with these codes
- Readable codes demonstrate understanding of the supplier experience

### 3. Docker Runtime — Fixed tsx Availability
Kiro initially kept `tsx` as a devDependency. The seed script uses `tsx prisma/seed.ts` which runs at container startup (not build time). I moved `tsx` and `prisma` to production dependencies because `npm install --omit=dev` in the runtime stage was stripping them. The AI didn't account for the build/runtime boundary in Docker multi-stage builds.

### 4. Login Page — Directed Brand Treatment
The AI generated a generic blue-themed login. I directed it to use Aajil's gold/amber brand colors with a WebGL smokey background animation, because the brief mentions this is an internal tool and first impressions matter for supplier confidence (Mona's persona: "needs to feel confident the link works").

## Why the AI Deviated (Pattern I Noticed)

The AI consistently over-scoped toward "production-ready" patterns (refresh tokens, rate limiting, comprehensive error boundaries, i18n scaffolding) even when the brief explicitly marked these as out of scope. This is because LLMs are trained on production codebases and default to best-practice completeness. The key steering skill was continuously saying "no, simpler" and referencing the brief's scope guardrails to justify cuts.
