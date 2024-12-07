import type { SchemaDefinition, Mappings } from "./schema.d";
import type { Client as NativeClient } from "@elastic/elasticsearch";
import { getClient } from "../client";
import { ElastickBirdClient } from "../client/client.d";

class ElastickbirdSchema {
  private alias: string;
  private mappings: Mappings | undefined;

  constructor(schema: SchemaDefinition) {
    this.alias = schema.alias;
    this.mappings = schema.mappings;
  }

  get client(): NativeClient {
    const elastickbirdClient: ElastickBirdClient = getClient();
    if (!elastickbirdClient || !elastickbirdClient.client) {
      throw new Error("Client not connected");
    }
    return elastickbirdClient.client;
  }

  private generateIndexName(): string {
    const now = new Date();
    const formattedDate = now.toISOString().replace(/\D/g, "").slice(0, 17);
    return this.alias + "_" + formattedDate;
  }

  async createIndex() {
    return await this.client.indices.create({
      index: this.generateIndexName(),
      aliases: { [this.alias]: {} },
      mappings: this.mappings
    });
  }
}

export default ElastickbirdSchema;
