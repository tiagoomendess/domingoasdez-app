# RGPD

- **Route:** `/rgpd`
- **Tab:** Páginas
- **Files:** `src/routes/rgpd/+page.svelte`, `src/lib/content/legal.ts` (`rgpdHtml`)

The GDPR (RGPD) information page: how personal data is handled and how to exercise data rights. A static page with the title and HTML text.

## Edge cases and pitfalls

- The text is **hard-coded in `src/lib/content/legal.ts`**. Changing it needs a deploy.
- Portuguese only, apart from the page title.
- The [register](../conta/registar.md) page has a separate RGPD consent checkbox. Registering stores `account_data_consent` on the user's profile.
- The "Download my data" and "Delete account" flows from the design system aren't built yet, so this page is currently the only RGPD surface.
- No load function and no meta description.
