import type { Component } from 'svelte';
import type { PlacardPublicState, PlacardScene } from '#lib/placard.ts';
import MatchScene from './MatchScene.svelte';
import PairingScene from './PairingScene.svelte';

/**
 * What the TV draws for each scene. A new scene (an ad break, a message) is a component here
 * plus its name in `PLACARD_SCENES`; `props` picks what it needs from the state, or returns null
 * when the state can't show it yet.
 */
type SceneEntry<Props extends Record<string, unknown>> = {
	component: Component<Props>;
	props: (state: PlacardPublicState, now: number) => Props | null;
};

const scene = <Props extends Record<string, unknown>>(entry: SceneEntry<Props>) =>
	entry as unknown as SceneEntry<Record<string, unknown>>;

export const placardScenes: Record<PlacardScene, SceneEntry<Record<string, unknown>>> = {
	pairing: scene({
		component: PairingScene,
		props: (state) => (state.pairing ? { pairing: state.pairing } : null)
	}),
	match: scene({
		component: MatchScene,
		props: (state, now) =>
			state.match ? { match: state.match, showNames: state.theme.showNames, now } : null
	})
};
