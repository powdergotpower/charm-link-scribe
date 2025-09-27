import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.5fd06942f75a40ab9e3b0c0633dc498e',
  appName: 'charm-link-scribe',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    url: 'https://5fd06942-f75a-40ab-9e3b-0c0633dc498e.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
};

export default config;