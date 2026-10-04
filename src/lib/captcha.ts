type Grecaptcha = {
	ready: (callback: () => void) => void;
	render: (
		element: HTMLElement,
		options: {
			sitekey: string;
			theme?: 'light' | 'dark';
			hl?: string;
			callback?: (token: string) => void;
			'expired-callback'?: () => void;
			'error-callback'?: () => void;
		}
	) => number;
	reset: (widgetId?: number) => void;
};

declare global {
	interface Window {
		grecaptcha?: Grecaptcha;
	}
}

let loading: Promise<void> | null = null;

/** Load the reCAPTCHA v2 explicit-render script once. */
export function loadRecaptcha(): Promise<void> {
	if (typeof window === 'undefined') return Promise.resolve();
	if (window.grecaptcha?.render) {
		return new Promise((resolve) => window.grecaptcha!.ready(resolve));
	}
	if (!loading) {
		loading = new Promise((resolve, reject) => {
			const script = document.createElement('script');
			script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
			script.async = true;
			script.onload = () => {
				if (!window.grecaptcha) {
					reject(new Error('recaptcha missing'));
					return;
				}
				window.grecaptcha.ready(resolve);
			};
			script.onerror = () => reject(new Error('recaptcha failed'));
			document.head.appendChild(script);
		});
	}
	return loading;
}
