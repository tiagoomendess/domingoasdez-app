import { error, fail, redirect } from '@sveltejs/kit';
import { isLegacyFullYearSlug, parseSeasonSlug, seasonNameSlug } from '#lib/competitions.ts';
import { m } from '#lib/messages.ts';
import { findSeasonBySlugs } from '#lib/server/competition-page.ts';
import {
	castMvpVote,
	findGameBySlugs,
	loadGamePage,
	parseClubsSlug
} from '#lib/server/game-page.ts';
import { slugify } from '#lib/slug.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url, locals, depends }) => {
	depends('app:game');

	const {
		season: seasonSlug,
		competition: competitionSlug,
		group: groupSlug,
		round: roundParam,
		clubs: clubsSlug
	} = params;

	if (isLegacyFullYearSlug(seasonSlug)) {
		const years = parseSeasonSlug(seasonSlug);
		if (!years) error(404, m.game_not_found());
		const [startYear, endYear] = years;
		redirect(
			301,
			`/competicoes/${seasonNameSlug(startYear, endYear)}/${competitionSlug}/${groupSlug}/${roundParam}/${clubsSlug}`
		);
	}

	const clubs = parseClubsSlug(clubsSlug);
	if (!clubs) error(404, m.game_not_found());

	const round = Number.parseInt(roundParam, 10);
	if (!Number.isFinite(round)) error(404, m.game_not_found());

	const season = await findSeasonBySlugs(seasonSlug, competitionSlug);
	if (!season) error(404, m.game_not_found());

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
	if (!game) error(404, m.game_not_found());

	const groupName = game.groupName?.trim() || display;
	const canonicalGroupSlug = slugify(groupName);
	const canonicalClubsSlug = `${slugify(game.homeClubName)}-vs-${slugify(game.awayClubName)}`;

	if (
		displaySlug !== competitionSlug ||
		canonicalSeasonSlug !== seasonSlug ||
		canonicalGroupSlug !== groupSlug ||
		canonicalClubsSlug !== clubsSlug
	) {
		redirect(
			301,
			`/competicoes/${canonicalSeasonSlug}/${displaySlug}/${canonicalGroupSlug}/${game.round}/${canonicalClubsSlug}`
		);
	}

	const page = await loadGamePage(game, locals.user, url.href);
	return page;
};

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
	}
};
