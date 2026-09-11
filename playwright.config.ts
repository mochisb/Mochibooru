import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';

// Playwright runs in Node via bun x. Load the environment here so its workers
// inherit it too. Explicit CI/shell values take precedence over the local file.
const { error } = loadEnv({
	path: fileURLToPath(new URL('.env', import.meta.url)),
	override: false,
	quiet: true,
});
if (error && (error as NodeJS.ErrnoException).code !== 'ENOENT') {
	throw new Error('Unable to read the repository .env file for E2E tests.', { cause: error });
}
if (!process.env.DATABASE_URL) {
	throw new Error(
		'Missing DATABASE_URL for E2E tests. Run bun run setup or set DATABASE_URL to your test database.',
	);
}

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: false,
	workers: 1,
	retries: 0,
	timeout: 90_000,
	expect: { timeout: 20_000 },
	use: {
		baseURL: process.env.E2E_BASE_URL ?? process.env.ORIGIN ?? 'http://localhost:5173',
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
