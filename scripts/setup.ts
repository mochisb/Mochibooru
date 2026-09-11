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
	console.info(
		'.env creado con un secreto aleatorio. Revisa sus valores y ejecuta bun run db:migrate.',
	);
} catch (error) {
	if ((error as NodeJS.ErrnoException).code === 'EEXIST')
		console.info('.env ya existe; se ha conservado.');
	else throw error;
}
