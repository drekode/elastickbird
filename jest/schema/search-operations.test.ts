import { ElasticSchema } from "../../lib/schema/ElasticSchema";
import { ElasticsearchClient } from "../../lib/client/ElasticsearchClient";

const ELASTICSEARCH_URL = (global as any).ELASTICSEARCH_URL as string;

describe("ElasticSchema Search Operations", () => {
  let userSchema: ElasticSchema;
  
  beforeEach(async () => {
    ElasticsearchClient.configure({ node: ELASTICSEARCH_URL });
    
    userSchema = new ElasticSchema({
      alias: 'test-search-users',
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

    // Seed test data
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
      },
      {
        id: '3',
        name: 'Bob Johnson',
        email: 'bob@example.com',
        age: 35,
        status: 'inactive',
        tags: ['manager', 'product'],
        createdAt: new Date('2023-03-10')
      }
    ];

    for (const user of users) {
      await userSchema.indexDocument(user);
    }
    await userSchema.refreshIndex();
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

  describe("Query Builder", () => {
    test("should create query builder instance", () => {
      const queryBuilder = userSchema.QueryBuilder();
      expect(queryBuilder).toBeDefined();
      expect(typeof queryBuilder.build).toBe('function');
    });

    test("should build and execute complex query", async () => {
      const queryBuilder = userSchema.QueryBuilder();
      
      queryBuilder
        .addTerm('status', 'active');
      
      queryBuilder.should({ minimumShouldMatch: 1 })
        .addMatch('name', 'john')
        .addRange('age', { gte: 25, lte: 35 });
        
      queryBuilder
        .setSize(10)
        .addSort('createdAt', 'desc');

      const searchResults = await userSchema.search(queryBuilder.build());
      
      expect(searchResults.count).toBeGreaterThan(0);
      expect(searchResults.rows).toBeDefined();
      expect(Array.isArray(searchResults.rows)).toBe(true);
    });

    test("should search with terms query", async () => {
      const queryBuilder = userSchema.QueryBuilder();
      queryBuilder.addTerms('tags', ['developer', 'designer']);
      
      const results = await userSchema.search(queryBuilder.build());
      
      expect(results.count).toBe(2);
      expect(results.rows.length).toBe(2);
      
      const userIds = results.rows.map((user: any) => user.id);
      expect(userIds).toContain('1');
      expect(userIds).toContain('2');
    });

    test("should search with range query", async () => {
      const queryBuilder = userSchema.QueryBuilder();
      queryBuilder.addRange('age', { gte: 30 });
      
      const results = await userSchema.search(queryBuilder.build());
      
      expect(results.count).toBe(2);
      results.rows.forEach((user: any) => {
        expect(user.age).toBeGreaterThanOrEqual(30);
      });
    });

    test("should search with match query", async () => {
      const queryBuilder = userSchema.QueryBuilder();
      queryBuilder.addMatch('name', 'John');
      
      const results = await userSchema.search(queryBuilder.build());
      
      expect(results.count).toBe(1);
      expect(results.rows[0].name).toBe('John Doe');
    });

    test("should handle empty search results", async () => {
      const queryBuilder = userSchema.QueryBuilder();
      queryBuilder.addTerm('status', 'nonexistent');
      
      const results = await userSchema.search(queryBuilder.build());
      
      expect(results.count).toBe(0);
      expect(results.rows).toEqual([]);
    });
  });

  describe("Search Options", () => {
    test("should limit search results with size", async () => {
      const queryBuilder = userSchema.QueryBuilder();
      queryBuilder
        .addTerm('status', 'active')
        .setSize(1);
      
      const results = await userSchema.search(queryBuilder.build());
      
      expect(results.rows.length).toBe(1);
    });

    test("should sort search results", async () => {
      const queryBuilder = userSchema.QueryBuilder();
      queryBuilder.must()
        .addTerm('status', 'active');
      
      queryBuilder
        .setSize(10)
        .addSort('age', 'asc');
      
      const results = await userSchema.search(queryBuilder.build());
      
      expect(results.rows.length).toBe(2);
      expect(results.rows[0].age).toBeLessThanOrEqual(results.rows[1].age);
    });

    test("should use pagination with from", async () => {
      const queryBuilder = userSchema.QueryBuilder();
      queryBuilder
        .setSize(1)
        .setFrom(1)
        .addSort('age', 'asc');
      
      const results = await userSchema.search(queryBuilder.build());
      
      expect(results.rows.length).toBe(1);
      // Should be the second result when sorted by age
      expect(results.rows[0].age).toBe(30);
    });
  });

  describe("Boolean Queries", () => {
    test("should use must query", async () => {
      const queryBuilder = userSchema.QueryBuilder();
      queryBuilder.must()
        .addTerm('status', 'active')
        .addRange('age', { gte: 25, lte: 30 });
      
      const results = await userSchema.search(queryBuilder.build());
      
      expect(results.count).toBe(2);
      results.rows.forEach((user: any) => {
        expect(user.status).toBe('active');
        expect(user.age).toBeGreaterThanOrEqual(25);
        expect(user.age).toBeLessThanOrEqual(30);
      });
    });

    test("should use filter query", async () => {
      const queryBuilder = userSchema.QueryBuilder();
      queryBuilder.filter()
        .addTerm('status', 'active');
      
      const results = await userSchema.search(queryBuilder.build());
      
      expect(results.count).toBe(2);
      results.rows.forEach((user: any) => {
        expect(user.status).toBe('active');
      });
    });

    test("should use mustNot query", async () => {
      const queryBuilder = userSchema.QueryBuilder();
      queryBuilder.mustNot()
        .addTerm('status', 'inactive');
      
      const results = await userSchema.search(queryBuilder.build());
      
      expect(results.count).toBe(2);
      results.rows.forEach((user: any) => {
        expect(user.status).not.toBe('inactive');
      });
    });
  });

  describe("Index Statistics", () => {
    test("should get index size", async () => {
      const stats = await userSchema.getIndexSize();
      
      expect(stats).toBeDefined();
      expect(stats.count).toBe(3);
      expect(stats._shards).toBeDefined();
      expect(stats._shards.total).toBe(1);
    });
  });
}); 