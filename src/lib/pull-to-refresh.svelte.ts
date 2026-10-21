/**
 * Pull-to-refresh lives in the AppShell, so every page has it. Pages that want their own
 * loading state while it runs (Home swaps the feed for skeletons) read `refreshing` here.
 */
export const pullRefresh = $state({ refreshing: false });
