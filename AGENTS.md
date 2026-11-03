# AGENTS.md — PERMANENT ENGINEERING RULES FOR FITLIFE OS

This file defines the authoritative, mandatory rules of engagement for all autonomous AI coding agents, subagents, and human contributors working on the **FITLIFE OS** repository.

Every AI assistant or agent working on this codebase **must read and strictly adhere to this document and `docs/MASTER_SYSTEM_BLUEPRINT.md` before making any modifications or proposals.**

---

## 1. The Supreme Authority of the Master Blueprint
1. **Always read `docs/MASTER_SYSTEM_BLUEPRINT.md` first.** It is the single, permanent source of truth for all product scope, functional and non-functional requirements, architectural decisions, database schemas, API specs, and technical boundaries.
2. **Never silently remove, weaken, replace, or reinterpret an approved requirement.**
3. **Never change the approved technology stack, database architecture, authentication strategy, product scope, or major UX flows without explicit human authorization.**
4. If a better technical solution or optimization is identified:
   - Prepare a formal Change Proposal following the format defined in the blueprint (Existing decision, Proposed decision, Rationale, Benefits, Disadvantages, Security/Performance/Cost/F-Droid implications, Migration impact).
   - Await explicit user authorization.
   - Once authorized, record the entry in `docs/CHANGE_DECISIONS.md` and update `docs/MASTER_SYSTEM_BLUEPRINT.md`.
5. **Never treat an undocumented assumption as an approved requirement.** When an implementation detail is ambiguous, formulate clear questions and request clarification rather than inventing product decisions.

---

## 2. Integrity and Truthfulness in Engineering
1. **Never claim tests passed unless they were actually executed in the environment and returned exit code 0.**
2. **Never claim a feature is complete when it is only partially implemented.** Stubs, mocks, or UI shells without underlying functional wiring must be explicitly documented as in-progress or planned.
3. **No fake or placeholder behavior in production paths.** If a screen, button, or feature is not yet implemented, it must clearly indicate to the user that it is under development rather than silently failing, doing nothing, or returning hardcoded fake mock data that masquerades as real user data.
4. **Never fabricate nutritional values or medical claims.** All nutrition calculations, metabolic rates, and exercise recommendations must follow documented physiological methods with explicit safety boundaries and disclaimers.

---

## 3. Security, Privacy, and Licensing
1. **Zero Secret Leakage:** Never hardcode or commit API keys, database passwords, JWT secrets, encryption keys, personal photographs, or user data. Use environment variables and provide `.env.example` templates with empty placeholders only.
2. **Strict Privacy by Default:** Health, biometric, workout, and transformation data (especially body measurements and progress photos) are strictly private. Progress photos and sensitive metrics must never be published to community feeds without explicit, per-item user opt-in.
3. **F-Droid Compatibility & 100% Free Software:** 
   - No non-free, proprietary, or closed-source binary blobs, SDKs, or tracking libraries (e.g., Google Play Services dependencies must be strictly optional or abstracted away, no proprietary Firebase/Crashlytics, no proprietary ad/analytics trackers).
   - All runtime and build-time dependencies must be verified against open-source licenses compatible with Apache-2.0 (e.g., MIT, BSD, Apache-2.0, ISC).
   - Ensure builds are reproducible and compilable using standard open toolchains.
4. **Self-Hostable and Offline Independence:** Core personal features (workout logging, nutrition tracking, water tracking, sleep tracking, habit tracking, body transformation) must function 100% locally without network connectivity. Network access is reserved for synchronization, community features, and optional online AI assistance.

---

## 4. Code Quality and Architecture Standards
1. **Separation of Concerns & Clean Monorepo Structure:**
   - `apps/mobile`: Mobile client (React Native / Expo with local SQLite).
   - `apps/server`: Self-hostable API and sync backend (Fastify, PostgreSQL).
   - `packages/domain`: Pure, platform-agnostic business logic, calculation engines (BMR/TDEE/macros, workout progressions).
   - `packages/shared-types`: Universal TypeScript types and DTOs.
   - `packages/validation`: Zod schemas shared across client and server.
2. **Strict Typing:** TypeScript strict mode enabled across all packages. Avoid `any` — use precise union types, generic constraints, and schema validations.
3. **Defensive Input Validation:** All external input (API payloads, user inputs, imported data, SQLite queries) must be validated with Zod schemas.
4. **Offline-First Data Flow:** Writes must succeed locally first (local SQLite transaction) and queue a change record for synchronization. Never discard user data due to offline states or network interruptions.
5. **Database Discipline:** Never execute ad-hoc schema changes. All PostgreSQL and SQLite schema changes must be versioned through forward-compatible, reversible migration scripts.

---

## 5. Testing and Verification Protocols
1. Every domain calculation (TDEE, BMR, macro splits, 1RM estimations, progressive overload rules) must have exhaustive unit tests covering edge cases, invalid inputs, and boundary conditions.
2. Every API endpoint must have automated integration tests verifying authentication, authorization, validation, and error states.
3. Every local-to-remote sync flow must have conflict-resolution test coverage.
4. When editing code, always run the relevant test suite before reporting completion.

---

## 6. Communication and Reporting Protocol
At the conclusion of every development step or task, provide a structured report covering:
1. **Completed:** Concrete artifacts created, modified, or tested.
2. **Files Changed:** Specific file paths and their functional changes.
3. **Tests:** Exact test commands run, with raw or summarized execution output and pass/fail counts.
4. **Remaining:** Pending tasks in the current milestone.
5. **Issues & Discovered Risks:** Technical debt, edge cases, blockers, or ambiguities.
6. **Next Step:** The immediate next objective according to the approved roadmap.
