import { ElasticSchema, ElasticsearchClient } from '../lib';

// Configure Elasticsearch client
ElasticsearchClient.configure({
  node: 'http://localhost:9200',
  // Uncomment if you need authentication
  // auth: {
  //   username: 'elastic',
  //   password: 'password'
  // }
});

// Define a user schema
const userSchema = new ElasticSchema({
  alias: 'users',
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

async function basicExample() {
  try {
    // Create index if it doesn't exist
    await userSchema.createIndexIfNotExists();
    console.log('✅ Index created or already exists');

    // Index some documents
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

    // Index documents one by one
    for (const user of users) {
      const result = await userSchema.indexDocument(user);
      console.log(`✅ Indexed user ${user.id}:`, result.success);
    }

    // Refresh index to make documents searchable immediately
    await userSchema.refreshIndex();

    // Get a document by ID
    const user = await userSchema.getDocumentById({ id: '1' });
    console.log('📄 Retrieved user:', user);

    // Update a document
    const updateResult = await userSchema.updateDocument({
      id: '1',
      name: 'John Smith',
      age: 31
    });
    console.log('✏️ Updated user:', updateResult.success);

    // Search with query builder
    const queryBuilder = userSchema.QueryBuilder();
    
    // Build a complex query
    queryBuilder
      .addTerm('status', 'active')
      .should({ minimumShouldMatch: 1 })
        .addMatch('name', 'john')
        .addRange('age', { gte: 25, lte: 35 })
      .setSize(10)
      .addSort('createdAt', 'desc');

    const searchResults = await userSchema.search(queryBuilder.build());
    console.log('🔍 Search results:', {
      count: searchResults.count,
      users: searchResults.rows
    });

    // Search for users with specific tags
    const tagQuery = userSchema.QueryBuilder();
    tagQuery.addTerms('tags', ['developer', 'designer']);
    
    const tagResults = await userSchema.search(tagQuery.build());
    console.log('🏷️ Users with developer or designer tags:', tagResults.rows);

    // Bulk operations example
    const bulk = userSchema.initBulk();
    
    // Add multiple operations
    bulk.addIndexOperation({
      id: '4',
      name: 'Alice Brown',
      email: 'alice@example.com',
      age: 28,
      status: 'active',
      tags: ['developer', 'python'],
      createdAt: new Date()
    });
    
    bulk.addUpdateOperation({
      id: '2',
      age: 26
    });

    // Execute bulk operations
    const bulkResult = await bulk.execute();
    console.log('📦 Bulk operation result:', {
      success: bulkResult.success,
      total: bulkResult.total
    });

    // Check if a document exists
    const exists = await userSchema.documentExists({ id: '1' });
    console.log('🔍 Document exists:', exists);

    // Delete a document
    const deleteResult = await userSchema.deleteDocument({ id: '3' });
    console.log('🗑️ Deleted user:', deleteResult.success);

    // Get index statistics
    const indexSize = await userSchema.getIndexSize();
    console.log('📊 Index size:', indexSize);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the example
basicExample().then(() => {
  console.log('🎉 Example completed!');
}).catch(console.error); 