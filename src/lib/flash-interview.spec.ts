import { describe, expect, it } from 'vitest';
import {
	FLASH_PIN_COOKIE_MAX_AGE,
	flashPinCookieName,
	isCorrectPin,
	isFlashInterviewOpen,
	isValidContactEmail,
	parseGoalPick,
	parseMinute,
	parseNotificationsEnabled,
	sanitizeComment,
	scorerPicksAllowed,
	validateComment
} from './flash-interview.ts';

describe('flashPinCookieName', () => {
	it('scopes the cookie to the uuid', () => {
		expect(flashPinCookieName('abc-123')).toBe('flash_pin_abc-123');
		expect(FLASH_PIN_COOKIE_MAX_AGE).toBeGreaterThan(0);
	});
});

describe('isCorrectPin', () => {
	it('compares strictly after trimming', () => {
		expect(isCorrectPin('1234', '1234')).toBe(true);
		expect(isCorrectPin(' 1234 ', '1234')).toBe(true);
		expect(isCorrectPin('1235', '1234')).toBe(false);
		expect(isCorrectPin('', '1234')).toBe(false);
		expect(isCorrectPin(null, '1234')).toBe(false);
	});
});

describe('sanitizeComment / validateComment', () => {
	it('strips tags and truncates at 1000 chars', () => {
		expect(sanitizeComment('<b>Olá</b> <script>x</script>mundo')).toBe('Olá xmundo');
		expect(sanitizeComment('x'.repeat(1200)).length).toBe(1000);
		expect(sanitizeComment(null)).toBe('');
	});

	it('accepts nullable comments up to 1000 chars', () => {
		expect(validateComment(null)).toEqual({ ok: true });
		expect(validateComment('')).toEqual({ ok: true });
		expect(validateComment('ok')).toEqual({ ok: true });
		expect(validateComment('x'.repeat(1001))).toEqual({ ok: false });
	});
});

describe('parseGoalPick / parseMinute', () => {
	it('maps select values to player, own goal or missing', () => {
		expect(parseGoalPick('7')).toEqual({ kind: 'player', playerId: 7 });
		expect(parseGoalPick(12)).toEqual({ kind: 'player', playerId: 12 });
		expect(parseGoalPick('-1')).toEqual({ kind: 'own_goal' });
		expect(parseGoalPick('0')).toEqual({ kind: 'missing' });
		expect(parseGoalPick('')).toEqual({ kind: 'missing' });
		expect(parseGoalPick('abc')).toEqual({ kind: 'missing' });
	});

	it('keeps positive integer minutes only', () => {
		expect(parseMinute('67')).toBe(67);
		expect(parseMinute('0')).toBeNull();
		expect(parseMinute('-3')).toBeNull();
		expect(parseMinute('')).toBeNull();
		expect(parseMinute('12.5')).toBe(12);
	});
});

describe('isValidContactEmail', () => {
	it('enforces format and 10–64 length', () => {
		expect(isValidContactEmail('contacto@clube.pt')).toBe(true);
		expect(isValidContactEmail('a@b.cd')).toBe(false);
		expect(isValidContactEmail('not-an-email-address')).toBe(false);
		expect(isValidContactEmail('x'.repeat(60) + '@a.pt')).toBe(false);
		expect(isValidContactEmail('')).toBe(false);
	});
});

describe('parseNotificationsEnabled', () => {
	it('mirrors filled() checkbox semantics', () => {
		expect(parseNotificationsEnabled('true')).toBe(true);
		expect(parseNotificationsEnabled('on')).toBe(true);
		expect(parseNotificationsEnabled(null)).toBe(false);
		expect(parseNotificationsEnabled(undefined)).toBe(false);
		expect(parseNotificationsEnabled('false')).toBe(false);
		expect(parseNotificationsEnabled('0')).toBe(false);
	});
});

describe('isFlashInterviewOpen', () => {
	const deadline = '2026-09-19T22:59:59.000Z';

	it('is open until the deadline', () => {
		expect(isFlashInterviewOpen(deadline, new Date('2026-09-19T22:59:58.000Z'))).toBe(true);
	});

	it('closes at the deadline and stays closed', () => {
		expect(isFlashInterviewOpen(deadline, new Date('2026-09-19T22:59:59.000Z'))).toBe(false);
		expect(isFlashInterviewOpen(deadline, new Date('2027-01-01T00:00:00.000Z'))).toBe(false);
	});

	it('treats a missing or unreadable deadline as closed', () => {
		expect(isFlashInterviewOpen(null)).toBe(false);
		expect(isFlashInterviewOpen('not a date')).toBe(false);
	});
});

describe('scorerPicksAllowed', () => {
	const squad = new Set([10, 11, 12]);

	it('accepts squad players, own goal and missing player', () => {
		expect(scorerPicksAllowed(['10', '-1', '0', '12'], 4, squad)).toBe(true);
	});

	it('rejects a player from outside the squad', () => {
		expect(scorerPicksAllowed(['10', '999'], 2, squad)).toBe(false);
	});

	it('only checks the goals that get saved', () => {
		expect(scorerPicksAllowed(['10', '999'], 1, squad)).toBe(true);
	});

	it('treats junk as a missing player, like the save does', () => {
		expect(scorerPicksAllowed(['abc', '', undefined], 3, squad)).toBe(true);
	});
});
