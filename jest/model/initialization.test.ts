import { ElastickbirdModel } from "../../lib/model/ElastickbirdModel";
import { ElasticsearchClient } from "../../lib/client/ElasticsearchClient";

const ELASTICSEARCH_URL = (global as any).ELASTICSEARCH_URL as string;

describe("ElastickbirdModel Initialization", () => {
  beforeEach(() => {
    ElasticsearchClient.configure({ node: ELASTICSEARCH_URL });
  });

  afterEach(async () => {
    // Cleanup any test indices
    const testModel = new ElastickbirdModel({ 
      alias: "test-example",
      mappings: { properties: {} }
    });
    try {
      const exists = await testModel.existsIndex();
      if (exists) {
        await testModel.deleteIndex();
      }
    } catch (e) {
      // Ignore cleanup errors
    }
    ElasticsearchClient.reset();
  });

  test("should create ElastickbirdModel instance", () => {
    const model = new ElastickbirdModel({ 
      alias: "test-example",
      mappings: {
        properties: {
          name: { type: "text" },
          age: { type: "integer" }
        }
      }
    });
    expect(model).toBeInstanceOf(ElastickbirdModel);
  });

  test("should throw error when creating index without client connection", () => {
    ElasticsearchClient.reset();
    const model = new ElastickbirdModel({ 
      alias: "test-example",
      mappings: { properties: {} }
    });
    expect(async () => await model.createIndex()).rejects.toThrow("Elasticsearch client not configured");
  });

  test("should create index successfully", async () => {
    const model = new ElastickbirdModel({ 
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
    
    await model.createIndex();
    
    const exists = await model.existsIndex();
    expect(exists).toBe(true);
  });

  test("should handle createIndexIfNotExists", async () => {
    const model = new ElastickbirdModel({ 
      alias: "test-example",
      mappings: {
        properties: {
          name: { type: "text" }
        }
      }
    });
    
    // Should create index
    await model.createIndexIfNotExists();
    let exists = await model.existsIndex();
    expect(exists).toBe(true);
    
    // Should not throw error if index already exists
    await model.createIndexIfNotExists();
    exists = await model.existsIndex();
    expect(exists).toBe(true);
  });
});
