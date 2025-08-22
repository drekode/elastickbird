import Elastickbird from './elastickbird';

export default Elastickbird;

export { ElastickbirdModel } from './model/ElastickbirdModel';
export { ElastickbirdQuery } from './query/ElastickbirdQuery';
export { ElastickbirdBulk } from './bulk/ElastickbirdBulk';
export { ElastickbirdBulkQueue } from './bulk/ElastickbirdBulkQueue';
export { ElastickbirdFilterRules } from './utils/ElastickbirdFilterRules';
export { ElasticsearchClient } from './client/ElasticsearchClient';
export { 
  DocumentOperationResult, 
  ByQueryOperationResult 
} from './utils/ResponseResults';

// Types
export * from './types';