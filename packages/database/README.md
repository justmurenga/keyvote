# @myvote/database

Database schema, migrations, and TypeScript types for myVote Kenya.

## Schema Overview

### Electoral Units Hierarchy

```
National
└── Counties (47)
    └── Constituencies (290)
        └── Wards (1,450)
            └── Polling Stations (46,229+)
```

### Core Tables

| Table | Description |
|-------|-------------|
| `counties` | 47 Kenyan counties |
| `constituencies` | 290 constituencies |
| `wards` | 1,450 wards (County Assembly Wards) |
| `polling_stations` | All polling stations with streams |
| `users` | All users (voters, candidates, agents, admins) |
| `candidates` | Candidate profiles and details |
| `political_parties` | Registered political parties |
| `followers` | Voter-to-candidate following relationships |
| `agents` | Campaign agents assigned by candidates |
| `polls` | Opinion polls |
| `poll_votes` | Individual poll votes |
| `election_results` | Official election results |
| `wallets` | User wallets for payments |
| `wallet_transactions` | All wallet transactions |

## Migrations

Migrations are in the `migrations/` folder, numbered sequentially:

```
migrations/
├── 0001_create_counties.sql
├── 0002_create_constituencies.sql
├── 0003_create_wards.sql
├── 0004_create_polling_stations.sql
├── 0005_create_enums.sql
├── 0006_create_users.sql
├── 0007_create_political_parties.sql
├── 0008_create_candidates.sql
├── 0009_create_followers.sql
├── 0010_create_agents.sql
├── 0011_create_polls.sql
├── 0012_create_election_results.sql
├── 0013_create_wallets.sql
├── 0014_create_messages.sql
├── 0015_create_rls_policies.sql
└── 0016_create_functions.sql
```

## Usage

```typescript
import { Database } from '@myvote/database';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Type-safe queries
const { data: counties } = await supabase
  .from('counties')
  .select('*');
```

## Seeding

```bash
# Import electoral data from Excel
pnpm import:electoral

# Seed test data
pnpm db:seed
```
