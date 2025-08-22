import { ElastickbirdModel } from "../../lib/model/ElastickbirdModel";
import { ElasticsearchClient } from "../../lib/client/ElasticsearchClient";

const ELASTICSEARCH_URL = (global as any).ELASTICSEARCH_URL as string;

describe("ElastickbirdModel Bulk Operations", () => {
  let User: ElastickbirdModel;
  
  beforeEach(async () => {
    ElasticsearchClient.configure({ node: ELASTICSEARCH_URL });
    
    User = new ElastickbirdModel({
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

    await User.createIndexIfNotExists();
  });

  afterEach(async () => {
    try {
      const exists = await User.existsIndex();
      if (exists) {
        await User.deleteIndex();
      }
    } catch (e) {
      // Ignore cleanup errors
    }
    ElasticsearchClient.reset();
  });

  describe("Bulk Operations", () => {
    test("should initialize bulk operation", () => {
      const bulk = User.initBulk();
      expect(bulk).toBeDefined();
      expect(typeof bulk.execute).toBe('function');
      expect(typeof bulk.addIndexOperation).toBe('function');
      expect(typeof bulk.addUpdateOperation).toBe('function');
      expect(typeof bulk.addCreateOperation).toBe('function');
    });

    test("should perform bulk index operations", async () => {
      const bulk = User.initBulk();
      
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
      await User.refreshIndex();
      const exists1 = await User.documentExists({ id: '1' });
      const exists2 = await User.documentExists({ id: '2' });
      expect(exists1).toBe(true);
      expect(exists2).toBe(true);
    });

    test("should perform mixed bulk operations", async () => {
      // First, create a document to update
      await User.indexDocument({
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        status: 'active'
      });
      await User.refreshIndex();

      const bulk = User.initBulk();
      
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
      await User.refreshIndex();
      const user1 = await User.getDocument({ id: '1' });
      const user2 = await User.getDocument({ id: '2' });
      
      expect(user1.age).toBe(31);
      expect(user1.status).toBe('updated');
      expect(user2.name).toBe('Jane Smith');
    });

    test("should handle bulk operation errors gracefully", async () => {
      const bulk = User.initBulk();
      
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
      const bulkQueue = User.initBulkQueue();
      expect(bulkQueue).toBeDefined();
      expect(typeof bulkQueue.waitForCompletion).toBe('function');
      expect(typeof bulkQueue.addOperationsToQueue).toBe('function');
    });

    test("should process bulk queue operations", async () => {
      const bulkQueue = User.initBulkQueue({ batchSize: 2 });
      
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
      await User.refreshIndex();
      const exists1 = await User.documentExists({ id: '1' });
      const exists2 = await User.documentExists({ id: '2' });
      const exists3 = await User.documentExists({ id: '3' });
      
      expect(exists1).toBe(true);
      expect(exists2).toBe(true);
      expect(exists3).toBe(true);
    });
  });

  describe("Batch Mode Operations", () => {
    test("should handle batch mode bulk operations", async () => {
      const bulk = User.initBulk({ 
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
      await User.refreshIndex();
      
      for (let i = 1; i <= 5; i++) {
        const exists = await User.documentExists({ id: `user-${i}` });
        expect(exists).toBe(true);
      }
    });
  });
}); 