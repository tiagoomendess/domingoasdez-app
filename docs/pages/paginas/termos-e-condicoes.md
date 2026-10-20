# Termos e condições

- **Route:** `/termos-e-condicoes`
- **Tab:** Páginas
- **Files:** `src/routes/termos-e-condicoes/+page.svelte`, `src/lib/content/legal.ts` (`termsHtml`)

The terms and conditions. A static page: the title and the terms as HTML in `prose rich-text`.

## Edge cases and pitfalls

- The text is **hard-coded in `src/lib/content/legal.ts`**. Changing it needs a deploy.
- Portuguese only, apart from the page title.
- Users accept these terms when they [register](../conta/registar.md), so a change here may need the legal side checked too.
- No load function and no meta description.
