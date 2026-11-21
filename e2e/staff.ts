/**
 * Test-only staff account. It exists only in the throwaway wild_e2e database, created by the API's
 * `npm run e2e:prepare` when playwright.config.ts passes these values. Never use them anywhere else.
 */
export const E2E_ADMIN_EMAIL = 'e2e-admin@example.invalid';
export const E2E_ADMIN_PASSWORD = 'e2e-only staff password, not a real one';
