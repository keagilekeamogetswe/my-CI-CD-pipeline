import { defineConfig, configDefaults } from 'vitest/config'
// Auto add .env for tests
import dotenv from 'dotenv';

dotenv.config({ path: './tests/.env' });
export default defineConfig({
  test: {
    exclude: [
      ...configDefaults.exclude,
      '**/deprecated/**',
      '**/tests/**/.ingore',
      '**/tests/**/deprecated/**',
    ],
    envFiles: ['**/tests/.env']
  },

})
