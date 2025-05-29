export const DOC_OPERATION_TYPES = {
  INDEX: "index",
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete"
} as const;

export type DocOperationType = typeof DOC_OPERATION_TYPES[keyof typeof DOC_OPERATION_TYPES]; 