/** Pure info-report helpers — ported from the legacy Laravel InfoReportsController. */

export const INFO_REPORT_CONTENT_MIN = 10;
export const INFO_REPORT_CONTENT_MAX = 500;
export const INFO_REPORT_SOURCE_MIN = 5;
export const INFO_REPORT_SOURCE_MAX = 155;
export const INFO_REPORT_CODE_LENGTH = 9;

export type InfoReportStatus = 'sent' | 'seen' | 'used' | 'archived' | 'deleted';

export const INFO_REPORT_STATUSES: InfoReportStatus[] = [
	'sent',
	'seen',
	'used',
	'archived',
	'deleted'
];

export function normalizeInfoCode(raw: unknown): string {
	return String(raw ?? '')
		.trim()
		.toUpperCase();
}

export function isValidInfoCode(code: string): boolean {
	return code.length === INFO_REPORT_CODE_LENGTH && /^[A-Z0-9]{9}$/.test(code);
}

export type InfoValidation =
	{ ok: true; content: string; source: string } | { ok: false; error: 'content' | 'source' };

export function validateInfoReport(content: unknown, source: unknown): InfoValidation {
	const cleanContent = String(content ?? '').trim();
	const cleanSource = String(source ?? '').trim();
	if (
		cleanContent.length < INFO_REPORT_CONTENT_MIN ||
		cleanContent.length > INFO_REPORT_CONTENT_MAX
	) {
		return { ok: false, error: 'content' };
	}
	if (cleanSource.length < INFO_REPORT_SOURCE_MIN || cleanSource.length > INFO_REPORT_SOURCE_MAX) {
		return { ok: false, error: 'source' };
	}
	return { ok: true, content: cleanContent, source: cleanSource };
}

/** 9-char uppercase alphanumeric code, matching Laravel Str::upper(Str::random(9)). */
export function generateInfoCode(random: () => number = Math.random): string {
	const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	let code = '';
	for (let i = 0; i < INFO_REPORT_CODE_LENGTH; i += 1) {
		code += alphabet[Math.floor(random() * alphabet.length)];
	}
	return code;
}
