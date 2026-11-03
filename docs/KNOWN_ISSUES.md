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
