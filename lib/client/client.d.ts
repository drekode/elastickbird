import { Client as NativeClient } from "@elastic/elasticsearch"

export interface ElastickBirdClient {
    client: NativeClient | null;
}