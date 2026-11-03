# FITLIFE OS — ARCHITECTURAL CHANGE DECISION LOG

This document is the official ledger of all approved architectural, technological, and scope decisions for **FITLIFE OS**.

No approved requirement or architectural boundary may be altered without recording a change proposal here and receiving explicit human authorization.

---

## Decision Record Format

Each decision entry must document:
- **Decision ID:** `DEC-YYYY-NNN`
- **Date:** ISO Date (`YYYY-MM-DD`)
- **Status:** `PROPOSED` | `APPROVED` | `REJECTED` | `SUPERSEDED`
- **Scope / Component:** (Mobile, Server, Database, Sync, Domain, Auth, Distribution)
- **Previous Decision / Status Quo:** Existing baseline
- **Proposed Decision:** New specification
- **Justification & Rationale:** Why this change is necessary
- **Trade-off Analysis:** Benefits vs. Disadvantages
- **Implications:** Security, Performance, Cost, F-Droid compliance, Offline impact
- **Approver:** Signature / User sign-off

---

## Active Decisions & Initial Proposals

### DEC-2026-001: Mobile Application Framework & Build Architecture
- **Date:** 2026-11-03
- **Status:** PROPOSED (Awaiting User Sign-off)
- **Scope / Component:** Mobile Client (`apps/mobile`)
- **Previous Decision:** Unspecified hybrid or native framework.
- **Proposed Decision:** Adopt **React Native with Expo using `expo prebuild` (Clean Native Config Plugin Architecture)** and TypeScript.
- **Justification:** Allows sharing TypeScript types, validation logic (Zod), and domain algorithms (BMR, 1RM) across mobile and server in a monorepo while retaining direct control over Android Gradle builds for F-Droid compliance.
- **Trade-off Analysis:**
  - *Benefits:* High developer velocity, cross-platform code reuse, rich community ecosystem, standard Hermes JavaScript engine.
  - *Disadvantages:* Requires careful configuration of config plugins to strip proprietary Google Play Services and ensure deterministic offline Gradle builds on F-Droid servers.
- **F-Droid Compliance:** Verified feasible with custom config plugins disabling GMS and proprietary push dependencies.
- **Approver:** Pending

---

### DEC-2026-002: Backend API & Synchronization Stack
- **Date:** 2026-11-03
- **Status:** PROPOSED (Awaiting User Sign-off)
- **Scope / Component:** Backend Server (`apps/server`)
- **Previous Decision:** Unspecified server stack.
- **Proposed Decision:** Adopt **Node.js + Fastify + TypeScript + PostgreSQL 16+**.
- **Justification:** Fastify delivers low overhead and fast I/O throughput; PostgreSQL provides robust relational integrity, JSONB support for sync payloads, and battle-tested ACID compliance.
- **Trade-off Analysis:**
  - *Benefits:* Native TypeScript monorepo integration with `packages/validation` and `packages/domain`; simple self-hosting via Docker Compose.
  - *Disadvantages:* Requires explicit connection pooling and migration management.
- **Self-Hosting Compliance:** 100% free and open-source; runs on any standard Linux container/VPS.
- **Approver:** Pending

---

### DEC-2026-003: Client-Side Storage & Offline Synchronization Strategy
- **Date:** 2026-11-03
- **Status:** PROPOSED (Awaiting User Sign-off)
- **Scope / Component:** Local Storage & Data Synchronization
- **Previous Decision:** Unspecified offline storage.
- **Proposed Decision:** Use **Expo SQLite** with Write-Ahead Logging (WAL) and an append-only **Sync Queue** leveraging Lamport timestamps and idempotent delta batch sync (`POST /api/v1/sync/push`, `GET /api/v1/sync/pull`).
- **Justification:** Ensures instant UI response times ($\le 16\text{ ms}$) without waiting for network I/O, protects user data during connectivity drops, and prevents data loss.
- **Approver:** Pending

---

### DEC-2026-004: Push Notification Architecture for F-Droid
- **Date:** 2026-11-03
- **Status:** PROPOSED (Awaiting User Sign-off)
- **Scope / Component:** Notification Subsystem
- **Previous Decision:** Unspecified push notifications.
- **Proposed Decision:** Rely entirely on **local Android notifications and alarms** for personal health routines (workouts, hydration, habits, sleep). For optional server-triggered community events, support **UnifiedPush** (NextPush/ntfy) without requiring Google Cloud Messaging (FCM).
- **Justification:** Google Play Services FCM violates pure F-Droid guidelines; local notifications provide 100% offline reliability with zero privacy leaks.
- **Approver:** Pending
