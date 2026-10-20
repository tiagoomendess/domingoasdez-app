# Técnico (staff member)

- **Route:** `/tecnicos/{id}/{slug}`
- **Tab:** Competições
- **Files:** `src/routes/tecnicos/[id=id]/[slug]/`, `src/lib/server/agent-page.ts`

The page of a team staff member ("agent" in the data model): coach, assistant coach, goalkeeper coach or director. Ports `TeamAgentController@show`. Reached from the staff list on a club page.

## What's on the page

- Photo (128), name, role pill and age (when known).
- **Clube atual**: club and team, or "Sem clube".
- **Jogador associado**: when the staff member is also a registered player, a link to that player.
- **Histórico**: past clubs and teams with role and start month/year.
- An admin "Editar" link, by permission.

## How it works

- Found by id. A wrong slug redirects (301) to the canonical one, but only when the name produces a non-empty slug.
- History comes from `team_agent_history`, newest start date first.

## Edge cases and pitfalls

- An unknown role value is shown as the raw database string, since `agentTypeLabel` only translates the four known types.
- The linked player is only shown when that player is visible, and their photo follows the under-18 rule.
- A name that slugifies to an empty string (only symbols, for example) skips the canonical redirect, so any slug works for that person.
- The URL prefix is the Portuguese `/tecnicos` while the code and data call them "agents". Search for `agent` when looking for the logic.
