import { expect, test } from 'bun:test';
import sharp from 'sharp';
import { makeDerivatives, InvalidMediaError } from '../../apps/worker/src/process';

test('orients previews, preserves dimensions and strips EXIF', async () => {
	const input = await sharp({
		create: { width: 800, height: 400, channels: 3, background: '#bca6e8' },
	})
		.jpeg()
		.withMetadata({ orientation: 6 })
		.toBuffer();
	const result = await makeDerivatives(input);
	expect(result.width).toBe(400);
	expect(result.height).toBe(800);
	expect(result.mime).toBe('image/jpeg');
	const thumbnail = await sharp(result.thumbnail).metadata();
	expect(thumbnail.width).toBe(240);
	expect(thumbnail.height).toBe(480);
	expect(thumbnail.exif).toBeUndefined();
	expect(result.animated).toBe(false);
});
test('rejects SVG even when the decoder supports it', async () => {
	const svg = Buffer.from(
		'<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" /></svg>',
	);
	await expect(makeDerivatives(svg)).rejects.toBeInstanceOf(InvalidMediaError);
});
test('rejects forged or corrupt image payloads', async () => {
	await expect(makeDerivatives(Buffer.from('not actually a PNG'))).rejects.toThrow();
});
