import { LOG_FORMAT, LOG_LEVEL } from '$app/env/private';
import { createLogger } from './logger.ts';
import { requestContext } from './request-context.ts';

/**
 * The app's logger (same as domingoasdez-admin's). Modules scope it
 * (`const log = logger.child('match-comments')`); entries made while a request is handled carry
 * its id and user.
 */
export const logger = createLogger({
	level: LOG_LEVEL,
	format: LOG_FORMAT,
	context: () => {
		const locals = requestContext.getStore();
		return locals && { requestId: locals.requestId, userId: locals.user?.id };
	}
});
