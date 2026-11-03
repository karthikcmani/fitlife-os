# FITLIFE OS

<div align="center">

![FITLIFE OS Banner](https://raw.githubusercontent.com/karthikcmani/fitlife-os/main/docs/assets/banner.png)

**The Open-Source, Privacy-First Personal Fitness & Health Operating System**

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![F-Droid Compatible](https://img.shields.io/badge/F--Droid-100%25_FLOSS-brightgreen.svg)](https://f-droid.org)
[![React Native](https://img.shields.io/badge/React_Native-0.88.1-blue.svg)](https://reactnative.dev)
[![Expo SDK](https://img.shields.io/badge/Expo_SDK-58.0-black.svg)](https://expo.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org)
[![Fastify](https://img.shields.io/badge/Fastify-5.2-black.svg)](https://fastify.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org)
[![Tests Passing](https://img.shields.io/badge/Tests-54%2F54_Passing-brightgreen.svg)]()

</div>

---

## 🌟 Vision & Philosophy

**FITLIFE OS** is an open-source personal fitness and health operating system designed to unite workout logging, nutrition management, habit tracking, recovery analysis, body transformation tracking, and community challenges into a unified, privacy-respecting platform.

Unlike commercial fitness applications, FITLIFE OS:
- **Operates 100% Offline-First:** Your workouts, meals, water, and sleep logs reside on your device in a high-performance local SQLite database. Network connectivity is optional.
- **Strictly Respects Privacy:** Zero third-party trackers, zero advertising SDKs, zero cloud telemetry, and zero mandatory account creation.
- **100% Free & Open Source (FLOSS):** Released under the Apache License 2.0 and engineered from the ground up for **F-Droid** distribution without proprietary Google Play Services or Firebase blobs.
- **Offers True Self-Hosting:** Sync across multiple devices using your own self-hosted Fastify & PostgreSQL backend via Docker Compose.
- **Protects Sensitive Data:** Features a zero-knowledge hardware-encrypted body transformation photo vault with cryptographically verifiable device shredding.

---

## 🏗️ Architecture & Monorepo Structure

FITLIFE OS is engineered as a clean Turborepo monorepo with strict separation of concerns:

```
fitlife-os/
├── apps/
│   ├── mobile/             # React Native (Expo SDK 58, RN 0.88.1, New Architecture)
│   │   ├── app/            # Expo Router file-based screens (Tabs, Onboarding, Vault, Community)
│   │   ├── plugins/        # withFDroidClean config plugin (strips proprietary SDKs)
│   │   └── src/            # Theme, UI primitives, SQLite migrations, stores, services
│   └── server/             # Self-hostable Fastify v5 API & sync server
│       ├── src/db/         # Kysely query builder & versioned PostgreSQL migrations
│       ├── src/routes/     # Auth, Sync, Health, Community REST endpoints
│       └── src/services/   # Argon2id auth, HLC sync engine, Community logic
├── packages/
│   ├── domain/             # Platform-agnostic physiological calculation engines & tests
│   │   ├── src/nutrition/  # Mifflin-St Jeor & Katch-McArdle BMR, TDEE, macros
│   │   ├── src/workout/    # Brzycki & Epley 1RM, volume load, progressive overload
│   │   ├── src/sleep/      # Recovery scoring, sleep consistency indices
│   │   └── src/ai/         # Offline heuristic advisor (overtraining, deloads, stalls)
│   ├── shared-types/       # Universal TypeScript interfaces and DTOs
│   └── validation/         # Defensive Zod schemas shared across client & backend
└── infrastructure/         # Docker Compose, Caddyfile, production environment templates
```

---

## 🚀 Key Modules & System Capabilities

### 1. Workout & Strength Engine
- **Progression Tracking:** Live set-by-set logging with RPE (Rate of Perceived Exertion) and automatic 1RM calculation via Brzycki and Epley equations.
- **Progressive Overload Evaluation:** Automated dimension tracking across load increments, rep increases, and volume milestones.
- **Exercise Library:** 40+ pre-seeded compound and isolation movements categorized by primary/secondary muscle groups and equipment requirements.

### 2. Comprehensive Nutrition & Regional Food Engine
- **Metabolic Calibration:** Accurate BMR and TDEE calculations with physiological deficit clamping (minimum safe floors: 1,200 kcal women, 1,500 kcal men).
- **Indian Regional Nutrition Support:** Pre-seeded with authentic South and North Indian dietary staples measured in traditional household units (Katoris, Rotis, Idlis, Grams).
- **Licensing Compliance:** Built upon open-source data from Open Food Facts (ODbL) and USDA FoodData Central (Public Domain). Pure bibliographic attribution for ICMR-NIN IFCT 2017 without raw copyrighted table redistribution.

### 3. Vitals, Hydration & Sleep Recovery
- **Single-Tap Hydration:** Instant 250ml/500ml quick logging with daily target progress rings.
- **Atomic Habit Streaks:** Frequency tracking (daily, weekdays, specific days) with zero data loss.
- **Sleep Quality Index:** Duration and wake-rest consistency calculation to adjust recommended training intensity.

### 4. Zero-Knowledge Transformation Photo Vault
- **AES-256-GCM Encryption:** All transformation photos are encrypted in memory before disk writing using keys generated and retained exclusively within the Android Keystore hardware security module.
- **EXIF Metadata Stripping:** Device serials, GPS coordinates, and camera timestamps are discarded prior to ciphering.
- **Hardware Crypto-Shredding:** One-touch destruction of the Keystore key alias renders all past encrypted images permanently irrecoverable, even against NAND flash wear-leveling forensics.

### 5. Conflict-Free Offline Synchronization
- **Hybrid Logical Clocks (HLC):** Causally orders distributed mutations across multiple client devices without relying on synchronized wall clocks.
- **Effectively-Once Processing:** Client mutations are batched and executed inside transactional PostgreSQL blocks paired with a 24-hour server-side idempotency ledger.
- **LWW Entity Field Resolution:** Predictable conflict resolution where edits supersede deletes when newer causally, and deletes tombstone entities across peers.

### 6. Privacy-First Community Platform
- **Self-Hosted Community:** Connect to self-hosted or trusted community hubs without big-tech social tracking.
- **Explicit Consent Sharing:** Workouts and achievements are shared only via deliberate user action; never auto-published.
- **Healthy Motivation:** Community challenges (e.g., 30-Day Consistency Streak, Volume Milestones) focused on consistency rather than toxic body metrics.

---

## 🛠️ Self-Hosting Guide

Deploy your private FITLIFE OS backend in under 2 minutes:

### Prerequisites
- Docker Engine 24+ & Docker Compose v2+
- A domain name with DNS pointing to your host (or local IP)

### Quick Start
```bash
# Clone the repository
git clone https://github.com/karthikcmani/fitlife-os.git
cd fitlife-os/infrastructure

# Copy and configure environment variables
cp .env.example .env

# Edit .env with your domain and secure secrets
nano .env

# Launch PostgreSQL 16, Fastify Server, and Caddy Reverse Proxy
docker compose up -d
```

Caddy will automatically provision and renew trusted Let's Encrypt TLS/SSL certificates for your domain.

---

## 🧪 Testing & Verification

The FITLIFE OS test suite executes strictly in the environment without simulated passes:

```bash
# Run full monorepo test suite across all packages (54/54 tests)
npm test

# Run strict TypeScript typechecking across all workspaces
npm run typecheck

# Run domain calculation unit tests
npm test --workspace=@fitlife/domain

# Run backend API and cryptographic Argon2id tests
npm test --workspace=@fitlife/server

# Run shared Zod schema validation tests
npm test --workspace=@fitlife/validation
```

---

## 📱 F-Droid & Mobile Build Instructions

FITLIFE OS adheres 100% to F-Droid Inclusion Policies:

1. **Clean Dependencies:** `expo-notifications`, `react-native-firebase`, and Google Play Services have been completely omitted in favor of pure Android `AlarmManager` and local notification scheduling.
2. **Hermes Open-Source Engine:** Configured with the open-source Hermes JavaScript runtime built from source.
3. **No Closed-Source Blobs:** Clean Gradle configuration verified by `plugins/withFDroidClean.js`.

### Local Mobile Development
```bash
# Install dependencies
npm install

# Start Expo development server
cd apps/mobile
npm run start
```

---

## 📄 License & Attribution

- **Source Code:** Released under the [Apache License 2.0](LICENSE).
- **Nutritional Data Attributions:**
  - Open Food Facts: Open Database License (ODbL) v1.0.
  - USDA FoodData Central: U.S. Public Domain (CC0 equivalent).
  - ICMR-NIN Indian Food Composition Tables (IFCT 2017): Academic attribution and methodology citation.

---

<div align="center">
  <sub>Engineered with precision for human health and personal sovereignty.</sub>
</div>
