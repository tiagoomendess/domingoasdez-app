export const SOCIAL_PROVIDERS = ['google', 'facebook', 'apple'] as const;

export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];
