export interface PutObjectInput {
  key: string;
  body: Uint8Array | ArrayBuffer | Blob;
  contentType?: string;
  cacheControl?: string;
}

export interface PutObjectResult {
  key: string;
  etag: string | null;
  sizeBytes: number;
}

export interface HeadObjectResult {
  key: string;
  contentLength: number;
  contentType: string | null;
  etag: string | null;
  lastModified: Date | null;
}

export interface ListObjectsInput {
  prefix?: string;
  continuationToken?: string;
  maxKeys?: number;
}

export interface StorageObjectItem {
  key: string;
  sizeBytes: number;
  lastModified: Date | null;
}

export interface ListObjectsResult {
  items: StorageObjectItem[];
  isTruncated: boolean;
  nextContinuationToken: string | null;
}

export interface DeleteObjectsResult {
  deleted: string[];
  failed: Array<{ key: string; message: string }>;
}

export interface StorageProvider {
  readonly name: "blob" | "r2";
  putObject(input: PutObjectInput): Promise<PutObjectResult>;
  deleteObjects(keys: string[]): Promise<DeleteObjectsResult>;
  headObject(key: string): Promise<HeadObjectResult | null>;
  listObjects(input?: ListObjectsInput): Promise<ListObjectsResult>;
}
