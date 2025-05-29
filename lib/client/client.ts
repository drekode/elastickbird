import type { ClientOptions } from "@elastic/elasticsearch";
import { Client as NativeClient } from "@elastic/elasticsearch"

export interface ElastickBirdClient {
    client: NativeClient | null;
}

export default class ElastickBirdClientClass implements ElastickBirdClient {
    client: NativeClient | null;
    constructor(clientOptions: ClientOptions) {
        this.client = new NativeClient(clientOptions);
    }
}