import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hk.oilmanager',
  appName: 'HK Oil Manager',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
