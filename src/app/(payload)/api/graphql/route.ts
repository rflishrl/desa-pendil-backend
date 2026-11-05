import { GRAPHQL_POST, REST_OPTIONS } from "@payloadcms/next/routes";
import configPromise from "@payload-config";

export const POST = GRAPHQL_POST(configPromise);
export const OPTIONS = REST_OPTIONS(configPromise);
