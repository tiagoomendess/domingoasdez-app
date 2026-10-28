import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScorePushResult } from '#lib/server/placard/score-push.ts';

vi.mock('#lib/server/db/index.ts', () => ({ db: {} }));
const push = vi.fn<() => Promise<ScorePushResult>>();
vi.mock('#lib/server/placard/score-push.ts', () => ({ pushPlacardScore: push }));

const { scoreboardUpdated } = await import('./score-reports.ts');

const game = { id: 7, date: '2026-10-25 15:00:00' } as unknown as Parameters<
	typeof scoreboardUpdated
>[0]['game'];
const call = (body: Record<string, unknown>) =>
	scoreboardUpdated({ game, all: body, json: body, now: new Date('2026-10-25T15:30:00Z') });

describe('scoreboardUpdated (legacy contract on top of pushPlacardScore)', () => {
	beforeEach(() => push.mockReset());

	it('rejects invalid data before pushing', async () => {
		const response = await call({ home_score: 100, away_score: 0 });
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ success: false, message: 'Dados inválidos!' });
		expect(push).not.toHaveBeenCalled();
	});

	it('passes the score and uuid on', async () => {
		push.mockResolvedValue('updated');
		const response = await call({ home_score: 2, away_score: '1', uuid: 'abc' });
		expect(push).toHaveBeenCalledWith(
			expect.objectContaining({ homeScore: 2, awayScore: 1, uuid: 'abc' })
		);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			success: true,
			message: 'Resultado atualizado com sucesso!'
		});
	});

	it('maps every result to the legacy response', async () => {
		push.mockResolvedValue('not_live');
		let response = await call({ home_score: 1, away_score: 0 });
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			success: false,
			message: 'O jogo ainda não começou ou já terminou!'
		});

		push.mockResolvedValue('not_allowed');
		response = await call({ home_score: 1, away_score: 0 });
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			success: false,
			message: 'Este jogo não aceita atualizações de resultado via placard!'
		});

		push.mockResolvedValue('unchanged');
		response = await call({ home_score: 1, away_score: 0 });
		expect(response.status).toBe(304);
	});
});
