import { defineParams } from '@sveltejs/kit/params';

/**
 * Parameter matchers for competition (and future) routes.
 * Season: 2025, 2025-26, or legacy 2025-2026. Slug: lowercase alphanumerics and dashes.
 */
export const params = defineParams({
	season: (param) => {
		if (!/^(\d{4}(-\d{2})?|\d{4}-\d{4})$/.test(param)) return;
		return param;
	},
	slug: (param) => {
		if (!/^[a-z0-9-]+$/.test(param)) return;
		return param;
	},
	round: (param) => {
		if (!/^\d+$/.test(param)) return;
		return param;
	},
	id: (param) => {
		if (!/^\d+$/.test(param)) return;
		return param;
	},
	clubs: (param) => {
		if (!/^[a-z0-9-]+-vs-[a-z0-9-]+$/.test(param)) return;
		return param;
	}
});
