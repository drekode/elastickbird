import ElastickBird from "../../lib/elastickbird";
import type ElastickBirdClient from "../../lib/client/client";
import ElastickBirdClientClass from "../../lib/client/client";
import { Client as NativeClient } from "@elastic/elasticsearch"

const ELASTICSEARCH_URL = (global as any).ELASTICSEARCH_URL as string;

test("Connect method is a function", () => {
  const connect = ElastickBird.connect;
  expect(connect).toBeInstanceOf(Function);
});

test("Connect without specifiying a node should throw missing node option", () => {
  const connect = ElastickBird.connect;
  expect(() => connect({})).toThrow("Missing node(s) option");
});

test("Connect using an invalid node URL should throw invalid URL error", () => {
  const connect = ElastickBird.connect;
  expect(() => connect({ node: "test-node-url" })).toThrow("Invalid URL");
});

test("Connect to elasticsearch", () => {
  const connect = ElastickBird.connect;
  const elastickbirdClient = connect({ node: ELASTICSEARCH_URL }) as ElastickBirdClient;
  expect(elastickbirdClient).toBeInstanceOf(ElastickBirdClientClass);
  expect(elastickbirdClient.client).toBeInstanceOf(NativeClient);
});
