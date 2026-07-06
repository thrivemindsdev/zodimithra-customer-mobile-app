import { defineConfig } from 'hot-updater';
import { expo } from '@hot-updater/expo';
import { standaloneRepository, standaloneStorage } from '@hot-updater/standalone';

export default defineConfig({
  build: expo(),
  storage: standaloneStorage({
    baseUrl: 'https://ota.howincloud.com',
  }),
  database: standaloneRepository({
    baseUrl: 'https://ota.howincloud.com',
  }),
  updateStrategy: 'appVersion',
  compressStrategy: 'zip',
});
