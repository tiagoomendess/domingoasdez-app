/**
 * Ports the legacy `Audit::add()`: one row in the `audit` table per audited action, with the
 * request's IP, country (Cloudflare), user agent and the `timezone` / `lang` cookies. Never throws:
 * a failed audit must not break the request.
 */
import type { RequestEvent } from '@sveltejs/kit';
import { db } from '#lib/server/db/index.ts';
import { audit } from '#lib/server/db/schema.ts';
import { strLimit } from '#lib/server/legacy-api/php.ts';
import { logger } from '#lib/server/log.ts';

const log = logger.child('audit');

export type AuditEntry = {
	action: string;
	model: string;
	modelId?: number | null;
	userId?: number | null;
	/** Already encoded the way Audit::add stored them (json_encode of the old/new values). */
	oldValues?: string | null;
	newValues?: string | null;
	extraInfo?: string | null;
};

function clientIp(event: RequestEvent): string {
	try {
		return event.getClientAddress();
	} catch {
		return 'Unknown';
	}
}

/**
 * `json_encode($value, JSON_PRETTY_PRINT)` for a database row: 4-space indent, `\/` and `\uXXXX`
 * escapes like PHP. Slashes and non-ASCII characters only occur inside strings, so escaping the
 * whole text is safe.
 */
export function phpPrettyJson(value: unknown): string {
	return JSON.stringify(value, null, 4)
		.replace(/\//g, '\\/')
		.replace(/[\u0080-\uffff]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

export async function addAudit(event: RequestEvent, entry: AuditEntry): Promise<void> {
	try {
		const now = new Date();
		const { request, cookies } = event;
		const timezone = cookies.get('timezone');
		const language = cookies.get('lang');
		await db.insert(audit).values({
			userId: entry.userId ?? null,
			action: entry.action,
			model: entry.model,
			modelId: entry.modelId ?? null,
			oldValues: entry.oldValues == null ? null : strLimit(entry.oldValues, 65531),
			newValues: entry.newValues == null ? null : strLimit(entry.newValues, 65531),
			ipAddress: strLimit(clientIp(event), 45, ''),
			ipCountry: strLimit(request.headers.get('cf-ipcountry') ?? 'Unknown', 45, ''),
			userAgent: strLimit(request.headers.get('user-agent') ?? '', 255, ''),
			timezone: timezone ? strLimit(timezone, 30, '') : null,
			language: language ? strLimit(language, 30, '') : null,
			extraInfo: entry.extraInfo ? strLimit(entry.extraInfo, 155, '') : null,
			createdAt: now,
			updatedAt: now
		});
	} catch (e) {
		log.error('Error adding audit', e);
	}
}
