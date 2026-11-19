import type { Actor } from '#lib/server/auth/actor.js';

declare global {
	namespace App {
		interface Locals {
			admin: Actor | null;
		}
	}

	interface Window {
		turnstile?: {
			render: (
				container: HTMLElement,
				options: {
					sitekey: string;
					action?: string;
					theme?: 'light' | 'dark' | 'auto';
					callback?: (token: string) => void;
					'expired-callback'?: () => void;
					'error-callback'?: () => void;
				}
			) => string;
			reset: (widgetId?: string) => void;
			remove: (widgetId: string) => void;
		};
	}
}

export {};
