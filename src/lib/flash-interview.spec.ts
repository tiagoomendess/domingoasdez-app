import { describe, expect, it } from 'vitest';
import {
	FLASH_PIN_COOKIE_MAX_AGE,
	flashPinCookieName,
	isCorrectPin,
	isValidContactEmail,
	parseGoalPick,
	parseMinute,
	parseNotificationsEnabled,
	sanitizeComment,
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
