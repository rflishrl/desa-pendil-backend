import { AppError } from '#lib/server/api/errors.js';
import { pingDatabase } from '#lib/server/features/health/repository.js';

export interface HealthStatus {
	status: 'ok';
	database: 'ok';
}

/** Health check verifying application server and database connectivity. */
export async function checkHealth(): Promise<HealthStatus> {
	try {
		await pingDatabase();
	} catch (cause) {
		throw new AppError('UNAVAILABLE', 'Database tidak dapat dijangkau.', {
			cause
		});
	}
	return { status: 'ok', database: 'ok' };
}
