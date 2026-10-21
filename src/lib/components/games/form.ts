import type { FormResult } from '#lib/games.ts';
import { m } from '#lib/messages.ts';

/** The one-letter chip label (V / E / D in Portuguese). */
export function formLabel(result: FormResult): string {
	switch (result) {
		case 'V':
			return m.game_form_win();
		case 'E':
			return m.game_form_draw();
		case 'D':
			return m.game_form_loss();
	}
}

/** "{team} venceu / empatou / perdeu", for the preview sheet and the chip's accessible name. */
export function formSentence(result: FormResult, team: string): string {
	switch (result) {
		case 'V':
			return m.game_form_result_win({ team });
		case 'E':
			return m.game_form_result_draw({ team });
		case 'D':
			return m.game_form_result_loss({ team });
	}
}

export function formClasses(result: FormResult): string {
	switch (result) {
		case 'V':
			return 'bg-success/14 text-success';
		case 'E':
			return 'bg-fill text-ink-secondary';
		case 'D':
			return 'bg-danger/12 text-danger';
	}
}
