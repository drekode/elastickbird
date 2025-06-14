import { ElasticSchema } from "../../lib/schema/ElasticSchema";
import { ElasticsearchClient } from "../../lib/client/ElasticsearchClient";

const ELASTICSEARCH_URL = (global as any).ELASTICSEARCH_URL as string;

describe("ElasticSchema Initialization", () => {
  beforeEach(() => {
    ElasticsearchClient.configure({ node: ELASTICSEARCH_URL });
  });

  afterEach(async () => {
    // Cleanup any test indices
    const testSchema = new ElasticSchema({ 
      alias: "test-example",
      mappings: { properties: {} }
    });
    try {
      const exists = await testSchema.existsIndex();
      if (exists) {
        await testSchema.deleteIndex();
      }
    } catch (e) {
      // Ignore cleanup errors
    }
    ElasticsearchClient.reset();
  });

  test("should create ElasticSchema instance", () => {
    const schema = new ElasticSchema({ 
      alias: "test-example",
      mappings: {
        properties: {
          name: { type: "text" },
          age: { type: "integer" }
        }
      }
    });
    expect(schema).toBeInstanceOf(ElasticSchema);
  });

  test("should throw error when creating index without client connection", () => {
    ElasticsearchClient.reset();
    const schema = new ElasticSchema({ 
      alias: "test-example",
      mappings: { properties: {} }
    });
    expect(async () => await schema.createIndex()).rejects.toThrow("Elasticsearch client not configured");
  });

  test("should create index successfully", async () => {
    const schema = new ElasticSchema({ 
      alias: "test-example",
      mappings: {
        properties: {
          name: { type: "text" },
          age: { type: "integer" }
        }
      },
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0
      }
    });
    
    await schema.createIndex();
    
    const exists = await schema.existsIndex();
    expect(exists).toBe(true);
  });

  test("should handle createIndexIfNotExists", async () => {
    const schema = new ElasticSchema({ 
      alias: "test-example",
      mappings: {
        properties: {
          name: { type: "text" }
        }
      }
    });
    
    // Should create index
    await schema.createIndexIfNotExists();
    let exists = await schema.existsIndex();
    expect(exists).toBe(true);
    
    // Should not throw error if index already exists
    await schema.createIndexIfNotExists();
    exists = await schema.existsIndex();
    expect(exists).toBe(true);
  });
});
