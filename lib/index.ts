import ElastickBird from './elastickbird';

export default ElastickBird;

export { ElastickbirdModel } from './model/ElastickbirdModel';
export { ElastickbirdQuery } from './query/ElastickbirdQuery';
export { ElastickbirdBulk } from './bulk/ElastickbirdBulk';
export { ElastickbirdBulkQueue } from './bulk/ElastickbirdBulkQueue';
export { ElasticsearchFilterRules } from './utils/ElasticsearchFilterRules';
export { ElasticsearchClient } from './client/ElasticsearchClient';
export { 
  DocumentOperationResult, 
  ByQueryOperationResult 
} from './utils/ResponseResults';

// Types
export * from './types';