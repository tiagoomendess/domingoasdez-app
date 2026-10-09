/**
 * Server helpers for the public info-report page ("Enviar Informação").
 * Ports Front\InfoReportsController create + store + show + delete (minus email notify).
 */
import { and, desc, eq, ne } from 'drizzle-orm';
import type { AuthUser } from '#lib/auth/user.ts';
import {
	generateInfoCode,
	isValidInfoCode,
	normalizeInfoCode,
	validateInfoReport,
	type InfoReportStatus
} from '#lib/info-reports.ts';
import { verifyRecaptcha } from '#lib/server/captcha.ts';
import { db } from '#lib/server/db/index.ts';
import { infoReports } from '#lib/server/db/schema.ts';

export type InfoReportView = {
	code: string;
	content: string;
	source: string;
	status: InfoReportStatus;
	createdAt: string | null;
	mine: boolean;
};

export type InfoPageData = {
	loggedIn: boolean;
	recaptchaSiteKey: string | null;
	mine: InfoReportView[];
	lookup: InfoReportView | null;
	lookupMissing: string | null;
	justSent: { code: string; anonymous: boolean } | null;
};

function toView(row: typeof infoReports.$inferSelect, userId: number | null): InfoReportView {
	return {
		code: row.code,
		content: row.content,
		source: row.source,
		status: row.status as InfoReportStatus,
		createdAt:
			row.createdAt instanceof Date ? row.createdAt.toISOString() : (row.createdAt ?? null),
		mine: userId != null && row.userId != null && row.userId === userId
	};
}

export async function loadInfoPage(input: {
	user: AuthUser | null;
	recaptchaSiteKey: string | null;
	lookupCode?: string | null;
	justSentCode?: string | null;
	justSentAnonymous?: boolean;
}): Promise<InfoPageData> {
	const userId = input.user?.id ?? null;

	const mine =
		userId == null
			? []
			: (
					await db
						.select()
						.from(infoReports)
						.where(and(eq(infoReports.userId, userId), ne(infoReports.status, 'deleted')))
						.orderBy(desc(infoReports.id))
						.limit(50)
				).map((row) => toView(row, userId));

	let lookup: InfoReportView | null = null;
	let lookupMissing: string | null = null;
	const rawLookup = (input.lookupCode ?? '').trim();
	if (rawLookup) {
		const code = normalizeInfoCode(rawLookup);
		if (!isValidInfoCode(code)) {
			lookupMissing = code || rawLookup.trim().toUpperCase();
		} else {
			const [row] = await db
				.select()
				.from(infoReports)
				.where(and(eq(infoReports.code, code), ne(infoReports.status, 'deleted')))
				.limit(1);
			if (row) lookup = toView(row, userId);
			else lookupMissing = code;
		}
	}

	return {
		loggedIn: Boolean(input.user),
		recaptchaSiteKey: input.user ? null : input.recaptchaSiteKey,
		mine,
		lookup,
		lookupMissing,
		justSent:
			input.justSentCode && isValidInfoCode(input.justSentCode)
				? { code: input.justSentCode, anonymous: input.justSentAnonymous ?? true }
				: null
	};
}

export type SubmitInfoInput = {
	content: unknown;
	source: unknown;
	anonymous: unknown;
	user: AuthUser | null;
	recaptchaToken: string | null;
	ipAddress: string;
};

export type SubmitInfoResult =
	| { ok: true; code: string; anonymous: boolean }
	| { ok: false; error: 'content' | 'source' | 'captcha' | 'code' };

function limit(value: string, max: number): string {
	return value.length <= max ? value : value.slice(0, max);
}

async function generateUniqueCode(tries = 5): Promise<string | null> {
	for (let i = 0; i < tries; i += 1) {
		const code = generateInfoCode();
		const [existing] = await db
			.select({ id: infoReports.id })
			.from(infoReports)
			.where(eq(infoReports.code, code))
			.limit(1);
		if (!existing) return code;
	}
	return null;
}

export async function submitInfoReport(input: SubmitInfoInput): Promise<SubmitInfoResult> {
	const validated = validateInfoReport(input.content, input.source);
	if (!validated.ok) return { ok: false, error: validated.error };

	// Logged-in users skip the captcha (same as score reports and polls);
	// guests must solve it.
	if (!input.user) {
		const captchaOk = await verifyRecaptcha(input.recaptchaToken, input.ipAddress);
		if (!captchaOk) return { ok: false, error: 'captcha' };
	}

	// Guests are always anonymous (legacy forces anonymous=true when logged out).
	const anonymous =
		input.user == null ||
		input.anonymous === true ||
		input.anonymous === 'true' ||
		input.anonymous === 'on';
	const userId = anonymous ? null : input.user!.id;

	const code = await generateUniqueCode();
	if (!code) return { ok: false, error: 'code' };

	const now = new Date();
	await db.insert(infoReports).values({
		code,
		userId,
		status: 'sent',
		content: limit(validated.content, 500),
		source: limit(validated.source, 155),
		createdAt: now,
		updatedAt: now
	});

	return { ok: true, code, anonymous };
}

export type DeleteInfoResult =
	{ ok: true } | { ok: false; error: 'invalid' | 'forbidden' | 'missing' };

export async function deleteInfoReport(input: {
	code: unknown;
	user: AuthUser | null;
}): Promise<DeleteInfoResult> {
	const code = normalizeInfoCode(input.code);
	if (!isValidInfoCode(code)) return { ok: false, error: 'invalid' };
	if (!input.user) return { ok: false, error: 'forbidden' };

	const [row] = await db.select().from(infoReports).where(eq(infoReports.code, code)).limit(1);
	if (!row || row.status === 'deleted') return { ok: false, error: 'missing' };
	if (row.userId == null || row.userId !== input.user.id) {
		return { ok: false, error: 'forbidden' };
	}

	await db
		.update(infoReports)
		.set({ status: 'deleted', updatedAt: new Date() })
		.where(eq(infoReports.id, row.id));
	return { ok: true };
}
