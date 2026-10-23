import { notFound } from '#lib/server/legacy-api/http.ts';
import type { RequestHandler } from './$types';

/**
 * Any /api/* path without its own route. The Laravel API is gone; its endpoints that external
 * clients use are ported under src/routes/api (see docs/routes-without-pages.md), and the
 * ones only the old UI used are deliberately not.
 */
export const fallback: RequestHandler = () => notFound();
