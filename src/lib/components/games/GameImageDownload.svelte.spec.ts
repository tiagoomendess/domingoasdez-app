import { page } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import GameImageDownload from './GameImageDownload.svelte';

describe('GameImageDownload.svelte', () => {
	afterEach(() => vi.restoreAllMocks());

	it('downloads the chosen format with the server file name', async () => {
		const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(new Blob(['jpeg'], { type: 'image/jpeg' }), {
				headers: { 'content-disposition': 'attachment; filename=silveiros-vs-cristelo-story.jpg' }
			})
		);
		const downloads: string[] = [];
		vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
			this: HTMLAnchorElement
		) {
			downloads.push(this.download);
		});

		render(GameImageDownload, { gameId: 8726 });
		await page.getByRole('button', { name: /Story/ }).click();

		await expect.poll(() => downloads).toEqual(['silveiros-vs-cristelo-story.jpg']);
		expect(fetchMock).toHaveBeenCalledWith('/api/jogos/8726/imagem?formato=story');
	});

	it('says so when the image could not be generated', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 500 }));

		render(GameImageDownload, { gameId: 8726 });
		await page.getByRole('button', { name: /Quadrada/ }).click();

		await expect
			.element(page.getByText('Não foi possível gerar a imagem. Tenta outra vez.'))
			.toBeInTheDocument();
	});
});
