import type { ClientOptions } from "@elastic/elasticsearch";
import type { ElastickBirdClient } from "./client";
import { ClientNotConnectedError } from "./errors";
import Client from "./client";

let client: ElastickBirdClient | null = null;
export const connect = function (options: ClientOptions): ElastickBirdClient {
  return client = new Client(options);
};
export const getClient = function (): ElastickBirdClient {
  if (!client) {
    throw new ClientNotConnectedError();
  }
  return client;
}
