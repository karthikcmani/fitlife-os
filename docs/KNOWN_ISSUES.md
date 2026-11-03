# FITLIFE OS — KNOWN LIMITATIONS & UNRESOLVED DECISIONS

This document logs architectural trade-offs, discovered technical risks, open product questions, and known constraints in **FITLIFE OS**.

---

## 1. Open Product & Architectural Questions (Awaiting Approval)

| Issue ID | Domain | Description | Current Recommendation | Approval Status |
|---|---|---|---|---|
| **ISSUE-001** | Notifications | Google Play Services FCM cannot be bundled in an F-Droid release without triggering anti-feature flags or build failures. | Use native Android alarms/local notifications for all personal scheduling. For community alerts, support UnifiedPush (ntfy/NextPush). | Proposed |
| **ISSUE-002** | Transformation Photos | Body transformation progress photos are highly sensitive personal biometric data. | Store photos strictly in local sandboxed storage with optional biometric lock (fingerprint/PIN). Cloud sync is strictly disabled by default and requires explicit opt-in with client-side encryption. | Proposed |
| **ISSUE-003** | Social Graph Model | Friend relationships in community platform: mutual two-way friendship vs. asymmetric one-way follow. | Mutual two-way friendship with private-by-default profiles to protect health privacy and prevent unsolicited monitoring. | Proposed |
| **ISSUE-004** | AI Architecture | Cloud AI integration without exposing user data or requiring mandatory third-party subscriptions. | Rule-based offline heuristics for standard suggestions. Optional Bring-Your-Own-Key (BYOK) or self-hosted Ollama endpoint for advanced interactive fitness explanations, with zero keys baked into app. | Proposed |

---

## 2. Technical Limitations & Edge Cases

1. **Repetition Limit for 1RM Calculations:**
   - 1RM formulas (Brzycki, Epley) are mathematically accurate only up to 10 repetitions. Beyond 10 repetitions, physiological fatigue factors skew estimates.
   - *Design Boundary:* Calculations for sets $> 10$ reps will be tagged as "High Repetition Estimate (Low Accuracy)" and will not override established 1RM personal records unless explicitly confirmed by the user.

2. **Indian Food Recipe Variance:**
   - Regional preparations of dishes like "Sambar" or "Dal Tadka" vary substantially in oil, coconut, and dal proportions across South and North India.
   - *Design Boundary:* Provide baseline standard values based on ICMR-NIN IFCT 2017, but prominently feature a "Customize Recipe" action so users can save their exact family recipe.
