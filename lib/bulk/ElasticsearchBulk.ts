import { DOC_OPERATION_TYPES, DocOperationType } from '../utils/Constants';
import { BulkOperationResult } from '../types';
import { 
  BulkOperationInBatchesResultInstance,
  createBulkOperationResult,
  createBulkOperationInBatchesResult
} from '../utils/ResponseResults';
import { ElasticsearchClient } from '../client/ElasticsearchClient';

interface ElasticsearchBulkOptions {
  getId: (payload: any) => string | number;
  schema: {
    alias: string;
    routing?: string;
    routingRules?: Record<string, (value: any) => string>;
  };
  batchMode?: boolean;
  batchSize?: number;
  refresh?: boolean;
}

export class ElasticsearchBulk {
  private operations: any[] = [];
  private getId: (payload: any) => string | number;
  private schema: {
    alias: string;
    routing?: string;
    routingRules?: Record<string, (value: any) => string>;
  };
  private batchMode: boolean;
  private batchSize: number;
  private refresh: boolean;
  private bulkOperationInBatchesResult?: BulkOperationInBatchesResultInstance;
  protected batchPromise?: Promise<any> | null;

  constructor({ 
    getId, 
    schema, 
    batchMode = false, 
    batchSize = 10000, 
    refresh = false 
  }: ElasticsearchBulkOptions) {
    this.getId = getId;
    this.refresh = refresh;
    this.batchMode = batchMode;
    this.batchSize = batchSize;
    this.schema = schema;
    
    if (batchMode) {
      this.batchPromise = null;
      this.bulkOperationInBatchesResult = createBulkOperationInBatchesResult();
    }
  }

  /**
   * Private Methods
   */
  private addOperationInternal(operation: DocOperationType, payload: any): void {
    // auto generate id through primary key attribute defined in schema
    const _id = this.getId(payload);
    if (!_id) return;

    if (!Object.values(DOC_OPERATION_TYPES).includes(operation)) {
      throw new Error(`Invalid Elasticsearch operation type: ${operation}`);
    }

    if (operation === DOC_OPERATION_TYPES.UPDATE) {
      payload = { doc: payload };
    }

    const operationRequest: any = { _index: this.schema.alias, _id };
    this.setRouting(operationRequest, payload);
    this.operations.push({ [operation]: operationRequest }, payload);
  }

  private async executeInternal(operations: any[]): Promise<any> {
    if (!operations.length) return;
    const client = ElasticsearchClient.getClient();
    return await client.bulk({ operations, refresh: this.refresh });
  }

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

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Protected methods
   */
  protected addOperations(operation: DocOperationType, dataArr: any[]): void {
    dataArr.forEach(data => this.addOperationInternal(operation, data));
  }

  protected getBulkResults(): BulkOperationResult {
    if (!this.bulkOperationInBatchesResult) {
      throw new Error('Bulk operation in batches result not initialized');
    }
    return this.bulkOperationInBatchesResult.getResults();
  }

  protected async executeInBatches(): Promise<void> {
    const response = await this.batchPromise;
    if (response && this.bulkOperationInBatchesResult) {
      this.bulkOperationInBatchesResult.addResult(response);
    }
    
    const batch = this.operations.splice(0, this.batchSize * 2);
    if (!batch.length) {
      // if there are no more operations, resolve the executing promise
      return;
    }
    
    this.batchPromise = this.executeInternal(batch);
    await this.executeInBatches();
  }

  /**
   * Public methods
   */

  /**
   * Add operation of specified type
   * @param operation - The operation type
   * @param data - The document data
   */
  addOperation(operation: DocOperationType, data: any): void {
    this.addOperationInternal(operation, data);
  }

  /**
   * Add operation of type index
   * @param data - The document data
   */
  addIndexOperation(data: any): void {
    this.addOperationInternal(DOC_OPERATION_TYPES.INDEX, data);
  }

  /**
   * Add operation of type create
   * @param data - The document data
   */
  addCreateOperation(data: any): void {
    this.addOperationInternal(DOC_OPERATION_TYPES.CREATE, data);
  }

  /**
   * Add operation of type update
   * @param data - The document data
   */
  addUpdateOperation(data: any): void {
    this.addOperationInternal(DOC_OPERATION_TYPES.UPDATE, data);
  }

  /**
   * Execute all operations
   * @returns Promise<BulkOperationResult>
   */
  async execute(): Promise<BulkOperationResult> {
    if (this.batchMode) {
      await this.executeInBatches();
      return this.getBulkResults();
    }
    
    const response = await this.executeInternal(this.operations);
    return createBulkOperationResult(response);
  }
} 