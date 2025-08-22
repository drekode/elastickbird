# Elastickbird 🐦

[Elasticsearch]: https://www.elastic.co/elasticsearch
[Mongoose]: https://mongoosejs.com/
[Sequelize]: https://sequelize.org/
[![npm version](https://img.shields.io/npm/v/elastickbird.svg)](https://www.npmjs.com/package/elastickbird)
[![npm downloads](https://img.shields.io/npm/dm/elastickbird.svg)](https://www.npmjs.com/package/elastickbird)
[![License](https://img.shields.io/npm/l/elastickbird.svg)](./LICENSE)
[![CI](https://github.com/dresiko/elastickbird/actions/workflows/ci.yml/badge.svg)](https://github.com/dresiko/elastickbird/actions/workflows/ci.yml)

A high-level [Elasticsearch] driver for Node.js, inspired by [Mongoose] and [Sequelize]. Elastickbird provides an elegant, model-based solution to work with Elasticsearch, making it easy to define mappings, perform CRUD operations, and execute complex queries.


## Features

- 🏗️ **Model-based approach** - Define your Elasticsearch mappings with TypeScript interfaces
- 🔍 **Powerful Query Builder** - Fluent API for building complex Elasticsearch queries
- 📦 **Bulk Operations** - Efficient bulk indexing, updating, and deleting with batch support
- 🔄 **Index Management** - Create, update, and manage Elasticsearch indices
- 🛡️ **Type Safety** - Full TypeScript support with proper type definitions
- 🚀 **High Performance** - Optimized for production use with connection pooling
- 📊 **Advanced Features** - Support for routing, filtering rules, and search-after pagination

## Installation

```bash
npm install elastickbird
```

## Quick Start

### 1. Configure Elasticsearch Client

```typescript
import { ElasticsearchClient } from 'elastickbird';

// Configure the Elasticsearch client
ElasticsearchClient.configure({
  node: 'http://localhost:9200',
  auth: {
    username: 'elastic',
    password: 'password'
  }
});
```

### 2. Define a Model

```typescript
import { ElastickbirdModel } from 'elastickbird';

// Define your model
const User = new ElastickbirdModel({
  alias: 'users',
  primaryKeyAttribute: 'id',
  mappings: {
    properties: {
      id: { type: 'keyword' },
      name: { type: 'text' },
      email: { type: 'keyword' },
      age: { type: 'integer' },
      createdAt: { type: 'date' }
    }
  },
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0
  }
});
```

### 3. Basic Operations

```typescript
// Create the index
await User.createIndex();

// Index a document
const result = await User.indexDocument({
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
  createdAt: new Date()
});

// Get a document by ID
const user = await User.getDocument({ id: '1' });

// Update a document
await User.updateDocument({
  id: '1',
  name: 'John Smith',
  age: 31
});

// Delete a document
await User.deleteDocument({ id: '1' });
```

### 4. Search with Query Builder

```typescript
// Create a query builder
const query = User.query();

// Build a complex query
query
  .addTerm('status', 'active')
  .should({ minimumShouldMatch: 1 })
    .addMatch('name', 'john')
    .addRange('age', { gte: 18, lte: 65 })
  .setSize(10)
  .addSort('createdAt', 'desc');

// Execute the search
const searchResults = await query.search()
console.log(searchResults.rows); // Array of matching documents
console.log(searchResults.count); // Total count
```

### 5. Bulk Operations

```typescript
// Initialize bulk operation
const bulk = User.initBulk({ batchSize: 1000 });

// Add multiple operations
bulk.addIndexOperation({ id: '1', name: 'User 1', email: 'user1@example.com' });
bulk.addIndexOperation({ id: '2', name: 'User 2', email: 'user2@example.com' });
bulk.addUpdateOperation({ id: '1', name: 'Updated User 1' });

// Execute all operations
const bulkResult = await bulk.execute();
console.log(bulkResult.success); // true if all operations succeeded
```

## Advanced Features

### Routing

```typescript
const model = new ElastickbirdModel({
  alias: 'orders',
  routing: 'customerId', // Route documents by customer ID
  mappings: {
    properties: {
      id: { type: 'keyword' },
      customerId: { type: 'keyword' },
      amount: { type: 'float' }
    }
  }
});

// The `customerId` will automatically be used for routing, determining in which shard the document will be located.
await User.createDocument({ id: '1', customerId: 'abc123' });

// Adding a filter by `customerId` will automatically add the routing to the search,
// causing Elasticsearch to search only in the relevant shard. This makes the query faster.
User.query().addTerm("customerId", 'abc123')
```

### Filter Rules

```typescript
import { ElastickbirdFilterRules } from 'elastickbird';

const filterRules = new ElastickbirdFilterRules({
  'active-users': (query) => {
    query.addTerm('status', 'active');
  },
  'recent': (query) => {
    query.addRange('createdAt', { gte: 'now-7d' });
  }
});

const model = new ElastickbirdModel({
  alias: 'users',
  filterRules,
  mappings: { /* ... */ }
});

// Use filter rules in queries
const query = model.query();
query.applyFilters('active-users,recent');
```

### Bulk Queue (Auto-batching)

```typescript
// Initialize bulk queue for auto-batching
const bulkQueue = User.initBulkQueue({ batchSize: 500 });

// Add operations in a loop
for (let i = 1; i <= 2000; i++) {
  bulkQueue.addOperationsToQueue('index', [
    { id: String(i), name: `User ${i}` }
  ]);
  // As you add operations, Elastickbird automatically batches and sends them to Elasticsearch for efficient processing.
}

// Wait for all operations to complete
const result = await bulkQueue.waitForCompletion();
```

## API Reference

### ElastickbirdModel

The main class for defining and working with Elasticsearch indices.

#### Constructor Options

```typescript
interface ElastickBirdSchema {
  alias: string;                    // Index alias name
  mappings: Record<string, any>;    // Elasticsearch mappings
  primaryKeyAttribute?: string;     // Primary key field (default: 'id')
  primaryKeyAttributes?: string[];  // Multiple primary key fields
  settings?: Record<string, any>;   // Index settings
  routing?: string;                 // Routing field
  routingRules?: Record<string, (value: any) => string>;
  filterRules?: ElastickbirdFilterRules;
  sortRules?: Record<string, (query: any, order: string) => void>;
  searchAfterDelimiter?: string;    // Delimiter for search-after (default: '~')
}
```

#### Methods

- `createIndex(options?)` - Create a new index
- `createIndexIfNotExists()` - Create index if it doesn't exist
- `deleteIndex()` - Delete the current index
- `truncateIndex()` - Delete and recreate the index
- `syncMapping()` - Update index mappings
- `indexDocument(payload, options?)` - Index a document
- `createDocument(payload, options?)` - Create a document (fails if exists)
- `updateDocument(payload, options?)` - Update a document
- `deleteDocument(payload, options?)` - Delete a document
- `search(request, options?)` - Execute a search query
- `deleteByQuery(params)` - Delete documents by query
- `updateByQuery(params)` - Update documents by query
- `documentExists(payload)` - Check if document exists
- `getDocument(payload)` - Get document by payload
- `getDocumentById(id)` - Get document by ID
- `query()` - Create a new query builder
- `initBulk(options?)` - Initialize bulk operations
- `initBulkQueue(options?)` - Initialize auto-batching bulk queue

### ElastickbirdQuery

Fluent API for building Elasticsearch queries.

#### Query Methods

- `addTerm(field, value)` - Add term query
- `addTerms(field, values)` - Add terms query
- `addMatch(field, value)` - Add match query
- `addRange(field, query)` - Add range query
- `addExists(field)` - Add exists query
- `addQueryString(query, options?)` - Add query string
- `addCustomClause(clause)` - Add custom query clause

#### Boolean Query Methods

- `must()` - Must occurrence (AND)
- `should(options?)` - Should occurrence (OR)
- `filter()` - Filter occurrence (no scoring)
- `mustNot()` - Must not occurrence (NOT)

#### Utility Methods

- `setSize(size)` - Set result size
- `setFrom(from)` - Set offset for pagination
- `addSort(field, order?)` - Add sort clause
- `setSearchAfter(searchAfter)` - Set search-after for pagination
- `build()` - Build the final query object

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

Apache-2.0

## Support

If you have any questions or need help, please open an issue on GitHub.