import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { dev } from '$app/env';
import { RECAPTCHA_SECRET_KEY } from '$app/env/private';
import type { Cookies } from '@sveltejs/kit';
import type { PollAnswer, PollState } from '#lib/components/types.ts';
import { POLL_COOKIE_MAX_AGE, decidePollVote, pollCookieName } from '#lib/polls.ts';
import type { AuthUser } from '#lib/auth/user.ts';
import { getUserPermissionNames, hasPermission } from '#lib/server/auth/permissions.ts';
import { db } from '#lib/server/db/index.ts';
import { pollAnswerVotes, pollAnswers, polls } from '#lib/server/db/schema.ts';
import { naiveToIso, nowIso } from '#lib/server/dates.ts';
import { pollClosed, pollState } from '#lib/server/feed/pollState.ts';
import { legacyUrl } from '#lib/server/legacy.ts';
import { mediaUrl } from '#lib/server/media.ts';

export type PollPageData = {
	id: number;
	slug: string;
	question: string;
	state: PollState;
	closed: boolean;
	endsAt: string;
	resultsAt: string;
	answers: PollAnswer[];
	totalVotes: number;
	loggedIn: boolean;
	recaptchaSiteKey: string | null;
	editHref: string | null;
	image: string;
};

export type PollVoteResult =
	| { ok: true }
	| { ok: false; error: 'not_found' }
	| { ok: false; error: 'closed' | 'already' }
	| { ok: false; error: 'invalid' | 'captcha' | 'generic'; answerId?: number };

const DEFAULT_POLL_IMAGE = '/images/poll_default.png';

export function readPollCookie(cookies: Cookies, pollId: number): number | null {
	const raw = cookies.get(pollCookieName(pollId));
	if (!raw || !/^\d+$/.test(raw)) return null;
	const id = Number(raw);
	return Number.isSafeInteger(id) ? id : null;
}

export function setPollCookie(cookies: Cookies, pollId: number, voteId: number) {
	cookies.set(pollCookieName(pollId), String(voteId), {
		path: '/',
		httpOnly: false,
		sameSite: 'lax',
		secure: !dev,
		maxAge: POLL_COOKIE_MAX_AGE
	});
}

async function verifyRecaptcha(token: string | null, remoteIp: string): Promise<boolean> {
	if (!RECAPTCHA_SECRET_KEY || !token) return false;

	const body = new URLSearchParams({
		secret: RECAPTCHA_SECRET_KEY,
		response: token,
		remoteip: remoteIp
	});

	try {
		const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body
		});
		if (!res.ok) return false;
		const data = (await res.json()) as { success?: boolean };
		return Boolean(data.success);
	} catch {
		return false;
	}
}

async function findVisiblePoll(slug: string) {
	const [poll] = await db
		.select({
			id: polls.id,
			question: polls.question,
			slug: polls.slug,
			showResultsAfter: polls.showResultsAfter,
			closeAfter: polls.closeAfter,
			image: polls.image
		})
		.from(polls)
		.where(and(eq(polls.slug, slug), eq(polls.visible, true)))
		.limit(1);
	return poll ?? null;
}

async function answersFor(pollId: number) {
	return db
		.select({ id: pollAnswers.id, label: pollAnswers.answer })
		.from(pollAnswers)
		.where(eq(pollAnswers.pollId, pollId))
		.orderBy(asc(pollAnswers.id));
}

async function voteCounts(answerIds: number[]): Promise<Map<number, number>> {
	const counts = new Map<number, number>();
	if (answerIds.length === 0) return counts;

	const rows = await db
		.select({
			pollAnswerId: pollAnswerVotes.pollAnswerId,
			count: sql<number>`count(*)`.mapWith(Number)
		})
		.from(pollAnswerVotes)
		.where(inArray(pollAnswerVotes.pollAnswerId, answerIds))
		.groupBy(pollAnswerVotes.pollAnswerId);

	for (const row of rows) counts.set(row.pollAnswerId, row.count);
	return counts;
}

async function userVoteId(userId: number, answerIds: number[]): Promise<number | null> {
	if (answerIds.length === 0) return null;
	const [row] = await db
		.select({ id: pollAnswerVotes.id })
		.from(pollAnswerVotes)
		.where(
			and(eq(pollAnswerVotes.userId, userId), inArray(pollAnswerVotes.pollAnswerId, answerIds))
		)
		.limit(1);
	return row?.id ?? null;
}

async function votesFromIp(ip: string, answerIds: number[]): Promise<number[]> {
	if (!ip || answerIds.length === 0) return [];
	const rows = await db
		.select({ id: pollAnswerVotes.id })
		.from(pollAnswerVotes)
		.where(and(eq(pollAnswerVotes.ip, ip), inArray(pollAnswerVotes.pollAnswerId, answerIds)))
		.orderBy(asc(pollAnswerVotes.id));
	return rows.map((row) => row.id);
}

export async function loadPollPage(input: {
	slug: string;
	user: AuthUser | null;
	cookies: Cookies;
	recaptchaSiteKey: string | null;
	now?: string;
}): Promise<PollPageData | null> {
	const poll = await findVisiblePoll(input.slug);
	if (!poll) return null;

	const now = input.now ?? nowIso();
	const answers = await answersFor(poll.id);
	const answerIds = answers.map((answer) => answer.id);
	const cookieVoteId = readPollCookie(input.cookies, poll.id);
	const existingUserVote = input.user ? await userVoteId(input.user.id, answerIds) : null;
	const hasVoted = cookieVoteId != null || existingUserVote != null;

	const timing = {
		closeAfter: naiveToIso(poll.closeAfter),
		showResultsAfter: naiveToIso(poll.showResultsAfter)
	};
	const state = pollState(timing, { now, hasVoted });
	const counts = state === 'results' ? await voteCounts(answerIds) : new Map<number, number>();
	const withVotes: PollAnswer[] = answers.map((answer) => ({
		id: answer.id,
		label: answer.label,
		votes: state === 'results' ? (counts.get(answer.id) ?? 0) : undefined
	}));
	const totalVotes = withVotes.reduce((sum, answer) => sum + (answer.votes ?? 0), 0);

	const perms = input.user ? await getUserPermissionNames(input.user.id) : new Set<string>();

	return {
		id: poll.id,
		slug: poll.slug,
		question: poll.question,
		state,
		closed: pollClosed(timing, now),
		endsAt: timing.closeAfter,
		resultsAt: timing.showResultsAfter,
		answers: withVotes,
		totalVotes,
		loggedIn: Boolean(input.user),
		recaptchaSiteKey: input.user ? null : input.recaptchaSiteKey,
		editHref: hasPermission(perms, 'polls.edit') ? legacyUrl(`/polls/${poll.id}/edit`) : null,
		image: mediaUrl(poll.image) ?? legacyUrl(DEFAULT_POLL_IMAGE)
	};
}

export async function voteOnPoll(input: {
	slug: string;
	answerId: number;
	user: AuthUser | null;
	cookies: Cookies;
	ip: string;
	recaptchaToken: string | null;
	now?: string;
}): Promise<PollVoteResult> {
	const poll = await findVisiblePoll(input.slug);
	if (!poll) return { ok: false, error: 'not_found' };

	const now = input.now ?? nowIso();
	if (pollClosed({ closeAfter: naiveToIso(poll.closeAfter) }, now)) {
		return { ok: false, error: 'closed' };
	}

	const answers = await answersFor(poll.id);
	const answerIds = answers.map((answer) => answer.id);
	if (!answerIds.includes(input.answerId)) {
		return { ok: false, error: 'invalid', answerId: input.answerId };
	}

	const cookieVoteId = readPollCookie(input.cookies, poll.id);
	const existingUserVote = input.user ? await userVoteId(input.user.id, answerIds) : null;
	const ipVoteIds = await votesFromIp(input.ip, answerIds);
	const decision = decidePollVote({
		closed: false,
		userVoteId: existingUserVote,
		cookieVoteId,
		ipVoteIds
	});

	if (decision.action === 'closed') return { ok: false, error: 'closed' };
	if (decision.action === 'keep') {
		setPollCookie(input.cookies, poll.id, decision.voteId);
		return { ok: false, error: 'already' };
	}

	if (!input.user) {
		const captchaOk = await verifyRecaptcha(input.recaptchaToken, input.ip);
		if (!captchaOk) return { ok: false, error: 'captcha', answerId: input.answerId };
	}

	if (!input.ip) return { ok: false, error: 'generic', answerId: input.answerId };

	const inserted = await db.insert(pollAnswerVotes).values({
		pollAnswerId: input.answerId,
		userId: input.user?.id ?? null,
		ip: input.ip.slice(0, 70),
		createdAt: new Date(),
		updatedAt: new Date()
	});
	const voteId = Number(inserted[0].insertId);
	if (!Number.isSafeInteger(voteId) || voteId <= 0) {
		return { ok: false, error: 'generic', answerId: input.answerId };
	}

	setPollCookie(input.cookies, poll.id, voteId);
	return { ok: true };
}
