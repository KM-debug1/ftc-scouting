import { defineConfig } from 'cypress';
import setupPlugins from './cypress/plugins/index';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4200',
    setupNodeEvents(on, config) {
      setupPlugins(on, config);
    },
    trashAssetsBeforeRuns: true,
  },
});
