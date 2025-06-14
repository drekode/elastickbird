import { ElasticSchema } from "../../lib/schema/ElasticSchema";
import { ElasticsearchClient } from "../../lib/client/ElasticsearchClient";

const ELASTICSEARCH_URL = (global as any).ELASTICSEARCH_URL as string;

describe("ElasticSchema Bulk Operations", () => {
  let userSchema: ElasticSchema;
  
  beforeEach(async () => {
    ElasticsearchClient.configure({ node: ELASTICSEARCH_URL });
    
    userSchema = new ElasticSchema({
      alias: 'test-bulk-users',
      primaryKeyAttribute: 'id',
      mappings: {
        properties: {
          id: { type: 'keyword' },
          name: { type: 'text' },
          email: { type: 'keyword' },
          age: { type: 'integer' },
          status: { type: 'keyword' },
          createdAt: { type: 'date' },
          tags: { type: 'keyword' }
        }
      },
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0
      }
    });

    await userSchema.createIndexIfNotExists();
  });

  afterEach(async () => {
    try {
      const exists = await userSchema.existsIndex();
      if (exists) {
        await userSchema.deleteIndex();
      }
    } catch (e) {
      // Ignore cleanup errors
    }
    ElasticsearchClient.reset();
  });

  describe("Bulk Operations", () => {
    test("should initialize bulk operation", () => {
      const bulk = userSchema.initBulk();
      expect(bulk).toBeDefined();
      expect(typeof bulk.execute).toBe('function');
      expect(typeof bulk.addIndexOperation).toBe('function');
      expect(typeof bulk.addUpdateOperation).toBe('function');
      expect(typeof bulk.addCreateOperation).toBe('function');
    });

    test("should perform bulk index operations", async () => {
      const bulk = userSchema.initBulk();
      
      const users = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          age: 30,
          status: 'active',
          tags: ['developer', 'javascript'],
          createdAt: new Date('2023-01-15')
        },
        {
          id: '2',  
          name: 'Jane Smith',
          email: 'jane@example.com',
          age: 25,
          status: 'active',
          tags: ['designer', 'ui/ux'],
          createdAt: new Date('2023-02-20')
        }
      ];

      users.forEach(user => {
        bulk.addIndexOperation(user);
      });

      const result = await bulk.execute();
      
      expect(result.success).toBe(true);
      expect(result.total).toBe(2);

      // Verify documents were indexed
      await userSchema.refreshIndex();
      const exists1 = await userSchema.documentExists({ id: '1' });
      const exists2 = await userSchema.documentExists({ id: '2' });
      expect(exists1).toBe(true);
      expect(exists2).toBe(true);
    });

    test("should perform mixed bulk operations", async () => {
      // First, create a document to update
      await userSchema.indexDocument({
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        status: 'active'
      });
      await userSchema.refreshIndex();

      const bulk = userSchema.initBulk();
      
      // Add new document
      bulk.addIndexOperation({
        id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        age: 25,
        status: 'active',
        tags: ['designer'],
        createdAt: new Date()
      });
      
      // Update existing document
      bulk.addUpdateOperation({
        id: '1',
        age: 31,
        status: 'updated'
      });

      const result = await bulk.execute();
      
      expect(result.success).toBe(true);
      expect(result.total).toBe(2);

      // Verify operations
      await userSchema.refreshIndex();
      const user1 = await userSchema.getDocumentById({ id: '1' });
      const user2 = await userSchema.getDocumentById({ id: '2' });
      
      expect(user1.age).toBe(31);
      expect(user1.status).toBe('updated');
      expect(user2.name).toBe('Jane Smith');
    });

    test("should handle bulk operation errors gracefully", async () => {
      const bulk = userSchema.initBulk();
      
      // Add document with missing required field (should still succeed as ES is flexible)
      bulk.addIndexOperation({
        id: '1',
        name: 'Test User'
        // Missing other fields - should still work
      });

      const result = await bulk.execute();
      
      // Should still succeed even with minimal data
      expect(result.success).toBe(true);
      expect(result.total).toBe(1);
    });
  });

  describe("Bulk Queue Operations", () => {
    test("should initialize bulk queue", () => {
      const bulkQueue = userSchema.initBulkQueue();
      expect(bulkQueue).toBeDefined();
      expect(typeof bulkQueue.waitForCompletion).toBe('function');
      expect(typeof bulkQueue.addOperationsToQueue).toBe('function');
    });

    test("should process bulk queue operations", async () => {
      const bulkQueue = userSchema.initBulkQueue({ batchSize: 2 });
      
      const users = [
        { id: '1', name: 'User 1', email: 'user1@example.com', age: 25 },
        { id: '2', name: 'User 2', email: 'user2@example.com', age: 26 },
        { id: '3', name: 'User 3', email: 'user3@example.com', age: 27 }
      ];

      // Add operations to queue
      bulkQueue.addOperationsToQueue('index', users);

      // Wait for completion
      const result = await bulkQueue.waitForCompletion();
      
      expect(result.success).toBe(true);
      expect(result.total).toBe(3);

      // Verify all documents were indexed
      await userSchema.refreshIndex();
      const exists1 = await userSchema.documentExists({ id: '1' });
      const exists2 = await userSchema.documentExists({ id: '2' });
      const exists3 = await userSchema.documentExists({ id: '3' });
      
      expect(exists1).toBe(true);
      expect(exists2).toBe(true);
      expect(exists3).toBe(true);
    });
  });

  describe("Batch Mode Operations", () => {
    test("should handle batch mode bulk operations", async () => {
      const bulk = userSchema.initBulk({ 
        batchMode: true, 
        batchSize: 2 
      });
      
      const users = Array.from({ length: 5 }, (_, i) => ({
        id: `user-${i + 1}`,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        age: 20 + i
      }));

      users.forEach(user => {
        bulk.addIndexOperation(user);
      });

      const result = await bulk.execute();
      
      expect(result.success).toBe(true);
      expect(result.total).toBe(5);

      // Verify all documents were indexed
      await userSchema.refreshIndex();
      
      for (let i = 1; i <= 5; i++) {
        const exists = await userSchema.documentExists({ id: `user-${i}` });
        expect(exists).toBe(true);
      }
    });
  });
}); 