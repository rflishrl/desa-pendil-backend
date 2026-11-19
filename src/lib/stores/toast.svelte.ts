export type ToastKind = 'success' | 'error' | 'info';

export interface ToastItem {
	id: number;
	kind: ToastKind;
	message: string;
}

class ToastStore {
	items = $state<ToastItem[]>([]);
	#nextId = 1;

	push(kind: ToastKind, message: string, durationMs = 4000): number {
		const id = this.#nextId++;
		this.items = [...this.items, { id, kind, message }];
		if (typeof window !== 'undefined' && durationMs > 0) {
			window.setTimeout(() => this.dismiss(id), durationMs);
		}
		return id;
	}

	success(message: string): number {
		return this.push('success', message);
	}

	error(message: string): number {
		return this.push('error', message, 5500);
	}

	info(message: string): number {
		return this.push('info', message);
	}

	dismiss(id: number): void {
		this.items = this.items.filter((item) => item.id !== id);
	}
}

export const toast = new ToastStore();
