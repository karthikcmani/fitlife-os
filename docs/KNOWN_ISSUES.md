# FITLIFE OS — KNOWN LIMITATIONS & UNRESOLVED DECISIONS

This document logs architectural trade-offs, discovered technical risks, upstream dependency behaviors, and resolved engineering constraints in **FITLIFE OS**.

---

## 1. Upstream Dependency & Toolchain Resolutions

### 1.1 `react-native-safe-area-context` Kotlin Compilation with React Native 0.88 New Architecture
- **Issue:** On React Native 0.88.1 New Architecture, the Paper `uiManager.uiImplementation` property was deprecated and removed. Direct field access in `com.th3rdwave.safeareacontext.SafeAreaView.kt` resulted in Kotlin compilation failure (`Unresolved reference 'uiImplementation'`).
- **Resolution:** Implemented backward-compatible Java reflection inside a try-catch block:
  ```kotlin
  val uiImplementation = try {
      val getMethod = uiManager.javaClass.getMethod("getUIImplementation")
      getMethod.invoke(uiManager)
  } catch (e: Exception) {
      null
  }
  ```
- **Tracking:** Saved as reproducible patch `patches/react-native-safe-area-context+5.4.0.patch`.

### 1.2 Windows MAX_PATH (260 Characters) Constraint in CMake/Ninja
- **Issue:** Deeply nested CMake build directory paths for autolinked codegen C++ files (`apps/mobile/android/app/.cxx/.../safeareacontext_autolinked_build/...`) exceed Windows Win32 MAX_PATH (260 characters), causing legacy `ninja.exe` binaries to abort with `Filename longer than 260 characters` or `mkdir: No such file or directory`.
- **Resolution:** Upgraded Android SDK CMake Ninja to `ninja 1.13.0` (Kitware build) with embedded `<longPathAware>true</longPathAware>` manifest and active UTF-8 codepage. Enabled OS registry `LongPathsEnabled = 1`.

### 1.3 React Native Codegen Trimming for Unused Modules
- **Issue:** `react-native-gesture-handler` was transitively installed by `@react-navigation/drawer` (a dependency of `expo-router`), producing an unnecessary 262-character C++ codegen build target (`rngesturehandler_codegen`).
- **Resolution:** FitLife OS uses Tab and Stack navigation exclusively; drawer navigation is not utilized. Configured `react-native.config.js` to disable Android autolinking for `react-native-gesture-handler`:
  ```javascript
  module.exports = {
    dependencies: {
      'react-native-gesture-handler': {
        platforms: { android: null },
      },
    },
  };
  ```

---

## 2. Product Decisions (Approved Status)

| Issue ID | Domain | Description | Decision | Status |
|---|---|---|---|---|
| **ISSUE-001** | Notifications | Google Play Services FCM cannot be bundled in an F-Droid release. | Native Android alarms/local notifications for all personal scheduling. Community push supports UnifiedPush (ntfy/NextPush). Zero FCM/GMS binaries. | Approved (DEC-2026-004) |
| **ISSUE-002** | Transformation Photos | Body transformation photos are sensitive personal biometric data. | Photos stored strictly in local sandboxed storage with AES-256-GCM encryption and biometric PIN/fingerprint lock. `android:allowBackup="false"` enforced. Zero cloud upload without per-photo user opt-in. | Approved (DEC-2026-005) |
| **ISSUE-003** | Social Graph Model | Friend relationships in community platform. | Mutual two-way friendship with private-by-default profiles to protect health privacy. | Approved |
| **ISSUE-004** | AI Architecture | Cloud AI integration without exposing user data or requiring subscriptions. | 100% offline rule-based heuristics for standard coaching. Optional Bring-Your-Own-Key (BYOK) or local self-hosted Ollama endpoint. | Approved |

---

## 3. Technical Limitations & Edge Cases

1. **Repetition Limit for 1RM Calculations:**
   - 1RM formulas (Brzycki, Epley) are mathematically accurate only up to 10 repetitions. Beyond 10 repetitions, physiological fatigue factors skew estimates.
   - *Design Boundary:* Calculations for sets $> 10$ reps are tagged as "High Repetition Estimate (Low Accuracy)" and will not override established 1RM personal records unless explicitly confirmed by the user.

2. **Indian Food Recipe Variance:**
   - Regional preparations of dishes like "Sambar" or "Dal Tadka" vary substantially in oil, coconut, and dal proportions across South and North India.
   - *Design Boundary:* Provide baseline standard values based on ICMR-NIN IFCT 2017, but prominently feature a "Customize Recipe" action so users can save their exact family recipe.

---

## 4. Real-Data Integrity & Personalization Resolutions (Post-Hardware Audit)

### 4.1 Synthetic Biometrics vs. Real User Measurements
- **Issue Discovered on Device:** The Vitals screen initialized sleep logging with pre-filled `7.5 hours` and `4/5 quality`, evaluating a synthetic `92/100` recovery score before any sleep record was submitted.
- **Resolution:** Initialized states to empty (`''` and `null`). Enforced explicit validation requiring duration (0.5–24h) and quality rating. Implemented clear empty states: `"No sleep recorded yet."` and `"Recovery Unavailable"` until valid measurements are saved.

### 4.2 Workout State Divergence Between Dashboard and Workout Tab
- **Issue Discovered on Device:** Dashboard displayed `"Workout Completed!"` while the Workout screen remained ready on `"Begin Workout Session"`.
- **Root Cause:** Incomplete/cancelled sessions remained in SQLite with `ended_at = NULL`. The Dashboard evaluated workout presence solely on `startedAt.startsWith(dateStr)` without checking `endedAt` or verifying completed sets.
- **Resolution:**
  - `cancelWorkout()` marks session and sets as `is_deleted = 1` in SQLite.
  - Active session restoration upon app launch.
  - Stale sessions (>24h) auto-expire cleanly on startup.
  - Dashboard completion requires `endedAt IS NOT NULL` and at least one completed set (`isCompleted = true`).
  - Added visual in-progress banner with `"Resume Active Workout"`.

### 4.3 Diurnal Hydration Guidance
- **Issue Discovered on Device:** Daily plan engine delivered morning hydration recommendations at 7:31 PM.
- **Resolution:** Introduced hour-aware diurnal recommendation engine (Morning 05:00–11:59, Afternoon 12:00–16:59, Evening 17:00–20:59, Night 21:00–04:59). Bedtime hours actively advise fluid tapering to protect sleep quality.

### 4.4 Local Calendar Date Boundaries vs. UTC Offsets
- **Issue Discovered on Device:** Formatting dates via `toISOString().split('T')[0]` caused premature day shifts for users in positive GMT zones (such as IST UTC+5:30).
- **Resolution:** Implemented `getLocalDateString()` utilizing local device calendar methods (`getFullYear()`, `getMonth() + 1`, `getDate()`).

### 4.5 Dynamic Age Derivation from Date of Birth
- **Issue:** Naive `currentYear - birthYear` subtraction incorrectly aged users prior to their birthday in the current calendar year.
- **Resolution:** Implemented `parseAndValidateDob()` and `calculateAgeFromDob()` supporting DD/MM/YYYY, leap-year boundary checking, and exact calendar birthday evaluation.

### 4.6 Missing Glyph Fallback ("NO GLYPH") in Bottom Tab Bar
- **Issue Discovered on Device:** On Nothing Phone (3a) running Nothing OS, the bottom tab bar showed tall vertical boxes labeled "NO GLYPH" because React Navigation rendered fallback slots when icons were undefined or when Unicode glyphs were missing from the system font.
- **Resolution:** Replaced all text-based Unicode icons with pure React Native `<View>` vector icons in `TabIcons.tsx`. They render directly via native drawing primitives with zero font dependency, ensuring 100% reliable rendering across all devices.

### 4.7 Information Clutter & Beginner Guidance Overhaul
- **Issue Discovered on Device:** The previous dashboard and workout screens exposed overwhelming technical jargon (BMR, TDEE, RPE, 1RM estimations) without guiding beginners step by step. Furthermore, users exercising at home were presented with gym equipment exercises.
- **Resolution:**
  - Redesigned the navigation into 4 simple tabs: **Home**, **My Plan**, **Progress**, and **Profile**.
  - Built an Equipment-Aware Coaching Generator that strictly respects home equipment (e.g. bodyweight only when no equipment is available).
  - Built an Animated Biomechanical Exercise Avatar (`WorkoutAvatar.tsx`) that visually demonstrates exercise movements on action with real-time breathing and tempo cues.
  - Simplified language across all screens (e.g. "Resting Energy" instead of "Basal Metabolic Rate", "Daily Burn" instead of "TDEE").

### 4.8 Finish Workout Flow & Dedicated Completion Screen
- **Issue Discovered on Device:** Tapping "Finish & Save Workout" on Nothing Phone (3a) snapped directly back to the unstarted workout overview without showing a completion screen or summary, leaving users unsure if their workout was saved.
- **Resolution:**
  - Added session completion validation: checks if 0 sets were logged and displays a warning to either complete a set or discard; checks if completed sets < planned sets and confirms whether the user wishes to finish early.
  - Built a dedicated Workout Completed Screen (`app/workout-completed.tsx`) displaying session duration, total completed sets and reps, exercises breakdown, celebratory feedback, and direct navigation buttons to "Return to Home" and "View Progress".
  - Updated `useFocusEffect` hooks on Dashboard, Plan, and Progress tabs to ensure real-time data synchronization.

### 4.9 Real-Time Plan Regeneration on Training Environment Changes
- **Issue Discovered on Device:** Changing training environment from Home to Gym in the user profile did not update the active coaching plan, leaving home bodyweight exercises active even after selecting gym equipment.
- **Resolution:**
  - Expanded the exercise catalog with genuine commercial gym machines (Leg Press, Seated Chest Press Machine, Cable Lat Pulldown, Cable Row, Leg Curl Machine, Overhead Shoulder Press Machine, Barbell Bench Press), outdoor cardio/park circuits, and calisthenics progressions.
  - Implemented an interactive In-Place Environment & Equipment Editor directly in `ProfileScreen` with full support for selecting Home, Gym, Outdoor, and Calisthenics, plus a checklist to mark broken or unavailable machines.
  - Regenerates and saves the personal coaching plan immediately upon environment change, preserving active workouts if one is in progress and displaying clear plan transparency rationales.
