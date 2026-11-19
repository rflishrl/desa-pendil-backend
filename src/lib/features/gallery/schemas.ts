import { z } from 'zod';

import { mediaImageUrl, optionalText, requiredText } from '#lib/schemas/common.js';

const galleryFields = {
	url: mediaImageUrl,
	alt: requiredText('Teks alternatif', 200),
	caption: optionalText('Keterangan', 300),
	sort_order: z.preprocess(
		(value) => (value === '' || value === null ? 0 : value),
		z.coerce
			.number({ error: 'Urutan harus berupa angka.' })
			.int('Urutan harus bilangan bulat.')
			.min(-9999, 'Urutan minimal -9999.')
			.max(9999, 'Urutan maksimal 9999.')
	)
};

/** Shared validation schema for admin form (client) and POST route (server). */
export const galleryCreateSchema = z.object({
	...galleryFields,
	caption: galleryFields.caption.default(''),
	sort_order: galleryFields.sort_order.default(0)
});

/** PATCH schema: preserves omitted fields without overriding existing values. */
export const galleryUpdateSchema = z.object(galleryFields).partial();

export type GalleryCreateInput = z.output<typeof galleryCreateSchema>;
export type GalleryUpdateInput = z.output<typeof galleryUpdateSchema>;
export type GalleryFormValues = z.input<typeof galleryCreateSchema>;

export interface GalleryDto {
	id: string;
	url: string;
	thumbUrl?: string;
	alt: string;
	caption: string | null;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
}
