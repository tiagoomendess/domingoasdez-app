import type { Component } from 'svelte';
import type { IconComponentProps } from 'phosphor-svelte';
import type { FormResult } from '#lib/games.ts';

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

/** A recent-form chip on the game page: one of a team's last games before this one. */
export type FormChip = {
	result: FormResult;
	/** The game behind the chip, for the preview sheet (its `href` is the game page). */
	match: Match;
	/** Which side the team the chip belongs to played on. */
	side: 'home' | 'away';
	competitionName: string;
	groupName: string;
	round: number;
};

/** `pending`: the user voted but results are hidden until a set date (legacy rule). */
export type PollState = 'open' | 'pending' | 'results';

export type PollAnswer = {
	id: number;
	label: string;
	votes?: number;
};
