import {
	createCanvas,
	GlobalFonts,
	loadImage,
	type Canvas,
	type Image,
	type SKRSContext2D
} from '@napi-rs/canvas';
import sharp from 'sharp';

/**
 * Drawing helpers that reproduce the legacy Intervention Image (GD) calls, so the generated images
 * keep their layout: Skia (`@napi-rs/canvas`) draws, `sharp` decodes, blurs and encodes. Same
 * helpers as the admin's image jobs (`domingoasdez-admin/src/worker/images/draw.ts`); keep them
 * in step.
 */

export const FONTS = { regular: 'DadRobotoRegular', black: 'DadRobotoBlack' } as const;

let fontsRegistered = false;

/** Registers the two Roboto weights once per process (the caller supplies the TTF bytes). */
export function registerFonts(fonts: { regular: Uint8Array; black: Uint8Array }) {
	if (fontsRegistered) return;
	GlobalFonts.register(Buffer.from(fonts.regular), FONTS.regular);
	GlobalFonts.register(Buffer.from(fonts.black), FONTS.black);
	fontsRegistered = true;
}

/** A canvas filled with `background` (legacy JPEGs were flattened onto white). */
export function newCanvas(width: number, height: number, background = '#ffffff') {
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext('2d');
	ctx.fillStyle = background;
	ctx.fillRect(0, 0, width, height);
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';
	return { canvas, ctx };
}

/** Any format sharp reads (JPEG, PNG, WebP, AVIF, SVG, …), EXIF-rotated, as a drawable image. */
export async function decodeImage(bytes: Uint8Array): Promise<Image> {
	const png = await sharp(bytes, { failOn: 'error' }).rotate().png().toBuffer();
	return loadImage(png);
}

/** Intervention `insert($img, 'center')`: natural size, centred, cropped by the canvas. */
export function drawCentered(ctx: SKRSContext2D, image: Image, width: number, height: number) {
	ctx.drawImage(
		image,
		Math.round((width - image.width) / 2),
		Math.round((height - image.height) / 2)
	);
}

/** Intervention `resize($width, null, aspectRatio)` (upscales too): the new height. */
export const heightForWidth = (image: Pick<Image, 'width' | 'height'>, width: number) =>
	Math.round((width * image.height) / image.width);

/** GD's `IMG_FILTER_GAUSSIAN_BLUR` kernel. */
const GD_GAUSSIAN = { width: 3, height: 3, kernel: [1, 2, 1, 2, 4, 2, 1, 2, 1], scale: 16 };

/**
 * GD `blur($amount)`: `$amount` passes of GD's 3×3 Gaussian, pass by pass (each pass rounds to
 * 8 bits like GD).
 */
export async function blur(canvas: Canvas, amount: number): Promise<void> {
	const { width, height } = canvas;
	const ctx = canvas.getContext('2d');
	const pixels = ctx.getImageData(0, 0, width, height);
	const raw = { width, height, channels: 4 } as const;
	let data = Buffer.from(pixels.data.buffer);
	for (let pass = 0; pass < amount; pass++) {
		data = await sharp(data, { raw }).convolve(GD_GAUSSIAN).raw().toBuffer();
	}
	pixels.data.set(data);
	ctx.putImageData(pixels, 0, 0);
}

/** Intervention font `size` with a TTF file: GD points (`ceil(size × 0.75)`) at 96 DPI, in px. */
export const gdFontPx = (size: number) => (Math.ceil(size * 0.75) * 96) / 72;

/**
 * Intervention `text()` with `align('center')` and `valign('center')` (or `'top'`): GD's text box
 * is centred on x, and centred on y (or starts at y). The box is the ink, except that GD counts a
 * leading space from the pen origin and a trailing space with its whole advance.
 */
export function drawCenteredText(
	ctx: SKRSContext2D,
	text: string,
	x: number,
	y: number,
	style: { font: string; size: number; color: string; valign?: 'center' | 'top' }
) {
	ctx.font = `${gdFontPx(style.size)}px ${style.font}`;
	ctx.textAlign = 'left';
	ctx.textBaseline = 'alphabetic';
	const box = ctx.measureText(text);
	let left = -box.actualBoundingBoxLeft;
	let right = box.actualBoundingBoxRight;
	if (text.startsWith(' ')) left = Math.min(left, 0);
	if (text.endsWith(' ')) right = Math.max(right, box.width);
	const originX = x - Math.round((left + right) / 2);
	const originY =
		style.valign === 'top'
			? y + Math.round(box.actualBoundingBoxAscent)
			: y + Math.round((box.actualBoundingBoxAscent - box.actualBoundingBoxDescent) / 2);
	ctx.fillStyle = style.color;
	ctx.fillText(text, originX, originY);
}

/** Intervention `encode('jpg')` (quality 90), as a progressive JPEG. */
export async function encodeJpeg(canvas: Canvas, quality = 90): Promise<Uint8Array> {
	const { width, height } = canvas;
	const pixels = canvas.getContext('2d').getImageData(0, 0, width, height);
	const jpeg = await sharp(Buffer.from(pixels.data.buffer), { raw: { width, height, channels: 4 } })
		.flatten({ background: '#ffffff' })
		.jpeg({ quality, progressive: true, mozjpeg: true })
		.toBuffer();
	return new Uint8Array(jpeg);
}
