import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'id.go.jogjakota.pupkp.pins',
  appName: 'PINS',
  webDir: 'out',
  server: {
    // Arahkan langsung ke server Nginx Anda
    url: 'https://10.25.16.152',
    cleartext: true
  }
};

export default config;
