# myVote Kenya - Implementation Plan

**Version:** 1.0  
**Date:** March 25, 2026  
**Deployment Target:** Digital Ocean App Platform  

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack Finalization](#2-technology-stack-finalization)
3. [Data Import Strategy](#3-data-import-strategy)
4. [Project Structure](#4-project-structure)
5. [Implementation Phases](#5-implementation-phases)
6. [CI/CD Pipeline](#6-cicd-pipeline)
7. [Digital Ocean Infrastructure](#7-digital-ocean-infrastructure)
8. [Sprint Breakdown](#8-sprint-breakdown)
9. [Testing Strategy](#9-testing-strategy)
10. [Monitoring & Observability](#10-monitoring--observability)
11. [Risk Mitigation](#11-risk-mitigation)
12. [Team Structure](#12-team-structure)

---

## 1. Project Overview

### 1.1 Project Summary

| Attribute | Value |
|-----------|-------|
| Project Name | myVote Kenya |
| Duration | 12 months (4 phases) |
| Deployment | Digital Ocean App Platform |
| Database | Supabase (Managed PostgreSQL) |
| Primary Framework | Next.js 14+ (App Router) |
| Mobile | React Native / Expo |

### 1.2 Key Deliverables

| Phase | Deliverable | Timeline |
|-------|-------------|----------|
| Phase 1 | Core Platform (Web) + Data Import | Months 1-3 |
| Phase 2 | Engagement Features + Android App | Months 4-6 |
| Phase 3 | Election Results + USSD | Months 7-9 |
| Phase 4 | Party Features + Optimization | Months 10-12 |

---

## 2. Technology Stack Finalization

### 2.1 Frontend Stack

```
┌─────────────────────────────────────────────────────────┐
│                    WEB APPLICATION                       │
├─────────────────────────────────────────────────────────┤
│  Framework      │ Next.js 14+ (App Router)              │
│  Language       │ TypeScript 5.x                        │
│  Styling        │ Tailwind CSS 3.x                      │
│  Components     │ shadcn/ui (Radix primitives)          │
│  State          │ Zustand + TanStack Query (React Query)│
│  Forms          │ React Hook Form + Zod validation      │
│  Charts         │ Recharts / Tremor                     │
│  Tables         │ TanStack Table                        │
│  Maps           │ Leaflet / Mapbox GL                   │
│  Icons          │ Lucide React                          │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Backend Stack

```
┌─────────────────────────────────────────────────────────┐
│                    BACKEND SERVICES                      │
├─────────────────────────────────────────────────────────┤
│  Database       │ Supabase PostgreSQL                   │
│  Auth           │ Supabase Auth (Phone OTP)             │
│  Storage        │ Supabase Storage                      │
│  Realtime       │ Supabase Realtime (WebSockets)        │
│  Edge Functions │ Supabase Edge Functions (Deno)        │
│  API Layer      │ Next.js API Routes + tRPC (optional)  │
│  Background Jobs│ Supabase pg_cron + Edge Functions     │
└─────────────────────────────────────────────────────────┘
```

### 2.3 Mobile Stack

```
┌─────────────────────────────────────────────────────────┐
│                    MOBILE APPLICATION                    │
├─────────────────────────────────────────────────────────┤
│  Framework      │ React Native + Expo SDK 50+           │
│  Navigation     │ Expo Router                           │
│  State          │ Zustand + TanStack Query              │
│  UI Components  │ Tamagui / NativeWind                  │
│  Push Notif.    │ Expo Notifications + FCM              │
│  Storage        │ Expo SecureStore                      │
│  Camera         │ Expo Camera (result sheet upload)     │
│  Location       │ Expo Location                         │
└─────────────────────────────────────────────────────────┘
```

### 2.4 External Integrations

| Service | Provider | Purpose | Priority |
|---------|----------|---------|----------|
| SMS Gateway | Africa's Talking | OTP, Bulk SMS | P0 |
| USSD | Africa's Talking | Feature phone access | P1 |
| M-Pesa | Safaricom Daraja | Payments | P0 |
| WhatsApp | 360Dialog | Messaging | P2 |
| Analytics | Metabase (self-hosted on DO) | BI Dashboards | P1 |
| Monitoring | Sentry | Error tracking | P0 |
| Analytics | PostHog | Product analytics | P1 |

---

## 3. Data Import Strategy

### 3.1 Excel Data Structure Analysis

Based on the provided Excel screenshot, the data has the following structure:

| Column | Header | Example | Maps To |
|--------|--------|---------|---------|
| A | County Code | 007 | `counties.code` |
| B | County Name | GARISSA | `counties.name` |
| C | Const Code | 028 | `constituencies.code` |
| D | Const. Name | BALAMBALA | `constituencies.name` |
| E | CAW Code | 0135 | `wards.code` |
| F | CAW Name | BALAMBALA | `wards.name` |
| G | Reg. Centre Code | 001 | `polling_stations.centre_code` |
| H | Reg. Centre Name | BALAMBALA PRIMARY SCHOOL | `polling_stations.centre_name` |
| I | Polling Station Code | 00702801350101 | `polling_stations.code` |
| J | Polling Station Name | BALAMBALA PRIMARY SCHOOL | `polling_stations.name` |
| K | Registered Voters | 512 | `polling_stations.registered_voters` |

### 3.2 Stream Detection Logic

Polling stations with multiple streams are identified when:
- Same `Reg. Centre Code` (Column G) appears multiple times within the same ward
- Same `Reg. Centre Name` (Column H) with different `Polling Station Code` (Column I)

**Example from data:**
```
Row 2: BALAMBALA PRIMARY SCHOOL - Code: 00702801350101 - 512 voters
Row 3: BALAMBALA PRIMARY SCHOOL - Code: 00702801350102 - 511 voters
```

These become:
- BALAMBALA PRIMARY SCHOOL Stream A (512 voters)
- BALAMBALA PRIMARY SCHOOL Stream B (511 voters)

### 3.3 Import Script Design

```typescript
// scripts/import-electoral-data.ts

interface ExcelRow {
  countyCode: string;      // Column A
  countyName: string;      // Column B
  constCode: string;       // Column C
  constName: string;       // Column D
  wardCode: string;        // Column E
  wardName: string;        // Column F
  regCentreCode: string;   // Column G
  regCentreName: string;   // Column H
  stationCode: string;     // Column I
  stationName: string;     // Column J
  registeredVoters: number; // Column K
}

// Stream assignment algorithm
function assignStreams(stations: ExcelRow[]): Map<string, string> {
  const streamMap = new Map<string, string>();
  const centreGroups = new Map<string, ExcelRow[]>();
  
  // Group by ward + registration centre
  stations.forEach(station => {
    const key = `${station.wardCode}-${station.regCentreCode}`;
    if (!centreGroups.has(key)) {
      centreGroups.set(key, []);
    }
    centreGroups.get(key)!.push(station);
  });
  
  // Assign streams (A, B, C...) for centres with multiple stations
  centreGroups.forEach((group, key) => {
    if (group.length > 1) {
      // Sort by station code for consistent ordering
      group.sort((a, b) => a.stationCode.localeCompare(b.stationCode));
      group.forEach((station, index) => {
        const stream = String.fromCharCode(65 + index); // A, B, C...
        streamMap.set(station.stationCode, stream);
      });
    }
  });
  
  return streamMap;
}
```

### 3.4 Import Process Steps

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA IMPORT PIPELINE                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Parse Excel File                                         │
│ - Use xlsx library (SheetJS)                                     │
│ - Validate column headers                                        │
│ - Convert to typed array                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: Data Validation                                          │
│ - Check for required fields                                      │
│ - Validate numeric values (registered voters > 0)                │
│ - Identify duplicates                                            │
│ - Generate validation report                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Extract Unique Entities                                  │
│ - Counties (47 expected)                                         │
│ - Constituencies (290 expected)                                  │
│ - Wards (1,450 expected)                                         │
│ - Polling Stations (46,229+ expected)                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: Stream Assignment                                        │
│ - Group stations by registration centre                          │
│ - Assign A, B, C... for multi-stream centres                     │
│ - Generate display names                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: Database Insertion (Transactional)                       │
│ - Insert counties (UPSERT on code)                               │
│ - Insert constituencies (UPSERT, link to county)                 │
│ - Insert wards (UPSERT, link to constituency)                    │
│ - Insert polling stations (UPSERT, link to ward)                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 6: Aggregate Registered Voters                              │
│ - Sum registered voters per ward                                 │
│ - Sum registered voters per constituency                         │
│ - Sum registered voters per county                               │
│ - Calculate national total                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 7: Generate Import Report                                   │
│ - Total records processed                                        │
│ - Records per county/constituency                                │
│ - Streams assigned                                               │
│ - Any errors or warnings                                         │
└─────────────────────────────────────────────────────────────────┘
```

### 3.5 Database Seeding SQL

```sql
-- Function to aggregate registered voters up the hierarchy
CREATE OR REPLACE FUNCTION aggregate_registered_voters()
RETURNS void AS $$
BEGIN
  -- Update ward totals
  UPDATE wards w
  SET registered_voters = (
    SELECT COALESCE(SUM(registered_voters), 0)
    FROM polling_stations ps
    WHERE ps.ward_id = w.id
  );
  
  -- Update constituency totals
  UPDATE constituencies c
  SET registered_voters = (
    SELECT COALESCE(SUM(registered_voters), 0)
    FROM wards w
    WHERE w.constituency_id = c.id
  );
  
  -- Update county totals
  UPDATE counties co
  SET registered_voters = (
    SELECT COALESCE(SUM(registered_voters), 0)
    FROM constituencies c
    WHERE c.county_id = co.id
  );
END;
$$ LANGUAGE plpgsql;
```

---

## 4. Project Structure

### 4.1 Monorepo Structure

```
my-vote/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Continuous Integration
│       ├── deploy-web.yml            # Web deployment to DO
│       ├── deploy-api.yml            # API deployment
│       └── deploy-mobile.yml         # Mobile build & deploy
│
├── apps/
│   ├── web/                          # Next.js Web Application
│   │   ├── app/                      # App Router pages
│   │   │   ├── (auth)/              # Auth group routes
│   │   │   │   ├── login/
│   │   │   │   ├── register/
│   │   │   │   └── verify/
│   │   │   ├── (dashboard)/         # Authenticated routes
│   │   │   │   ├── voter/
│   │   │   │   ├── candidate/
│   │   │   │   ├── agent/
│   │   │   │   └── admin/
│   │   │   ├── (public)/            # Public routes
│   │   │   │   ├── candidates/
│   │   │   │   ├── polls/
│   │   │   │   └── results/
│   │   │   ├── api/                 # API routes
│   │   │   │   ├── auth/
│   │   │   │   ├── webhooks/
│   │   │   │   │   ├── mpesa/
│   │   │   │   │   ├── sms/
│   │   │   │   │   └── ussd/
│   │   │   │   └── trpc/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   ├── ui/                  # shadcn/ui components
│   │   │   ├── forms/
│   │   │   ├── charts/
│   │   │   ├── maps/
│   │   │   └── layout/
│   │   ├── lib/
│   │   │   ├── supabase/
│   │   │   ├── utils/
│   │   │   └── validations/
│   │   ├── hooks/
│   │   ├── stores/
│   │   ├── types/
│   │   ├── public/
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── mobile/                       # React Native / Expo App
│   │   ├── app/                      # Expo Router
│   │   │   ├── (auth)/
│   │   │   ├── (tabs)/
│   │   │   └── _layout.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── stores/
│   │   ├── app.json
│   │   ├── eas.json
│   │   └── package.json
│   │
│   └── ussd/                         # USSD Handler Service
│       ├── src/
│       │   ├── handlers/
│       │   ├── menus/
│       │   ├── sessions/
│       │   └── index.ts
│       ├── Dockerfile
│       └── package.json
│
├── packages/
│   ├── database/                     # Database schema & migrations
│   │   ├── migrations/
│   │   │   ├── 0001_create_counties.sql
│   │   │   ├── 0002_create_constituencies.sql
│   │   │   ├── 0003_create_wards.sql
│   │   │   ├── 0004_create_polling_stations.sql
│   │   │   ├── 0005_create_users.sql
│   │   │   └── ...
│   │   ├── seed/
│   │   │   ├── electoral-data.ts
│   │   │   └── test-data.ts
│   │   ├── types/
│   │   │   └── database.types.ts    # Generated Supabase types
│   │   └── package.json
│   │
│   ├── shared/                       # Shared utilities
│   │   ├── constants/
│   │   ├── types/
│   │   ├── validations/
│   │   └── utils/
│   │
│   └── ui/                           # Shared UI components (optional)
│       ├── components/
│       └── package.json
│
├── scripts/
│   ├── import-electoral-data.ts      # Excel import script
│   ├── generate-types.ts             # Supabase type generation
│   └── setup-dev.sh
│
├── supabase/
│   ├── config.toml
│   ├── functions/                    # Edge Functions
│   │   ├── send-otp/
│   │   ├── mpesa-stk-push/
│   │   ├── mpesa-b2c/
│   │   ├── send-bulk-sms/
│   │   └── calculate-poll-results/
│   └── migrations/                   # Supabase migrations
│
├── docs/
│   ├── PRD.md
│   ├── IMPLEMENTATION_PLAN.md
│   ├── API.md
│   └── DEPLOYMENT.md
│
├── data/
│   └── electoral-data.xlsx           # Source Excel file
│
├── .env.example
├── .gitignore
├── turbo.json                        # Turborepo config
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

### 4.2 Key Configuration Files

#### turbo.json (Monorepo)
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {
      "dependsOn": ["build"]
    },
    "db:generate": {
      "cache": false
    }
  }
}
```

---

## 5. Implementation Phases

### Phase 1: Foundation (Weeks 1-12)

```
Week 1-2: Project Setup
├── Initialize monorepo (Turborepo + pnpm)
├── Setup Supabase project
├── Configure Digital Ocean App Platform
├── Setup CI/CD pipelines
├── Configure development environment
└── Setup linting, formatting, pre-commit hooks

Week 3-4: Database & Data Import
├── Create database schema (migrations)
├── Build Excel import script
├── Import electoral data
├── Validate imported data
├── Setup Row Level Security policies
└── Generate TypeScript types

Week 5-6: Authentication System
├── Supabase Auth configuration
├── Phone number registration with OTP
├── Africa's Talking SMS integration
├── User profile creation flow
├── Polling station selection (cascading dropdowns)
└── Session management

Week 7-8: Voter Features
├── Voter dashboard
├── Candidate discovery (by electoral line)
├── Candidate profile pages
├── Follow/unfollow functionality
├── Following feed
└── Notification preferences

Week 9-10: Candidate Features
├── Candidate registration flow
├── KYC verification (basic)
├── Candidate profile management
├── Manifesto upload (PDF + rich text)
├── Follower analytics (basic)
└── Party affiliation selection

Week 11-12: Wallet & Payments
├── Wallet creation on registration
├── M-Pesa STK Push integration
├── Wallet top-up flow
├── Transaction history
├── Balance display
└── Basic payment webhook handling
```

### Phase 2: Engagement (Weeks 13-24)

```
Week 13-14: Opinion Polls System
├── Poll creation (admin)
├── Poll scheduling by position
├── Voting interface
├── One-vote-per-poll enforcement
├── Real-time vote counting
└── Poll results display

Week 15-16: Poll Analytics
├── Results by region (ward → national)
├── Demographic breakdown (gender, age)
├── Historical trends
├── Candidate comparison
└── Access control (electoral line restriction)

Week 17-18: In-App Messaging
├── Conversation model
├── Candidate ↔ Agent chat
├── Real-time messaging (Supabase Realtime)
├── Read receipts
├── Push notifications
└── Media sharing

Week 19-20: Agent Management
├── Agent invitation system
├── Agent acceptance flow
├── Region assignment
├── Agent dashboard
├── Activity reporting
└── Performance metrics

Week 21-22: Android App (Core)
├── Expo project setup
├── Authentication screens
├── Voter registration flow
├── Candidate browsing
├── Following functionality
└── Basic poll voting

Week 23-24: Android App (Enhanced)
├── Push notifications
├── Offline support
├── Result sheet camera capture
├── GPS location services
├── Chat functionality
└── Play Store preparation
```

### Phase 3: Elections (Weeks 25-36)

```
Week 25-26: Bulk Communications
├── SMS campaign builder
├── Recipient targeting (region, demographics)
├── Sender ID configuration
├── Delivery reports
├── Campaign analytics
└── Cost calculation & wallet deduction

Week 27-28: Election Results - Submission
├── Result submission form (app)
├── Multi-candidate entry
├── Result sheet image upload
├── GPS & timestamp capture
├── Validation rules
└── Offline queue & sync

Week 29-30: Election Results - Aggregation
├── MODE calculation for multiple submissions
├── Real-time aggregation triggers
├── Results by level (station → national)
├── Discrepancy flagging
├── Result verification workflow
└── Admin override capability

Week 31-32: Results Dashboard
├── Live results view
├── Drill-down navigation
├── Charts and visualizations
├── Turnout calculations
├── Result sheet gallery
└── Export functionality

Week 33-34: USSD Integration
├── Africa's Talking USSD setup
├── Session management
├── Menu navigation system
├── Registration via USSD
├── Poll voting via USSD
├── Result submission via USSD

Week 35-36: USSD Enhancement & Testing
├── Wallet check via USSD
├── Results viewing via USSD
├── Error handling
├── Session timeout handling
├── Load testing
└── Edge case handling
```

### Phase 4: Scale (Weeks 37-48)

```
Week 37-38: Political Party Module
├── Party registration
├── Party profile management
├── Symbol/logo upload
├── Party admin dashboard
├── Candidate affiliation
└── Party verification

Week 39-40: Party Nominations
├── Nomination poll creation
├── Membership verification
├── Nomination voting
├── Results & winner declaration
├── Nomination fee handling
└── Certificate generation

Week 41-42: WhatsApp Integration
├── 360Dialog/Twilio setup
├── Template message approval
├── Bulk WhatsApp campaigns
├── Rich media support
├── Delivery tracking
└── Cost management

Week 43-44: Analytics & Metabase
├── Metabase deployment (DO Droplet)
├── Database connection
├── Dashboard templates
├── Embedded dashboards
├── Automated reports
└── Alert configuration

Week 45-46: M-Pesa Bulk Disbursement
├── B2C API integration
├── Bulk payment interface
├── Payment approval workflow
├── Reconciliation
├── Failed payment handling
└── Payment reports

Week 47-48: Optimization & Launch Prep
├── Performance optimization
├── Security audit
├── Load testing
├── Documentation completion
├── Training materials
├── Production deployment
└── Launch checklist
```

---

## 6. CI/CD Pipeline

### 6.1 GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ vars.TURBO_TEAM }}

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint

  typecheck:
    name: Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck

  test:
    name: Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [lint, typecheck, test]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
```

### 6.2 Web Deployment Workflow

```yaml
# .github/workflows/deploy-web.yml
name: Deploy Web

on:
  push:
    branches: [main]
    paths:
      - 'apps/web/**'
      - 'packages/**'

jobs:
  deploy:
    name: Deploy to Digital Ocean
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install doctl
        uses: digitalocean/action-doctl@v2
        with:
          token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}
      
      - name: Deploy to App Platform
        run: |
          doctl apps create-deployment ${{ secrets.DO_APP_ID }} --wait
```

### 6.3 Mobile Build Workflow

```yaml
# .github/workflows/deploy-mobile.yml
name: Build Mobile App

on:
  push:
    branches: [main]
    paths:
      - 'apps/mobile/**'
      - 'packages/shared/**'
  workflow_dispatch:
    inputs:
      platform:
        description: 'Platform to build'
        required: true
        default: 'android'
        type: choice
        options:
          - android
          - ios
          - all

jobs:
  build-android:
    name: Build Android
    runs-on: ubuntu-latest
    if: ${{ github.event.inputs.platform == 'android' || github.event.inputs.platform == 'all' || github.event_name == 'push' }}
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      
      - name: Install dependencies
        run: |
          cd apps/mobile
          npm install
      
      - name: Build Android APK
        run: |
          cd apps/mobile
          eas build --platform android --profile preview --non-interactive
```

---

## 7. Digital Ocean Infrastructure

### 7.1 App Platform Configuration

```yaml
# .do/app.yaml
name: myvote-kenya
region: fra  # Frankfurt (closest to Kenya)

services:
  # Web Application
  - name: web
    github:
      repo: your-org/my-vote
      branch: main
      deploy_on_push: true
    source_dir: apps/web
    build_command: pnpm build
    run_command: pnpm start
    environment_slug: node-js
    instance_count: 2
    instance_size_slug: professional-xs
    http_port: 3000
    routes:
      - path: /
    envs:
      - key: NEXT_PUBLIC_SUPABASE_URL
        scope: RUN_AND_BUILD_TIME
        value: ${SUPABASE_URL}
      - key: NEXT_PUBLIC_SUPABASE_ANON_KEY
        scope: RUN_AND_BUILD_TIME
        value: ${SUPABASE_ANON_KEY}
      - key: SUPABASE_SERVICE_ROLE_KEY
        scope: RUN_TIME
        type: SECRET
      - key: NODE_ENV
        scope: RUN_AND_BUILD_TIME
        value: production

  # USSD Handler
  - name: ussd-handler
    github:
      repo: your-org/my-vote
      branch: main
      deploy_on_push: true
    source_dir: apps/ussd
    dockerfile_path: apps/ussd/Dockerfile
    instance_count: 2
    instance_size_slug: basic-xs
    http_port: 8080
    routes:
      - path: /ussd
    envs:
      - key: SUPABASE_URL
        scope: RUN_TIME
        value: ${SUPABASE_URL}
      - key: AT_API_KEY
        scope: RUN_TIME
        type: SECRET
      - key: AT_USERNAME
        scope: RUN_TIME
        type: SECRET

# Static assets (if needed separately)
static_sites: []

# Background workers (if needed)
workers: []

# Databases (using external Supabase)
databases: []

# Environment variable groups
envs:
  - key: SUPABASE_URL
    scope: RUN_AND_BUILD_TIME
    value: "https://your-project.supabase.co"
```

### 7.2 Infrastructure Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DIGITAL OCEAN APP PLATFORM                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │   Web App       │    │   USSD Handler  │    │   Metabase      │         │
│  │   (Next.js)     │    │   (Node.js)     │    │   (Droplet)     │         │
│  │   2x prof-xs    │    │   2x basic-xs   │    │   s-2vcpu-4gb   │         │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘         │
│           │                      │                      │                   │
│           └──────────────────────┼──────────────────────┘                   │
│                                  │                                          │
│                          ┌───────▼───────┐                                  │
│                          │  DO Spaces    │                                  │
│                          │  (CDN/Assets) │                                  │
│                          └───────────────┘                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ HTTPS
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SUPABASE CLOUD                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │   PostgreSQL    │    │   Auth          │    │   Storage       │         │
│  │   Database      │    │   (Phone OTP)   │    │   (Files)       │         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
│                                                                              │
│  ┌─────────────────┐    ┌─────────────────┐                                 │
│  │   Realtime      │    │   Edge          │                                 │
│  │   (WebSocket)   │    │   Functions     │                                 │
│  └─────────────────┘    └─────────────────┘                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ API Calls
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL SERVICES                                   │
├──────────────────┬──────────────────┬───────────────────────────────────────┤
│  Africa's        │  Safaricom       │  WhatsApp                              │
│  Talking         │  Daraja          │  Business API                          │
│  (SMS/USSD)      │  (M-Pesa)        │  (360Dialog)                           │
└──────────────────┴──────────────────┴───────────────────────────────────────┘
```

### 7.3 Scaling Strategy

| Load Level | Web Instances | USSD Instances | Supabase Plan |
|------------|---------------|----------------|---------------|
| Development | 1x basic-xxs | 1x basic-xxs | Free |
| Staging | 1x basic-xs | 1x basic-xs | Pro |
| Production (Normal) | 2x prof-xs | 2x basic-xs | Pro |
| Production (Election) | 4x prof-s | 4x basic-s | Team |
| Production (Peak) | 8x prof-m | 8x basic-m | Team |

### 7.4 Cost Estimation

| Resource | Specification | Monthly Cost (USD) |
|----------|--------------|-------------------|
| Web App (2x professional-xs) | 1 vCPU, 1GB RAM each | $24 |
| USSD Handler (2x basic-xs) | 0.5 vCPU, 512MB RAM each | $10 |
| Metabase Droplet | 2 vCPU, 4GB RAM | $24 |
| DO Spaces (CDN) | 250GB storage, 1TB transfer | $5 |
| **Digital Ocean Total** | | **~$63/month** |
| Supabase Pro | 8GB DB, 100GB storage | $25 |
| Domain + SSL | Managed by DO | Included |
| **Grand Total (Base)** | | **~$88/month** |

*Note: During elections, expect to scale up to $200-400/month*

---

## 8. Sprint Breakdown

### 8.1 Sprint Structure

- **Sprint Duration:** 2 weeks
- **Sprint Planning:** Monday of Week 1
- **Daily Standups:** 15 minutes
- **Sprint Review:** Friday of Week 2
- **Sprint Retrospective:** Friday of Week 2 (after review)

### 8.2 Phase 1 Sprints (Foundation)

#### Sprint 1: Project Setup (Weeks 1-2)

| Story | Points | Acceptance Criteria |
|-------|--------|---------------------|
| Initialize monorepo with Turborepo | 3 | Repo created, pnpm workspace configured |
| Setup Next.js web app | 5 | App runs locally, basic routing works |
| Configure Tailwind + shadcn/ui | 3 | Components library ready |
| Setup Supabase project | 3 | Project created, local dev linked |
| Configure GitHub Actions CI | 5 | Lint, test, build pipeline works |
| Setup DO App Platform | 5 | Initial deployment succeeds |
| Environment variables management | 2 | Secrets configured in all environments |
| **Total** | **26** | |

#### Sprint 2: Database & Import (Weeks 3-4)

| Story | Points | Acceptance Criteria |
|-------|--------|---------------------|
| Create electoral units schema | 5 | Counties, constituencies, wards, polling stations |
| Create users schema | 5 | Users, profiles, preferences |
| Build Excel parser script | 5 | Parse sample data correctly |
| Stream assignment algorithm | 3 | Correctly identifies multi-stream stations |
| Data validation layer | 3 | Validates all required fields |
| Import script execution | 5 | Full data imported to dev DB |
| Aggregation functions | 3 | Registered voters summed correctly |
| Generate TypeScript types | 2 | Types generated from Supabase |
| **Total** | **31** | |

#### Sprint 3: Authentication (Weeks 5-6)

| Story | Points | Acceptance Criteria |
|-------|--------|---------------------|
| Supabase Auth configuration | 3 | Phone auth enabled |
| Africa's Talking SMS setup | 5 | OTPs send successfully |
| Registration page UI | 5 | Form with validation |
| OTP verification flow | 5 | 6-digit code entry, expiry handling |
| Profile creation wizard | 8 | Multi-step form with polling station selection |
| Cascading location dropdowns | 5 | County → Constituency → Ward → Station |
| Session management | 3 | JWT refresh, logout |
| Protected routes | 3 | Middleware for auth |
| **Total** | **37** | |

#### Sprint 4: Voter Core (Weeks 7-8)

| Story | Points | Acceptance Criteria |
|-------|--------|---------------------|
| Voter dashboard layout | 5 | Responsive layout with sidebar |
| Candidate listing (by electoral line) | 8 | Filter by position, region |
| Candidate profile page | 5 | Full profile display |
| Follow/unfollow API | 3 | Toggle with optimistic UI |
| Following list | 3 | List of followed candidates |
| Follower notifications | 5 | Email/push on candidate updates |
| Search functionality | 5 | Search candidates by name |
| Mobile responsive design | 5 | Works on all screen sizes |
| **Total** | **39** | |

#### Sprint 5: Candidate Core (Weeks 9-10)

| Story | Points | Acceptance Criteria |
|-------|--------|---------------------|
| Candidate registration flow | 8 | Position, region, party selection |
| Candidate profile editor | 5 | Edit all profile fields |
| Manifesto text editor | 5 | Rich text with formatting |
| PDF manifesto upload | 3 | Upload, preview, download |
| Profile photo upload | 3 | Crop, resize, upload |
| Basic follower analytics | 5 | Count, trend chart |
| Party affiliation UI | 3 | Select party or independent |
| Candidate verification request | 3 | Submit for admin review |
| **Total** | **35** | |

#### Sprint 6: Wallet Foundation (Weeks 11-12)

| Story | Points | Acceptance Criteria |
|-------|--------|---------------------|
| Wallet database schema | 3 | Wallets, transactions tables |
| Wallet creation trigger | 2 | Auto-create on user registration |
| Wallet balance display | 2 | Show in dashboard header |
| M-Pesa Daraja integration | 8 | STK Push API working |
| Top-up flow UI | 5 | Enter amount, trigger STK |
| Payment webhook handler | 5 | Process M-Pesa callbacks |
| Transaction history | 3 | List with filters |
| Balance notifications | 2 | Low balance alerts |
| **Total** | **30** | |

---

## 9. Testing Strategy

### 9.1 Testing Pyramid

```
                    ┌─────────────────┐
                    │   E2E Tests     │  10%
                    │   (Playwright)  │
                    ├─────────────────┤
                    │  Integration    │  20%
                    │  Tests          │
              ┌─────┴─────────────────┴─────┐
              │       Unit Tests            │  70%
              │       (Vitest)              │
              └─────────────────────────────┘
```

### 9.2 Test Coverage Targets

| Area | Target Coverage | Priority |
|------|-----------------|----------|
| Authentication flows | 90% | P0 |
| Payment processing | 95% | P0 |
| Poll voting logic | 90% | P0 |
| Result aggregation | 95% | P0 |
| UI Components | 70% | P1 |
| API Routes | 85% | P0 |
| Edge Functions | 80% | P1 |

### 9.3 E2E Test Scenarios

```typescript
// Critical User Journeys

describe('Voter Registration', () => {
  test('can register with phone number and select polling station');
  test('receives OTP and verifies successfully');
  test('cannot register with invalid phone format');
  test('handles OTP expiry gracefully');
});

describe('Candidate Following', () => {
  test('voter sees only candidates in their electoral line');
  test('can follow and unfollow candidates');
  test('following count updates in real-time');
});

describe('Poll Voting', () => {
  test('voter can vote once per poll');
  test('cannot vote after poll ends');
  test('results update in real-time');
});

describe('Election Results', () => {
  test('agent can submit results with image');
  test('MODE calculation works for multiple submissions');
  test('results aggregate correctly up the hierarchy');
});

describe('Wallet Operations', () => {
  test('can top up via M-Pesa');
  test('balance updates after successful payment');
  test('transaction history shows all operations');
});
```

### 9.4 Load Testing (k6)

```javascript
// load-tests/election-day.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5m', target: 1000 },   // Ramp up
    { duration: '30m', target: 5000 },  // Peak load
    { duration: '5m', target: 0 },      // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% under 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% failure
  },
};

export default function () {
  // Simulate result viewing
  const res = http.get('https://myvote.co.ke/api/results/national');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

---

## 10. Monitoring & Observability

### 10.1 Monitoring Stack

| Tool | Purpose | Integration |
|------|---------|-------------|
| **Sentry** | Error tracking | Next.js, React Native |
| **PostHog** | Product analytics | Web, Mobile |
| **Supabase Dashboard** | Database metrics | Built-in |
| **DO App Platform Insights** | App metrics | Built-in |
| **Better Uptime** | Uptime monitoring | External |
| **Metabase** | Business intelligence | Self-hosted |

### 10.2 Key Alerts

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| API Response Time (p95) | > 500ms | > 2s | Scale up |
| Error Rate | > 1% | > 5% | Page on-call |
| Database Connections | > 70% | > 90% | Increase pool |
| Wallet Balance (system) | < KES 100K | < KES 10K | Top up |
| SMS Credits | < 10K | < 1K | Purchase more |
| Disk Usage | > 70% | > 90% | Clean up / scale |

### 10.3 Dashboard Metrics

```
┌─────────────────────────────────────────────────────────────┐
│                    REAL-TIME DASHBOARD                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Active Users: 12,453     Requests/min: 8,234               │
│  ──────────────────────   ─────────────────                 │
│                                                              │
│  Poll Votes Today         Results Submitted                  │
│  ┌─────────────────┐      ┌─────────────────┐               │
│  │     45,678      │      │      3,456      │               │
│  │  ▲ 12% vs yday  │      │   Stations: 890 │               │
│  └─────────────────┘      └─────────────────┘               │
│                                                              │
│  Top Regions by Activity          Error Rate                 │
│  1. Nairobi (23%)                 ┌───────────┐             │
│  2. Kiambu (12%)                  │   0.3%    │             │
│  3. Mombasa (8%)                  │   ✓ OK    │             │
│  4. Nakuru (7%)                   └───────────┘             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. Risk Mitigation

### 11.1 Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Database overload during elections | High | Medium | Auto-scaling, read replicas, caching |
| M-Pesa API downtime | High | Low | Fallback messaging, retry queues |
| SMS delivery failures | Medium | Medium | Multi-provider setup, USSD fallback |
| Data import errors | Medium | Low | Validation, dry-run mode, rollback |
| Real-time sync failures | High | Low | Message queuing, reconciliation |

### 11.2 Security Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Voter data breach | Critical | Low | Encryption, RLS, audit logs |
| Vote manipulation | Critical | Low | One-vote enforcement, audit trails |
| DDoS attacks | High | Medium | Cloudflare, rate limiting |
| Unauthorized result submission | High | Medium | Agent verification, GPS validation |
| Payment fraud | High | Low | Transaction limits, anomaly detection |

### 11.3 Business Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Low user adoption | High | Medium | Marketing, partnerships |
| Regulatory issues | High | Low | Legal review, IEBC engagement |
| Competition | Medium | Medium | Unique features, first-mover |
| Funding gap | High | Medium | Revenue model, investor backup |

---

## 12. Team Structure

### 12.1 Recommended Team

| Role | Count | Responsibilities |
|------|-------|------------------|
| **Project Manager** | 1 | Planning, coordination, stakeholder management |
| **Tech Lead** | 1 | Architecture, code review, technical decisions |
| **Full-Stack Developers** | 3 | Next.js, Supabase, API development |
| **Mobile Developer** | 1 | React Native / Expo |
| **DevOps Engineer** | 1 | CI/CD, infrastructure, monitoring |
| **UI/UX Designer** | 1 | Design system, user flows, prototypes |
| **QA Engineer** | 1 | Testing, automation, quality |
| **Product Owner** | 1 | Requirements, prioritization, UAT |

### 12.2 RACI Matrix

| Activity | PM | Tech Lead | Dev | DevOps | QA | PO |
|----------|:--:|:---------:|:---:|:------:|:--:|:--:|
| Sprint Planning | A | C | R | C | C | R |
| Architecture Design | C | R/A | C | C | I | I |
| Feature Development | I | C | R/A | I | C | C |
| Code Review | I | R/A | R | I | I | I |
| Deployment | C | C | C | R/A | C | I |
| Testing | I | I | C | I | R/A | C |
| UAT Sign-off | C | I | I | I | C | R/A |

R = Responsible, A = Accountable, C = Consulted, I = Informed

---

## Appendix: Quick Start Commands

### Initial Setup

```bash
# Clone repository
git clone https://github.com/your-org/my-vote.git
cd my-vote

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Generate Supabase types
pnpm db:generate

# Run development servers
pnpm dev
```

### Import Electoral Data

```bash
# Place Excel file in data folder
cp /path/to/electoral-data.xlsx data/

# Run import script (dry run)
pnpm import:electoral --dry-run

# Run actual import
pnpm import:electoral

# Verify import
pnpm import:verify
```

### Deployment

```bash
# Deploy to staging
git push origin develop

# Deploy to production
git push origin main

# Manual deployment trigger
doctl apps create-deployment $APP_ID --wait
```

---

**Document Prepared By:** Product & Engineering Team  
**Last Updated:** March 25, 2026  
**Next Review:** April 8, 2026
