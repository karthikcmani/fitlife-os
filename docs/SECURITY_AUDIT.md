# FITLIFE OS — SECURITY & PRIVACY SPECIFICATION

---

## 1. Security Architecture Principles
FITLIFE OS operates under the premise that fitness, biometric, and transformation data constitute sensitive personal health information. The following security invariants are strictly enforced:

1. **Zero Secret Leakage:** No API secrets, private keys, database passwords, or third-party credentials may ever be committed to the repository or embedded in client binaries.
2. **Zero Involuntary Cloud Exposure:** The mobile application functions 100% offline. No telemetry, analytics beacons, or remote logging libraries are permitted in client builds.
3. **Tenant & Data Isolation:** Backend requests verify authenticated user sessions via scoped JWTs. Every query touching personal data is constrained by `WHERE user_id = $auth.userId`.
4. **Resilient Cryptography:**
   - User passwords: Hashed with **Argon2id** (memory: 64MB, iterations: 3, parallelism: 4).
   - Session tokens: Signed with HMAC-SHA256 (or RS256 for asymmetric verification) with short lifespan (15 minutes).
   - Refresh tokens: Stored as cryptographically random SHA-256 hashes in PostgreSQL with explicit device revocation.

---

## 2. Threat Modeling & Safeguards

| Threat Vector | Severity | Safeguard Implementation |
|---|---|---|
| **Brute Force Login** | High | IP and account-level rate limiting using Fastify Rate Limit; exponential backoff on failed attempts. |
| **Physical Device Inspection** | High | Progress photos stored in sandboxed app files directory (`Context.getFilesDir()`), excluded from Android MediaStore. Session tokens stored in Android Keystore via Expo SecureStore. |
| **SQL Injection** | Critical | 100% parameterized queries via Kysely SQL query builder and SQLite prepared statements. Zero string concatenation. |
| **Cross-Site Scripting (XSS) / Payload Injection** | Medium | Strict Zod validation schemas for all inbound payloads, stripping unallowed HTML/script tags. |
| **Man-in-the-Middle (MitM) Attacks** | High | Mandatory TLS 1.3 for sync endpoints; optional SSL pinning for hardened self-hosted setups. |
| **F-Droid Dependency Supply Chain** | Critical | Pinned npm package-lock versions, automated vulnerability scans (`npm audit`), and elimination of unverified native binaries. |

---

## 3. Account Deletion & GDPR/Data Sovereignty
Users retain unconditional ownership of their data:
- **Full Data Export:** `GET /api/v1/user/export` returns a complete, structured JSON archive of all workouts, meals, body metrics, habits, and sleep logs.
- **Permanent Account Deletion:** `DELETE /api/v1/user/account` triggers a cascading purge of all relational records across PostgreSQL and deletes cloud-stored assets, leaving no residual personal data.
