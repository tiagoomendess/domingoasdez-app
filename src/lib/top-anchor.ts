/**
 * AdSense top anchors are position:fixed and push the page by setting padding-top
 * on body. The theme and back buttons are also fixed, so they stay at the viewport
 * top and slide under the ad. `--anchor-offset` is that occupied height: tall while
 * the anchor is open, short while it is collapsed, and 0 when no top anchor is showing.
 */

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
	viewport: { width: number; height: number }
): number {
	const maxHeight = viewport.height * 0.75;
	const minWidth = viewport.width * 0.7;
	let offset = bodyPaddingTop > 0 ? bodyPaddingTop : 0;

	for (const box of boxes) {
		const height = box.bottom - box.top;
		// Vignettes and side rails are not the top bar. A top anchor is full width
		// and flush with the viewport top; half-screen collapsible anchors still fit.
		if (height < 1 || height > maxHeight) continue;
		if (box.width < minWidth) continue;
		if (box.top < -1 || box.top > 1) continue;
		if (box.bottom > offset) offset = box.bottom;
	}

	return Math.round(offset);
}

export function measureTopAnchorOffset(doc: Document = document): number {
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

	return resolveTopAnchorOffset(Number.isFinite(padding) ? padding : 0, boxes, {
		width: view?.innerWidth ?? doc.documentElement.clientWidth,
		height: view?.innerHeight ?? doc.documentElement.clientHeight
	});
}

export function watchTopAnchorOffset(doc: Document = document): () => void {
	const root = doc.documentElement;
	const resize = new ResizeObserver(() => kick());
	let anchors: Element[] = [];
	let frame = 0;
	let last = '';

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
		const next = `${measureTopAnchorOffset(doc)}px`;
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
