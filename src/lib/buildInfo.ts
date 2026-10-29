// What this build of the web code is, whether it runs in a browser, inside
// the APK, or as an over-the-air update — which is what lets the updater
// tell "newer than me" without any bookkeeping.
export const APP_VERSION: string = __APP_VERSION__;
// Milliseconds since the epoch at which this bundle was built.
export const BUILD_TIME: number = __BUILD_TIME__;
