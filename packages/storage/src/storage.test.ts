import { expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { localStorage, validateKey } from './index';

test.each(['../secret.txt', '/etc/passwd', 'a/../../x.jpg', 'x\\secret.jpg', 'a/%2e%2e/file.jpg'])(
	'rejects unsafe object keys: %s',
	(key) => {
		expect(() => validateKey(key)).toThrow();
	},
);
test('round-trips binary media and serves a bounded stream', async () => {
	const dir = await mkdtemp(join(tmpdir(), 'mochi-storage-'));
	try {
		const store = localStorage(dir);
		const input = new Uint8Array([0, 1, 255, 42]);
		await store.put('originals/test.bin', input, 'application/octet-stream');
		expect(new Uint8Array(await store.read('originals/test.bin'))).toEqual(input);
		const streamed = await store.stream('originals/test.bin');
		expect(streamed.size).toBe(4);
		expect(new Uint8Array(await new Response(streamed.body).arrayBuffer())).toEqual(input);
		await store.delete('originals/test.bin');
		await store.delete('originals/test.bin');
		await expect(store.read('originals/test.bin')).rejects.toThrow();
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
});
