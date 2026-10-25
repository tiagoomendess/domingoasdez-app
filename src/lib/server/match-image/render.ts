import { loadImage } from '@napi-rs/canvas';
import {
	blur,
	decodeImage,
	drawCentered,
	drawCenteredText,
	encodeJpeg,
	FONTS,
	heightForWidth,
	newCanvas
} from './draw.ts';

/**
 * Ports the legacy `MatchImageGeneratorService`: the square (900×900) and story (1080×1920)
 * images a signed-in user downloads from a game page. Promotes the game (date and playground) or,
 * once finished, shows the final score. Positions are the legacy ones, with its `(int)`
 * truncation; the story is the same render as the admin's `renderMatchStory`.
 */

export type MatchImageFormat = 'square' | 'story';

export const SIZES = {
	square: { width: 900, height: 900 },
	story: { width: 1080, height: 1920 }
} as const;

export type MatchImageInput = {
	format: MatchImageFormat;
	background: Uint8Array;
	/** `watermark.png` (square) or `story_watermark.png` (story). */
	watermark: Uint8Array;
	homeEmblem: Uint8Array;
	awayEmblem: Uint8Array;
	/** The season's (or competition's) logo; none is drawn without one (legacy crashed). */
	competitionLogo: Uint8Array | null;
	competition: string;
	homeClub: string;
	awayClub: string;
	/** Shown under the date; empty without a playground. */
	playground: string;
	/** `25 DE OUTUBRO | 10H00` (`matchDateLine`). */
	dateLine: string;
	/** Finished games show the final score instead of the date and the playground. */
	result: { home: number; away: number; penalties: { home: number; away: number } | null } | null;
};

/** The legacy per-format numbers (`$type === 'story' ? … : …`). */
const LAYOUT = {
	square: {
		competitionY: 1 / 5,
		competitionSize: 55,
		logoWidth: 1 / 10,
		logoY: 1 / 9,
		namesY: 1 / 4,
		namesSize: 30,
		infoY: 3 / 4,
		finalLabelSize: 30,
		scoreSize: 110,
		scoreOffset: 12,
		penaltiesSize: 30,
		penaltiesOffset: 120,
		dateSize: 40,
		playgroundSize: 30,
		playgroundOffset: 46
	},
	story: {
		competitionY: 1 / 3.5,
		competitionSize: 70,
		logoWidth: 1 / 5,
		logoY: 1 / 5.5,
		namesY: 1 / 3.1,
		namesSize: 40,
		infoY: 3.5 / 5,
		finalLabelSize: 55,
		scoreSize: 210,
		scoreOffset: 40,
		penaltiesSize: 60,
		penaltiesOffset: 230,
		dateSize: 70,
		playgroundSize: 50,
		playgroundOffset: 70
	}
} as const;

/** Legacy `translateMonth()`. */
const MONTHS = [
	'Janeiro',
	'Fevereiro',
	'Março',
	'Abril',
	'Maio',
	'Junho',
	'Julho',
	'Agosto',
	'Setembro',
	'Outubro',
	'Novembro',
	'Dezembro'
];

const lisbonParts = new Intl.DateTimeFormat('en-GB', {
	timeZone: 'Europe/Lisbon',
	day: '2-digit',
	month: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23'
});

/** `25 DE OUTUBRO | 10H00` in Lisbon time (legacy `d`, month name, `H\Hi`). */
export function matchDateLine(kickOff: Date): string {
	const parts = Object.fromEntries(
		lisbonParts.formatToParts(kickOff).map((p) => [p.type, p.value])
	);
	const month = MONTHS[Number(parts.month) - 1].toUpperCase();
	return `${parts.day} DE ${month} | ${parts.hour}H${parts.minute}`;
}

export async function renderMatchImage(input: MatchImageInput): Promise<Uint8Array> {
	const { width: W, height: H } = SIZES[input.format];
	const L = LAYOUT[input.format];
	const { canvas, ctx } = newCanvas(W, H);

	const background = await decodeImage(input.background);
	if (input.format === 'story') {
		// resize(null, 1920, aspectRatio) then insert centred: fills the height, cropped sideways.
		const backgroundWidth = Math.round((H * background.width) / background.height);
		ctx.drawImage(background, Math.round((W - backgroundWidth) / 2), 0, backgroundWidth, H);
	} else {
		drawCentered(ctx, background, W, H);
	}
	await blur(canvas, Math.round(W / 100));
	// insert($watermark) with no position: top-left (both watermarks are canvas-sized).
	ctx.drawImage(await loadImage(Buffer.from(input.watermark)), 0, 0);

	// Competition name, with its shadow 2 px down and right.
	const competition = input.competition.toUpperCase();
	const titleY = Math.trunc(H * L.competitionY);
	const title = { font: FONTS.black, size: L.competitionSize };
	drawCenteredText(ctx, competition, W / 2 + 2, titleY + 2, { ...title, color: '#484848' });
	drawCenteredText(ctx, competition, W / 2, titleY, { ...title, color: '#ffffff' });

	if (input.competitionLogo) {
		const logo = await decodeImage(input.competitionLogo);
		const logoWidth = Math.trunc(W * L.logoWidth);
		const logoHeight = heightForWidth(logo, logoWidth);
		ctx.drawImage(
			logo,
			Math.trunc(W / 2 - logoWidth / 2),
			Math.trunc(H * L.logoY - logoHeight / 2),
			logoWidth,
			logoHeight
		);
	}

	const emblemWidth = Math.trunc(W / 2.5);
	const [home, away] = await Promise.all([
		decodeImage(input.homeEmblem),
		decodeImage(input.awayEmblem)
	]);
	const homeHeight = heightForWidth(home, emblemWidth);
	const awayHeight = heightForWidth(away, emblemWidth);
	ctx.drawImage(
		home,
		Math.trunc(W / 4 + 30 - emblemWidth / 2),
		Math.trunc(H / 2 - homeHeight / 2),
		emblemWidth,
		homeHeight
	);
	ctx.drawImage(
		away,
		Math.trunc((W / 4) * 3 - 30 - emblemWidth / 2),
		Math.trunc(H / 2 - awayHeight / 2),
		emblemWidth,
		awayHeight
	);

	const names = `${input.homeClub.toUpperCase()} vs ${input.awayClub.toUpperCase()}`;
	const namesY = Math.trunc(H * L.namesY);
	const caption = { font: FONTS.regular, size: L.namesSize };
	drawCenteredText(ctx, names, W / 2 + 2, namesY + 12, { ...caption, color: '#282828' });
	drawCenteredText(ctx, names, W / 2, namesY + 10, { ...caption, color: '#ffffff' });

	const infoY = Math.trunc(H * L.infoY);
	if (input.result) {
		const top = { valign: 'top' } as const;
		const label = { font: FONTS.regular, size: L.finalLabelSize, ...top };
		drawCenteredText(ctx, 'RESULTADO FINAL', W / 2 + 2, infoY - 29, { ...label, color: '#282828' });
		drawCenteredText(ctx, 'RESULTADO FINAL', W / 2, infoY - 30, { ...label, color: '#ffffff' });

		const score = `${input.result.home} - ${input.result.away}`;
		const big = { font: FONTS.black, size: L.scoreSize, ...top };
		const scoreY = infoY + L.scoreOffset;
		drawCenteredText(ctx, score, W / 2 + 2, scoreY + 2, { ...big, color: '#484848' });
		drawCenteredText(ctx, score, W / 2, scoreY, { ...big, color: '#ffffff' });

		if (input.result.penalties) {
			const penalties = `(${input.result.penalties.home}-${input.result.penalties.away} g.p)`;
			const small = { font: FONTS.black, size: L.penaltiesSize, ...top };
			const penaltiesY = infoY + L.penaltiesOffset;
			drawCenteredText(ctx, penalties, W / 2 + 1, penaltiesY + 2, { ...small, color: '#282828' });
			drawCenteredText(ctx, penalties, W / 2, penaltiesY, { ...small, color: '#ffffff' });
		}
	} else {
		const dateStyle = { font: FONTS.black, size: L.dateSize };
		drawCenteredText(ctx, input.dateLine, W / 2 + 1, infoY + 1, { ...dateStyle, color: '#484848' });
		drawCenteredText(ctx, input.dateLine, W / 2, infoY, { ...dateStyle, color: '#ffffff' });

		const playground = input.playground.toUpperCase();
		const placeStyle = { font: FONTS.regular, size: L.playgroundSize };
		// Legacy drew the shadow 1 px above the text here.
		drawCenteredText(ctx, playground, W / 2 + 1, infoY + L.playgroundOffset, {
			...placeStyle,
			color: '#484848'
		});
		drawCenteredText(ctx, playground, W / 2, infoY + L.playgroundOffset + 1, {
			...placeStyle,
			color: '#ffffff'
		});
	}

	return encodeJpeg(canvas, 90);
}
