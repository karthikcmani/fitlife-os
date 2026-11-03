# FITLIFE OS — SECURITY & PRIVACY SPECIFICATION AND AUDIT REPORT

---

## 1. Security Architecture Principles
FITLIFE OS operates under the premise that fitness, biometric, and transformation data constitute sensitive personal health information. The following security invariants are strictly enforced and verified in the codebase:

1. **Zero Secret Leakage:**
   - No API secrets, private keys, database passwords, or third-party credentials exist in Git history or client binaries.
   - Verified via automated scan: all `.env` files are ignored; only placeholder template `infrastructure/.env.example` is committed.
2. **Zero Involuntary Cloud Exposure & F-Droid Cleanliness:**
   - The mobile application functions 100% offline. Zero telemetry, crashlytics, or analytics SDKs are included.
   - Zero Firebase libraries (`com.google.firebase:*`) and zero Google Play Services (`com.google.android.gms:*`) in the Gradle dependency tree or Android manifest.
3. **Tenant & Data Isolation:**
   - Backend requests verify authenticated user sessions via scoped JWTs (`sub: user_id`).
   - Every database query touching personal data is constrained by `WHERE user_id = $auth.userId`.
4. **Resilient Cryptography:**
   - **Password Hashing:** Argon2id (memory: 64MB, iterations: 3, parallelism: 4) verified in `apps/server/src/services/auth.service.ts`.
   - **Local Token Storage:** Stored in hardware-backed Android Keystore via Expo SecureStore (`apps/mobile/src/store/authStore.ts`).
   - **Encrypted Photo Vault:** AES-256-GCM authenticated encryption for private progress photos. Files are stored in app-private sandbox storage (`FileSystem.documentDirectory/vault`).
   - **Crypto-Shredding:** Resetting vault or deleting photos zeroes the encryption key and permanently deletes encrypted blocks, preventing forensic recovery.
5. **Physical ADB Backup Exclusion:**
   - Manifest explicitly enforces `android:allowBackup="false"` in `apps/mobile/android/app/src/main/AndroidManifest.xml` (enforced via `withFDroidClean.js` config plugin) to prevent physical backup extraction via `adb backup`.

---

## 2. Threat Modeling & Safeguards

| Threat Vector | Severity | Safeguard Implementation | Status |
|---|---|---|---|
| **Brute Force Login** | High | IP and account-level rate limiting using Fastify Rate Limit; exponential backoff on failed attempts. Argon2id prevents GPU attack. | Verified |
| **Physical Device Inspection** | High | Progress photos stored in sandboxed app files directory, excluded from Android MediaStore. Session tokens stored in Android Keystore via Expo SecureStore. | Verified |
| **Physical ADB Backup Extraction** | High | Manifest explicitly sets `android:allowBackup="false"`. Encrypted vault contents cannot be extracted over ADB. | Verified |
| **SQL Injection** | Critical | 100% parameterized queries via Kysely SQL query builder and SQLite prepared statements. Zero raw string concatenation. | Verified |
| **Payload Tampering & Injection** | Medium | Strict Zod validation schemas (`@fitlife/validation`) for all inbound REST and sync payloads. | Verified |
| **Replay & Desync Attacks** | High | Hybrid Logical Clocks (HLC), monotonically increasing revision counters, and server-side `idempotency_ledger` with batch UUIDs. | Verified |
| **Man-in-the-Middle (MitM) Attacks** | High | TLS 1.3 enforced for sync endpoints; self-hosted HTTPS certificate validation. | Verified |
| **F-Droid Dependency Supply Chain** | Critical | 100% FLOSS dependencies under Apache-2.0, MIT, and BSD licenses. Zero proprietary binary blobs. | Verified |

---

## 3. Account Deletion & GDPR/Data Sovereignty
Users retain unconditional ownership of their data:
- **Full Data Export:** `GET /api/v1/user/export` returns a complete, structured JSON archive of all workouts, meals, body metrics, habits, and sleep logs.
- **Permanent Account Deletion:** `DELETE /api/v1/user/account` triggers a cascading foreign key purge of all relational records across PostgreSQL (`ON DELETE CASCADE`), leaving zero residual records.
- **Local Vault Crypto-Shredding:** `POST /vault/shred` discards the AES key from SecureStore and wipes encrypted directory contents.
