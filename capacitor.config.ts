import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl =
  process.env.CAPACITOR_SERVER_URL ||
  'https://ais-pre-vjwo4kpzba4hbxlkcj47x2-317175059880.asia-southeast1.run.app';

const config: CapacitorConfig = {
  appId: 'com.astronex.app',
  appName: 'AstroNex',
  webDir: 'public',
  server: {
    url: serverUrl,
    cleartext: true,
    androidScheme: 'https',
    allowNavigation: [
      '*.run.app',
      '*.firebaseapp.com',
      '*.googleapis.com',
      'accounts.google.com',
      'checkout.razorpay.com',
      'api.razorpay.com',
    ],
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
