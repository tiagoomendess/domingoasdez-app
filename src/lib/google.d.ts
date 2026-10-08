declare global {
	interface Window {
		gtag?: (...args: unknown[]) => void;
		dataLayer?: unknown[];
		adsbygoogle?: unknown[];
		googlefc?: {
			callbackQueue?: unknown[];
			showRevocationMessage?: () => void;
		};
	}
}

export {};
