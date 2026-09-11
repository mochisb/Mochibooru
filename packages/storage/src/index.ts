import { mkdir, writeFile, rename, unlink, stat, readFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
	S3Client,
	PutObjectCommand,
	GetObjectCommand,
	DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getConfig } from '@mochi/shared/config';

export interface Storage {
	put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
	read(key: string): Promise<Uint8Array>;
	stream(key: string): Promise<{ body: ReadableStream; size: number }>;
	delete(key: string): Promise<void>;
}

export function validateKey(key: string) {
	if (!/^[a-zA-Z0-9][a-zA-Z0-9/_-]*\.[a-z0-9]+$/.test(key) || key.includes('..'))
		throw new Error('Clave de almacenamiento inválida.');
	return key;
}

export function localStorage(root: string): Storage {
	const path = (key: string) => resolve(root, validateKey(key));
	return {
		async put(key, bytes) {
			const target = path(key);
			await mkdir(dirname(target), { recursive: true });
			const temporary = `${target}.${randomUUID()}.tmp`;
			try {
				await writeFile(temporary, bytes, { flag: 'wx' });
				await rename(temporary, target);
			} finally {
				await unlink(temporary).catch((error: NodeJS.ErrnoException) => {
					if (error.code !== 'ENOENT') throw error;
				});
			}
		},
		read: (key) => readFile(path(key)),
		async stream(key) {
			const file = path(key);
			const info = await stat(file);
			return {
				body: Readable.toWeb(createReadStream(file)) as unknown as ReadableStream,
				size: info.size,
			};
		},
		async delete(key) {
			await unlink(path(key)).catch((error: NodeJS.ErrnoException) => {
				if (error.code !== 'ENOENT') throw error;
			});
		},
	};
}

let cached: Storage | undefined;
export function getStorage(): Storage {
	if (cached) return cached;
	const config = getConfig();
	if (config.STORAGE_DRIVER === 'local') return (cached = localStorage(config.STORAGE_PATH));
	const client = new S3Client({
		region: config.S3_REGION,
		endpoint: config.S3_ENDPOINT || undefined,
		forcePathStyle: config.S3_FORCE_PATH_STYLE,
		credentials: {
			accessKeyId: config.S3_ACCESS_KEY_ID!,
			secretAccessKey: config.S3_SECRET_ACCESS_KEY!,
		},
	});
	const object = (key: string) => ({ Bucket: config.S3_BUCKET!, Key: validateKey(key) });
	return (cached = {
		async put(key, bytes, contentType) {
			await client.send(
				new PutObjectCommand({ ...object(key), Body: bytes, ContentType: contentType }),
			);
		},
		async read(key) {
			const result = await client.send(new GetObjectCommand(object(key)));
			if (!result.Body) throw new Error('Archivo no encontrado.');
			return result.Body.transformToByteArray();
		},
		async stream(key) {
			const result = await client.send(new GetObjectCommand(object(key)));
			if (!result.Body) throw new Error('Archivo no encontrado.');
			return { body: result.Body.transformToWebStream(), size: result.ContentLength! };
		},
		async delete(key) {
			await client.send(new DeleteObjectCommand(object(key)));
		},
	});
}
