import type { AuthUser } from '#lib/auth/user.ts';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: AuthUser | null;
			/** False when the signed-in user has `disable_ads` (or admin). */
			showAds: boolean;
		}
		interface PageData {
			user: AuthUser | null;
			showAds: boolean;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
