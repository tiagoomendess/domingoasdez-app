import { describe, expect, it, vi } from 'vitest';

vi.mock('#lib/server/db/index.ts', () => ({ db: {} }));

const { validate, parseLegacyDate } = await import('./validate.ts');
const { SCORE_REPORT_RULES, SCOREBOARD_RULES } = await import('./score-reports.ts');
const { CREATE_RULES } = await import('./player-update-requests.ts');

const RULE_SETS = { score: SCORE_REPORT_RULES, scoreboard: SCOREBOARD_RULES, create: CREATE_RULES };

/** [rule set, input, errors] produced by Laravel 5.8's Validator with the legacy translations. */
const LARAVEL_CASES: [
	keyof typeof RULE_SETS,
	Record<string, unknown>,
	Record<string, string[]> | null
][] = [
	[
		'score',
		{},
		{
			home_score: ['O campo home score é obrigatório.'],
			away_score: ['O campo away score é obrigatório.'],
			uuid: ['O campo uuid é obrigatório.']
		}
	],
	['score', { home_score: 2, away_score: 1, uuid: 'abc' }, null],
	[
		'score',
		{ home_score: '2', away_score: '33', uuid: null },
		{
			away_score: ['O campo away score não pode ser maior que 32.'],
			uuid: ['O campo uuid é obrigatório.']
		}
	],
	[
		'score',
		{
			home_score: -1,
			away_score: 1.5,
			uuid: 'x',
			finished: 'yes',
			latitude: '41.5',
			longitude: 'abc',
			accuracy: null,
			user_id: '12'
		},
		{
			home_score: ['O campo home score tem de ser no mínimo 0.'],
			away_score: ['The away score must be an integer.'],
			longitude: ['The longitude must be a number.'],
			finished: ['The finished field must be true or false.']
		}
	],
	[
		'score',
		{
			home_score: true,
			away_score: '012',
			uuid: '0123456789012345678901234567890123456789',
			ip_address: 12345,
			finished: '1'
		},
		{
			away_score: ['The away score must be an integer.'],
			ip_address: ['The ip address must be a string.'],
			uuid: ['O campo uuid não pode ser maior do que 36 caracteres.']
		}
	],
	[
		'score',
		{ home_score: 1, away_score: 1, uuid: 5, redirect_to: ['a'], user_id: 1.5 },
		{
			user_id: ['The user id must be an integer.'],
			redirect_to: ['The redirect to must be a string.'],
			uuid: ['The uuid must be a string.']
		}
	],
	[
		'scoreboard',
		{},
		{
			home_score: ['O campo home score é obrigatório.'],
			away_score: ['O campo away score é obrigatório.']
		}
	],
	[
		'scoreboard',
		{ home_score: 100, away_score: 'abc', uuid: null },
		{
			home_score: ['O campo home score não pode ser maior que 99.'],
			away_score: ['The away score must be an integer.']
		}
	],
	['scoreboard', { home_score: 0, away_score: 99, uuid: 'u' }, null],
	[
		'create',
		{},
		{
			name: ['O campo name é obrigatório.'],
			picture_url: ['O campo picture url é obrigatório.'],
			club_name: ['O campo club name é obrigatório.']
		}
	],
	[
		'create',
		{
			name: 'Jo',
			picture_url: 'notaurl',
			club_name: 'AB',
			nickname: 'J',
			phone: '123',
			email: 'bad',
			position: 'keeper',
			obs: 'short',
			source_data: 'x',
			birth_date: 'not a date',
			facebook_profile: 'https://facebook.com/x'
		},
		{
			name: ['O campo name tem de ter pelo menos 3 caracteres.'],
			picture_url: ['The picture url format is invalid.'],
			club_name: ['O campo club name tem de ter pelo menos 3 caracteres.'],
			nickname: ['O campo nickname tem de ter pelo menos 2 caracteres.'],
			phone: ['O campo phone tem de ter pelo menos 6 caracteres.'],
			email: ['The Endereço de Email must be a valid email address.'],
			birth_date: ['O campo birth date não é uma data válida.'],
			position: ['The selected position is invalid.'],
			obs: ['O campo obs tem de ter pelo menos 6 caracteres.'],
			source_data: ['The source data must be an array.']
		}
	],
	[
		'create',
		{
			name: 'João Silva',
			picture_url: 'https://example.com/p.jpg',
			club_name: 'GDR Campo',
			email: 'a@b.pt',
			birth_date: '1999-02-30',
			position: 'striker',
			source_data: { a: 1 }
		},
		{ birth_date: ['O campo birth date não é uma data válida.'] }
	],
	[
		'create',
		{
			name: 'João Silva',
			picture_url: 'http://x',
			club_name: 'GDR Campo',
			birth_date: '2001-05-04',
			phone: '123456789012345',
			email: 'user@localhost',
			team: 'Seniores'
		},
		{
			picture_url: ['The picture url format is invalid.'],
			phone: ['O campo phone não pode ser maior do que 14 caracteres.']
		}
	],
	[
		'create',
		{
			name: 'Ana',
			picture_url: 'ftp://files.example.com/a.png',
			club_name: 'Cab',
			birth_date: '04-05-2001',
			email: 'a.b@c',
			obs: 'Some notes here'
		},
		null
	],
	[
		'create',
		{
			name: 123,
			picture_url: 'https://e.com',
			club_name: 'Clube',
			birth_date: '2001/05/04',
			email: 'x..y@e.com'
		},
		{
			name: ['The name must be a string.'],
			email: ['The Endereço de Email must be a valid email address.']
		}
	]
];

describe('validate', () => {
	it.each(LARAVEL_CASES)('%s rules on %j give Laravel errors', async (set, data, errors) => {
		expect(await validate(data, RULE_SETS[set])).toEqual(errors);
	});

	it('keeps the error order of the rules', async () => {
		const errors = await validate({}, SCORE_REPORT_RULES);
		expect(Object.keys(errors ?? {})).toEqual(['home_score', 'away_score', 'uuid']);
	});
});

describe('parseLegacyDate', () => {
	it('reads the formats strtotime reads', () => {
		expect(parseLegacyDate('2001-05-04')?.toISOString()).toBe('2001-05-04T00:00:00.000Z');
		expect(parseLegacyDate('04-05-2001')?.toISOString()).toBe('2001-05-04T00:00:00.000Z');
		expect(parseLegacyDate('05/04/2001')?.toISOString()).toBe('2001-05-04T00:00:00.000Z');
	});

	it('rejects impossible dates and text', () => {
		expect(parseLegacyDate('1999-02-30')).toBeNull();
		expect(parseLegacyDate('not a date')).toBeNull();
	});
});
