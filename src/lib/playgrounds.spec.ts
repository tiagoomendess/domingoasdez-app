import { describe, expect, it } from 'vitest';
import { directionsLinks, osmEmbedUrl, resultCounts, seasonBreaks } from './playgrounds.ts';

describe('resultCounts', () => {
	it('splits finished games by side', () => {
		const counts = resultCounts([
			{ homeScore: 2, awayScore: 1 },
			{ homeScore: 0, awayScore: 0 },
			{ homeScore: 1, awayScore: 3 },
			{ homeScore: 4, awayScore: 0 }
		]);
		expect(counts).toEqual({
			homeWins: 2,
			draws: 1,
			awayWins: 1,
			total: 4,
			homeWinPercent: 50,
			drawPercent: 25,
			awayWinPercent: 25
		});
	});

	it('has zero percentages without games', () => {
		expect(resultCounts([])).toMatchObject({ total: 0, homeWinPercent: 0, drawPercent: 0 });
	});
});

describe('seasonBreaks', () => {
	it('marks the first game of each season, across appended pages', () => {
		const firstPage = ['2025/26', '2025/26', '2024/25'];
		const appended = ['2024/25', '2024/25', '2023/24'];
		const items = [...firstPage, ...appended].map((season) => ({ season }));
		expect([...seasonBreaks(items)]).toEqual([0, 2, 5]);
	});
});

describe('map links', () => {
	const point = { lat: 41.581648, lon: -8.629125 };

	it('builds the directions links', () => {
		expect(directionsLinks(point)).toEqual({
			googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=41.581648,-8.629125',
			wazeUrl: 'https://www.waze.com/ul?ll=41.581648,-8.629125&navigate=yes'
		});
	});

	it('centres the OpenStreetMap embed on the point, with a marker', () => {
		const url = new URL(osmEmbedUrl(point));
		const [minLon, minLat, maxLon, maxLat] = url.searchParams.get('bbox')!.split(',').map(Number);
		expect((minLat + maxLat) / 2).toBeCloseTo(point.lat, 5);
		expect((minLon + maxLon) / 2).toBeCloseTo(point.lon, 5);
		expect(url.searchParams.get('marker')).toBe('41.581648,-8.629125');
	});
});
