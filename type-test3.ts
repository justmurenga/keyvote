import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './packages/database/src/types/database.types';

const client = createBrowserClient<Database>('url', 'key');

// Test: does .from('users') resolve to never?
async function test() {
  const { data } = await client.from('users').select('full_name, role').single();
  // If data is never, this will error
  if (data) {
    const name: string = data.full_name;
    const role: string | null = data.role;
    console.log(name, role);
  }
}
