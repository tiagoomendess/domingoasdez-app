import type { Component } from 'svelte';
import type { PlacardOverlay, PlacardOverlayType } from '#lib/placard.ts';
import AdOverlay from './AdOverlay.svelte';
import MessageOverlay from './MessageOverlay.svelte';
import SubstitutionOverlay from './SubstitutionOverlay.svelte';

/**
 * What the TV draws on top of the scene for each overlay type, while it lasts. A substitution or
 * a message is a component here plus a member of `PlacardOverlay`; every overlay gets the server
 * time so it can count down.
 */
type OverlayComponent = Component<{ overlay: never; now: number }>;

export const placardOverlays: Record<PlacardOverlayType, OverlayComponent> = {
	ad: AdOverlay as OverlayComponent,
	substitution: SubstitutionOverlay as OverlayComponent,
	message: MessageOverlay as OverlayComponent
};

/** The overlay to draw at `now` (server ms): none once it has ended, even before the next poll. */
export const activeOverlay = (overlay: PlacardOverlay | null, now: number) =>
	overlay && overlay.endsAt > now ? overlay : null;
