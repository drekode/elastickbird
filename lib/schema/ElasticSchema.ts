import { ElasticsearchClient } from '../client/ElasticsearchClient';
import { ElastickbirdQuery } from '../query/ElasticsearchQueryBuilder';
import { ElasticsearchBulk } from '../bulk/ElasticsearchBulk';
import { ElasticsearchBulkQueue } from '../bulk/ElasticsearchBulkQueue';
import { 
  createDocumentOperationResult, 
  createByQueryOperationResult 
} from '../utils/ResponseResults';
import { ElasticSchemaConfig, DocumentOperationResult, ByQueryOperationResult } from '../types';

/**
 * ElastickbirdModel - A class for managing Elasticsearch indices, mappings, settings, and document operations.
 * Provides functionality to interact with Elasticsearch via CRUD operations, bulk operations, and more.
 */
export class ElastickbirdModel {
  private schema: ElasticSchemaConfig;

     /**
    * Creates an instance of ElastickbirdModel.
    * @param schema - The schema configuration for the Elasticsearch index.
    */
  constructor(schema: ElasticSchemaConfig) {
    const defaultsSchema: Partial<ElasticSchemaConfig> = {
      primaryKeyAttribute: "id",
      sortRules: {},
      searchAfterDelimiter: "~"
    };
    this.schema = { ...defaultsSchema, ...schema };
  }

  /**
   * Generates a new index name based on the current timestamp.
   * @returns The new index name.
   * @private
   */
  private generateNewIndexName(): string {
    return (this.schema.alias + "_" + new Date().toISOString().replace(/[-:.T]/g, '').slice(0, 15)).toLowerCase();
  }

  /**
   * Creates an error response for operations missing required primary key fields.
   * @param payload - The document payload.
   * @returns The error response object.
   * @private
   */
  private createMissingIdOperationError(payload: any = {}): DocumentOperationResult {
    const missingFields = this.schema.primaryKeyAttributes?.length
      ? this.schema.primaryKeyAttributes.filter(key => !this.getNestedValue(payload, key))
      : !payload[this.schema.primaryKeyAttribute || 'id'];

    return {
      success: false,
      error: `Missing primary key field(s): ${Array.isArray(missingFields) ? missingFields.join(", ") : this.schema.primaryKeyAttribute}`,
      total: 0
    };
  }

  /**
   * Get nested value from object using dot notation
   * @param obj - The object to get value from
   * @param path - The path to the value
   * @returns The value at the path
   * @private
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set routing value for request
   * @param request - The request object
   * @param payload - The document payload
   * @private
   */
  private setRouting(request: any, payload: any): void {
    if (this.schema.routing) {
      const routingValue = this.getNestedValue(payload, this.schema.routing);
      if (routingValue) request.routing = routingValue;
    } else if (this.schema.routingRules) {
      for (const [key, fn] of Object.entries(this.schema.routingRules)) {
        const value = this.getNestedValue(payload, key);
        if (value) {
          request.routing = fn(value);
          break;
        }
      }
    }
  }

  /**
   * Retrieves the current index name associated with the alias.
   * @returns The current index name or `false` if the alias doesn't exist.
   */
  async getIndexName(): Promise<string | false> {
    try {
      const client = ElasticsearchClient.getClient();
      const result = await client.indices.getAlias({ name: this.getAlias() });
      return Object.keys(result)[0];
    } catch (e) {
      return false;
    }
  }

  /**
   * Gets the mappings defined in the schema.
   * @returns The mappings for the index.
   */
  getMappings(): Record<string, any> {
    return this.schema.mappings || { properties: {} };
  }

  /**
   * Gets the properties defined in the mappings.
   * @returns The properties defined in the mappings.
   */
  getMappingsProperties(): Record<string, any> {
    return this.getMappings()?.properties || {};
  }

  /**
   * Gets the settings defined in the schema.
   * @returns The settings for the index.
   */
  getSettings(): Record<string, any> {
    let settings = this.schema.settings || {};
    // You can add test-specific settings here if needed
    return settings;
  }

  /**
   * Gets the alias name defined in the schema.
   * @returns The alias name.
   */
  getAlias(): string {
    return this.schema.alias;
  }

  /**
   * Checks if the index exists in Elasticsearch.
   * @returns `true` if the index exists, `false` otherwise.
   */
  async existsIndex(): Promise<boolean> {
    const client = ElasticsearchClient.getClient();
    return await client.indices.exists({ index: this.getAlias() });
  }

  /**
   * Creates a new Elasticsearch index with the current settings and mappings.
   * @param options - Creation options
   * @returns The response from Elasticsearch.
   */
  async createIndex({ setAlias = true }: { setAlias?: boolean } = {}): Promise<any> {
    const client = ElasticsearchClient.getClient();
    return await client.indices.create({
      index: this.generateNewIndexName(),
      aliases: setAlias ? { [this.getAlias()]: {} } : {},
      mappings: this.getMappings(),
      settings: this.getSettings()
    });
  }

  /**
   * Updates the mapping for Elasticsearch indices when introducing new fields or modifying mapping parameters.
   * Note: For changes in field types, a reIndex operation is necessary.
   * @returns Returns `true` if the mapping was successfully updated.
   */
  async syncMapping(): Promise<boolean> {
    const mappings = this.getMappings();
    const alias = this.getAlias();
    try {
      const client = ElasticsearchClient.getClient();
      const { acknowledged } = await client.indices.putMapping({
        index: alias,
        body: mappings
      });
      return acknowledged;
    } catch (e) {
      console.error("Failed to sync mapping", {
        error: e instanceof Error ? e.message : 'Unknown error',
        mappings,
        alias
      });
      return false;
    }
  }

  /**
   * Ensures the index exists; if not, creates it.
   */
  async createIndexIfNotExists(): Promise<void> {
    const exists = await this.existsIndex();
    if (!exists) {
      await this.createIndex();
    }
  }

  /**
   * Deletes the current index associated with the alias.
   * @returns The response from Elasticsearch.
   */
  async deleteIndex(): Promise<any> {
    const indexName = await this.getIndexName();
    if (indexName) {
      const client = ElasticsearchClient.getClient();
      return await client.indices.delete({ index: indexName });
    }
  }

  /**
   * Truncates the index by deleting and recreating it.
   */
  async truncateIndex(): Promise<void> {
    const exists = await this.existsIndex();
    if (exists) {
      await this.deleteIndex();
    }
    await this.createIndex();
  }

  /**
   * Indexes a document in Elasticsearch.
   * @param payload - The document to be indexed.
   * @param options - Additional options.
   * @returns The result of the indexing operation or an error.
   */
  async indexDocument(payload: any, { refresh = false }: { refresh?: boolean } = {}): Promise<DocumentOperationResult> {
    const mappingFields = Object.keys(this.getMappingsProperties());
    const body = this.pickFields(payload, mappingFields);

    const request: any = {
      index: this.getAlias(),
      body,
      refresh
    };

    const id = this.getId(payload);
    if (id) request.id = id;

    this.setRouting(request, payload);

    const client = ElasticsearchClient.getClient();
    const result = await client.index(request);
    return createDocumentOperationResult(result);
  }

  /**
   * Pick specific fields from an object
   * @param obj - The source object
   * @param fields - Array of field names to pick
   * @returns Object with only the specified fields
   * @private
   */
  private pickFields(obj: any, fields: string[]): any {
    const result: any = {};
    for (const field of fields) {
      if (obj.hasOwnProperty(field)) {
        result[field] = obj[field];
      }
    }
    return result;
  }

  /**
   * Creates a document in Elasticsearch.
   * @param payload - The document to create.
   * @param options - Additional options.
   * @returns The result of the creation or an error.
   */
  async createDocument(payload: any, { refresh = false }: { refresh?: boolean } = {}): Promise<DocumentOperationResult> {
    const id = this.getId(payload);
    if (!id) return this.createMissingIdOperationError(payload);

    const request: any = {
      index: this.getAlias(),
      id,
      body: payload,
      refresh
    };

    this.setRouting(request, payload);

    try {
      const client = ElasticsearchClient.getClient();
      const result = await client.create(request);
      return createDocumentOperationResult(result);
    } catch (e: any) {
      if (e.statusCode === 409) return createDocumentOperationResult({ result: "conflict" });
      throw e;
    }
  }

  /**
   * Updates a document in Elasticsearch by ID.
   * @param payload - The document to update.
   * @param options - Additional options.
   * @returns The result of the update or an error.
   */
  async updateDocument(
    payload: any, 
    { 
      refresh = false, 
      script = null, 
      upsert = false 
    }: { 
      refresh?: boolean; 
      script?: any; 
      upsert?: boolean; 
    } = {}
  ): Promise<DocumentOperationResult> {
    const id = this.getId(payload);
    if (!id) return this.createMissingIdOperationError(payload);

    const request: any = {
      index: this.getAlias(),
      id: this.getId(payload),
      body: {},
      refresh,
      doc_as_upsert: upsert && !script
    };

    this.setRouting(request, payload);

    if (script) {
      request.script = script;
      if (upsert) request.upsert = payload;
    } else {
      request.body.doc = payload;
    }

    const client = ElasticsearchClient.getClient();
    const result = await client.update(request);
    return createDocumentOperationResult(result);
  }

  /**
   * Deletes a document in Elasticsearch by ID.
   * @param payload - The document to delete.
   * @param options - Additional options.
   * @returns The result of the deletion or an error.
   */
  async deleteDocument(payload: any, { refresh = false }: { refresh?: boolean } = {}): Promise<DocumentOperationResult> {
    const id = this.getId(payload);
    if (!id) return this.createMissingIdOperationError(payload);

    const request: any = {
      index: this.getAlias(),
      id,
      refresh
    };
    this.setRouting(request, payload);

    try {
      const client = ElasticsearchClient.getClient();
      const result = await client.delete(request);
      return createDocumentOperationResult(result);
    } catch (err: any) {
      if (err.meta?.body?.result === "not_found") {
        return createDocumentOperationResult(err.meta?.body);
      }
      throw err;
    }
  }

  /**
   * Flushes the index to make all operations durable.
   * @returns The result of the flush operation.
   */
  async flushIndex(): Promise<any> {
    const client = ElasticsearchClient.getClient();
    return await client.indices.flush({ index: this.getAlias() });
  }

  /**
   * Refreshes the index to make all operations available for search.
   * @returns The result of the refresh operation.
   */
  async refreshIndex(): Promise<any> {
    const client = ElasticsearchClient.getClient();
    return await client.indices.refresh({ index: this.getAlias() });
  }

  /**
   * Retrieves the number of documents in the index.
   * @returns The document count.
   */
  async getIndexSize(): Promise<any> {
    const client = ElasticsearchClient.getClient();
    return await client.count({ index: this.getAlias() });
  }

  /**
   * Creates a query builder instance for this schema.
   * @returns A new query builder instance.
   */
  QueryBuilder(): ElastickbirdQuery {
    return new ElastickbirdQuery({
      sortRules: this.schema.sortRules,
      filterRules: this.schema.filterRules,
      routing: this.schema.routing,
      routingRules: this.schema.routingRules,
      searchAfterDelimiter: this.schema.searchAfterDelimiter
    });
  }

  /**
   * Executes a search query against the index.
   * @param request - The search request object.
   * @param options - Additional options.
   * @returns The search results.
   */
  async search(request: any = {}, { fields }: { fields?: string[] } = {}): Promise<any> {
    request.index = this.getAlias();
    if (fields?.length) request._source = fields;
    
    const client = ElasticsearchClient.getClient();
    const searchResult = await client.search(request);
    
    // Handle different total formats from Elasticsearch
    const totalHits = searchResult.hits.total;
    const count = typeof totalHits === 'number' ? totalHits : totalHits?.value || 0;
    
    const result: any = {
      rows: searchResult.hits.hits.map((res: any) => res._source),
      count
    };
    
    if (searchResult.aggregations) {
      result.aggregations = searchResult.aggregations;
    }
    
    if (
      searchResult.hits.hits.length &&
      request.size &&
      request.size === searchResult.hits.hits.length
    ) {
      const lastHit = searchResult.hits.hits[searchResult.hits.hits.length - 1];
      if (lastHit?.sort) {
        result.search_after = lastHit.sort.join(this.schema.searchAfterDelimiter);
      }
    }
    
    return result;
  }

  /**
   * Deletes documents in Elasticsearch that match the specified query.
   * @param params - Parameters for the delete operation.
   * @returns The result of the delete operation.
   */
  async deleteByQuery({ 
    query, 
    routing, 
    refresh = false 
  }: { 
    query: any; 
    routing?: string; 
    refresh?: boolean; 
  }): Promise<ByQueryOperationResult> {
    const request: any = {
      index: this.getAlias(),
      query,
      routing,
      refresh
    };
    
    const client = ElasticsearchClient.getClient();
    const result = await client.deleteByQuery(request);
    return createByQueryOperationResult(result);
  }

  /**
   * Updates documents in Elasticsearch that match the specified query.
   * @param params - Parameters for the update operation.
   * @returns The result of the update or a promise if progress tracking is used.
   */
  async updateByQuery({
    query,
    script,
    routing,
    progressCallback,
    progressIntervalDelay = 10000,
    refresh = false
  }: {
    query: any;
    script: any;
    routing?: string;
    progressCallback?: (updated: number) => void;
    progressIntervalDelay?: number;
    refresh?: boolean;
  }): Promise<ByQueryOperationResult | Promise<any>> {
    const waitForCompletion = !progressCallback;

    const request: any = {
      index: this.getAlias(),
      query,
      script,
      routing,
      refresh,
      wait_for_completion: waitForCompletion
    };

    const client = ElasticsearchClient.getClient();
    const result = await client.updateByQuery(request);

    if (waitForCompletion) return createByQueryOperationResult(result);

    const { task: task_id } = result;
    if (!task_id) {
      throw new Error('Task ID not returned from updateByQuery');
    }

    return new Promise(resolve => {
      const checkTask = async () => {
        const task = await client.tasks.get({ task_id: task_id as string });

        if (task.completed) {
          resolve(task);
          return;
        }
        if (progressCallback && task.task?.status?.updated !== undefined) {
          progressCallback(task.task.status.updated);
        }
        setTimeout(checkTask, progressIntervalDelay);
      };
      checkTask();
    });
  }

  /**
   * Checks if a document exists in Elasticsearch by ID.
   * @param payload - The document payload to check.
   * @returns True if the document exists, false otherwise, or an error if ID is missing.
   */
  async documentExists(payload: any): Promise<boolean | DocumentOperationResult> {
    const id = this.getId(payload);
    if (!id) return this.createMissingIdOperationError(payload);

    const request: any = {
      index: this.getAlias(),
      id
    };
    this.setRouting(request, payload);

    const client = ElasticsearchClient.getClient();
    return await client.exists(request);
  }

  /**
   * Retrieves a document from Elasticsearch by ID.
   * @param payload - The document payload to retrieve.
   * @returns The document source or an error if ID is missing.
   */
  async getDocumentById(payload: any): Promise<any | DocumentOperationResult> {
    const id = this.getId(payload);
    if (!id) return this.createMissingIdOperationError(payload);

    const request: any = {
      index: this.getAlias(),
      id
    };
    this.setRouting(request, payload);

    const client = ElasticsearchClient.getClient();
    const result = await client.get(request);
    return result?._source;
  }

  /**
   * Initializes a bulk operation for indexing, updating, or deleting multiple documents.
   * @param options - Options for the bulk operation.
   * @returns The bulk operation object.
   */
  initBulk({ 
    batchMode = false, 
    batchSize = 10000, 
    refresh = false 
  }: { 
    batchMode?: boolean; 
    batchSize?: number; 
    refresh?: boolean; 
  } = {}): ElasticsearchBulk {
    return new ElasticsearchBulk({
      getId: (payload: any) => {
        const id = this.getId(payload);
        return id || '';
      },
      schema: this.schema,
      batchMode,
      batchSize,
      refresh
    });
  }

  /**
   * Initializes a bulk operation queue for indexing, updating, or deleting multiple documents while adding operations in batches.
   * @param options - Options for the bulk operation queue.
   * @returns The bulk operation queue object.
   */
  initBulkQueue({ 
    batchSize = 10000, 
    refresh = false 
  }: { 
    batchSize?: number; 
    refresh?: boolean; 
  } = {}): ElasticsearchBulkQueue {
    return new ElasticsearchBulkQueue({
      getId: (payload: any) => {
        const id = this.getId(payload);
        return id || '';
      },
      schema: this.schema,
      batchSize,
      refresh
    });
  }

  /**
   * Constructs a unique ID for a document based on the schema's primary key attributes.
   * @param payload - The document payload.
   * @returns The constructed ID or false if required attributes are missing.
   */
  getId(payload: any): string | false {
    if (this.schema.primaryKeyAttributes?.length) {
      const areAllDefined = this.schema.primaryKeyAttributes.every(key => 
        !!this.getNestedValue(payload, key)
      );
      if (!areAllDefined) return false;
      return this.schema.primaryKeyAttributes
        .map(key => this.getNestedValue(payload, key))
        .join("_");
    } else {
      return this.getNestedValue(payload, this.schema.primaryKeyAttribute || 'id');
    }
  }
} 