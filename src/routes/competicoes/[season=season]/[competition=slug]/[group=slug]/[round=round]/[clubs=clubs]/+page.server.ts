import { error, fail, redirect } from '@sveltejs/kit';
import { isLegacyFullYearSlug, parseSeasonSlug, seasonNameSlug } from '#lib/competitions.ts';
import { m } from '#lib/messages.ts';
import { actualOutcome, judgePrediction } from '#lib/predictions.ts';
import { findSeasonBySlugs } from '#lib/server/competition-page.ts';
import { loadGamePredictions, savePrediction } from '#lib/server/game-predictions.ts';
import {
	deleteMatchComment,
	listMatchComments,
	postMatchComment
} from '#lib/server/match-comments.ts';
import {
	castMvpVote,
	findGameBySlugs,
	loadGamePage,
	parseClubsSlug
} from '#lib/server/game-page.ts';
import { slugify } from '#lib/slug.ts';
import { poisonFor } from '#lib/server/poison.ts';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

type GameParams = Parameters<PageServerLoad>[0]['params'];

/**
 * The game a game-page URL points at, plus whether the URL is already canonical. Null when
 * nothing matches. Legacy long seasons are handled by `load` before this.
 */
async function resolveGame(params: GameParams) {
	const {
		season: seasonSlug,
		competition: competitionSlug,
		group: groupSlug,
		round: roundParam,
		clubs: clubsSlug
	} = params;

	const clubs = parseClubsSlug(clubsSlug);
	if (!clubs) return null;

	const round = Number.parseInt(roundParam, 10);
	if (!Number.isFinite(round)) return null;

	const season = await findSeasonBySlugs(seasonSlug, competitionSlug);
	if (!season) return null;

	const display = season.name?.trim() || season.competitionName;
	const displaySlug = slugify(display);
	const canonicalSeasonSlug = seasonNameSlug(season.startYear, season.endYear);

	const game = await findGameBySlugs(
		season,
		groupSlug,
		round,
		clubs.homeClubSlug,
		clubs.awayClubSlug
	);
	if (!game) return null;

	const groupName = game.groupName?.trim() || display;
	const canonicalGroupSlug = slugify(groupName);
	const canonicalClubsSlug = `${slugify(game.homeClubName)}-vs-${slugify(game.awayClubName)}`;

	const canonical =
		displaySlug === competitionSlug &&
		canonicalSeasonSlug === seasonSlug &&
		canonicalGroupSlug === groupSlug &&
		canonicalClubsSlug === clubsSlug;

	return {
		game,
		canonical,
		canonicalPath: `/competicoes/${canonicalSeasonSlug}/${displaySlug}/${canonicalGroupSlug}/${game.round}/${canonicalClubsSlug}`
	};
}

export const load: PageServerLoad = async ({ params, url, locals, depends }) => {
	depends('app:game');

	if (isLegacyFullYearSlug(params.season)) {
		const years = parseSeasonSlug(params.season);
		if (!years) error(404, m.game_not_found());
		const [startYear, endYear] = years;
		redirect(
			301,
			`/competicoes/${seasonNameSlug(startYear, endYear)}/${params.competition}/${params.group}/${params.round}/${params.clubs}`
		);
	}

	const resolved = await resolveGame(params);
	if (!resolved) error(404, m.game_not_found());
	if (!resolved.canonical) redirect(301, resolved.canonicalPath);

	const [realPage, comments, predictions] = await Promise.all([
		loadGamePage(resolved.game, locals.user, url.href),
		listMatchComments(resolved.game.id, locals.user?.id ?? null),
		loadGamePredictions(resolved.game, locals.user?.id ?? null)
	]);
	const page = poisonFor(locals, realPage);

	// Judged on the score the page shows; `penalties` is only set when they decided the game.
	const result =
		page.status === 'finished'
			? { home: page.homeScore, away: page.awayScore, penalties: page.penalties ?? null }
			: null;
	const prediction = {
		...predictions,
		actual: result ? actualOutcome(result, predictions.kind) : null,
		verdict:
			result && predictions.mine
				? judgePrediction(predictions.mine, result, predictions.kind)
				: null
	};

	return { ...page, comments, prediction };
};

function parseId(value: FormDataEntryValue | null): number | null {
	const id = Number.parseInt(String(value ?? ''), 10);
	return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** The comment actions need a signed-in user and the game this (canonical) URL resolves to. */
async function commentContext({ params, locals, url }: RequestEvent) {
	if (!locals.user) {
		redirect(303, `/conta/entrar?redirectTo=${encodeURIComponent(`${url.pathname}#comentarios`)}`);
	}
	const resolved = await resolveGame(params);
	if (!resolved?.canonical) error(404, m.game_not_found());
	return { user: locals.user, game: resolved.game };
}

export const actions: Actions = {
	mvp: async ({ request, locals, url }) => {
		if (!locals.user) {
			redirect(303, `/conta/entrar?redirectTo=${encodeURIComponent(url.pathname)}`);
		}

		const form = await request.formData();
		const gameId = Number.parseInt(String(form.get('game') ?? ''), 10);
		const playerId = Number.parseInt(String(form.get('player') ?? ''), 10);

		if (!Number.isFinite(gameId) || !Number.isFinite(playerId)) {
			return fail(400, { error: 'invalid' as const });
		}

		const result = await castMvpVote({
			gameId,
			playerId,
			userId: locals.user.id
		});

		if (!result.ok) {
			const status =
				result.reason === 'already_voted'
					? 409
					: result.reason === 'closed'
						? 403
						: result.reason === 'not_found'
							? 404
							: 400;
			return fail(status, { error: result.reason });
		}

		return { ok: true as const };
	},

	predict: async (event) => {
		const { locals, url } = event;
		if (!locals.user) {
			redirect(303, `/conta/entrar?redirectTo=${encodeURIComponent(`${url.pathname}#previsao`)}`);
		}
		const resolved = await resolveGame(event.params);
		if (!resolved?.canonical) error(404, m.game_not_found());

		const form = await event.request.formData();
		const result = await savePrediction({
			gameId: resolved.game.id,
			userId: locals.user.id,
			home: form.get('home'),
			away: form.get('away'),
			penaltyWinner: form.get('penaltyWinner')
		});
		if (!result.ok) {
			const status =
				result.error === 'closed' || result.error === 'not_open'
					? 403
					: result.error === 'not_found'
						? 404
						: 400;
			return fail(status, { action: 'predict' as const, error: result.error });
		}
		return { action: 'predict' as const, ok: true as const };
	},

	comment: async (event) => {
		const { user, game } = await commentContext(event);
		const form = await event.request.formData();
		const content = String(form.get('comment') ?? '');
		const parentId = parseId(form.get('parent'));

		const result = await postMatchComment({ gameId: game.id, userId: user.id, content, parentId });
		if (!result.ok) {
			const status = result.error === 'too_fast' ? 429 : 400;
			return fail(status, { action: 'comment' as const, error: result.error, content, parentId });
		}
		return { action: 'comment' as const, commentId: result.id };
	},

	deleteComment: async (event) => {
		const { user, game } = await commentContext(event);
		const form = await event.request.formData();
		const commentId = parseId(form.get('id'));
		if (commentId == null)
			return fail(400, { action: 'delete' as const, error: 'not_found' as const });

		const result = await deleteMatchComment({ gameId: game.id, commentId, userId: user.id });
		if (!result.ok) {
			return fail(result.error === 'forbidden' ? 403 : 404, {
				action: 'delete' as const,
				error: result.error
			});
		}
		return { action: 'delete' as const, deleted: commentId };
	}
};
