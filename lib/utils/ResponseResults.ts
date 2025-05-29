import { DocumentOperationResult, ByQueryOperationResult } from '../types';
import { DOC_OPERATION_TYPES } from './Constants';

/**
 * Creates a document operation result object
 * @param response - The Elasticsearch response
 * @returns DocumentOperationResult
 */
export function createDocumentOperationResult(response: any = {}): DocumentOperationResult & {
  result: string;
  deleted: number;
  updated: number;
  created: number;
} {
  return {
    success: response?.result !== "conflict",
    result: response?.result || "",
    deleted: response?.result === "deleted" ? 1 : 0,
    updated: response?.result === "updated" ? 1 : 0,
    created: response?.result === "created" ? 1 : 0,
    total: response?.result === "not_found" || response?.result === "conflict" ? 0 : 1
  };
}

/**
 * Bulk operation result interface
 */
export interface BulkOperationResult {
  success: boolean;
  total: number;
  errors?: any[];
  firstError?: any;
}

/**
 * Creates a bulk operation result object
 * @param response - The Elasticsearch bulk response
 * @returns BulkOperationResult
 */
export function createBulkOperationResult(response: any = {}): BulkOperationResult {
  const results: BulkOperationResult = {
    success: !response.errors,
    total: response.items?.length || 0
  };
  
  if (response.errors) {
    results.firstError = response.items?.find((item: any) =>
      Object.values(DOC_OPERATION_TYPES).some((op: any) => item[op]?.error)
    );

    results.errors = [];
    for (const item of response.items) {
      const itemValues = Object.values(item)[0] as any;
      if (itemValues.error) results.errors.push(itemValues.error);
    }
  }
  return results;
}

/**
 * Bulk operation in batches result instance
 */
export interface BulkOperationInBatchesResultInstance {
  addResult(response: any): void;
  getResults(): BulkOperationResult;
}

/**
 * Creates a bulk operation in batches result handler
 * @returns BulkOperationInBatchesResultInstance
 */
export function createBulkOperationInBatchesResult(): BulkOperationInBatchesResultInstance {
  const results: BulkOperationResult = {
    success: true,
    total: 0,
    errors: []
  };
  
  return {
    addResult: (response: any) => {
      const bulkOperationResult = createBulkOperationResult(response);
      results.success = bulkOperationResult.success && results.success;
      results.total += bulkOperationResult.total;
      if (bulkOperationResult.errors) {
        results.firstError = results.firstError || bulkOperationResult.firstError;
        if (!results.errors) results.errors = [];
        results.errors.push(...bulkOperationResult.errors);
      }
    },
    getResults: () => results
  };
}

/**
 * Creates a by-query operation result object
 * @param response - The Elasticsearch by-query response
 * @param error - Error message if the operation failed
 * @returns ByQueryOperationResult
 */
export function createByQueryOperationResult(
  response?: any,
  error?: string
): ByQueryOperationResult {
  if (error || !response) {
    return {
      success: false,
      error: error || 'Unknown error occurred',
      took: 0,
      timed_out: false,
      total: 0,
      batches: 0,
      version_conflicts: 0,
      noops: 0,
      retries: {
        bulk: 0,
        search: 0,
      },
      throttled_millis: 0,
      requests_per_second: 0,
      throttled_until_millis: 0,
      failures: [],
    };
  }

  return {
    success: !response.failures?.length && !!(response.deleted + response.updated),
    took: response.took || 0,
    timed_out: response.timed_out || false,
    total: response.total || 0,
    updated: response.updated,
    deleted: response.deleted,
    batches: response.batches || 0,
    version_conflicts: response.version_conflicts || 0,
    noops: response.noops || 0,
    retries: response.retries || {
      bulk: 0,
      search: 0,
    },
    throttled_millis: response.throttled_millis || 0,
    requests_per_second: response.requests_per_second || 0,
    throttled_until_millis: response.throttled_until_millis || 0,
    failures: response.failures || [],
  };
}

// Export the result classes for backwards compatibility
export { createDocumentOperationResult as DocumentOperationResult };
export { createByQueryOperationResult as ByQueryOperationResult };
export { createBulkOperationResult as BulkOperationResult };
export { createBulkOperationInBatchesResult as BulkOperationInBatchesResult }; 