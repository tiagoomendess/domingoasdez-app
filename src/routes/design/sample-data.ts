import type { Match, PollAnswer, PollState } from '#lib/components/types.ts';
import { addDays } from '#lib/format.ts';

const svg = (markup: string) => `data:image/svg+xml,${encodeURIComponent(markup)}`;

const SHIELD = 'M32 4 9 11v19c0 14 9.5 25 23 30 13.5-5 23-16 23-30V11Z';

export function crest(primary: string, secondary: string) {
	return svg(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="${SHIELD}" fill="${primary}"/><path d="M32 4v56c13.5-5 23-16 23-30V11Z" fill="${secondary}"/><path d="${SHIELD}" fill="none" stroke="rgba(0,0,0,.2)" stroke-width="2"/></svg>`
	);
}

export function competitionBadge(color: string, label: string) {
	return svg(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${color}"/><text x="32" y="41" text-anchor="middle" font-family="system-ui,Arial,sans-serif" font-size="24" font-weight="700" fill="#fff">${label}</text></svg>`
	);
}

export function pitchPhoto(variant: 'day' | 'night' = 'day') {
	const [a, b] = variant === 'day' ? ['#3b814f', '#46905b'] : ['#1f4d33', '#255a3c'];
	const stripes = Array.from(
		{ length: 8 },
		(_, i) => `<rect x="${i * 40}" width="40" height="180" fill="${i % 2 ? a : b}"/>`
	).join('');
	return svg(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><defs><linearGradient id="s" x2="0" y2="1"><stop offset="0" stop-opacity="0"/><stop offset="1" stop-opacity=".35"/></linearGradient></defs>${stripes}<g fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="2"><rect x="12" y="12" width="296" height="156"/><path d="M160 12v156"/><circle cx="160" cy="90" r="28"/><rect x="12" y="52" width="40" height="76"/><rect x="268" y="52" width="40" height="76"/></g><rect width="320" height="180" fill="url(#s)"/></svg>`
	);
}

export const clubs = {
	montalegre: { name: 'Grupo Desportivo de Montalegre', emblem: crest('#1d4ed8', '#ffffff') },
	ribeira: { name: 'Clube Atlético da Ribeira', emblem: crest('#b91c1c', '#111827') },
	serrana: { name: 'União Desportiva Serrana', emblem: crest('#15803d', '#facc15') },
	castelo: { name: 'Futebol Clube do Castelo', emblem: crest('#0f172a', '#e5e7eb') },
	santaMarta: { name: 'Associação Recreativa de Santa Marta', emblem: crest('#7c3aed', '#fde68a') },
	vilaNova: { name: 'Sport Clube Vila Nova', emblem: crest('#ea580c', '#1e3a8a') },
	pontes: { name: 'Clube de Futebol das Pontes', emblem: null },
	lameiras: { name: 'Lameiras FC', emblem: crest('#0891b2', '#ffffff') }
};

export const competitions = [
	{
		id: 1,
		name: 'Campeonato Distrital 1.ª Divisão',
		season: 'Época 2026/27',
		emblem: competitionBadge('#107db7', '1D')
	},
	{
		id: 2,
		name: 'Taça Distrital',
		season: 'Época 2026/27',
		emblem: competitionBadge('#be935e', 'TD')
	},
	{
		id: 3,
		name: 'Campeonato Distrital 2.ª Divisão',
		season: 'Época 2026/27',
		emblem: competitionBadge('#0a5a82', '2D')
	},
	{
		id: 4,
		name: 'Distrital de Juniores',
		season: 'Época 2026/27',
		emblem: competitionBadge('#3b814f', 'JU')
	}
];

const at = (day: string, utcTime: string) => `${day}T${utcTime}:00Z`;

export function sampleLiveMatches(today: string): Match[] {
	return [
		{
			id: 1,
			href: '#jogos',
			status: 'live',
			kickoff: at(today, '14:00'),
			home: clubs.montalegre,
			away: clubs.ribeira,
			homeScore: 2,
			awayScore: 1
		},
		{
			id: 2,
			href: '#jogos',
			status: 'warmup',
			kickoff: at(today, '15:30'),
			home: clubs.serrana,
			away: clubs.castelo
		}
	];
}

export function sampleDayGroups(today: string) {
	return [
		{
			competition: competitions[0],
			subtitle: 'Época 2026/27 · Jornada 5',
			matches: [
				{
					id: 3,
					href: '#jogos',
					status: 'finished',
					kickoff: at(today, '10:00'),
					home: clubs.pontes,
					away: clubs.lameiras,
					homeScore: 0,
					awayScore: 3
				},
				{
					id: 4,
					href: '#jogos',
					status: 'scheduled',
					kickoff: at(today, '17:00'),
					home: clubs.santaMarta,
					away: clubs.vilaNova
				}
			] satisfies Match[]
		},
		{
			competition: competitions[1],
			subtitle: 'Época 2026/27 · 2.ª eliminatória',
			matches: [
				{
					id: 5,
					href: '#jogos',
					status: 'finished',
					kickoff: at(today, '09:00'),
					home: clubs.castelo,
					away: clubs.lameiras,
					homeScore: 2,
					awayScore: 2,
					penalties: { home: 4, away: 3 }
				},
				{
					id: 6,
					href: '#jogos',
					status: 'postponed',
					kickoff: at(today, '15:00'),
					home: clubs.vilaNova,
					away: clubs.serrana
				}
			] satisfies Match[]
		}
	];
}

export function sampleDays(today: string) {
	return Array.from({ length: 15 }, (_, i) => addDays(today, i - 7));
}

export function sampleMarkers(today: string): Record<string, 'games' | 'live'> {
	return {
		[addDays(today, -6)]: 'games',
		[addDays(today, -1)]: 'games',
		[today]: 'live',
		[addDays(today, 1)]: 'games',
		[addDays(today, 7)]: 'games'
	};
}

type FeedArticle = {
	type: 'article';
	id: number;
	date: string;
	title: string;
	excerpt: string;
	image: string;
	meta: string;
};

type FeedPoll = {
	type: 'poll';
	id: number;
	date: string;
	question: string;
	state: PollState;
	closed: boolean;
	endsAt?: string;
	resultsAt?: string;
	answers: PollAnswer[];
};

export type FeedItem = FeedArticle | FeedPoll;

export function sampleFeed(now: number): FeedItem[] {
	const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();
	const inHours = (h: number) => new Date(now + h * 3_600_000).toISOString();

	const items: FeedItem[] = [
		{
			type: 'article',
			id: 1,
			date: hoursAgo(2),
			title: 'Montalegre vence em casa e isola-se na liderança do Distrital',
			excerpt:
				'Dois golos na segunda parte deram a volta ao resultado num jogo intenso perante bancadas cheias.',
			image: pitchPhoto('day'),
			meta: '1.ª Divisão'
		},
		{
			type: 'poll',
			id: 2,
			date: hoursAgo(5),
			question: 'Quem foi o melhor em campo na jornada 4?',
			state: 'open',
			closed: false,
			endsAt: inHours(40),
			answers: [
				{ id: 1, label: 'Rui Fernandes (Montalegre)' },
				{ id: 2, label: 'Tiago Moura (Ribeira)' },
				{ id: 3, label: 'André Pires (Serrana)' },
				{ id: 4, label: 'Hugo Lopes (Castelo)' }
			]
		},
		{
			type: 'article',
			id: 3,
			date: hoursAgo(26),
			title: 'Sorteio da Taça Distrital ditou dérbi logo na segunda eliminatória',
			excerpt:
				'Castelo e Lameiras voltam a encontrar-se, numa repetição da final da época passada.',
			image: pitchPhoto('night'),
			meta: 'Taça Distrital'
		},
		{
			type: 'poll',
			id: 4,
			date: hoursAgo(30),
			question: 'Qual o golo mais bonito do mês de setembro?',
			state: 'pending',
			closed: false,
			endsAt: inHours(12),
			resultsAt: inHours(12),
			answers: [
				{ id: 1, label: 'Livre direto de Vila Nova' },
				{ id: 2, label: 'Pontapé de bicicleta em Lameiras' }
			]
		},
		{
			type: 'poll',
			id: 5,
			date: hoursAgo(80),
			question: 'Que equipa vai ser campeã distrital esta época?',
			state: 'results',
			closed: true,
			answers: [
				{ id: 1, label: 'GD Montalegre', votes: 412 },
				{ id: 2, label: 'CA Ribeira', votes: 268 },
				{ id: 3, label: 'UD Serrana', votes: 131 },
				{ id: 4, label: 'FC Castelo', votes: 77 }
			]
		}
	];

	return items.sort((a, b) => b.date.localeCompare(a.date));
}
