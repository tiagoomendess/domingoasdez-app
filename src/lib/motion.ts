import { prefersReducedMotion } from 'svelte/motion';
import { quintOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';

const fade = (duration = 150): TransitionConfig => ({ duration, css: (t) => `opacity: ${t}` });

/** Glass arriving as a material: grows and fades in together, never just a plain fade. */
export function materialize(_node: Element, { y = 0, duration = 240 } = {}): TransitionConfig {
	if (prefersReducedMotion.current) return fade();
	return {
		duration,
		easing: quintOut,
		css: (t) => `opacity: ${t}; transform: translateY(${(1 - t) * y}px) scale(${0.85 + 0.15 * t})`
	};
}

/** New live score: rolls in from below (first 240ms) while a live tint fades out (600ms). */
export function rollIn(_node: Element, { distance = 70 } = {}): TransitionConfig {
	if (prefersReducedMotion.current) return { duration: 0 };
	return {
		duration: 600,
		css: (t) => {
			const move = quintOut(Math.min(1, t * 2.5));
			return `transform: translateY(${(1 - move) * distance}%); opacity: ${move}; background-color: color-mix(in srgb, var(--live-tint), transparent ${t * 100}%)`;
		}
	};
}

export function rollOut(_node: Element, { distance = 70 } = {}): TransitionConfig {
	if (prefersReducedMotion.current) return { duration: 0 };
	return {
		duration: 240,
		easing: quintOut,
		css: (t) => `transform: translateY(${(t - 1) * distance}%); opacity: ${t}`
	};
}
