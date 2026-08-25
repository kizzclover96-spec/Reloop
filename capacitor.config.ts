import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.malvin.reloop",
  appName: "Reloop",
  webDir: "dist",
  backgroundColor: "#FFFFFF",
  server: {
    androidScheme: "https",
  },
  // @capacitor-firebase/authentication checks this list at runtime and
  // refuses to run a provider's sign-in flow if it isn't listed here —
  // separate from (and in addition to) the rgcfaIncludeGoogle Gradle flag,
  // which only controls whether the native library gets compiled in.
  // Exact string values confirmed against the plugin's own source
  // (FirebaseAuthenticationHelper.java: GOOGLE = "google.com", YAHOO = "yahoo.com").
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ["google.com", "yahoo.com", "apple.com"],
    },
  },
};

export default config;
