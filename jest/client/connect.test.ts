import { ElasticsearchClient } from "../../lib/client/ElasticsearchClient";
import { Client as NativeClient } from "@elastic/elasticsearch";

const ELASTICSEARCH_URL = (global as any).ELASTICSEARCH_URL as string;

describe("Elasticsearch Client", () => {
  afterEach(() => {
    // Reset client after each test
    ElasticsearchClient.reset();
  });

  test("should configure client with node URL", () => {
    ElasticsearchClient.configure({ node: ELASTICSEARCH_URL });
    const client = ElasticsearchClient.getClient();
    expect(client).toBeInstanceOf(NativeClient);
  });

  test("should throw error when getting client without configuration", () => {
    expect(() => ElasticsearchClient.getClient()).toThrow("Elasticsearch client not configured");
  });

  test("should connect to Elasticsearch and ping successfully", async () => {
    ElasticsearchClient.configure({ node: ELASTICSEARCH_URL });
    const client = ElasticsearchClient.getClient();
    
    const response = await client.ping();
    expect(response).toBe(true);
  });

  test("should return same client instance (singleton)", () => {
    ElasticsearchClient.configure({ node: ELASTICSEARCH_URL });
    const client1 = ElasticsearchClient.getClient();
    const client2 = ElasticsearchClient.getClient();
    expect(client1).toBe(client2);
  });
});
