/**
 * The "Gota" goal sound: a soft double bloop, synthesised with Web Audio so there's no file to load.
 *
 * Browsers only let audio start after a user gesture. `unlockGoalSound` creates/resumes the
 * context inside one (call it from a pointerdown or keydown); `playGoalSound` stays silent
 * until then instead of queueing the sound.
 */

let context: AudioContext | null = null;

function getContext(): AudioContext | null {
	if (typeof window === 'undefined') return null;
	if (!context) {
		const Ctor =
			window.AudioContext ??
			(window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
		if (!Ctor) return null;
		context = new Ctor();
	}
	return context;
}

export function unlockGoalSound() {
	const ctx = getContext();
	if (ctx?.state === 'suspended') void ctx.resume();
}

function bloop(ctx: AudioContext, start: number, from: number, to: number, volume: number) {
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();
	osc.type = 'sine';
	osc.frequency.setValueAtTime(from, start);
	osc.frequency.exponentialRampToValueAtTime(to, start + 0.08);
	gain.gain.setValueAtTime(0, start);
	gain.gain.linearRampToValueAtTime(volume, start + 0.004);
	gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.21);
	osc.connect(gain).connect(ctx.destination);
	osc.start(start);
	osc.stop(start + 0.3);
}

export function playGoalSound() {
	const ctx = getContext();
	if (!ctx) return;
	if (ctx.state === 'suspended') {
		// Allowed without a gesture once the page has had one (sticky activation); otherwise a no-op.
		void ctx.resume();
		if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
	}
	const t = ctx.currentTime + 0.02;
	bloop(ctx, t, 400, 1300, 0.25);
	bloop(ctx, t + 0.13, 600, 1800, 0.16);
}
