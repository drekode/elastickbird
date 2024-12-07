import type { ClientOptions } from "@elastic/elasticsearch";
import type { ElastickBirdClient } from "./client.d";
import Client from "./client";

export const connect = function (options: ClientOptions): ElastickBirdClient {
  return new Client(options);
};
