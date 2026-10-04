import { describe, expect, it, vi } from 'vitest';

vi.mock('$app/env/private', () => ({
	SOCIAL_LOGINS_ENABLED: true,
	GOOGLE_LOGIN_ENABLED: true,
	FACEBOOK_LOGIN_ENABLED: false,
	APPLE_LOGIN_ENABLED: false
}));

describe('enabledSocialProviders', () => {
	it('returns google by default (facebook and apple off)', async () => {
		vi.resetModules();
		vi.doMock('$app/env/private', () => ({
			SOCIAL_LOGINS_ENABLED: true,
			GOOGLE_LOGIN_ENABLED: true,
			FACEBOOK_LOGIN_ENABLED: false,
			APPLE_LOGIN_ENABLED: false
		}));
		const { enabledSocialProviders } = await import('./social.ts');
		expect(enabledSocialProviders()).toEqual(['google']);
	});

	it('returns nothing when the master switch is off', async () => {
		vi.resetModules();
		vi.doMock('$app/env/private', () => ({
			SOCIAL_LOGINS_ENABLED: false,
			GOOGLE_LOGIN_ENABLED: true,
			FACEBOOK_LOGIN_ENABLED: true,
			APPLE_LOGIN_ENABLED: true
		}));
		const { enabledSocialProviders } = await import('./social.ts');
		expect(enabledSocialProviders()).toEqual([]);
	});

	it('includes facebook and apple when their flags are on', async () => {
		vi.resetModules();
		vi.doMock('$app/env/private', () => ({
			SOCIAL_LOGINS_ENABLED: true,
			GOOGLE_LOGIN_ENABLED: true,
			FACEBOOK_LOGIN_ENABLED: true,
			APPLE_LOGIN_ENABLED: true
		}));
		const { enabledSocialProviders } = await import('./social.ts');
		expect(enabledSocialProviders()).toEqual(['google', 'facebook', 'apple']);
	});
});
