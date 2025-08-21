import { ElastickbirdModel } from "../../lib/model/ElastickbirdModel";
import { ElasticsearchClient } from "../../lib/client/ElasticsearchClient";

const ELASTICSEARCH_URL = (global as any).ELASTICSEARCH_URL as string;

describe("ElastickbirdModel Search Operations", () => {
  let UserModel: ElastickbirdModel;

  beforeEach(async () => {
    ElasticsearchClient.configure({ node: ELASTICSEARCH_URL });

    UserModel = new ElastickbirdModel({
      alias: "test-search-users",
      primaryKeyAttribute: "id",
      mappings: {
        properties: {
          id: { type: "keyword" },
          name: { type: "text" },
          email: { type: "keyword" },
          age: { type: "integer" },
          status: { type: "keyword" },
          createdAt: { type: "date" },
          tags: { type: "keyword" },
        },
      },
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0,
      },
    });

    await UserModel.createIndexIfNotExists();

    // Seed test data
    const users = [
      {
        id: "1",
        name: "John Doe",
        email: "john@example.com",
        age: 30,
        status: "active",
        tags: ["developer", "javascript"],
        createdAt: new Date("2023-01-15"),
      },
      {
        id: "2",
        name: "Jane Smith",
        email: "jane@example.com",
        age: 25,
        status: "active",
        tags: ["designer", "ui/ux"],
        createdAt: new Date("2023-02-20"),
      },
      {
        id: "3",
        name: "Bob Johnson",
        email: "bob@example.com",
        age: 35,
        status: "inactive",
        tags: ["manager", "product"],
        createdAt: new Date("2023-03-10"),
      },
    ];

    for (const user of users) {
      await UserModel.indexDocument(user);
    }
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

  describe("Query Builder", () => {
    test("should create query builder instance", () => {
      const query = UserModel.query();
      expect(query).toBeDefined();
      expect(typeof query.build).toBe("function");
    });

    test("should build and execute complex query", async () => {
      const query = UserModel.query();

      query.addTerm("status", "active");

      query
        .should({ minimumShouldMatch: 1 })
        .addMatch("name", "john")
        .addRange("age", { gte: 25, lte: 35 });

      query.setSize(10).addSort("createdAt", "desc");

      const searchResults = await UserModel.search(query.build());

      expect(searchResults.count).toBeGreaterThan(0);
      expect(searchResults.rows).toBeDefined();
      expect(Array.isArray(searchResults.rows)).toBe(true);
    });

    test("should search with terms query", async () => {
      const query = UserModel.query();
      query.addTerms("tags", ["developer", "designer"]);

      const results = await UserModel.search(query.build());

      expect(results.count).toBe(2);
      expect(results.rows.length).toBe(2);

      const userIds = results.rows.map((user: any) => user.id);
      expect(userIds).toContain("1");
      expect(userIds).toContain("2");
    });

    test("should search with range query", async () => {
      const query = UserModel.query();
      query.addRange("age", { gte: 30 });

      const results = await UserModel.search(query.build());

      expect(results.count).toBe(2);
      results.rows.forEach((user: any) => {
        expect(user.age).toBeGreaterThanOrEqual(30);
      });
    });

    test("should search with match query", async () => {
      const query = UserModel.query();
      query.addMatch("name", "John");

      const results = await UserModel.search(query.build());

      expect(results.count).toBe(1);
      expect(results.rows[0].name).toBe("John Doe");
    });

    test("should handle empty search results", async () => {
      const query = UserModel.query();
      query.addTerm("status", "nonexistent");

      const results = await UserModel.search(query.build());

      expect(results.count).toBe(0);
      expect(results.rows).toEqual([]);
    });
  });

  describe("Search Options", () => {
    test("should limit search results with size", async () => {
      const query = UserModel.query();
      query.addTerm("status", "active").setSize(1);

      const results = await UserModel.search(query.build());

      expect(results.rows.length).toBe(1);
    });

    test("should sort search results", async () => {
      const query = UserModel.query();
      query.must().addTerm("status", "active");

      query.setSize(10).addSort("age", "asc");

      const results = await UserModel.search(query.build());

      expect(results.rows.length).toBe(2);
      expect(results.rows[0].age).toBeLessThanOrEqual(results.rows[1].age);
    });

    test("should use pagination with from", async () => {
      const query = UserModel.query();
      query.setSize(1).setFrom(1).addSort("age", "asc");

      const results = await UserModel.search(query.build());

      expect(results.rows.length).toBe(1);
      // Should be the second result when sorted by age
      expect(results.rows[0].age).toBe(30);
    });
  });

  describe("Boolean Queries", () => {
    test("should use must query", async () => {
      const query = UserModel.query();
      query.must().addTerm("status", "active").addRange("age", { gte: 25, lte: 30 });

      const results = await UserModel.search(query.build());

      expect(results.count).toBe(2);
      results.rows.forEach((user: any) => {
        expect(user.status).toBe("active");
        expect(user.age).toBeGreaterThanOrEqual(25);
        expect(user.age).toBeLessThanOrEqual(30);
      });
    });

    test("should use filter query", async () => {
      const query = UserModel.query();
      query.filter().addTerm("status", "active");

      const results = await UserModel.search(query.build());

      expect(results.count).toBe(2);
      results.rows.forEach((user: any) => {
        expect(user.status).toBe("active");
      });
    });

    test("should use mustNot query", async () => {
      const query = UserModel.query();
      query.mustNot().addTerm("status", "inactive");

      const results = await UserModel.search(query.build());

      expect(results.count).toBe(2);
      results.rows.forEach((user: any) => {
        expect(user.status).not.toBe("inactive");
      });
    });
  });

  describe("Index Statistics", () => {
    test("should get index size", async () => {
      const stats = await UserModel.getIndexSize();

      expect(stats).toBeDefined();
      expect(stats.count).toBe(3);
      expect(stats._shards).toBeDefined();
      expect(stats._shards.total).toBe(1);
    });
  });
});
