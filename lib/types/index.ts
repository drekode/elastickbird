import { Client } from '@elastic/elasticsearch';

export interface ElasticSchemaConfig {
  alias: string;
  mappings: Record<string, any>;
  primaryKeyAttribute?: string;
  primaryKeyAttributes?: string[];
  settings?: Record<string, any>;
  routing?: string;
  routingRules?: Record<string, (value: any) => string>;
  filterRules?: any;
  sortRules?: Record<string, (queryBuilder: any, order: string) => void>;
  searchAfterDelimiter?: string;
}

export interface DocumentOperationResult {
  success: boolean;
  error?: string;
  total: number;
  document?: any;
  _id?: string;
  _index?: string;
  _version?: number;
  result?: string;
}

export interface ByQueryOperationResult {
  success: boolean;
  error?: string;
  took: number;
  timed_out: boolean;
  total: number;
  updated?: number;
  deleted?: number;
  batches: number;
  version_conflicts: number;
  noops: number;
  retries: {
    bulk: number;
    search: number;
  };
  throttled_millis: number;
  requests_per_second: number;
  throttled_until_millis: number;
  failures: any[];
}

export interface SearchRequest {
  query?: any;
  size?: number;
  from?: number;
  sort?: any[];
  search_after?: any[];
  routing?: string;
  _source?: string[] | boolean;
}

export interface BulkOperation {
  index?: {
    _index?: string;
    _id?: string;
    routing?: string;
  };
  create?: {
    _index?: string;
    _id?: string;
    routing?: string;
  };
  update?: {
    _index?: string;
    _id?: string;
    routing?: string;
  };
  delete?: {
    _index?: string;
    _id?: string;
    routing?: string;
  };
}

export interface QueryBuilderOptions {
  sortRules?: Record<string, (queryBuilder: any, order: string) => void>;
  filterRules?: any;
  routing?: string;
  routingRules?: Record<string, (value: any) => string>;
  searchAfterDelimiter?: string;
}

export type OccurrenceType = 'must' | 'should' | 'filter' | 'mustNot';

export interface ElasticsearchClientConfig {
  node?: string | string[];
  auth?: {
    username: string;
    password: string;
  } | {
    apiKey: string;
  };
  tls?: {
    ca?: string;
    cert?: string;
    key?: string;
    rejectUnauthorized?: boolean;
  };
} 