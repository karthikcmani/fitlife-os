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

## Active Decisions & Approved Baseline

### DEC-2026-001: Mobile Application Framework & Build Architecture
- **Date:** 2026-11-03
- **Status:** APPROVED
- **Scope / Component:** Mobile Client (`apps/mobile`)
- **Previous Decision:** Unspecified hybrid or native framework.
- **Proposed Decision:** Adopt **React Native with Expo SDK 58 (Stable Production Release `expo@58.0.22`, React Native 0.88.1, React 19.3.0) using `expo prebuild` (Continuous Native Generation)**.
- **Justification:** SDK 58 provides the modern New Architecture by default (TurboModules and Fabric with Hermes engine on Apache-2.0), supports Node v22.13.0, Gradle 8.8+, and OpenJDK 17, and eliminates legacy bridge serialization overhead.
- **Trade-off Analysis:**
  - *Benefits:* High developer velocity, cross-platform code reuse, shared TypeScript packages (`domain`, `validation`), native Hermes C++ execution, $<16\text{ ms}$ write latency.
  - *Disadvantages:* F-Droid compilation must be protected against proprietary transitive dependencies.
- **F-Droid Compliance:** Requires clean native modules with zero Google Mobile Services.
- **Approver:** Human Maintainer (Official Engineering Authorization 2026-11-03)

---

### DEC-2026-002: Backend API & Synchronization Stack
- **Date:** 2026-11-03
- **Status:** APPROVED
- **Scope / Component:** Backend Server (`apps/server`)
- **Previous Decision:** Unspecified server stack.
- **Proposed Decision:** Adopt **Node.js + Fastify + TypeScript + PostgreSQL 16+ + Kysely + Caddy**.
- **Justification:** Fastify delivers low overhead and fast I/O throughput; PostgreSQL provides robust relational integrity, JSONB support for sync payloads, and battle-tested ACID compliance.
- **Trade-off Analysis:**
  - *Benefits:* Native TypeScript monorepo integration with `packages/validation` and `packages/domain`; simple self-hosting via Docker Compose.
  - *Disadvantages:* Requires explicit connection pooling and migration management.
- **Self-Hosting Compliance:** 100% free and open-source; runs on any standard Linux container/VPS.
- **Approver:** Human Maintainer (Official Engineering Authorization 2026-11-03)

---

### DEC-2026-003: Client-Side Storage & Offline Synchronization Strategy
- **Date:** 2026-11-03
- **Status:** APPROVED
- **Scope / Component:** Local Storage & Data Synchronization
- **Previous Decision:** Unspecified offline storage.
- **Proposed Decision:** Use **Expo SQLite** with Write-Ahead Logging (WAL) and an append-only **Sync Queue** leveraging **Hybrid Logical Clocks (HLC)**, idempotent batch mutations (`POST /api/v1/sync/push`), field-level Last-Write-Wins (LWW) for mutable entities, soft-delete tombstones, and server-side `idempotency_ledger` providing **effectively-once processing**.
- **Justification:** Resolves physical clock skew, guarantees deterministic multi-device convergence, and safely handles lost acknowledgments without duplicating mutations.
- **Approver:** Human Maintainer (Official Engineering Authorization 2026-11-03)

---

### DEC-2026-004: Notification Architecture for F-Droid
- **Date:** 2026-11-03
- **Status:** APPROVED
- **Scope / Component:** Notification Subsystem
- **Previous Decision:** Unspecified push notifications / `expo-notifications`.
- **Proposed Decision:** Implement a dedicated local notification bridge (`@fitlife/local-notifications`) using pure Android Jetpack `androidx.core:core` (`NotificationCompat` + `AlarmManager`), completely omitting `expo-notifications` (which hardcodes Firebase Cloud Messaging). For optional community alerts, evaluate **UnifiedPush** (NextPush/ntfy).
- **Justification:** Concrete inspection of `expo-notifications@58.1.7` tarball proved hardcoded Kotlin dependencies on `com.google.firebase:firebase-messaging`, which breaks F-Droid compilation when stripped. A dedicated lightweight local bridge guarantees 100% FLOSS F-Droid buildability.
- **Approver:** Human Maintainer (Official Engineering Authorization 2026-11-03)

---

### DEC-2026-005: Nutrition Database Licensing & Ingestion Strategy
- **Date:** 2026-11-03
- **Status:** APPROVED
- **Scope / Component:** Nutrition Subsystem (`foods` dataset)
- **Previous Decision:** Bundle ICMR-NIN IFCT 2017 dataset directly.
- **Proposed Decision:** Pre-seed local database exclusively with legally unencumbered datasets: **Open Food Facts (ODbL v1.0)**, **USDA FoodData Central (Public Domain)**, and open-source community-verified Indian composite recipes with household measure mappings (katori, roti, cup). Do NOT bundle IFCT 2017 or automated scrapers due to copyright restrictions under Section 52 of the Indian Copyright Act.
- **Justification:** ICMR-NIN holds strict copyright on IFCT 2017 prohibiting unauthorized electronic distribution in products. Open Food Facts and USDA are legally unencumbered, free software compliant, and free from copyright liability.
- **Approver:** Human Maintainer (Official Engineering Authorization 2026-11-03)

---

### DEC-2026-006 (ISSUE-002): Transformation Photo Vault Security & Crypto-Shredding
- **Date:** 2026-11-03
- **Status:** APPROVED
- **Scope / Component:** Transformation Subsystem (`apps/mobile`)
- **Previous Decision:** Standard file storage in sandboxed directory.
- **Proposed Decision:** Implement zero-knowledge **AES-256-GCM** encryption at rest. Symmetric master key is generated in hardware-backed **Android Keystore** (`setInvalidatedByBiometricEnrollment(true)`). EXIF metadata is stripped in memory prior to encryption. Photos directory is excluded from Android OS auto-backup. Account deletion and vault purge execute **Cryptographic Erasure (Crypto-Shredding)** by destroying the Keystore key.
- **Justification:** Flash memory wear leveling prevents guaranteed physical block zeroing. Cryptographic destruction provides mathematically provable erasure ($2^{256}$ keyspace).
- **Approver:** Human Maintainer (Official Engineering Authorization 2026-11-03)
