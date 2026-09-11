import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const example = await readFile(new URL('.env.example', root), 'utf8');
const contents = example
	.replace('replace-with-at-least-32-random-characters', randomBytes(48).toString('base64url'))
	.replace('/absolute/path/to/Mochibooru/data/media', fileURLToPath(new URL('data/media', root)));
try {
	await writeFile(new URL('.env', root), contents, { flag: 'wx', mode: 0o600 });
	console.info('.env created with a random secret. Review its values and run bun run db:migrate.');
} catch (error) {
	if ((error as NodeJS.ErrnoException).code === 'EEXIST')
		console.info('.env already exists and has been preserved.');
	else throw error;
}
