import { ElastickbirdModel } from "../../lib/model/ElastickbirdModel";
import { ElasticsearchClient } from "../../lib/client/ElasticsearchClient";

const ELASTICSEARCH_URL = (global as any).ELASTICSEARCH_URL as string;

describe("ElastickbirdModel CRUD Operations", () => {
  let UserModel: ElastickbirdModel;
  
  beforeEach(async () => {
    ElasticsearchClient.configure({ node: ELASTICSEARCH_URL });
    
    UserModel = new ElastickbirdModel({
      alias: 'test-users',
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

    await UserModel.truncateIndex();

    // Add some test data
    await UserModel.indexDocument({
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
      status: 'active',
      tags: ['developer', 'javascript'],
      createdAt: new Date('2023-01-15')
    });

    await UserModel.indexDocument({
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      age: 25,
      status: 'active',
      tags: ['designer', 'ui/ux'],
      createdAt: new Date('2023-02-20')
    });

    await UserModel.refreshIndex();
  });

  afterEach(async () => {
    try {
      const exists = await UserModel.existsIndex();
      if (exists) {
        await UserModel.deleteIndex();
      }
    } catch (e) {
      // Ignore cleanup errors
    }
    ElasticsearchClient.reset();
  });

  describe("Document Indexing", () => {
    test("should index a document successfully", async () => {
      const user = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        status: 'active',
        tags: ['developer', 'javascript'],
        createdAt: new Date('2023-01-15')
      };

      const result = await UserModel.indexDocument(user);
      
      expect(result.success).toBe(true);
      expect(result.total).toBe(1);
      expect(result.result).toBe('updated');
    });

    test("should update existing document when indexing with same ID", async () => {
      const user = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        status: 'active'
      };

      // First index
      await UserModel.indexDocument(user);
      await UserModel.refreshIndex();

      // Update with same ID
      const updatedUser = { ...user, age: 31, name: 'John Smith' };
      const result = await UserModel.indexDocument(updatedUser);

      expect(result.success).toBe(true);
      expect(result.result).toBe('updated');
    });
  });

  describe("Document Retrieval", () => {
    test("should get document by payload", async () => {
      const user = await UserModel.getDocument({ id: '1' });
      
      expect(user).toBeDefined();
      expect(user.id).toBe('1');
      expect(user.name).toBe('John Doe');
      expect(user.email).toBe('john@example.com');
    });

    test("should get document by ID", async () => {
      const user = await UserModel.getDocumentById('1');
      
      expect(user).toBeDefined();
      expect(user.id).toBe('1');
      expect(user.name).toBe('John Doe');
      expect(user.email).toBe('john@example.com');
    });

    test("should check if document exists", async () => {
      const exists1 = await UserModel.documentExists({ id: '1' });
      const exists2 = await UserModel.documentExists({ id: 'nonexistent' });
      
      expect(exists1).toBe(true);
      expect(exists2).toBe(false);
    });
  });

  describe("Document Updates", () => {
    test("should update document", async () => {
      const result = await UserModel.updateDocument({
        id: '1',
        name: 'John Smith',
        age: 31
      });

      expect(result.success).toBe(true);
      expect((result as any).updated).toBe(1);

      // Verify update
      await UserModel.refreshIndex();
      const updatedUser = await UserModel.getDocument({ id: '1' });
      expect(updatedUser.name).toBe('John Smith');
      expect(updatedUser.age).toBe(31);
      expect(updatedUser.email).toBe('john@example.com'); // Should preserve other fields
    });
  });

  describe("Document Deletion", () => {
    test("should delete document", async () => {
      const result = await UserModel.deleteDocument({ id: '1' });

      expect(result.success).toBe(true);
      expect((result as any).deleted).toBe(1);

      // Verify deletion
      await UserModel.refreshIndex();
      const exists = await UserModel.documentExists({ id: '1' });
      expect(exists).toBe(false);
    });
  });

  describe("Error Handling", () => {
    test("should handle missing ID for operations requiring it", async () => {
      const resultGet = await UserModel.getDocument({});
      expect(resultGet.success).toBe(false);
      expect(resultGet.error).toContain('Missing primary key field');

      const resultUpdate = await UserModel.updateDocument({ name: 'Test' });
      expect(resultUpdate.success).toBe(false);
      expect(resultUpdate.error).toContain('Missing primary key field');

      const resultDelete = await UserModel.deleteDocument({});
      expect(resultDelete.success).toBe(false);
      expect(resultDelete.error).toContain('Missing primary key field');
    });
  });
}); 