/**
 * AdSense vignettes are a fixed full-screen overlay. In the installed iOS app the
 * webview draws under the status bar, and Google pins the close button to y=0, so
 * it sits in the clock and battery. Shift that overlay down to the safe area.
 * Safari already starts below the status bar, so this only runs from the home screen.
 */

const VIGNETTE = 'ins.adsbygoogle[data-vignette-loaded]';

export function isHomeScreenApp(win: Window = window): boolean {
	const nav = win.navigator as Navigator & { standalone?: boolean };
	if (nav.standalone) return true;
	return win.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
}

export function readSafeAreaTop(doc: Document = document): number {
	const probe = doc.createElement('div');
	probe.style.cssText =
		'position:fixed;top:0;left:0;visibility:hidden;pointer-events:none;height:env(safe-area-inset-top,0px)';
	doc.body.append(probe);
	const height = probe.getBoundingClientRect().height;
	probe.remove();
	return height;
}

/** Pixel top for a vignette that currently starts above the status bar. Null leaves it alone. */
export function vignetteTop(
	safeTop: number,
	currentTop: number,
	fullScreen: boolean
): number | null {
	if (!fullScreen || safeTop < 1) return null;
	if (currentTop >= safeTop - 1) return null;
	return Math.round(safeTop);
}

function coversViewport(el: HTMLElement, viewHeight: number): boolean {
	const inlineHeight = el.style.getPropertyValue('height');
	if (inlineHeight.includes('100vh') || inlineHeight.includes('100dvh')) return true;
	const height = Number.parseFloat(getComputedStyle(el).height);
	return Number.isFinite(height) && height >= viewHeight * 0.75;
}

export function placeVignette(el: HTMLElement, safeTop: number, viewHeight = window.innerHeight) {
	const style = getComputedStyle(el);
	if (style.position !== 'fixed') return;
	if (!coversViewport(el, viewHeight)) return;
	const currentTop = Number.parseFloat(style.top);
	const next = vignetteTop(safeTop, Number.isFinite(currentTop) ? currentTop : 0, true);
	// translateZ keeps a fixed close control inside this box instead of the viewport.
	const contained = style.transform !== 'none';
	if (next !== null || !contained) {
		const top = `${next ?? Math.round(safeTop)}px`;
		// Written after Google's `inset: 0 !important`, so the longhand wins.
		el.style.setProperty('inset', `${top} auto auto 0px`, 'important');
		el.style.setProperty('top', top, 'important');
		el.style.setProperty('height', `calc(100vh - ${top})`, 'important');
		el.style.setProperty('transform', 'translateZ(0)', 'important');
	}

	for (const node of el.querySelectorAll('iframe, div, button')) {
		if (node instanceof HTMLElement) liftOutOfStatusBar(node, safeTop);
	}
}

/** Move a control that is still painted in the status-bar band. */
function liftOutOfStatusBar(el: HTMLElement, safeTop: number) {
	const style = getComputedStyle(el);
	if (style.position !== 'fixed' && style.position !== 'absolute') return;
	const rect = el.getBoundingClientRect();
	if (rect.top >= safeTop - 1 || rect.height < 24) return;
	const base = Number.parseFloat(style.top);
	const origin = Number.isFinite(base) ? base : 0;
	if (origin >= safeTop - 1) return;
	el.style.setProperty('top', `${Math.round(origin + safeTop - rect.top)}px`, 'important');
}

function insetVignettes(doc: Document, safeTop: number) {
	const viewHeight = doc.defaultView?.innerHeight ?? 0;
	for (const node of doc.querySelectorAll(VIGNETTE)) {
		if (node instanceof HTMLElement) placeVignette(node, safeTop, viewHeight);
	}
}

export function watchVignetteInset(doc: Document = document): () => void {
	const view = doc.defaultView;
	if (!view || !isHomeScreenApp(view)) return () => {};

	let frame = 0;
	const apply = () => {
		frame = 0;
		const safeTop = readSafeAreaTop(doc);
		if (safeTop < 1) return;
		insetVignettes(doc, safeTop);
	};
	const kick = () => {
		if (frame) return;
		frame = view.requestAnimationFrame(apply);
	};

	const app = () => doc.querySelector('[data-app-root]');
	const mutations = new MutationObserver((records) => {
		const boundary = app();
		for (const record of records) {
			const target = record.target;
			if (
				boundary &&
				target instanceof Node &&
				(target === boundary || boundary.contains(target))
			) {
				continue;
			}
			kick();
			return;
		}
	});

	mutations.observe(doc.body, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: ['style', 'data-vignette-loaded']
	});
	view.addEventListener('resize', kick);
	kick();

	return () => {
		if (frame) view.cancelAnimationFrame(frame);
		mutations.disconnect();
		view.removeEventListener('resize', kick);
	};
}
