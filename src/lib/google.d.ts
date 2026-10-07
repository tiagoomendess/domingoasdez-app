declare global {
	interface Window {
		gtag?: (...args: unknown[]) => void;
		dataLayer?: unknown[];
		adsbygoogle?: unknown[];
	}
}

export {};
