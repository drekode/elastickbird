import ElastickBird from './elastickbird';

export default ElastickBird;

export { ElastickBirdModel } from './model/ElastickBirdModel';
export { ElastickbirdQuery } from './query/ElasticsearchQueryBuilder';
export { BoolQueryBuilder } from './query/BoolQueryBuilder';
export { ElasticsearchBulk } from './bulk/ElasticsearchBulk';
export { ElasticsearchBulkQueue } from './bulk/ElasticsearchBulkQueue';
export { ElasticsearchFilterRules } from './utils/ElasticsearchFilterRules';
export { ElasticsearchClient } from './client/ElasticsearchClient';
export { 
  DocumentOperationResult, 
  ByQueryOperationResult 
} from './utils/ResponseResults';

// Types
export * from './types';