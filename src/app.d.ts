import type { AuthUser } from '#lib/auth/user.ts';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: AuthUser | null;
			/** Set by the first `handle` (`logRequests`), logged with every entry of the request. */
			requestId: string;
			/** True when the signed-in account has the `disable_ads` permission. */
			adsDisabled: boolean;
		}
		interface PageData {
			user: AuthUser | null;
			adsDisabled: boolean;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
