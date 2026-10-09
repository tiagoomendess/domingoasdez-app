/**
 * AdSense top anchors are position:fixed and push the page by setting padding-top
 * on body. The theme and back buttons are also fixed, so they stay at the viewport
 * top and slide under the ad. `--anchor-offset` is that occupied height: tall while
 * the anchor is open, short while it is collapsed, and 0 when no top anchor is showing.
 *
 * On the installed iOS app the webview starts under the Dynamic Island. The anchor
 * is shifted to that safe area, and the body padding grows with it so the page
 * and the buttons stay below the bar.
 */

import { isHomeScreenApp, readSafeAreaTop } from '#lib/vignette-inset.ts';

export type AnchorBox = {
	top: number;
	bottom: number;
	width: number;
};

const ANCHOR_SELECTOR =
	'ins.adsbygoogle[data-ad-hi], ins.adsbygoogle[data-anchor-status], ins.adsbygoogle[data-anchor-shown]';

export function resolveTopAnchorOffset(
	bodyPaddingTop: number,
	boxes: readonly AnchorBox[],
	viewport: { width: number; height: number },
	safeTop = 0
): number {
	const maxHeight = viewport.height * 0.75;
	const minWidth = viewport.width * 0.7;
	// Flush with the screen, or with the status bar once the bar has been shifted.
	const flush = Math.max(1, safeTop + 1);
	let offset = bodyPaddingTop > 0 ? bodyPaddingTop : 0;

	for (const box of boxes) {
		const height = box.bottom - box.top;
		// Vignettes and side rails are not the top bar. A top anchor is full width
		// and flush with the viewport top; half-screen collapsible anchors still fit.
		if (height < 1 || height > maxHeight) continue;
		if (box.width < minWidth) continue;
		if (box.top < -1 || box.top > flush) continue;
		if (box.bottom > offset) offset = box.bottom;
	}

	return Math.round(offset);
}

/** Where a top anchor should sit. Null when it is already below the status bar. */
export function anchorTop(safeTop: number, currentTop: number): number | null {
	if (safeTop < 1) return null;
	if (currentTop >= safeTop - 1) return null;
	return Math.round(safeTop);
}

export function measureTopAnchorOffset(doc: Document = document, safeTop = 0): number {
	const view = doc.defaultView;
	const padding = Number.parseFloat(getComputedStyle(doc.body).paddingTop);
	const boxes: AnchorBox[] = [];

	for (const node of doc.querySelectorAll(ANCHOR_SELECTOR)) {
		if (!(node instanceof HTMLElement)) continue;
		const style = getComputedStyle(node);
		if (style.display === 'none' || style.visibility === 'hidden') continue;
		const rect = node.getBoundingClientRect();
		boxes.push({ top: rect.top, bottom: rect.bottom, width: rect.width });
	}

	return resolveTopAnchorOffset(
		Number.isFinite(padding) ? padding : 0,
		boxes,
		{
			width: view?.innerWidth ?? doc.documentElement.clientWidth,
			height: view?.innerHeight ?? doc.documentElement.clientHeight
		},
		safeTop
	);
}

/**
 * Drop a top anchor below the status bar and extend the body's reserved padding
 * so the page starts under the bar. Returns the padding that should stay once
 * the anchor is gone, or null when this call did not own the padding.
 */
export function placeTopAnchors(doc: Document, safeTop: number): number {
	const view = doc.defaultView;
	const viewWidth = view?.innerWidth ?? doc.documentElement.clientWidth;
	const viewHeight = view?.innerHeight ?? doc.documentElement.clientHeight;
	let lowest = 0;

	for (const node of doc.querySelectorAll(ANCHOR_SELECTOR)) {
		if (!(node instanceof HTMLElement)) continue;
		const style = getComputedStyle(node);
		if (style.display === 'none' || style.visibility === 'hidden') continue;
		if (style.position !== 'fixed' && style.position !== 'sticky') continue;

		const rect = node.getBoundingClientRect();
		if (rect.height < 1 || rect.height > viewHeight * 0.75) continue;
		if (rect.width < viewWidth * 0.7) continue;
		if (rect.top > safeTop + 1) continue;

		const current = Number.parseFloat(style.top);
		const next = anchorTop(safeTop, Number.isFinite(current) ? current : rect.top);
		if (next !== null) {
			const top = `${next}px`;
			// Width stays full-bleed if Google's `inset` shorthand drops `right`.
			node.style.setProperty('left', '0px', 'important');
			node.style.setProperty('width', '100%', 'important');
			node.style.setProperty('inset', `${top} auto auto 0px`, 'important');
			node.style.setProperty('top', top, 'important');
		}

		const bottom = node.getBoundingClientRect().bottom;
		if (bottom > lowest) lowest = bottom;
	}

	return lowest;
}

export function watchTopAnchorOffset(doc: Document = document): () => void {
	const root = doc.documentElement;
	const view = doc.defaultView;
	const homeScreen = view ? isHomeScreenApp(view) : false;
	const resize = new ResizeObserver(() => kick());
	let anchors: Element[] = [];
	let frame = 0;
	let last = '';
	let padded = false;

	const syncAnchors = () => {
		const next = [...doc.querySelectorAll(ANCHOR_SELECTOR)];
		if (next.length === anchors.length && next.every((node, index) => node === anchors[index])) {
			return;
		}
		resize.disconnect();
		anchors = next;
		for (const node of anchors) resize.observe(node);
	};

	const apply = () => {
		const safeTop = homeScreen ? readSafeAreaTop(doc) : 0;
		const lowest = safeTop >= 1 ? placeTopAnchors(doc, safeTop) : 0;
		if (lowest >= 1) {
			const needed = Math.round(lowest);
			const pad = Number.parseFloat(getComputedStyle(doc.body).paddingTop) || 0;
			if (pad < needed - 1) {
				doc.body.style.setProperty('padding-top', `${needed}px`, 'important');
				padded = true;
			}
		} else if (padded) {
			doc.body.style.removeProperty('padding-top');
			padded = false;
		}

		const next = `${measureTopAnchorOffset(doc, safeTop)}px`;
		if (root.style.getPropertyValue('--anchor-offset').trim() !== next) {
			root.style.setProperty('--anchor-offset', next);
		}
		return next;
	};

	// Keep reading while the bar is easing open or closed, then stop once it settles.
	const tick = () => {
		frame = 0;
		syncAnchors();
		const next = apply();
		if (next === last) return;
		last = next;
		frame = requestAnimationFrame(tick);
	};

	const kick = () => {
		if (frame) return;
		frame = requestAnimationFrame(tick);
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
		attributeFilter: [
			'style',
			'class',
			'data-ad-status',
			'data-anchor-status',
			'data-anchor-shown',
			'data-ad-hi'
		]
	});

	kick();

	return () => {
		if (frame) cancelAnimationFrame(frame);
		mutations.disconnect();
		resize.disconnect();
		root.style.removeProperty('--anchor-offset');
	};
}
