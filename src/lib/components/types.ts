import type { Component } from 'svelte';
import type { IconComponentProps } from 'phosphor-svelte';

export type Icon = Component<IconComponentProps>;

export type MatchStatus = 'scheduled' | 'warmup' | 'live' | 'finished' | 'postponed';

export type Team = {
	name: string;
	emblem?: string | null;
};

export type Match = {
	id: number;
	href: string;
	status: MatchStatus;
	kickoff: string;
	home: Team;
	away: Team;
	homeScore?: number | null;
	awayScore?: number | null;
	penalties?: { home: number; away: number } | null;
};

/** `pending`: the user voted but results are hidden until a set date (legacy rule). */
export type PollState = 'open' | 'pending' | 'results';

export type PollAnswer = {
	id: number;
	label: string;
	votes?: number;
};
