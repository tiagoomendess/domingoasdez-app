/**
 * Mirror of the tables this app uses. The schema is owned by domingoasdez-admin's migrations
 * (its src/lib/server/db/schema.ts and drizzle/migrations): never push or migrate from here.
 * After an admin migration, `npm run db:pull` and port the columns this app needs.
 */
import {
	mysqlTable,
	int,
	bigint,
	varchar,
	text,
	longtext,
	boolean,
	timestamp,
	datetime,
	date,
	decimal,
	mysqlEnum,
	tinyint,
	char,
	json,
	index
} from 'drizzle-orm/mysql-core';

export const media = mysqlTable('media', {
	id: int('id').primaryKey().autoincrement(),
	userId: int('user_id').notNull(),
	url: text('url').notNull(),
	thumbnailUrl: text('thumbnail_url'),
	mediaType: mysqlEnum('media_type', [
		'none',
		'image',
		'video',
		'youtube',
		'download',
		'other'
	]).notNull(),
	tags: text('tags'),
	visible: boolean('visible').notNull().default(true),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const articles = mysqlTable('articles', {
	id: int('id').primaryKey().autoincrement(),
	mediaId: int('media_id'),
	title: varchar('title', { length: 255 }).notNull(),
	description: text('description'),
	text: longtext('text').notNull(),
	userId: int('user_id').notNull(),
	date: timestamp('date').notNull(),
	tags: text('tags'),
	visible: boolean('visible').notNull().default(true),
	facebookPostId: varchar('facebook_post_id', { length: 144 }),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const articleComments = mysqlTable('article_comments', {
	id: int('id', { unsigned: true }).primaryKey().autoincrement(),
	articleId: int('article_id', { unsigned: true }).notNull(),
	/** Parent comment for replies; null for a top-level comment. */
	articleCommentId: int('article_comment_id', { unsigned: true }),
	/** Nulled by the legacy account-deletion job (ProcessDeleteRequest). */
	content: text('content'),
	userId: int('user_id', { unsigned: true }).notNull(),
	deleted: boolean('deleted').notNull().default(false),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

/** One vote per user and article comment; `value` is +1 or -1 (no row = no vote). */
export const articleCommentVotes = mysqlTable('article_comment_votes', {
	id: int('id', { unsigned: true }).primaryKey().autoincrement(),
	articleCommentId: int('article_comment_id', { unsigned: true }).notNull(),
	userId: int('user_id', { unsigned: true }).notNull(),
	value: tinyint('value').notNull(),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

/** Comments on a game (not the flash interviews, which are `game_comments`). */
export const matchComments = mysqlTable('match_comments', {
	id: int('id', { unsigned: true }).primaryKey().autoincrement(),
	gameId: int('game_id', { unsigned: true }).notNull(),
	/** Parent comment for replies; null for a top-level comment. */
	matchCommentId: int('match_comment_id', { unsigned: true }),
	content: text('content'),
	userId: int('user_id', { unsigned: true }).notNull(),
	deleted: boolean('deleted').notNull().default(false),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

/** One vote per user and match comment; `value` is +1 or -1 (no row = no vote). */
export const matchCommentVotes = mysqlTable('match_comment_votes', {
	id: int('id', { unsigned: true }).primaryKey().autoincrement(),
	matchCommentId: int('match_comment_id', { unsigned: true }).notNull(),
	userId: int('user_id', { unsigned: true }).notNull(),
	value: tinyint('value').notNull(),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const polls = mysqlTable('polls', {
	id: int('id').primaryKey().autoincrement(),
	question: varchar('question', { length: 144 }).notNull(),
	slug: varchar('slug', { length: 150 }).notNull().unique(),
	showResultsAfter: datetime('show_results_after').notNull(),
	publishAfter: datetime('publish_after').notNull(),
	closeAfter: datetime('close_after').notNull(),
	image: varchar('image', { length: 255 }),
	updateImage: boolean('update_image').notNull().default(true),
	visible: boolean('visible').notNull().default(false),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const pollAnswers = mysqlTable('poll_answers', {
	id: int('id').primaryKey().autoincrement(),
	pollId: int('poll_id').notNull(),
	answer: varchar('answer', { length: 144 }).notNull(),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const pollAnswerVotes = mysqlTable(
	'poll_answer_votes',
	{
		id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
		pollAnswerId: int('poll_answer_id').notNull(),
		userId: int('user_id'),
		ip: varchar('ip', { length: 70 }),
		createdAt: timestamp('created_at'),
		updatedAt: timestamp('updated_at')
	},
	(table) => [index('poll_answer_votes_ip_user_id_index').on(table.ip, table.userId)]
);

export const competitions = mysqlTable('competitions', {
	id: int('id', { unsigned: true }).primaryKey().autoincrement(),
	name: varchar('name', { length: 155 }).notNull(),
	picture: text('picture'),
	visible: boolean('visible').notNull().default(true),
	socialMediaEnabled: boolean('social_media_enabled').notNull().default(true),
	priority: int('priority', { unsigned: true }).notNull().default(0),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const seasons = mysqlTable('seasons', {
	id: int('id', { unsigned: true }).primaryKey().autoincrement(),
	competitionId: int('competition_id', { unsigned: true }).notNull(),
	name: varchar('name', { length: 155 }),
	picture: text('picture'),
	startYear: int('start_year').notNull(),
	endYear: int('end_year').notNull(),
	obs: text('obs'),
	visible: boolean('visible').notNull().default(true),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const clubs = mysqlTable('clubs', {
	id: int('id', { unsigned: true }).primaryKey().autoincrement(),
	name: varchar('name', { length: 155 }).notNull(),
	foundingDate: date('founding_date'),
	birthdayPostEnabled: boolean('birthday_post_enabled').notNull().default(true),
	contactEmail: varchar('contact_email', { length: 155 }),
	notificationsEnabled: boolean('notifications_enabled').notNull().default(true),
	adminUserId: int('admin_user_id', { unsigned: true }),
	emblem: text('emblem'),
	website: varchar('website', { length: 155 }),
	visible: boolean('visible').notNull().default(true),
	priority: int('priority', { unsigned: true }).notNull().default(0),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const teams = mysqlTable('teams', {
	id: int('id', { unsigned: true }).primaryKey().autoincrement(),
	clubId: int('club_id', { unsigned: true }).notNull(),
	name: varchar('name', { length: 155 }).notNull(),
	contactEmail: varchar('contact_email', { length: 155 }),
	visible: boolean('visible').notNull().default(true),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const groupRules = mysqlTable('group_rules', {
	id: int('id', { unsigned: true }).primaryKey().autoincrement(),
	name: varchar('name', { length: 255 }).notNull().unique(),
	promotes: int('promotes').notNull().default(0),
	relegates: int('relegates').notNull().default(0),
	type: mysqlEnum('type', ['points', 'elimination', 'friendly', 'other']).notNull(),
	tieBreakerScript: text('tie_breaker_script'),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const groupRulesPositions = mysqlTable('group_rules_positions', {
	id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
	groupRulesId: int('group_rules_id', { unsigned: true }).notNull(),
	positions: varchar('positions', { length: 255 }).notNull(),
	color: varchar('color', { length: 255 }).notNull(),
	label: varchar('label', { length: 255 }).notNull(),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const gameGroups = mysqlTable('game_groups', {
	id: int('id', { unsigned: true }).primaryKey().autoincrement(),
	name: varchar('name', { length: 155 }),
	seasonId: int('season_id', { unsigned: true }).notNull(),
	groupRulesId: int('group_rules_id', { unsigned: true }).notNull(),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

/** Score predictions: one per user and game; `penaltyWinner` only for level knockout picks. */
export const gamePredictions = mysqlTable('game_predictions', {
	id: int('id', { unsigned: true }).primaryKey().autoincrement(),
	gameId: int('game_id', { unsigned: true }).notNull(),
	userId: int('user_id', { unsigned: true }).notNull(),
	goalsHome: tinyint('goals_home', { unsigned: true }).notNull(),
	goalsAway: tinyint('goals_away', { unsigned: true }).notNull(),
	penaltyWinner: mysqlEnum('penalty_winner', ['home', 'away']),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const games = mysqlTable('games', {
	id: int('id', { unsigned: true }).primaryKey().autoincrement(),
	homeTeamId: int('home_team_id', { unsigned: true }).notNull(),
	awayTeamId: int('away_team_id', { unsigned: true }).notNull(),
	gameGroupId: int('game_group_id', { unsigned: true }).notNull(),
	round: int('round').notNull(),
	date: timestamp('date').notNull(),
	playgroundId: int('playground_id', { unsigned: true }),
	goalsHome: int('goals_home'),
	goalsAway: int('goals_away'),
	penaltiesHome: int('penalties_home'),
	penaltiesAway: int('penalties_away'),
	finished: boolean('finished').notNull().default(false),
	visible: boolean('visible').notNull().default(true),
	postponed: boolean('postponed').notNull().default(false),
	image: varchar('image', { length: 255 }),
	generateImage: boolean('generate_image').notNull().default(false),
	scoreboardUpdates: boolean('scoreboard_updates').notNull().default(true),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const goals = mysqlTable('goals', {
	id: int('id', { unsigned: true }).primaryKey().autoincrement(),
	playerId: int('player_id', { unsigned: true }),
	teamId: int('team_id', { unsigned: true }).notNull(),
	gameId: int('game_id', { unsigned: true }).notNull(),
	ownGoal: boolean('own_goal').notNull().default(false),
	penalty: boolean('penalty').notNull().default(false),
	minute: int('minute'),
	visible: boolean('visible').notNull().default(true),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const players = mysqlTable('players', {
	id: int('id', { unsigned: true }).primaryKey().autoincrement(),
	name: varchar('name', { length: 255 }).notNull(),
	picture: text('picture'),
	associationId: varchar('association_id', { length: 255 }).unique(),
	nickname: varchar('nickname', { length: 255 }),
	phone: varchar('phone', { length: 255 }),
	email: varchar('email', { length: 255 }),
	facebookProfile: text('facebook_profile'),
	obs: text('obs'),
	// DATETIME since admin migration 0005 (TIMESTAMP couldn't hold dates before 1970)
	birthDate: datetime('birth_date'),
	position: mysqlEnum('position', ['none', 'striker', 'midfielder', 'defender', 'goalkeeper'])
		.notNull()
		.default('none'),
	teamId: int('team_id', { unsigned: true }),
	visible: boolean('visible').notNull().default(true),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const transfers = mysqlTable('transfers', {
	id: int('id', { unsigned: true }).primaryKey().autoincrement(),
	playerId: int('player_id', { unsigned: true }).notNull(),
	teamId: int('team_id', { unsigned: true }),
	date: timestamp('date').notNull(),
	visible: boolean('visible').notNull().default(true),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const teamAgents = mysqlTable('team_agents', {
	id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
	playerId: int('player_id', { unsigned: true }),
	teamId: int('team_id', { unsigned: true }),
	name: varchar('name', { length: 155 }).notNull(),
	birthDate: varchar('birth_date', { length: 155 }),
	externalId: varchar('external_id', { length: 155 }),
	email: varchar('email', { length: 155 }),
	phone: varchar('phone', { length: 155 }),
	picture: varchar('picture', { length: 155 }),
	agentType: mysqlEnum('agent_type', [
		'manager',
		'assistant_manager',
		'goalkeeper_manager',
		'director'
	])
		.notNull()
		.default('manager'),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const teamAgentHistory = mysqlTable('team_agents_history', {
	id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
	teamAgentId: bigint('team_agent_id', { mode: 'number', unsigned: true }).notNull(),
	teamId: int('team_id', { unsigned: true }),
	agentType: mysqlEnum('agent_type', [
		'manager',
		'assistant_manager',
		'goalkeeper_manager',
		'director'
	])
		.notNull()
		.default('manager'),
	startedAt: timestamp('started_at').notNull(),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

/** MySQL POINT is read via ST_AsText in queries; not selected as a Drizzle column. */
export const playgrounds = mysqlTable('playgrounds', {
	id: int('id', { unsigned: true }).primaryKey().autoincrement(),
	clubId: int('club_id', { unsigned: true }),
	name: varchar('name', { length: 255 }).notNull(),
	surface: varchar('surface', { length: 255 }).notNull(),
	width: int('width'),
	height: int('height'),
	capacity: int('capacity'),
	picture: text('picture'),
	obs: text('obs'),
	visible: boolean('visible').notNull().default(true),
	priority: int('priority', { unsigned: true }).notNull().default(0),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const referees = mysqlTable('referees', {
	id: int('id', { unsigned: true }).primaryKey().autoincrement(),
	name: varchar('name', { length: 255 }).notNull(),
	picture: text('picture'),
	obs: text('obs'),
	association: varchar('association', { length: 255 }).notNull().default('none'),
	visible: boolean('visible').notNull().default(true),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const refereeTypes = mysqlTable('referee_types', {
	id: int('id', { unsigned: true }).primaryKey().autoincrement(),
	name: varchar('name', { length: 255 }).notNull(),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const gameReferees = mysqlTable('game_referees', {
	id: int('id', { unsigned: true }).primaryKey().autoincrement(),
	gameId: int('game_id', { unsigned: true }).notNull(),
	refereeId: int('referee_id', { unsigned: true }).notNull(),
	refereeTypeId: int('referee_type_id', { unsigned: true }).notNull(),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const mvpVotes = mysqlTable('mvp_votes', {
	id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
	gameId: int('game_id', { unsigned: true }).notNull(),
	playerId: int('player_id', { unsigned: true }).notNull(),
	userId: int('user_id', { unsigned: true }).notNull(),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const gameComments = mysqlTable('game_comments', {
	id: int('id', { unsigned: true }).primaryKey().autoincrement(),
	uuid: varchar('uuid', { length: 36 }).notNull().unique(),
	pin: varchar('pin', { length: 4 }).notNull(),
	gameId: int('game_id', { unsigned: true }).notNull(),
	teamId: int('team_id', { unsigned: true }).notNull(),
	userId: int('user_id', { unsigned: true }),
	content: text('content').notNull(),
	used: boolean('used').notNull().default(false),
	deadline: timestamp('deadline'),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const permissions = mysqlTable('permissions', {
	id: int('id', { unsigned: true }).primaryKey().autoincrement(),
	name: varchar('name', { length: 155 }).notNull(),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const userPermissions = mysqlTable('user_permissions', {
	id: int('id', { unsigned: true }).primaryKey().autoincrement(),
	userId: int('user_id', { unsigned: true }).notNull(),
	permissionId: int('permission_id', { unsigned: true }).notNull(),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const pages = mysqlTable('pages', {
	id: int('id', { unsigned: true }).primaryKey().autoincrement(),
	name: varchar('name', { length: 155 }).notNull(),
	slug: varchar('slug', { length: 155 }).notNull().unique(),
	title: varchar('title', { length: 155 }).notNull(),
	picture: varchar('picture', { length: 155 }).notNull(),
	body: text('body').notNull(),
	visible: boolean('visible').notNull().default(true),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const users = mysqlTable('users', {
	id: int('id', { unsigned: true }).primaryKey().autoincrement(),
	name: varchar('name', { length: 155 }),
	email: varchar('email', { length: 155 }).unique(),
	password: varchar('password', { length: 155 }),
	emailToken: varchar('email_token', { length: 20 }),
	verified: boolean('verified').notNull().default(false),
	rememberToken: varchar('remember_token', { length: 100 }),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const userProfiles = mysqlTable('user_profiles', {
	id: int('id', { unsigned: true }).primaryKey().autoincrement(),
	phone: varchar('phone', { length: 20 }),
	bio: text('bio'),
	userId: int('user_id', { unsigned: true }).notNull().unique(),
	picture: text('picture'),
	accountDataConsent: timestamp('account_data_consent'),
	analyticsCookiesConsent: timestamp('analytics_cookies_consent'),
	allDataConsent: timestamp('all_data_consent'),
	timezone: varchar('timezone', { length: 20 }).notNull().default('Europe/Lisbon'),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const userBans = mysqlTable('user_bans', {
	id: int('id', { unsigned: true }).primaryKey().autoincrement(),
	bannedUserId: int('banned_user_id', { unsigned: true }).notNull(),
	reason: varchar('reason', { length: 155 }).notNull(),
	bannedByUserId: int('banned_by_user_id', { unsigned: true }).notNull(),
	pardoned: boolean('pardoned').notNull().default(false),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const socialProviders = mysqlTable('social_providers', {
	id: int('id', { unsigned: true }).primaryKey().autoincrement(),
	userId: int('user_id', { unsigned: true }).notNull(),
	providerId: varchar('provider_id', { length: 155 }).notNull(),
	provider: varchar('provider', { length: 155 }).notNull(),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

/** MySQL POINT is written via ST_GeomFromText; not selected as a Drizzle column. */
export const scoreReports = mysqlTable('score_reports', {
	id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
	userId: int('user_id', { unsigned: true }),
	gameId: int('game_id', { unsigned: true }).notNull(),
	homeScore: int('home_score', { unsigned: true }).notNull(),
	awayScore: int('away_score', { unsigned: true }).notNull(),
	source: varchar('source', { length: 25 }).notNull(),
	ipAddress: varchar('ip_address', { length: 45 }),
	ipCountry: varchar('ip_country', { length: 155 }),
	userAgent: varchar('user_agent', { length: 255 }),
	locationAccuracy: decimal('location_accuracy', { precision: 8, scale: 4, mode: 'number' }),
	uuid: varchar('uuid', { length: 40 }),
	finished: boolean('finished').notNull().default(false),
	isFake: boolean('is_fake').notNull().default(false),
	isCorrect: boolean('is_correct').notNull().default(false),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const scoreReportBans = mysqlTable('score_report_bans', {
	id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
	userId: int('user_id', { unsigned: true }),
	ipAddress: varchar('ip_address', { length: 45 }),
	uuid: varchar('uuid', { length: 40 }),
	userAgent: varchar('user_agent', { length: 255 }),
	shadowBan: boolean('shadow_ban').notNull().default(false),
	ipBan: boolean('ip_ban').notNull().default(false),
	reason: varchar('reason', { length: 255 }),
	expiresAt: timestamp('expires_at'),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

/** Info reports ("Enviar Informação"). Status mirrors App\InfoReport::ALLOWED_STATUS. */
export const infoReports = mysqlTable('info_reports', {
	id: int('id', { unsigned: true }).primaryKey().autoincrement(),
	code: varchar('code', { length: 12 }).notNull().unique(),
	userId: int('user_id', { unsigned: true }),
	status: mysqlEnum('status', ['sent', 'seen', 'used', 'archived', 'deleted']).notNull(),
	content: varchar('content', { length: 500 }).notNull(),
	source: varchar('source', { length: 155 }).notNull(),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const userUuids = mysqlTable('user_uuids', {
	id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
	userId: int('user_id', { unsigned: true }).notNull(),
	uuid: varchar('uuid', { length: 36 }).notNull(),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const uuidKarmas = mysqlTable('uuid_karmas', {
	uuid: varchar('uuid', { length: 36 }).primaryKey(),
	karma: int('karma').notNull().default(0),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

/** Direct-sold ads. Lower `priority` is shown first. Clicks are written to `partner_clicks`. */
export const partners = mysqlTable('partners', {
	id: int('id', { unsigned: true }).primaryKey().autoincrement(),
	name: varchar('name', { length: 50 }).notNull(),
	url: varchar('url', { length: 150 }).notNull(),
	picture: varchar('picture', { length: 255 }).notNull(),
	priority: int('priority', { unsigned: true }).notNull(),
	visible: boolean('visible').notNull().default(true),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const partnerClicks = mysqlTable('partner_clicks', {
	id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
	partnerId: int('partner_id', { unsigned: true }).notNull(),
	page: varchar('page', { length: 155 }),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

/** Key/value settings (`api_access_token`, `test_game_id`, …), written by the admin. */
export const variables = mysqlTable('variables', {
	name: varchar('name', { length: 64 }).primaryKey(),
	value: text('value').notNull(),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

/** Player create/update requests sent through the legacy API, reviewed in the admin. */
export const playerUpdateRequests = mysqlTable('player_update_requests', {
	id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
	playerId: int('player_id', { unsigned: true }),
	name: varchar('name', { length: 155 }),
	nickname: varchar('nickname', { length: 155 }),
	clubName: varchar('club_name', { length: 155 }),
	team: varchar('team', { length: 155 }),
	pictureUrl: text('picture_url'),
	associationId: varchar('association_id', { length: 155 }),
	phone: varchar('phone', { length: 155 }),
	email: varchar('email', { length: 155 }),
	facebookProfile: text('facebook_profile'),
	// DATETIME since admin migration 0005 (TIMESTAMP couldn't hold dates before 1970)
	birthDate: datetime('birth_date'),
	position: mysqlEnum('position', ['none', 'striker', 'midfielder', 'defender', 'goalkeeper']),
	obs: text('obs'),
	status: mysqlEnum('status', ['pending', 'approved', 'denied']).notNull().default('pending'),
	createdBy: varchar('created_by', { length: 155 }),
	reviewedBy: int('reviewed_by', { unsigned: true }),
	reviewedAt: timestamp('reviewed_at'),
	reviewNotes: text('review_notes'),
	sourceData: text('source_data'),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

/** Legacy audit log (table `audit`). This app only writes failed API token logins. */
export const audit = mysqlTable('audit', {
	id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
	userId: bigint('user_id', { mode: 'number', unsigned: true }),
	action: varchar('action', { length: 25 }).notNull(),
	model: varchar('model', { length: 50 }),
	modelId: bigint('model_id', { mode: 'number', unsigned: true }),
	oldValues: text('old_values'),
	newValues: text('new_values'),
	ipAddress: varchar('ip_address', { length: 45 }),
	ipCountry: varchar('ip_country', { length: 155 }),
	userAgent: varchar('user_agent', { length: 255 }),
	timezone: varchar('timezone', { length: 30 }),
	language: varchar('language', { length: 155 }),
	extraInfo: varchar('extra_info', { length: 155 }),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

/**
 * Stadium screens ("placard eletrónico", `/placard`): one row per TV browser with the state it
 * shows. Created by admin migration 0006_placards. The TV's cookie holds a token; only its
 * sha256 is stored. Clock times are server time (see `src/lib/placard/state.ts`).
 */
export const placards = mysqlTable('placards', {
	id: int('id', { unsigned: true }).primaryKey().autoincrement(),
	deviceTokenHash: char('device_token_hash', { length: 64 }).notNull().unique(),
	pairingCode: char('pairing_code', { length: 6 }).unique(),
	pairingCodeExpiresAt: datetime('pairing_code_expires_at'),
	scene: varchar('scene', { length: 20 }).notNull().default('pairing'),
	gameId: int('game_id', { unsigned: true }),
	controllerUserId: int('controller_user_id', { unsigned: true }),
	homeScore: tinyint('home_score', { unsigned: true }).notNull().default(0),
	awayScore: tinyint('away_score', { unsigned: true }).notNull().default(0),
	period: varchar('period', { length: 20 }).notNull().default('first_half'),
	clockElapsedMs: int('clock_elapsed_ms', { unsigned: true }).notNull().default(0),
	clockRunningSince: datetime('clock_running_since', { fsp: 3 }),
	version: int('version', { unsigned: true }).notNull().default(0),
	pairedAt: datetime('paired_at'),
	lastActionAt: datetime('last_action_at'),
	lastSeenAt: datetime('last_seen_at'),
	/** On top of the scene until `overlay_ends_at`: `ad` for now (see `PlacardOverlay`). */
	overlayType: varchar('overlay_type', { length: 20 }),
	overlayPayload: json('overlay_payload'),
	overlayStartedAt: datetime('overlay_started_at', { fsp: 3 }),
	overlayEndsAt: datetime('overlay_ends_at', { fsp: 3 }),
	lastAdAt: datetime('last_ad_at', { fsp: 3 }),
	nextAdId: int('next_ad_id', { unsigned: true }),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

/** Log of what happened on a screen: pairing, every controller action, release. */
export const placardEvents = mysqlTable('placard_events', {
	id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().autoincrement(),
	placardId: int('placard_id', { unsigned: true }).notNull(),
	gameId: int('game_id', { unsigned: true }),
	userId: int('user_id', { unsigned: true }),
	type: varchar('type', { length: 30 }).notNull(),
	payload: json('payload'),
	createdAt: timestamp('created_at')
});

/** A club's stadium screen look (admin migration 0007): colours `#rrggbb` and a 16:9 image. */
export const clubPlacardSettings = mysqlTable('club_placard_settings', {
	id: int('id', { unsigned: true }).primaryKey().autoincrement(),
	clubId: int('club_id', { unsigned: true }).notNull().unique(),
	textColor: char('text_color', { length: 7 }),
	backgroundColor: char('background_color', { length: 7 }),
	backgroundImage: varchar('background_image', { length: 255 }),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

/** A club's ad spots on its stadium screen, at most 5, in `position` order. */
export const clubPlacardAds = mysqlTable('club_placard_ads', {
	id: int('id', { unsigned: true }).primaryKey().autoincrement(),
	clubId: int('club_id', { unsigned: true }).notNull(),
	image: varchar('image', { length: 255 }).notNull(),
	durationSeconds: tinyint('duration_seconds', { unsigned: true }).notNull().default(10),
	position: tinyint('position', { unsigned: true }).notNull().default(0),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});
