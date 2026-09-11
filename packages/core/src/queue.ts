import { Queue } from 'bullmq';
import { getConfig } from '@mochi/shared/config';

export const QUEUE_NAME = 'media';
export function redisConnection() {
	const url = new URL(getConfig().REDIS_URL);
	return {
		host: url.hostname,
		port: Number(url.port || 6379),
		username: url.username ? decodeURIComponent(url.username) : undefined,
		password: url.password ? decodeURIComponent(url.password) : undefined,
		db: Number(url.pathname.slice(1) || 0),
		...(url.protocol === 'rediss:' ? { tls: {} } : {}),
		maxRetriesPerRequest: null,
	};
}
let queue: Queue | undefined;
export function getQueue() {
	return (queue ??= new Queue(QUEUE_NAME, {
		connection: redisConnection(),
		defaultJobOptions: {
			attempts: 3,
			backoff: { type: 'exponential', delay: 3000 },
			removeOnComplete: true,
			removeOnFail: { age: 86400, count: 1000 },
		},
	}));
}
