# Política de privacidade

- **Route:** `/politica-de-privacidade`
- **Tab:** Páginas
- **Files:** `src/routes/politica-de-privacidade/+page.svelte`, `src/lib/content/legal.ts` (`privacyHtml`)

The privacy policy. A static page: the title and the policy text as HTML in `prose rich-text`.

## Edge cases and pitfalls

- The text is **hard-coded in `src/lib/content/legal.ts`**, not stored in the database or the CMS. Changing it needs a deploy.
- The text is in Portuguese only. The page title is translated, the body isn't.
- Linked from the Páginas list and from the terms checkbox on the [register](../conta/registar.md) page.
- There's no load function and no meta description.
