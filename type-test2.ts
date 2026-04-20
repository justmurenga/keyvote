import type { Database } from './packages/database/src/types/database.types';

type GenericRelationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};
type GenericTable = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: GenericRelationship[];
};
type GenericUpdatableView = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: GenericRelationship[];
};
type GenericNonUpdatableView = {
  Row: Record<string, unknown>;
  Relationships: GenericRelationship[];
};
type GenericView = GenericUpdatableView | GenericNonUpdatableView;
type GenericSetofOption = {
  isSetofReturn?: boolean | undefined;
  isOneToOne?: boolean | undefined;
  isNotNullable?: boolean | undefined;
  to: string;
  from: string;
};
type GenericFunction = {
  Args: Record<string, unknown> | never;
  Returns: unknown;
  SetofOptions?: GenericSetofOption;
};
type GenericSchema = {
  Tables: Record<string, GenericTable>;
  Views: Record<string, GenericView>;
  Functions: Record<string, GenericFunction>;
};

// The actual test
type PublicSchema = Database['public'];
type TestSchema = PublicSchema extends GenericSchema ? 'compatible' : 'INCOMPATIBLE';
declare const result: TestSchema;

// Also test individual parts
type TestTables = PublicSchema['Tables'] extends Record<string, GenericTable> ? 'ok' : 'FAIL';
type TestViews = PublicSchema['Views'] extends Record<string, GenericView> ? 'ok' : 'FAIL';
type TestFunctions = PublicSchema['Functions'] extends Record<string, GenericFunction> ? 'ok' : 'FAIL';
declare const tTables: TestTables;
declare const tViews: TestViews;
declare const tFunctions: TestFunctions;

// Test a specific table
type UsersTable = PublicSchema['Tables']['users'];
type TestUsersTable = UsersTable extends GenericTable ? 'ok' : 'FAIL';
declare const tUsers: TestUsersTable;

console.log(result, tTables, tViews, tFunctions, tUsers);
