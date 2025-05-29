import { Client } from '@elastic/elasticsearch';
import { ElasticsearchClientConfig } from '../types';

/**
 * ElasticsearchClient wrapper
 * Provides a configurable Elasticsearch client instance
 */
export class ElasticsearchClient {
  private static instance: Client;

  /**
   * Initialize the Elasticsearch client with configuration
   * @param config - Elasticsearch client configuration
   */
  static configure(config: ElasticsearchClientConfig): void {
    ElasticsearchClient.instance = new Client(config);
  }

  /**
   * Get the configured Elasticsearch client instance
   * @returns The Elasticsearch client
   */
  static getClient(): Client {
    if (!ElasticsearchClient.instance) {
      throw new Error('Elasticsearch client not configured. Call ElasticsearchClient.configure() first.');
    }
    return ElasticsearchClient.instance;
  }

  /**
   * Set a custom client instance
   * @param client - Custom Elasticsearch client
   */
  static setClient(client: Client): void {
    ElasticsearchClient.instance = client;
  }
} 