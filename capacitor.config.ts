import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.adodakwaliya.app',
  appName: 'ADO DA KWALIYA',
  webDir: 'dist',
  server: {
    url: 'https://adodakwaliya.shop',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
