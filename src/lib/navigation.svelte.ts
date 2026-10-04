import HouseIcon from 'phosphor-svelte/lib/HouseIcon';
import SoccerBallIcon from 'phosphor-svelte/lib/SoccerBallIcon';
import TrophyIcon from 'phosphor-svelte/lib/TrophyIcon';
import FilesIcon from 'phosphor-svelte/lib/FilesIcon';
import UserCircleIcon from 'phosphor-svelte/lib/UserCircleIcon';
import type { Tab } from '#lib/components/shell/TabBar.svelte';
import { m } from '#lib/messages.ts';
import type { AuthUser } from '#lib/auth/user.ts';

export type TabId = 'home' | 'games' | 'competitions' | 'pages' | 'account';

/** Built per call so labels pick up the request locale (never cache at module scope). */
export function getTabs(user: AuthUser | null = null): Tab[] {
	return [
		{ id: 'home', href: '/', label: m.nav_home(), icon: HouseIcon },
		{ id: 'games', href: '/jogos', label: m.nav_games(), icon: SoccerBallIcon },
		{
			id: 'competitions',
			href: '/competicoes',
			label: m.nav_competitions(),
			shortLabel: m.nav_competitions_short(),
			icon: TrophyIcon
		},
		{ id: 'pages', href: '/p', label: m.nav_pages(), icon: FilesIcon },
		{
			id: 'account',
			href: '/conta',
			label: m.nav_account(),
			icon: UserCircleIcon,
			avatar: user ? { name: user.name, src: user.picture } : undefined
		}
	];
}

const TAB_ROOTS: Record<TabId, string> = {
	home: '/',
	games: '/jogos',
	competitions: '/competicoes',
	pages: '/p',
	account: '/conta'
};

/** Longest-prefix ownership for deep links (DESIGN_SYSTEM §3.3). */
const PATH_OWNERS: { prefix: string; tab: TabId }[] = (
	[
		{ prefix: '/noticias', tab: 'home' },
		{ prefix: '/sondagens', tab: 'home' },
		{ prefix: '/jogos', tab: 'games' },
		{ prefix: '/hoje', tab: 'games' },
		{ prefix: '/direto', tab: 'games' },
		{ prefix: '/score-reports', tab: 'games' },
		{ prefix: '/competicoes', tab: 'competitions' },
		{ prefix: '/clubes', tab: 'competitions' },
		{ prefix: '/jogadores', tab: 'competitions' },
		{ prefix: '/tecnicos', tab: 'competitions' },
		{ prefix: '/arbitros', tab: 'competitions' },
		{ prefix: '/transferencias', tab: 'competitions' },
		{ prefix: '/p', tab: 'pages' },
		{ prefix: '/politica-de-privacidade', tab: 'pages' },
		{ prefix: '/termos-e-condicoes', tab: 'pages' },
		{ prefix: '/rgpd', tab: 'pages' },
		{ prefix: '/conta', tab: 'account' }
	] as const satisfies { prefix: string; tab: TabId }[]
).toSorted((a, b) => b.prefix.length - a.prefix.length);

export function tabFromPath(pathname: string): TabId {
	if (pathname === '/') return 'home';
	for (const { prefix, tab } of PATH_OWNERS) {
		if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return tab;
	}
	return 'home';
}

export function parentOf(pathname: string): string {
	return TAB_ROOTS[tabFromPath(pathname)];
}

export function isTabRoot(pathname: string): boolean {
	return Object.values(TAB_ROOTS).includes(pathname);
}

const nav = $state({ lastTab: null as TabId | null });

export function getActiveTab(pathname: string): TabId {
	return nav.lastTab ?? tabFromPath(pathname);
}

export function setLastTab(id: TabId) {
	nav.lastTab = id;
}
