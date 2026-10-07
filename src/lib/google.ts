/** Hosts where GA and AdSense scripts load (must match the allowlist in app.html). */
const GOOGLE_HOSTS = new Set(['domingoasdez.com', 'www.domingoasdez.com', 'app.domingoasdez.com']);

export function isGoogleHost(hostname = typeof location !== 'undefined' ? location.hostname : '') {
	return GOOGLE_HOSTS.has(hostname);
}
