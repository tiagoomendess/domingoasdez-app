import { todayInLisbon } from '#lib/format.ts';
import { dayRange, isValidDay } from '#lib/games.ts';
import { m } from '#lib/messages.ts';
import { getUserPermissionNames, hasPermission } from '#lib/server/auth/permissions.ts';
import {
	getLatestTransferDay,
	getPreviousTransferDay,
	getTransferDayMarkers,
	getTransfersForDay
} from '#lib/server/transfers.ts';
import type { PageServerLoad } from './$types';

const RAIL_RADIUS = 14;

export const load: PageServerLoad = async ({ url, locals }) => {
	const today = todayInLisbon();
	const raw = url.searchParams.get('date');
	// Transfers are sparse, so a bare link opens on the latest day that has some.
	const selected = raw && isValidDay(raw) ? raw : ((await getLatestTransferDay()) ?? today);
	const days = dayRange(selected, RAIL_RADIUS, RAIL_RADIUS);

	const perms = locals.user ? await getUserPermissionNames(locals.user.id) : new Set<string>();

	const [transfers, markers, previousDay] = await Promise.all([
		getTransfersForDay(selected, {
			canSeeUnderagePics: hasPermission(perms, 'players'),
			canEdit: hasPermission(perms, 'transfers.edit')
		}),
		getTransferDayMarkers(days[0], days[days.length - 1]),
		getPreviousTransferDay(selected)
	]);

	return {
		today,
		selected,
		days,
		markers,
		transfers,
		previousDay,
		seo: {
			title: m.transfers_title(),
			description: m.transfers_meta_description()
		}
	};
};
