import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.yudhvirsingh.ironward",
  appName: "Ironward",
  webDir: "dist",
  backgroundColor: "#0c0d0f",
  plugins: {
    LocalNotifications: {
      // "Rest's over" alerts (src/lib/restAlert.ts).
      iconColor: "#ff6b1a",
    },
    CapacitorUpdater: {
      // Updates are checked and downloaded by the app itself (see
      // src/lib/otaUpdater.ts) against our own site, never the plugin
      // vendor's cloud; these URLs are blanked so nothing is sent there.
      autoUpdate: false,
      statsUrl: "",
      updateUrl: "",
      channelUrl: "",
      // A downloaded bundle must call notifyAppReady within this time or
      // the app returns to the previous one.
      appReadyTimeout: 15000,
      resetWhenUpdate: true,
    },
  },
  server: {
    // Keep the local WebView on a secure origin so crypto.randomUUID and
    // IndexedDB behave the same as on the HTTPS web deployment.
    androidScheme: "https",
  },
};

export default config;
