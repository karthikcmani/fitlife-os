# FITLIFE OS — PROJECT ROADMAP

This document outlines the phased development plan for **FITLIFE OS**. Milestones are ordered by architectural dependency to ensure solid engineering foundations before user-facing feature expansion.

---

## Phase 0: Project Initiation & Governance (Completed)
* [x] Repository inspection & Git baseline verification
* [x] Apache 2.0 License verification
* [x] `AGENTS.md` permanent engineering rules formulation
* [x] Master System Blueprint creation (`docs/MASTER_SYSTEM_BLUEPRINT.md`)
* [x] Technology stack evaluation & F-Droid feasibility analysis
* [x] Architectural Change Decision log setup (`docs/CHANGE_DECISIONS.md`)
* [x] Human approval of Master Blueprint and proposed technology choices (Authorized 2026-11-03)

---

## Phase 1: Monorepo Foundation & Core Domain Logic (Completed)
* [x] Turborepo / npm workspaces initialization
* [x] TypeScript base configuration (`tsconfig.base.json`) with strict checks
* [x] ESLint and Prettier rules setup
* [x] `packages/shared-types` scaffold (Entities, DTOs, Enums, HLC)
* [x] `packages/validation` scaffold (Zod schemas matching shared types)
* [x] `packages/domain` implementation:
  - Mifflin-St Jeor & Katch-McArdle BMR calculators
  - TDEE & goal-based caloric adjustments
  - Macronutrient partitioning logic
  - 1RM calculators (Brzycki & Epley)
  - Progressive overload volume analyzers
  - Sleep & Recovery index calculation
* [x] Comprehensive unit test suites for `packages/domain` with 100% boundary test coverage (29/29 tests passing)

---

## Phase 2: Mobile Application Foundation & Design System (`apps/mobile`) (Active)
* [ ] Expo SDK 58 initialization with `expo prebuild` configuration
* [ ] Custom Config Plugin for F-Droid compliance (stripping GMS, Firebase, analytics)
* [ ] Atomic Design System primitives:
  - Theme provider (OLED Dark Mode & Clean Light Mode)
  - Color tokens, typography, spacing scales
  - Surface cards, metric chips, custom buttons
  - Haptic feedback integration
* [ ] Local SQLite database initialization (`expo-sqlite`):
  - DDL schema execution & versioned migration manager
  - Local repository / DAO layers
  - Seed baseline exercise library (500+ categorized exercises)
  - Seed initial Indian food taxonomy (ICMR-NIN IFCT 2017)
* [ ] Authentication screens & SecureStore token management
* [ ] Onboarding wizard (Physiological calibration & goal setting)

---

## Phase 3: Core Tracking Engines
* [ ] **Workout Engine:**
  - Active workout logger (Sets, Reps, Weight, RPE)
  - Interactive rest timer with local notification & haptic alerts
  - Personal record (PR) badge detector
  - Routine creator & workout history calendar
* [ ] **Nutrition Engine:**
  - Food search with instant local SQLite indexing
  - Indian portion selector (Katori, Roti, Grams)
  - Meal logger (Breakfast, Lunch, Dinner, Snacks)
  - Daily macro progress bars (Calories, Protein, Carbs, Fat, Fiber)
* [ ] **Vitals & Habits:**
  - Water intake logger with quick-add volume buttons
  - Habit tracker with streak calculations
  - Sleep logger (bedtime, wake-up, quality rating)
* [ ] **Body Transformation:**
  - Circumference measurement logger (Waist, Chest, Arms, Thighs)
  - Bodyweight moving average trend chart
  - Encrypted, sandboxed local progress photo vault

---

## Phase 4: Backend API & Synchronization (`apps/server`)
* [ ] Fastify HTTP server setup with TypeScript
* [ ] PostgreSQL 16+ DDL migration scripts
* [ ] Authentication endpoints (`/api/v1/auth/*`) with Argon2id and JWT
* [ ] User profile CRUD & preference synchronization
* [ ] Sync Engine (`/api/v1/sync/push` and `/api/v1/sync/pull`):
  - Idempotent batch insertion
  - Lamport timestamp validation
  - Conflict resolution tests
* [ ] Docker Compose orchestration for self-hosters

---

## Phase 5: Community & Peer Accountability
* [ ] User profile visibility toggles (Public, Friends Only, Private)
* [ ] Opt-in friend relationships and activity feed
* [ ] Group challenges (Streak, Consistency, Volume)
* [ ] Reporting & content moderation controls
* [ ] Threat model verification & data privacy audit

---

## Phase 6: Testing, Hardening & F-Droid Packaging
* [ ] End-to-end integration tests (Maestro / E2E test harness)
* [ ] F-Droid build recipe verification on clean Debian container
* [ ] APK size optimization and memory leak auditing
* [ ] Documentation finalization (User guide, Self-hosting guide)
* [ ] Production release tag preparation (v1.0.0)
