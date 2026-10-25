import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { beforeAll, describe, expect, it } from 'vitest';
import { registerFonts } from './draw.ts';
import { backgroundPath, matchImageFileName, placeholderPath } from './paths.ts';
import { matchDateLine, renderMatchImage, SIZES, type MatchImageInput } from './render.ts';

const solid = (width: number, height: number, color: string) =>
	sharp({ create: { width, height, channels: 4, background: color } })
		.png()
		.toBuffer()
		.then((b) => new Uint8Array(b));

describe('paths', () => {
	it('picks placeholders by the last digit of the id', () => {
		expect(placeholderPath('1_1', 8726)).toBe('/images/1_1_placeholder_6.jpg');
		expect(placeholderPath('16_9', 40)).toBe('/images/16_9_placeholder_0.jpg');
	});

	it('uses the playground picture, else its placeholder, else the game placeholder', () => {
		const pg = { id: 12, picture: '/storage/media/images/campo.jpg' };
		expect(backgroundPath('square', { id: 5 }, pg)).toBe('/storage/media/images/campo.jpg');
		expect(backgroundPath('square', { id: 5 }, { id: 12, picture: null })).toBe(
			'/images/1_1_placeholder_2.jpg'
		);
		expect(backgroundPath('story', { id: 5 }, { id: 12, picture: null })).toBe(
			'/images/16_9_placeholder_2.jpg'
		);
		expect(backgroundPath('story', { id: 5 }, null)).toBe('/images/16_9_placeholder_5.jpg');
	});

	it('names the download like the legacy site', () => {
		expect(matchImageFileName('S. Martinho', 'Águias de Alvelos', 'square')).toBe(
			's-martinho-vs-aguias-de-alvelos-square.jpg'
		);
	});
});

describe('matchDateLine', () => {
	it('prints the Lisbon date and time, on both sides of the clock change', () => {
		expect(matchDateLine(new Date('2026-10-24T14:00:00Z'))).toBe('24 DE OUTUBRO | 15H00');
		expect(matchDateLine(new Date('2026-11-01T10:00:00Z'))).toBe('01 DE NOVEMBRO | 10H00');
	});
});

describe('renderMatchImage', () => {
	let base: Omit<MatchImageInput, 'format' | 'watermark' | 'background'>;

	beforeAll(async () => {
		registerFonts({
			regular: await readFile(new URL('./fonts/Roboto-Regular.ttf', import.meta.url)),
			black: await readFile(new URL('./fonts/Roboto-Black.ttf', import.meta.url))
		});
		base = {
			homeEmblem: await solid(200, 240, '#c00000'),
			awayEmblem: await solid(200, 200, '#0000c0'),
			competitionLogo: await solid(120, 120, '#00a000'),
			competition: 'Divisão de Honra',
			homeClub: 'Carapeços',
			awayClub: 'GDR Campo',
			playground: 'Campo de Carapeços',
			dateLine: '01 DE NOVEMBRO | 10H00',
			result: null
		};
	});

	it.each(['square', 'story'] as const)('draws a %s JPEG at the legacy size', async (format) => {
		const { width, height } = SIZES[format];
		const jpeg = await renderMatchImage({
			...base,
			format,
			background: await solid(1920, 1080, '#336699'),
			watermark: await solid(width, height, '#00000000')
		});
		const meta = await sharp(jpeg).metadata();
		expect([meta.format, meta.width, meta.height]).toEqual(['jpeg', width, height]);
	});

	it('draws a finished game with its score and penalties, and without a logo', async () => {
		const jpeg = await renderMatchImage({
			...base,
			format: 'square',
			competitionLogo: null,
			background: await solid(1000, 1000, '#663399'),
			watermark: await solid(900, 900, '#00000000'),
			result: { home: 2, away: 2, penalties: { home: 4, away: 5 } }
		});
		expect((await sharp(jpeg).metadata()).width).toBe(900);
	});
});
