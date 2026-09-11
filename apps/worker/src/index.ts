import { Worker, UnrecoverableError } from 'bullmq';
import { and, eq, lt, or } from 'drizzle-orm';
import { getDb, closeDb, posts } from '@mochi/db';
import { getQueue, redisConnection, QUEUE_NAME } from '@mochi/core/queue';
import { processPost, InvalidMediaError } from './process';

const worker = new Worker(
	QUEUE_NAME,
	async (job) => {
		try {
			await processPost(job.data.postId);
		} catch (error) {
			const final =
				error instanceof InvalidMediaError || job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
			if (final)
				await getDb()
					.update(posts)
					.set({
						status: 'failed',
						updatedAt: new Date(),
						processingError:
							error instanceof InvalidMediaError
								? error.message
								: 'El procesamiento falló. Puedes reintentarlo desde la publicación.',
					})
					.where(eq(posts.id, job.data.postId));
			if (error instanceof InvalidMediaError) throw new UnrecoverableError(error.message);
			throw error;
		}
	},
	{ connection: redisConnection(), concurrency: 2, lockDuration: 120_000, maxStalledCount: 2 },
);

worker.on('completed', (job) => console.info(`Procesada: ${job.data.postId}`));
worker.on('failed', (job, error) => console.error(`Falló: ${job?.data.postId}`, error));
worker.on('error', (error) => console.error('Worker:', error));

// PostgreSQL is the durable outbox. Uploads survive Redis outages and worker restarts.
let reconciling = false;
async function reconcile() {
	if (reconciling) return;
	reconciling = true;
	try {
		const pending = await getDb()
			.select({ id: posts.id })
			.from(posts)
			.where(
				or(
					eq(posts.status, 'queued'),
					and(
						eq(posts.status, 'processing'),
						lt(posts.updatedAt, new Date(Date.now() - 5 * 60_000)),
					),
				),
			)
			.limit(100);
		for (const post of pending) {
			const old = await getQueue().getJob(post.id);
			if (old && ['failed', 'completed'].includes(await old.getState())) await old.remove();
			await getQueue().add('process-image', { postId: post.id }, { jobId: post.id });
		}
	} catch (error) {
		console.error('No se pudo reconciliar la cola:', error);
	} finally {
		reconciling = false;
	}
}
const timer = setInterval(reconcile, 5000);
await reconcile();
console.info('Worker multimedia listo.');
let stopping = false;
async function shutdown() {
	if (stopping) return;
	stopping = true;
	clearInterval(timer);
	await worker.close();
	await getQueue().close();
	await closeDb();
}
process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());
