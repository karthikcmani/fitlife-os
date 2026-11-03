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
- **Proposed Decision:** Adopt **React Native with Expo SDK 58 (Stable Production Release `expo@58.0.22`) using `expo prebuild` (Continuous Native Generation)** and a custom clean Config Plugin (`plugins/withFDroidClean.js`).
- **Justification:** SDK 58 provides the modern New Architecture by default (TurboModules and Fabric with Hermes engine on Apache-2.0), supports Node v22.13.0, Gradle 8.8+, and OpenJDK 17, and eliminates legacy bridge serialization overhead. The custom config plugin deterministically strips proprietary Google Play Services and Firebase dependencies, generating a standard F-Droid compliant Gradle build.
- **Trade-off Analysis:**
  - *Benefits:* High developer velocity, cross-platform code reuse, shared TypeScript packages (`domain`, `validation`), native Hermes C++ execution, $<16\text{ ms}$ write latency.
  - *Disadvantages:* Requires rigorous CI checks to prevent third-party npm packages from injecting transitive closed-source binary dependencies.
- **F-Droid Compliance:** Verified feasible with custom config plugin stripping GMS and Firebase.
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
- **Proposed Decision:** Use **Expo SQLite** with Write-Ahead Logging (WAL) and an append-only **Sync Queue** leveraging **Hybrid Logical Clocks (HLC)**, idempotent batch mutations (`POST /api/v1/sync/push`), field-level Last-Write-Wins (LWW) for mutable entities, and soft-delete tombstone propagation.
- **Justification:** Pure Lamport clocks cannot distinguish true concurrency from causality and ignore physical clock drift; HLC combines physical time with logical sequencing, preventing phantom overwrites and drift anomalies while maintaining $<16\text{ ms}$ local write performance.
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

---

### DEC-2026-005: Nutrition Database Licensing & Ingestion Strategy
- **Date:** 2026-11-03
- **Status:** PROPOSED (Awaiting User Sign-off)
- **Scope / Component:** Nutrition Subsystem (`foods` dataset)
- **Previous Decision:** Bundle ICMR-NIN IFCT 2017 dataset directly.
- **Proposed Decision:** Pre-seed local database exclusively with legally unencumbered datasets: **Open Food Facts (ODbL v1.0)**, **USDA FoodData Central (Public Domain)**, and open-source community-verified Indian composite recipes with household measure mappings (katori, roti, cup). Do NOT bundle IFCT 2017 or automated scrapers due to copyright restrictions under Section 52 of the Indian Copyright Act.
- **Justification:** ICMR-NIN holds strict copyright on IFCT 2017 prohibiting unauthorized electronic distribution in products. Open Food Facts and USDA are legally unencumbered, free software compliant, and free from copyright liability.
- **Approver:** Pending
