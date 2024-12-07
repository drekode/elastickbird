declare enum MappingEntryType {
    Text = "text",
    Keyword = "keyword",
    Long = "long",
    Integer = "integer"
}
interface MappingsEntry { type: MappingEntryType; index?: boolean, fields?: Mappings, normalizer?: string, ignore_above?: number, analyzer?: string, copy_to?: string }
interface MappingsObject { properties: Mappings }
interface Mappings {
  [key: string]: MappingsEntry | MappingsObject;
}

interface SchemaDefinition {
  alias: string;
  idField?: string;
  idFields?: string[];
  idFn?: (payload: object) => string;
  mappings?: Mappings;
  settings?: any;
}

export default SchemaDefinition;
export { SchemaDefinition, SchemaOptions, MappingsEntry, MappingsObject, Mappings, MappingEntryType };