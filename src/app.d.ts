import type { AuthUser } from '#lib/auth/user.ts';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: AuthUser | null;
		}
		interface PageData {
			user: AuthUser | null;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
