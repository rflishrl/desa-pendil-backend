"use client";

import {
  ImageUploader,
  type ImageUploaderProps,
} from "@/features/uploads/components/ImageUploader";

/** Admin form image upload field backed by ImageUploader. */
export function ImageField(props: ImageUploaderProps) {
  return <ImageUploader {...props} />;
}
