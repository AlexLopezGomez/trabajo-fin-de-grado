import schemaData from './schema-data.json';

// Re-export types used by consumers
export interface IndexInfo {
  name: string;
  keys: Record<string, 1 | -1 | 'text' | '2dsphere'>;
  unique: boolean;
  sparse?: boolean;
  partialFilterExpression?: Record<string, unknown>;
}

export interface CollectionRelationship {
  localField: string;
  foreignCollection: string;
  foreignField: string;
  cardinality: '1:1' | '1:N' | 'N:1' | 'N:N';
  description: string;
  typeMismatch?: boolean;
}

export interface JsonSchemaProperty {
  type: string | string[];
  description?: string;
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  enum?: (string | number | boolean)[];
  format?: string;
  bsonType?: string;
}

export interface JsonSchema {
  type: 'object';
  properties: Record<string, JsonSchemaProperty>;
  required: string[];
}

export interface CollectionMetadata {
  name: string;
  description: string;
  domain: string;
  documentCount: number;
  avgDocumentSize: number;
  schema: JsonSchema;
  sampleDocuments: Record<string, unknown>[];
  indexes: IndexInfo[];
  relationships: CollectionRelationship[];
  tags: string[];
  enums: Record<string, (string | number | boolean)[]>;
}

export interface CollectionSummary {
  name: string;
  description: string;
  tags: string[];
}

export interface TypeMismatch {
  collection: string;
  field: string;
  actualType: string;
  expectedType: string;
  relatedCollection: string;
  relatedField: string;
}

const data = schemaData as any;

export const DATABASE_INFO = {
  name: data.databaseName as string,
  description: data.databaseDescription as string,
  generatedAt: data.generatedAt as string,
  schemaVersion: data.schemaVersion as number,
};

export const CATALOG_SUMMARIES: CollectionSummary[] = data.summaries;

export const FULL_CATALOG: Record<string, CollectionMetadata> = data.collections;

export const QUERYABLE_COLLECTIONS = data.queryableCollections as string[];

export const TERM_MAPPINGS: Record<string, Record<string, string>> = data.termMappings;

export const TYPE_MISMATCHES: TypeMismatch[] = data.typeMismatches;

export function getCollectionMetadata(name: string): CollectionMetadata | undefined {
  return FULL_CATALOG[name];
}

export function getMultipleCollectionMetadata(names: string[]): CollectionMetadata[] {
  return names
    .map((name) => FULL_CATALOG[name])
    .filter((m): m is CollectionMetadata => m !== undefined);
}

export function formatCatalogSummariesForPrompt(): string {
  return CATALOG_SUMMARIES.map(
    (s) => `- ${s.name}: ${s.description} (Tags: ${s.tags.join(', ')})`
  ).join('\n');
}

export function getAllCollectionNames(): string[] {
  return Object.keys(FULL_CATALOG);
}

export function searchCollectionsByTags(tags: string[]): CollectionMetadata[] {
  return Object.values(FULL_CATALOG).filter((c) =>
    tags.some((tag) => c.tags.includes(tag))
  );
}

function formatDDLType(prop: any): string {
  if (!prop) return 'any';
  if (prop.bsonType) return prop.bsonType;
  const type = Array.isArray(prop.type) ? prop.type[0] : prop.type;
  if (type === 'array') {
    const itemType = prop.items ? formatDDLType(prop.items) : 'any';
    return `Array<${itemType}>`;
  }
  if (type === 'object' && prop.properties) {
    const fields = Object.entries(prop.properties)
      .map(([k, v]: [string, any]) => `${k}: ${formatDDLType(v)}`)
      .join(', ');
    return `{ ${fields} }`;
  }
  return type || 'any';
}

export function formatSchemaAsDDL(collection: CollectionMetadata): string {
  const lines: string[] = [];
  lines.push(`## Collection: ${collection.name}`);
  lines.push(`Description: ${collection.description}`);
  lines.push(`Domain: ${collection.domain} | Docs: ${collection.documentCount.toLocaleString()} | Avg: ${collection.avgDocumentSize} bytes`);
  lines.push('');

  lines.push(`${collection.name}(`);

  const schema = collection.schema;
  const entries = Object.entries(schema.properties || {});

  for (let i = 0; i < entries.length; i++) {
    const [field, prop] = entries[i];
    const parts: string[] = [`  ${field}: `];

    parts.push(formatDDLType(prop as any));

    if (field === '_id') parts.push(' PK');

    const rel = collection.relationships.find((r) => r.localField === field);
    if (rel) {
      parts.push(` FK->${rel.foreignCollection}.${rel.foreignField}`);
    }

    const enumValues = collection.enums?.[field];
    if (enumValues && enumValues.length > 0) {
      parts.push(` enum[${enumValues.map((v) => `"${v}"`).join(',')}]`);
    }

    const comma = i < entries.length - 1 ? ',' : '';
    lines.push(parts.join('') + comma);
  }

  lines.push(')');

  if (collection.indexes.length > 0) {
    lines.push('');
    const indexStrs = collection.indexes
      .filter((idx) => idx.name !== '_id_')
      .map((idx) => {
        const keys = Object.entries(idx.keys)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
        return `${idx.name} { ${keys} }`;
      });
    if (indexStrs.length > 0) {
      lines.push(`Indexes: ${indexStrs.join(', ')}`);
    }
  }

  return lines.join('\n');
}
