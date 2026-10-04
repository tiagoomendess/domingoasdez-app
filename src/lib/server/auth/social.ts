import {
	APPLE_LOGIN_ENABLED,
	FACEBOOK_LOGIN_ENABLED,
	GOOGLE_LOGIN_ENABLED,
	SOCIAL_LOGINS_ENABLED
} from '$app/env/private';
import { SOCIAL_PROVIDERS, type SocialProvider } from '#lib/auth/social.ts';

export type { SocialProvider };

const FLAGS: Record<SocialProvider, boolean> = {
	google: GOOGLE_LOGIN_ENABLED,
	facebook: FACEBOOK_LOGIN_ENABLED,
	apple: APPLE_LOGIN_ENABLED
};

/** Providers currently shown on the logged-out account page (legacy flag semantics). */
export function enabledSocialProviders(): SocialProvider[] {
	if (!SOCIAL_LOGINS_ENABLED) return [];
	return SOCIAL_PROVIDERS.filter((provider) => FLAGS[provider]);
}
