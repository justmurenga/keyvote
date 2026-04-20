// Quick type test
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
type GenericView = { Row: Record<string, unknown>; Relationships: GenericRelationship[]; };
type GenericFunction = { Args: Record<string, unknown>; Returns: unknown; };
type GenericSchema = {
  Tables: Record<string, GenericTable>;
  Views: Record<string, GenericView>;
  Functions: Record<string, GenericFunction>;
};

// Test 1: Empty views/functions  
type EmptyMapped = { [_ in never]: never };
type Test1 = EmptyMapped extends Record<string, GenericView> ? 'yes' : 'no';

// Test 2: A simple table
type SimpleTable = {
  Row: { id: string; name: string };
  Insert: { id?: string; name: string };
  Update: { id?: string; name?: string };
  Relationships: [];
};
type Test2 = SimpleTable extends GenericTable ? 'yes' : 'no';

// Test 3: Minimal schema
type MinimalSchema = {
  Tables: { users: SimpleTable };
  Views: { [_ in never]: never };
  Functions: { [_ in never]: never };
};
type Test3 = MinimalSchema extends GenericSchema ? 'yes' : 'no';

// Test 4: Schema with extra Enums field
type SchemaWithEnums = {
  Tables: { users: SimpleTable };
  Views: { [_ in never]: never };
  Functions: { [_ in never]: never };
  Enums: { role: 'admin' | 'user' };
};
type Test4 = SchemaWithEnums extends GenericSchema ? 'yes' : 'no';

// Output types for inspection
declare const t1: Test1;
declare const t2: Test2;
declare const t3: Test3;
declare const t4: Test4;

console.log(t1, t2, t3, t4);
