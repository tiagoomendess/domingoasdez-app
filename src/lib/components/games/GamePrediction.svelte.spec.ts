import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import GamePrediction from './GamePrediction.svelte';
import type { GameKind } from '#lib/predictions.ts';

const home = { name: 'Águias da Graça', emblem: null };
const away = { name: 'Necessidades', emblem: null };

function open(kind: GameKind) {
	return {
		kind,
		open: true,
		early: false,
		opensAt: '2030-10-17T19:00:00.000Z',
		mine: null,
		summary: null,
		actual: null,
		verdict: null
	};
}

describe('GamePrediction.svelte', () => {
	it('asks who goes through on penalties for a level knockout pick', async () => {
		render(GamePrediction, {
			prediction: open('knockout'),
			home,
			away,
			user: { name: 'Ana' },
			returnTo: '/jogo'
		});

		const save = page.getByRole('button', { name: 'Guardar previsão' });
		await expect.element(page.getByText('Quem passa nos penáltis?')).toBeInTheDocument();
		await expect.element(save).toBeDisabled();

		await page.getByRole('button', { name: 'Necessidades', exact: true }).click();
		await expect.element(page.getByText('Necessidades passa nos penáltis')).toBeInTheDocument();
		await expect.element(save).toBeEnabled();

		await page.getByRole('button', { name: 'Mais um golo para Águias da Graça' }).click();
		await expect.element(page.getByText('Quem passa nos penáltis?')).not.toBeInTheDocument();
		await expect.element(page.getByText('Águias da Graça vence')).toBeInTheDocument();
	});

	it('allows a draw in a points game, with no penalties question', async () => {
		render(GamePrediction, {
			prediction: open('points'),
			home,
			away,
			user: { name: 'Ana' },
			returnTo: '/jogo'
		});

		await expect.element(page.getByText('Empate')).toBeInTheDocument();
		await expect.element(page.getByText('Quem passa nos penáltis?')).not.toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Guardar previsão' })).toBeEnabled();
	});

	it('shows the verdict and the split once the game is over', async () => {
		render(GamePrediction, {
			prediction: {
				kind: 'knockout' as const,
				open: false,
				early: false,
				opensAt: '2020-10-17T19:00:00.000Z',
				mine: { home: 1, away: 1, penaltyWinner: 'home' as const },
				summary: {
					total: 4,
					outcomes: { home: 3, draw: null, away: 1 },
					topScores: [{ home: 1, away: 1, count: 2 }]
				},
				actual: 'home' as const,
				verdict: { winner: 'right' as const, exact: false }
			},
			home,
			away,
			user: { name: 'Ana' },
			returnTo: '/jogo'
		});

		await expect.element(page.getByText('Previsões fechadas')).toBeInTheDocument();
		await expect.element(page.getByText('Acertaste no vencedor')).toBeInTheDocument();
		await expect.element(page.getByText('75%').first()).toBeInTheDocument();
		await expect.element(page.getByText('Empate')).not.toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Alterar' })).not.toBeInTheDocument();
	});

	it('says when predictions open while the game is still too far away', async () => {
		render(GamePrediction, {
			prediction: { ...open('points'), open: false, early: true },
			home,
			away,
			user: { name: 'Ana' },
			returnTo: '/jogo'
		});

		await expect.element(page.getByText(/Previsões abrem a/)).toBeInTheDocument();
		await expect.element(page.getByText(/7 dias antes do jogo/)).toBeInTheDocument();
		await expect
			.element(page.getByRole('button', { name: 'Guardar previsão' }))
			.not.toBeInTheDocument();
		await expect.element(page.getByText('Previsões fechadas')).not.toBeInTheDocument();
	});
});
