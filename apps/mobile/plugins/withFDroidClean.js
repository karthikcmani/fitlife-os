const { withAppBuildGradle, withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to ensure standard F-Droid / FLOSS compliance.
 * 1. Strips Google Play Services and Firebase dependencies from Gradle.
 * 2. Removes proprietary push services from AndroidManifest.xml.
 */
module.exports = function withFDroidClean(config) {
  // 1. Clean app/build.gradle
  config = withAppBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;
    // Strip google-services plugin and firebase implementations if injected
    contents = contents.replace(/apply\s+plugin:\s+['"]com\.google\.gms\.google-services['"]/g, '');
    contents = contents.replace(/implementation\s+['"]com\.google\.firebase:.*['"]/g, '');
    contents = contents.replace(/implementation\s+['"]com\.google\.android\.gms:.*['"]/g, '');
    cfg.modResults.contents = contents;
    return cfg;
  });

  // 2. Clean AndroidManifest.xml
  config = withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (app && app.service) {
      app.service = app.service.filter(
        (s) => !s.$['android:name']?.includes('FirebaseMessagingService')
      );
    }
    return cfg;
  });

  return config;
};
