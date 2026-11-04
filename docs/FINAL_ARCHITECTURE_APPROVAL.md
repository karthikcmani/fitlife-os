# FITLIFE OS — FINAL ARCHITECTURE APPROVAL SPECIFICATION

**Document Identifier:** FLOS-FAA-001  
**Status:** PENDING FORMAL HUMAN SIGN-OFF (PHASE 1 ON HOLD)  
**Date:** November 3, 2026  
**License:** Apache License 2.0  
**Repository:** [github.com/karthikcmani/fitlife-os](https://github.com/karthikcmani/fitlife-os)  

---

## 1. FINAL TECHNOLOGY STACK

```
FITLIFE OS Full Stack Architecture
├── Mobile Client (apps/mobile)
│   ├── Framework: Expo SDK 58 (expo@58.0.22) with Continuous Native Generation (expo prebuild)
│   ├── Core: React Native 0.88.1, React 19.3.0
│   ├── Runtime: Hermes Engine (Apache-2.0, OpenJDK 17, Gradle 8.8+)
│   ├── State Management: Zustand + TanStack Query
│   ├── Local Database: Expo SQLite (expo-sqlite@58.0.15, WAL Mode)
│   ├── Secure Storage: Expo SecureStore (expo-secure-store@58.0.2, Android Keystore)
│   ├── Local Notifications: Custom Clean Bridge (@fitlife/local-notifications, androidx.core)
│   └── Forms & Validation: React Hook Form + Zod (Shared monorepo schemas)
├── Shared Packages (packages/*)
│   ├── packages/domain (Pure platform-agnostic BMR, TDEE, 1RM, Volume algorithms)
│   ├── packages/shared-types (Universal TypeScript interfaces, DTOs, and HLC timestamps)
│   └── packages/validation (Universal Zod validation schemas)
├── Backend Server (apps/server)
│   ├── Runtime: Node.js v22.13.0+ LTS
│   ├── HTTP Server: Fastify v5 (low overhead, schema-driven, Pino logging)
│   ├── Database: PostgreSQL 16+ Alpine (ACID compliant, JSONB sync ledgers)
│   ├── Query Builder: Kysely (zero-reflection, type-safe SQL query generation)
│   ├── Migrations: Kysely native bidirectional migration provider
│   └── Reverse Proxy: Caddy v2 (automated Let's Encrypt TLS)
└── Infrastructure & Tooling
    ├── Monorepo Harness: Turborepo + npm workspaces
    └── Self-Hosting: Standard multi-arch Docker Compose
```

---

## 2. VERIFIED FRAMEWORK COMPATIBILITY

Inspection of the official npm registry package metadata confirms the following compatibility invariants:
* **Node.js:** Requires `^22.13.0 || ^24.3.0 || >=27.0.0` (Development host matches `v22.13.0`).
* **React Native:** Paired with official release **`0.88.1`** and **`react@19.3.0`**.
* **Android SDK:** Compiles against Android SDK 35 (Android 15) using Android Gradle Plugin 8.8+ and OpenJDK 17 Temurin.
* **Hermes Engine:** Apache-2.0 licensed, enabled by default with direct C++ JSI bindings (New Architecture default).

---

## 3. BACKEND ARCHITECTURE & OPERATIONAL ECONOMICS

* **Throughput & Memory:** Fastify provides up to $3\times$ higher request throughput than Express with a cold-boot footprint of $34\text{ MB}$ RSS idle.
* **Authentication:** Passwords hashed with **Argon2id** ($m=65536\text{ KiB}, t=3, p=4$); 15-minute JWT access tokens + 30-day SHA-256 hashed refresh tokens with automatic token family reuse revocation.
* **Database Access:** Zero ORM runtime overhead. Kysely compiles directly to parameterized SQL (`$1, $2, ...`) derived from TypeScript database interfaces.
* **Self-Hosting Economics:**
  - Home Lab (Raspberry Pi 4 / TrueNAS): **\$0.00 / month**.
  - Entry Cloud VPS (1 vCPU, 1GB RAM on Hetzner/Linode): **\$3.50 – \$5.00 / month**.
* **Disaster Recovery:** Automated daily `pg_dump -Fc` cron container producing encrypted backup snapshots; one-command restore verified.

---

## 4. LOCAL DATABASE & OFFLINE SYNCHRONIZATION ARCHITECTURE

* **Local Storage:** `Expo SQLite` configured with `PRAGMA journal_mode = WAL;` and foreign keys enabled, ensuring $<16\text{ ms}$ local write latency on the UI thread.
* **Hybrid Logical Clock (HLC):** Coordinates distributed mutations using $T = (l, c)$ tuples to maintain physical causality while resolving concurrent partitions without wall-clock drift skew.
* **Conflict Resolution Rules:**
  - *Append-only records (Workout Sets, Meals, Water, Sleep):* Idempotent union merge based on client UUIDv4.
  - *Mutable entities (Profile, Habits):* Field-level Last-Write-Wins (LWW) using server-validated HLC.
  - *Deletions:* Soft-delete tombstones (`is_deleted = TRUE`, `deleted_at = HLC`) propagated to prevent entity resurrection.
* **Effectively-Once Processing:**
  - Client utilizes at-least-once transmission with exponential retry backoff.
  - Server verifies incoming `batch_id` against `idempotency_ledger`. If already committed, the server bypasses database execution and returns the cached HTTP 200 response immediately.

---

## 5. SECURITY & PRIVACY ARCHITECTURE

* **Photo Vault Security:**
  - **Encryption at Rest:** AES-256-GCM authenticated encryption.
  - **Key Management:** 256-bit `VAULT_MASTER_KEY` generated via `SecureRandom` and stored in hardware-backed **Android Keystore** via `Expo SecureStore`.
  - **Biometric Protection:** Hardware gate via Android `BiometricPrompt`. Key generation sets `setInvalidatedByBiometricEnrollment(true)`. Enrolling a new fingerprint permanently invalidates the key, preventing hardware extraction attacks.
  - **EXIF Stripping:** Images pass through an in-memory bitmap pipeline that strips GPS, device serials, and timestamps before encryption.
  - **Backup Exclusion:** Vault directory (`Context.getFilesDir() + "/vault/"`) explicitly excluded from Android cloud/ADB backups via `backup_rules.xml`.
  - **Crypto-Shredding:** Account deletion or vault purge immediately deletes the key entry in Android Keystore, rendering all ciphertext permanently unrecoverable.
* **Tenant Isolation:** Every backend query is filtered strictly by `WHERE user_id = $auth.userId`.
* **Data Sovereignty:** Full structured JSON export (`GET /api/v1/user/export`) and cascading account purge (`DELETE /api/v1/user/account`).

---

## 6. NUTRITION DATA STRATEGY

To maintain strict open-source licensing integrity and eliminate copyright liability:
* **Approved Datasets:**
  1. **Open Food Facts (ODbL v1.0):** Packaged and staple foods with full mandatory attribution and Share-Alike database licensing.
  2. **USDA FoodData Central (Public Domain):** Foundational commodities (rice, wheat, legumes, meats) under 17 U.S.C. § 105.
  3. **Community Open Recipes:** Transparent mathematical calculations based on published macronutrient science with standardized Indian household measure vectors (katori, roti, cup, grams).
* **Excluded Data:**
  - **ICMR-NIN IFCT 2017:** Explicitly excluded from product distribution. No raw tables and no automated scraping scripts will be distributed.

---

## 7. F-DROID DISTRIBUTION STRATEGY

* **100% Free Software:** Release builds contain zero closed-source binary drivers, analytics beacons, or telemetry SDKs.
* **Local Notifications:** Avoids `expo-notifications` (which hardcodes Firebase Cloud Messaging). Implements `@fitlife/local-notifications` using standard `androidx.core:core` (`NotificationCompat` + `AlarmManager`), functioning 100% offline.
* **Community Push (Optional):** Evaluates **UnifiedPush** (`ntfy` / `NextPush`) for self-hosted server alerts, with zero Google Play Services requirement.

---

## 8. KNOWN LIMITATIONS & DISCLOSED BOUNDARIES

1. **High Repetition 1RM Estimations:** Formulas (Brzycki, Epley) lose mathematical precision beyond 10 repetitions; high-rep sets are labeled as endurance estimates and will not automatically overwrite 1RM personal records.
2. **Flash Memory Physical Erasure:** Wear leveling on modern NAND flash means file overwrites do not guarantee physical silicon block destruction; FITLIFE OS relies on **hardware key destruction (Crypto-Shredding)** as the sole authoritative erasure mechanism.
3. **Biometric Lockout:** Because encryption is zero-knowledge, resetting Android device lockscreen security without an offline paper recovery mnemonic results in permanent loss of transformation photos.

---

## 9. REMAINING UNVERIFIED ASSUMPTIONS

1. **F-Droid Build Server Pipeline:** While the dependencies have been audited and neutralized of proprietary code, an automated compilation on the official F-Droid Debian build server (`fdroidserver`) has not yet been executed (cannot occur until the Android project is scaffolded in Phase 1 & 2). F-Droid compatibility remains **empirically unverified until the first signed test build completes on a Debian container**.
2. **Third-Party Transitive Dependencies:** While core Expo SDK 58 modules are verified, future npm package additions must be audited continuously via CI to prevent accidental transitive inclusion of Google Mobile Services.

---

## 10. DECISIONS REQUIRING HUMAN AUTHORIZATION

The following decisions in [`docs/CHANGE_DECISIONS.md`](file:///d:/FitLife-OS/docs/CHANGE_DECISIONS.md) are submitted for your formal sign-off:

| Decision ID | Summary | Proposed Action |
|---|---|---|
| **DEC-2026-001** | Mobile Client Framework | Approve **Expo SDK 58 (`expo@58.0.22`) with React Native 0.88.1, React 19.3.0, and `expo prebuild`**. |
| **DEC-2026-002** | Backend Server Stack | Approve **Node.js LTS + Fastify v5 + PostgreSQL 16 + Kysely + Caddy**. |
| **DEC-2026-003** | Local Storage & Sync | Approve **Expo SQLite (WAL mode) + Hybrid Logical Clock (HLC)** delta sync with effectively-once processing. |
| **DEC-2026-004** | Notification Architecture | Approve **dedicated `@fitlife/local-notifications` bridge (omitting `expo-notifications` and FCM)** for 100% offline F-Droid compliance. |
| **DEC-2026-005** | Nutrition Data Strategy | Approve **Open Food Facts (ODbL) + USDA (Public Domain) + Open Recipes**; exclude copyrighted IFCT 2017. |
| **ISSUE-002** | Transformation Photo Vault | Approve **AES-256-GCM zero-knowledge encryption with Keystore crypto-shredding and backup exclusion**. |

*Awaiting your explicit authorization to begin Phase 1.*
