import { ElasticsearchBulk } from './ElasticsearchBulk';
import { DocOperationType } from '../utils/Constants';
import { BulkOperationResult } from '../utils/ResponseResults';

interface ElasticsearchBulkQueueOptions {
  getId: (payload: any) => string | number;
  schema: {
    alias: string;
    routing?: string;
    routingRules?: Record<string, (value: any) => string>;
  };
  batchSize?: number;
  refresh?: boolean;
}

export class ElasticsearchBulkQueue extends ElasticsearchBulk {
  private executingPromise: Promise<void> | null = null;
  private resolveExecutingPromise?: () => void;

  constructor(options: ElasticsearchBulkQueueOptions) {
    super({ ...options, batchMode: true });
  }

  private async onOperationsAdded(): Promise<void> {
    if (this.executingPromise === null) {
      this.executingPromise = new Promise<void>(resolve => {
        this.resolveExecutingPromise = resolve;
      });
    }
    
    // if there is no batch promise ongoing, execute the operations
    if (this.batchPromise === null) {
      try {
        await this.executeInBatches();
      } catch (error) {
        console.error("Error executing bulk queue operations", { error });
      } finally {
        this.onOperationsFinished();
      }
    }
  }

  private onOperationsFinished(): void {
    if (this.resolveExecutingPromise) {
      this.resolveExecutingPromise();
    }
    this.executingPromise = null;
    this.batchPromise = null;
  }

  /**
   * Add operations to the queue
   * @param operation - The operation type
   * @param dataArr - Array of document data
   */
  addOperationsToQueue(operation: DocOperationType, dataArr: any[]): void {
    this.addOperations(operation, dataArr);
    this.onOperationsAdded();
  }

  /**
   * Wait for all operations to complete
   * @returns Promise<BulkOperationResult>
   */
  async waitForCompletion(): Promise<BulkOperationResult> {
    // wait for all the ongoing batches promises to resolve
    await this.executingPromise;
    return this.getBulkResults();
  }
} 