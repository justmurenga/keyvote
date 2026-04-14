# Product Requirements Document (PRD)
## myVote Kenya - Election Management System

**Version:** 1.0  
**Date:** March 25, 2026  
**Status:** Draft  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Product Vision & Objectives](#3-product-vision--objectives)
4. [Target Users](#4-target-users)
5. [Electoral Hierarchy Structure](#5-electoral-hierarchy-structure)
6. [Feature Requirements](#6-feature-requirements)
7. [System Architecture](#7-system-architecture)
8. [Data Model](#8-data-model)
9. [Integrations](#9-integrations)
10. [Monetization Strategy](#10-monetization-strategy)
11. [Security & Compliance](#11-security--compliance)
12. [Technical Stack](#12-technical-stack)
13. [User Interface Guidelines](#13-user-interface-guidelines)
14. [Success Metrics](#14-success-metrics)
15. [Roadmap & Phases](#15-roadmap--phases)
16. [Appendices](#16-appendices)

---

## 1. Executive Summary

**myVote Kenya** is a comprehensive election management platform designed to bridge the gap between electoral candidates and voters in Kenya. The system enables candidates to build their political presence, engage with voters, manage campaign agents, and track election results in real-time—all while giving voters the power to follow candidates, participate in opinion polls, and monitor electoral outcomes.

The platform operates across web, Android mobile app, and USSD channels to ensure accessibility for all Kenyans regardless of their technological capabilities.

### Key Value Propositions

| Stakeholder | Value |
|-------------|-------|
| **Voters** | Access to candidate information, opinion polls, real-time results within their electoral region |
| **Candidates** | Campaign management, voter analytics, agent coordination, bulk communications |
| **Political Parties** | Party nominations, candidate management, symbol/branding management |
| **Agents** | Reporting tools, real-time communication with candidates, payment receipts |
| **IEBC/Electoral Bodies** | Transparent result aggregation, voter statistics |

---

## 2. Problem Statement

### Current Challenges

1. **Information Asymmetry**: Voters lack centralized access to candidate profiles, manifestos, and party affiliations
2. **Campaign Inefficiency**: Candidates struggle to reach and engage voters at scale
3. **Agent Management**: No unified system for coordinating campaign agents and tracking their activities
4. **Result Transparency**: Election results take time to trickle down and are prone to manipulation claims
5. **Opinion Polling**: Limited mechanisms for structured, location-aware opinion polling
6. **Financial Tracking**: Campaign financing and agent payments lack transparency
7. **Accessibility**: Rural voters without smartphones are excluded from digital political engagement

### Opportunity

Create a unified platform that democratizes political information, enables efficient campaign management, and provides real-time, transparent election result tracking from polling station to national level.

---

## 3. Product Vision & Objectives

### Vision Statement

> *"To be Kenya's most trusted platform for electoral engagement, connecting every voter with their candidates and ensuring transparent, real-time election monitoring."*

### Strategic Objectives

| Objective | Target | Timeline |
|-----------|--------|----------|
| Registered voters on platform | 5 million | 18 months |
| Active candidates | 10,000+ | 12 months |
| Polling stations covered | 46,229 (100%) | 6 months |
| Opinion poll participation rate | 40% of registered users | Ongoing |
| Result reporting accuracy | 99.5% | Election period |

### Success Criteria

- [ ] 100% coverage of Kenya's electoral units (polling stations, wards, constituencies, counties)
- [ ] Real-time result aggregation within 30 minutes of announcement
- [ ] USSD accessibility for feature phone users
- [ ] Sub-3-second page load times
- [ ] 99.9% uptime during election periods

---

## 4. Target Users

### 4.1 Primary User Personas

#### Persona 1: The Voter (Mwananchi)

| Attribute | Details |
|-----------|---------|
| **Name** | James Otieno |
| **Age** | 28 years |
| **Location** | Kisumu County, Nyalenda Ward |
| **Device** | Android smartphone (entry-level) |
| **Goals** | Follow preferred candidates, vote in opinion polls, view election results |
| **Pain Points** | Information scattered across social media, fake news, difficulty verifying candidate claims |

#### Persona 2: The Candidate (Aspirant)

| Attribute | Details |
|-----------|---------|
| **Name** | Hon. Mary Wanjiku |
| **Position** | Aspiring County Women Representative |
| **Experience** | First-time candidate |
| **Goals** | Build voter base, communicate manifesto, manage agents, track campaign progress |
| **Pain Points** | Limited budget, difficulty reaching all wards, tracking agent activities |

#### Persona 3: The Campaign Agent

| Attribute | Details |
|-----------|---------|
| **Name** | Peter Mwangi |
| **Role** | Ward Coordinator |
| **Device** | Feature phone (USSD user) |
| **Goals** | Mobilize voters, report ground activities, receive payments |
| **Pain Points** | No structured reporting, delayed payments, communication gaps |

#### Persona 4: The Party Official

| Attribute | Details |
|-----------|---------|
| **Name** | Sarah Chebet |
| **Role** | Party Nominations Coordinator |
| **Goals** | Manage party nominations, coordinate candidates, maintain party branding |
| **Pain Points** | Disputed nominations, lack of transparent voting mechanisms |

### 4.2 User Roles & Permissions Matrix

| Feature | Voter | Candidate | Agent | Party Admin | System Admin |
|---------|:-----:|:---------:|:-----:|:-----------:|:------------:|
| View own region results | ✅ | ✅ | ✅ | ✅ | ✅ |
| View other region results | 💰 | 💰 | 💰 | 💰 | ✅ |
| Follow candidates | ✅ | ❌ | ✅ | ❌ | ❌ |
| Create candidate profile | ❌ | ✅ | ❌ | ❌ | ✅ |
| Manage agents | ❌ | ✅ | ❌ | ❌ | ✅ |
| Submit results | ❌ | ❌ | ✅ | ❌ | ✅ |
| Send bulk SMS | ❌ | 💰 | ❌ | 💰 | ✅ |
| Run opinion polls | ❌ | 💰 | ❌ | 💰 | ✅ |
| Party nominations | ❌ | ❌ | ❌ | ✅ | ✅ |
| Upload result sheets | ❌ | ❌ | ✅ | ❌ | ✅ |
| Bulk M-Pesa payments | ❌ | 💰 | ❌ | 💰 | ✅ |

✅ = Included | 💰 = Paid Feature | ❌ = Not Available

---

## 5. Electoral Hierarchy Structure

### 5.1 Kenya Electoral Units Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                      NATIONAL LEVEL                         │
│                   (President, Deputy)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    47 COUNTIES                              │
│          (Governor, Senator, Women Rep)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  290 CONSTITUENCIES                         │
│                (Member of Parliament)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     1,450 WARDS                             │
│            (Member of County Assembly - MCA)                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 46,229 POLLING STATIONS                     │
│              (Multiple streams: A, B, C...)                 │
│            [Registered Voters per Station]                  │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Electoral Positions

| Level | Position | Quantity | Voting Scope |
|-------|----------|----------|--------------|
| National | President | 1 | All voters |
| National | Deputy President | 1 | (Running mate) |
| County | Governor | 47 | County voters |
| County | Deputy Governor | 47 | (Running mate) |
| County | Senator | 47 | County voters |
| County | Women Representative | 47 | County voters |
| Constituency | Member of Parliament (MP) | 290 | Constituency voters |
| Ward | Member of County Assembly (MCA) | 1,450 | Ward voters |

### 5.3 Polling Station Data Structure

Each polling station record will include:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `station_code` | String | Unique IEBC code | `001/001/001/001` |
| `station_name` | String | Official name | `Karura Primary School` |
| `stream` | String | Stream identifier (if multiple) | `A`, `B`, `C` |
| `display_name` | String | Combined name + stream | `Karura Primary School Stream A` |
| `registered_voters` | Integer | IEBC registered count | `487` |
| `ward_id` | FK | Parent ward | Reference |
| `latitude` | Decimal | GPS coordinate | `-1.2345` |
| `longitude` | Decimal | GPS coordinate | `36.7890` |

### 5.4 Voter's Electoral Line

A voter's "line" determines which candidates they can follow and which results they can view:

```
Voter at: Karura Primary School Stream A, Karura Ward, Westlands Constituency, Nairobi County

Can Follow/View:
├── MCA candidates for Karura Ward
├── MP candidates for Westlands Constituency  
├── Governor candidates for Nairobi County
├── Senator candidates for Nairobi County
├── Women Rep candidates for Nairobi County
└── Presidential candidates (National)
```

---

## 6. Feature Requirements

### 6.1 User Management

#### 6.1.1 Voter Registration & Profile

| Requirement ID | Description | Priority |
|----------------|-------------|----------|
| UM-001 | Voters register with phone number (primary identifier) | P0 |
| UM-002 | OTP verification via SMS | P0 |
| UM-003 | Profile fields: Full Name, ID Number (optional), Gender, Age Bracket | P0 |
| UM-004 | Polling station selection (searchable dropdown with autocomplete) | P0 |
| UM-005 | Automatic assignment of ward, constituency, county based on polling station | P0 |
| UM-006 | Profile photo upload (optional) | P2 |
| UM-007 | Voters can update polling station (with verification) | P1 |

**Age Brackets:**
- 18-24 years (Youth)
- 25-34 years (Young Adult)
- 35-44 years (Middle Age)
- 45-54 years (Mature Adult)
- 55-64 years (Pre-Senior)
- 65+ years (Senior)

**Gender Options:**
- Male
- Female
- Prefer not to say

#### 6.1.2 Candidate Registration & Profile

| Requirement ID | Description | Priority |
|----------------|-------------|----------|
| CM-001 | Candidates register with verified phone number | P0 |
| CM-002 | KYC verification (ID upload, selfie verification) | P0 |
| CM-003 | Profile fields: Full Name, Date of Birth, Education, Experience | P0 |
| CM-004 | Electoral position selection | P0 |
| CM-005 | Electoral region selection (based on position) | P0 |
| CM-006 | Political party affiliation OR Independent declaration | P0 |
| CM-007 | Profile photo (mandatory, high quality) | P0 |
| CM-008 | Manifesto upload (PDF, max 10MB) | P1 |
| CM-009 | Manifesto text editor (rich text) | P1 |
| CM-010 | Campaign slogan | P1 |
| CM-011 | Social media links | P2 |
| CM-012 | Campaign video upload/YouTube link | P2 |
| CM-013 | Verification badge for approved candidates | P1 |

#### 6.1.3 Agent Registration

| Requirement ID | Description | Priority |
|----------------|-------------|----------|
| AG-001 | Agents invited by candidates via phone number | P0 |
| AG-002 | Agent accepts/declines invitation | P0 |
| AG-003 | Agent assigned to specific region(s) by candidate | P0 |
| AG-004 | Agent can be assigned to: Polling Station, Ward, Constituency, or County level | P0 |
| AG-005 | Agents can be voters from any region (not restricted) | P0 |
| AG-006 | Agent profile includes M-Pesa number for payments | P1 |
| AG-007 | Candidate can revoke agent status | P0 |
| AG-008 | Agent activity dashboard | P1 |

### 6.2 Following System

| Requirement ID | Description | Priority |
|----------------|-------------|----------|
| FL-001 | Voters can follow candidates within their electoral line only | P0 |
| FL-002 | Follow/Unfollow toggle on candidate profile | P0 |
| FL-003 | Following feed shows updates from followed candidates | P1 |
| FL-004 | Notification when followed candidate posts update | P1 |
| FL-005 | Candidates see follower count with breakdown by region | P0 |
| FL-006 | Candidates see follow/unfollow trends (daily, weekly, monthly) | P1 |
| FL-007 | Follower demographics: Gender breakdown | P1 |
| FL-008 | Follower demographics: Age bracket breakdown | P1 |
| FL-009 | Follower demographics: Geographic breakdown (to polling station) | P1 |
| FL-010 | Exportable follower analytics report | P2 |

### 6.3 Opinion Polls

#### 6.3.1 Poll Management

| Requirement ID | Description | Priority |
|----------------|-------------|----------|
| OP-001 | System admin can schedule opinion polls | P0 |
| OP-002 | Polls can be scheduled by electoral position category | P0 |
| OP-003 | Poll scheduling: specific date, recurring (daily by position) | P1 |
| OP-004 | Poll duration: Start at 00:00 EAT, End at 23:59 EAT | P0 |
| OP-005 | Suggested schedule: Monday=MCA, Tuesday=MP, Wednesday=Women Rep, Thursday=Senator, Friday=Governor, Saturday=President | P1 |
| OP-006 | Candidates automatically included in polls for their position/region | P0 |
| OP-007 | Custom polls (parties can create for nominations) | P1 |

#### 6.3.2 Voting in Polls

| Requirement ID | Description | Priority |
|----------------|-------------|----------|
| PV-001 | Voters see only candidates in their electoral line | P0 |
| PV-002 | One vote per voter per poll (until poll ends) | P0 |
| PV-003 | Vote recorded with voter's polling station (anonymous) | P0 |
| PV-004 | Confirmation screen before submitting vote | P0 |
| PV-005 | Vote receipt/confirmation | P1 |
| PV-006 | Cannot change vote once submitted | P0 |
| PV-007 | USSD voting support | P1 |

#### 6.3.3 Poll Results

| Requirement ID | Description | Priority |
|----------------|-------------|----------|
| PR-001 | Real-time result aggregation | P0 |
| PR-002 | Results viewable by: Polling Station → Ward → Constituency → County → National | P0 |
| PR-003 | Results breakdown by gender | P1 |
| PR-004 | Results breakdown by age bracket | P1 |
| PR-005 | Historical poll trends (candidate performance over time) | P2 |
| PR-006 | Candidates can only view results within their electoral scope | P0 |
| PR-007 | Voters can view results within their electoral line (free) | P0 |
| PR-008 | Viewing results outside electoral line requires payment | P1 |

### 6.4 Election Results Tracking

#### 6.4.1 Result Submission

| Requirement ID | Description | Priority |
|----------------|-------------|----------|
| ER-001 | Agents submit results via Android app | P0 |
| ER-002 | Agents submit results via USSD | P1 |
| ER-003 | Result submission form: Position, Candidate, Votes | P0 |
| ER-004 | Multiple agents can submit results for same polling station | P0 |
| ER-005 | System takes MODE (most common value) as default result | P0 |
| ER-006 | Result sheet image upload (mandatory) | P0 |
| ER-007 | Timestamp and GPS location recorded with submission | P0 |
| ER-008 | Agent identity recorded (for accountability) | P0 |
| ER-009 | Result disputes flagged for review | P1 |

#### 6.4.2 Result Aggregation

| Requirement ID | Description | Priority |
|----------------|-------------|----------|
| RA-001 | Real-time tallying from polling station upward | P0 |
| RA-002 | Automatic summation: Station → Ward → Constituency → County → National | P0 |
| RA-003 | Display: Total votes cast vs. Total registered voters | P0 |
| RA-004 | Turnout percentage calculation | P0 |
| RA-005 | Invalid/rejected votes tracking | P1 |
| RA-006 | Sync within 30 seconds of submission | P0 |

#### 6.4.3 Result Viewing

| Requirement ID | Description | Priority |
|----------------|-------------|----------|
| RV-001 | Candidates view results for their electoral scope only | P0 |
| RV-002 | Drill-down capability: National → County → Constituency → Ward → Polling Station | P0 |
| RV-003 | Visual charts: Bar charts, pie charts | P1 |
| RV-004 | Live results dashboard with auto-refresh | P0 |
| RV-005 | Result comparison across regions | P1 |
| RV-006 | Result export (PDF, Excel) | P2 |
| RV-007 | Result sheet images viewable | P1 |

### 6.5 Communication Features

#### 6.5.1 In-App Messaging

| Requirement ID | Description | Priority |
|----------------|-------------|----------|
| IM-001 | Candidate to Agent direct messaging | P0 |
| IM-002 | Real-time chat with read receipts | P1 |
| IM-003 | Group messaging (Candidate to all agents) | P1 |
| IM-004 | File/image sharing in chat | P1 |
| IM-005 | Chat history persistence | P0 |
| IM-006 | Push notifications for new messages | P0 |

#### 6.5.2 Bulk SMS

| Requirement ID | Description | Priority |
|----------------|-------------|----------|
| BS-001 | Candidates send bulk SMS to followers | P0 |
| BS-002 | Custom Sender ID support | P1 |
| BS-003 | SMS targeting by region (ward, constituency, county) | P1 |
| BS-004 | SMS targeting by demographics (gender, age) | P1 |
| BS-005 | SMS scheduling | P1 |
| BS-006 | SMS delivery reports | P1 |
| BS-007 | SMS templates | P2 |
| BS-008 | Cost: Deducted from wallet | P0 |
| BS-009 | Opt-out management (STOP functionality) | P0 |

#### 6.5.3 WhatsApp Integration

| Requirement ID | Description | Priority |
|----------------|-------------|----------|
| WA-001 | Bulk WhatsApp messaging to followers | P1 |
| WA-002 | WhatsApp Business API integration | P1 |
| WA-003 | Rich media support (images, documents) | P1 |
| WA-004 | Cost: Deducted from wallet | P0 |

#### 6.5.4 USSD Interface

| Requirement ID | Description | Priority |
|----------------|-------------|----------|
| US-001 | USSD short code (e.g., *XXX#) | P0 |
| US-002 | USSD menu: Registration | P0 |
| US-003 | USSD menu: Profile update | P1 |
| US-004 | USSD menu: View candidates | P1 |
| US-005 | USSD menu: Vote in polls | P1 |
| US-006 | USSD menu: Submit election results (agents) | P0 |
| US-007 | USSD menu: Check wallet balance | P1 |
| US-008 | USSD menu: View results | P1 |
| US-009 | Session timeout handling | P0 |

**Sample USSD Flow:**
```
*384*VOTE#

1. Register
2. My Profile
3. Opinion Polls
4. View Candidates
5. Election Results
6. My Wallet
0. Exit
```

### 6.6 Agent Management

| Requirement ID | Description | Priority |
|----------------|-------------|----------|
| AM-001 | Candidate dashboard showing all agents | P0 |
| AM-002 | Agent assignment to regions (single or multiple) | P0 |
| AM-003 | Agent performance metrics | P1 |
| AM-004 | Agent activity reports | P1 |
| AM-005 | Agent communication logs | P1 |
| AM-006 | Bulk agent import (CSV) | P2 |
| AM-007 | Agent verification status | P1 |

### 6.7 Agent Reporting

| Requirement ID | Description | Priority |
|----------------|-------------|----------|
| AR-001 | Agents submit daily activity reports | P1 |
| AR-002 | Report templates (Rally attendance, Door-to-door, etc.) | P1 |
| AR-003 | Photo/media attachment in reports | P1 |
| AR-004 | GPS location stamp on reports | P1 |
| AR-005 | Report approval workflow | P2 |

### 6.8 Wallet & Payments

#### 6.8.1 Wallet Management

| Requirement ID | Description | Priority |
|----------------|-------------|----------|
| WL-001 | Auto-create wallet on user registration | P0 |
| WL-002 | Wallet balance display | P0 |
| WL-003 | Wallet top-up via M-Pesa (STK Push) | P0 |
| WL-004 | Wallet top-up via card payment | P2 |
| WL-005 | Wallet transaction history | P0 |
| WL-006 | Low balance notifications | P1 |
| WL-007 | Wallet statements (downloadable) | P2 |

#### 6.8.2 Bulk M-Pesa Disbursements

| Requirement ID | Description | Priority |
|----------------|-------------|----------|
| MP-001 | Candidates send money to agents via M-Pesa B2C | P0 |
| MP-002 | Bulk payment upload (CSV: phone, amount, reason) | P1 |
| MP-003 | Payment approval workflow (for large amounts) | P1 |
| MP-004 | Payment confirmation receipts | P0 |
| MP-005 | Failed payment handling and retry | P1 |
| MP-006 | Payment reports and reconciliation | P1 |
| MP-007 | Amount limits (configurable) | P1 |

### 6.9 Political Party Management

| Requirement ID | Description | Priority |
|----------------|-------------|----------|
| PP-001 | Party registration with official details | P0 |
| PP-002 | Party symbol/logo upload | P0 |
| PP-003 | Party color scheme | P1 |
| PP-004 | Party leadership structure | P1 |
| PP-005 | Party-affiliated candidates listing | P0 |
| PP-006 | Party admin dashboard | P0 |
| PP-007 | Party verification (with ORPP certificate) | P1 |

### 6.10 Party Nominations

| Requirement ID | Description | Priority |
|----------------|-------------|----------|
| PN-001 | Party creates nomination poll | P1 |
| PN-002 | Nomination by electoral position and region | P1 |
| PN-003 | Candidates register for nomination | P1 |
| PN-004 | Party members vote (verified membership) | P1 |
| PN-005 | One vote per member per position | P0 |
| PN-006 | Nomination results dashboard | P1 |
| PN-007 | Winner declaration and certificate generation | P2 |
| PN-008 | Nomination fee payment (to party wallet) | P1 |

### 6.11 Analytics & Reporting

| Requirement ID | Description | Priority |
|----------------|-------------|----------|
| AN-001 | Candidate dashboard with key metrics | P0 |
| AN-002 | Follower growth charts | P1 |
| AN-003 | Engagement metrics (views, interactions) | P1 |
| AN-004 | Geographic heat maps | P2 |
| AN-005 | Demographic breakdown charts | P1 |
| AN-006 | Poll performance trends | P1 |
| AN-007 | Comparative analytics (vs other candidates) | P2 |
| AN-008 | Custom report builder | P2 |
| AN-009 | Metabase integration for advanced analytics | P1 |
| AN-010 | Exportable reports (PDF, Excel, CSV) | P1 |

---

## 7. System Architecture

### 7.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                     │
├────────────────────┬────────────────────┬────────────────────────────────────┤
│    Web App         │   Android App      │         USSD Gateway               │
│  (Next.js/React)   │   (React Native/   │     (Africa's Talking /            │
│                    │    Kotlin)         │      Safaricom)                    │
└────────────────────┴────────────────────┴────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                        │
│                         (Supabase Edge Functions)                             │
├──────────────────────────────────────────────────────────────────────────────┤
│  Auth  │  Profiles  │  Polls  │  Results  │  Payments  │  Messaging  │ Admin │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                            DATABASE LAYER                                     │
│                         (Supabase PostgreSQL)                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│  Users  │  Electoral Units  │  Polls  │  Results  │  Wallets  │  Messages   │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          INTEGRATIONS LAYER                                   │
├──────────────┬──────────────┬──────────────┬──────────────┬─────────────────┤
│   M-Pesa     │   SMS        │   WhatsApp   │   USSD       │   Metabase      │
│   (Daraja)   │   (Africa's  │   (WABA)     │   (Africa's  │   (Analytics)   │
│              │   Talking)   │              │   Talking)   │                 │
└──────────────┴──────────────┴──────────────┴──────────────┴─────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                            STORAGE LAYER                                      │
│                         (Supabase Storage)                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│  Profile Images  │  Manifestos  │  Result Sheets  │  Party Logos  │  Reports │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Real-Time Architecture (for Results)

```
┌─────────────┐    Submit     ┌─────────────┐    Insert    ┌─────────────┐
│   Agent     │──────────────▶│   API       │─────────────▶│  Database   │
│   (App)     │               │   Endpoint  │              │  (Postgres) │
└─────────────┘               └─────────────┘              └──────┬──────┘
                                                                  │
                                                                  │ Trigger
                                                                  ▼
┌─────────────┐    Realtime   ┌─────────────┐   Calculate  ┌─────────────┐
│   Viewers   │◀──────────────│  Supabase   │◀─────────────│   Mode      │
│   (Web/App) │   (WebSocket) │  Realtime   │              │  Function   │
└─────────────┘               └─────────────┘              └─────────────┘
```

---

## 8. Data Model

### 8.1 Core Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    counties     │       │  constituencies │       │     wards       │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │───┐   │ id (PK)         │───┐   │ id (PK)         │
│ name            │   │   │ name            │   │   │ name            │
│ code            │   │   │ code            │   │   │ code            │
│ registered_     │   └──▶│ county_id (FK)  │   └──▶│ constituency_id │
│   voters        │       │ registered_     │       │ registered_     │
└─────────────────┘       │   voters        │       │   voters        │
                          └─────────────────┘       └────────┬────────┘
                                                             │
                                                             ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     users       │       │   candidates    │       │polling_stations │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │───┐   │ id (PK)         │       │ id (PK)         │
│ phone           │   │   │ user_id (FK)    │◀──┐   │ code            │
│ name            │   │   │ position        │   │   │ name            │
│ gender          │   │   │ party_id (FK)   │   │   │ stream          │
│ age_bracket     │   │   │ manifesto       │   │   │ display_name    │
│ polling_station │   │   │ is_independent  │   │   │ ward_id (FK)    │
│ role            │   │   │ verified        │   │   │ registered_     │
│ wallet_id (FK)  │   │   │ electoral_region│   │   │   voters        │
└────────┬────────┘   │   └─────────────────┘   │   │ latitude        │
         │            │           │             │   │ longitude       │
         │            │           │             │   └─────────────────┘
         ▼            │           ▼             │
┌─────────────────┐   │   ┌─────────────────┐   │
│   followers     │   │   │     agents      │   │
├─────────────────┤   │   ├─────────────────┤   │
│ id (PK)         │   │   │ id (PK)         │   │
│ voter_id (FK)   │◀──┘   │ user_id (FK)    │◀──┘
│ candidate_id    │       │ candidate_id    │
│ followed_at     │       │ region_type     │
│ unfollowed_at   │       │ region_id       │
└─────────────────┘       │ status          │
                          │ mpesa_number    │
                          └─────────────────┘
```

### 8.2 Detailed Table Schemas

#### 8.2.1 Electoral Units

```sql
-- Counties (47 records)
CREATE TABLE counties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(3) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    registered_voters INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Constituencies (290 records)
CREATE TABLE constituencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    county_id UUID REFERENCES counties(id) ON DELETE CASCADE,
    registered_voters INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wards (1,450 records)
CREATE TABLE wards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(15) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    constituency_id UUID REFERENCES constituencies(id) ON DELETE CASCADE,
    registered_voters INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Polling Stations (46,229+ records with streams)
CREATE TABLE polling_stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(200) NOT NULL,
    stream VARCHAR(5), -- A, B, C, etc.
    display_name VARCHAR(250) GENERATED ALWAYS AS (
        CASE WHEN stream IS NOT NULL 
        THEN name || ' Stream ' || stream 
        ELSE name END
    ) STORED,
    ward_id UUID REFERENCES wards(id) ON DELETE CASCADE,
    registered_voters INTEGER NOT NULL DEFAULT 0,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(code, stream)
);
```

#### 8.2.2 Users & Authentication

```sql
-- User Roles Enum
CREATE TYPE user_role AS ENUM ('voter', 'candidate', 'agent', 'party_admin', 'system_admin');

-- Gender Enum
CREATE TYPE gender_type AS ENUM ('male', 'female', 'prefer_not_to_say');

-- Age Bracket Enum
CREATE TYPE age_bracket AS ENUM ('18-24', '25-34', '35-44', '45-54', '55-64', '65+');

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    full_name VARCHAR(200) NOT NULL,
    gender gender_type,
    age_bracket age_bracket,
    id_number VARCHAR(20), -- Optional, encrypted
    polling_station_id UUID REFERENCES polling_stations(id),
    role user_role DEFAULT 'voter',
    profile_photo_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Preferences
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    push_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT FALSE,
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 8.2.3 Political Parties

```sql
CREATE TABLE political_parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) UNIQUE NOT NULL,
    abbreviation VARCHAR(20) UNIQUE NOT NULL,
    symbol_url TEXT,
    primary_color VARCHAR(7), -- Hex color
    secondary_color VARCHAR(7),
    registration_number VARCHAR(50), -- ORPP registration
    is_verified BOOLEAN DEFAULT FALSE,
    headquarters VARCHAR(300),
    website_url TEXT,
    founded_date DATE,
    leader_name VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Party Membership
CREATE TABLE party_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    party_id UUID REFERENCES political_parties(id) ON DELETE CASCADE,
    membership_number VARCHAR(50),
    role VARCHAR(100), -- e.g., 'member', 'official', 'leader'
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, party_id)
);
```

#### 8.2.4 Candidates

```sql
-- Electoral Position Enum
CREATE TYPE electoral_position AS ENUM (
    'president', 
    'governor', 
    'senator', 
    'women_rep', 
    'mp', 
    'mca'
);

-- Candidates Table
CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    position electoral_position NOT NULL,
    
    -- Electoral Region (depends on position)
    county_id UUID REFERENCES counties(id), -- For Governor, Senator, Women Rep
    constituency_id UUID REFERENCES constituencies(id), -- For MP
    ward_id UUID REFERENCES wards(id), -- For MCA
    -- President: null (national level)
    
    party_id UUID REFERENCES political_parties(id),
    is_independent BOOLEAN DEFAULT FALSE,
    
    -- Profile
    campaign_slogan VARCHAR(500),
    manifesto_text TEXT,
    manifesto_pdf_url TEXT,
    campaign_video_url TEXT,
    
    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    verification_notes TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure either party or independent
    CONSTRAINT party_or_independent CHECK (
        (party_id IS NOT NULL AND is_independent = FALSE) OR
        (party_id IS NULL AND is_independent = TRUE)
    )
);
```

#### 8.2.5 Followers

```sql
CREATE TABLE followers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voter_id UUID REFERENCES users(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    followed_at TIMESTAMPTZ DEFAULT NOW(),
    unfollowed_at TIMESTAMPTZ,
    is_following BOOLEAN DEFAULT TRUE,
    
    -- Snapshot of voter's location at follow time
    polling_station_id UUID REFERENCES polling_stations(id),
    ward_id UUID REFERENCES wards(id),
    constituency_id UUID REFERENCES constituencies(id),
    county_id UUID REFERENCES counties(id),
    
    UNIQUE(voter_id, candidate_id)
);

-- Follower Analytics Materialized View
CREATE MATERIALIZED VIEW candidate_follower_stats AS
SELECT 
    c.id AS candidate_id,
    c.position,
    COUNT(DISTINCT f.voter_id) FILTER (WHERE f.is_following) AS total_followers,
    COUNT(DISTINCT f.voter_id) FILTER (WHERE f.followed_at >= CURRENT_DATE) AS today_new,
    COUNT(DISTINCT f.voter_id) FILTER (WHERE f.unfollowed_at >= CURRENT_DATE) AS today_unfollowed,
    COUNT(DISTINCT f.voter_id) FILTER (WHERE f.is_following AND u.gender = 'male') AS male_followers,
    COUNT(DISTINCT f.voter_id) FILTER (WHERE f.is_following AND u.gender = 'female') AS female_followers
FROM candidates c
LEFT JOIN followers f ON c.id = f.candidate_id
LEFT JOIN users u ON f.voter_id = u.id
GROUP BY c.id, c.position;
```

#### 8.2.6 Agents

```sql
-- Region Type Enum
CREATE TYPE region_type AS ENUM ('polling_station', 'ward', 'constituency', 'county', 'national');

-- Agent Status Enum
CREATE TYPE agent_status AS ENUM ('pending', 'active', 'suspended', 'revoked');

CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    
    -- Assignment
    assigned_region_type region_type NOT NULL,
    assigned_region_id UUID, -- References appropriate table based on type
    
    -- Payment Info
    mpesa_number VARCHAR(15),
    
    -- Status
    status agent_status DEFAULT 'pending',
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    
    -- Performance
    total_reports INTEGER DEFAULT 0,
    total_results_submitted INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, candidate_id)
);

-- Agent Reports
CREATE TABLE agent_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    report_type VARCHAR(50), -- 'rally', 'door_to_door', 'meeting', etc.
    content TEXT NOT NULL,
    media_urls TEXT[], -- Array of image/video URLs
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    reported_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'submitted' -- 'submitted', 'reviewed', 'approved'
);
```

#### 8.2.7 Opinion Polls

```sql
-- Poll Status Enum
CREATE TYPE poll_status AS ENUM ('scheduled', 'active', 'completed', 'cancelled');

-- Polls Table
CREATE TABLE polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    position electoral_position NOT NULL,
    
    -- Scope (null = national for that position)
    county_id UUID REFERENCES counties(id),
    constituency_id UUID REFERENCES constituencies(id),
    ward_id UUID REFERENCES wards(id),
    
    -- Schedule
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    
    -- Type
    is_party_nomination BOOLEAN DEFAULT FALSE,
    party_id UUID REFERENCES political_parties(id), -- If nomination poll
    
    status poll_status DEFAULT 'scheduled',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Poll Votes
CREATE TABLE poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
    voter_id UUID REFERENCES users(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    
    -- Voter's location snapshot (for analytics, anonymous)
    polling_station_id UUID REFERENCES polling_stations(id),
    gender gender_type,
    age_bracket age_bracket,
    
    voted_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(poll_id, voter_id) -- One vote per voter per poll
);

-- Poll Results (Materialized for performance)
CREATE MATERIALIZED VIEW poll_results AS
SELECT 
    p.id AS poll_id,
    pv.candidate_id,
    COUNT(*) AS vote_count,
    COUNT(*) FILTER (WHERE pv.gender = 'male') AS male_votes,
    COUNT(*) FILTER (WHERE pv.gender = 'female') AS female_votes,
    COUNT(*) FILTER (WHERE pv.age_bracket = '18-24') AS youth_votes,
    ps.ward_id,
    w.constituency_id,
    c.county_id
FROM polls p
JOIN poll_votes pv ON p.id = pv.poll_id
JOIN polling_stations ps ON pv.polling_station_id = ps.id
JOIN wards w ON ps.ward_id = w.id
JOIN constituencies c ON w.constituency_id = c.id
GROUP BY p.id, pv.candidate_id, ps.ward_id, w.constituency_id, c.county_id;
```

#### 8.2.8 Election Results

```sql
-- Election Results Submissions
CREATE TABLE election_result_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    polling_station_id UUID REFERENCES polling_stations(id) ON DELETE CASCADE,
    position electoral_position NOT NULL,
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    votes INTEGER NOT NULL CHECK (votes >= 0),
    
    -- Submission Details
    submitted_by UUID REFERENCES users(id), -- Agent
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Result Sheet
    result_sheet_url TEXT,
    
    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ
);

-- Consolidated Results (MODE calculation)
CREATE TABLE election_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    polling_station_id UUID REFERENCES polling_stations(id) ON DELETE CASCADE,
    position electoral_position NOT NULL,
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    
    -- Final votes (MODE of submissions)
    votes INTEGER NOT NULL,
    
    -- Metadata
    submission_count INTEGER DEFAULT 1,
    has_discrepancy BOOLEAN DEFAULT FALSE,
    
    -- Result Sheet (most recent/verified)
    result_sheet_url TEXT,
    
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(polling_station_id, position, candidate_id)
);

-- Aggregated Results View (for real-time tallying)
CREATE OR REPLACE VIEW aggregated_results AS
WITH station_results AS (
    SELECT 
        er.position,
        er.candidate_id,
        er.votes,
        ps.id AS polling_station_id,
        ps.ward_id,
        w.constituency_id,
        c.county_id
    FROM election_results er
    JOIN polling_stations ps ON er.polling_station_id = ps.id
    JOIN wards w ON ps.ward_id = w.id
    JOIN constituencies c ON w.constituency_id = c.id
)
SELECT 
    position,
    candidate_id,
    SUM(votes) AS total_votes,
    COUNT(DISTINCT polling_station_id) AS stations_reported,
    county_id,
    constituency_id,
    ward_id
FROM station_results
GROUP BY position, candidate_id, county_id, constituency_id, ward_id;
```

#### 8.2.9 Wallet & Payments

```sql
-- Wallets
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(12, 2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'KES',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction Type Enum
CREATE TYPE transaction_type AS ENUM (
    'topup', 
    'sms_charge', 
    'whatsapp_charge',
    'poll_view_charge',
    'result_view_charge',
    'mpesa_disbursement',
    'subscription_charge',
    'refund'
);

-- Transaction Status Enum
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'reversed');

-- Wallet Transactions
CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    type transaction_type NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    balance_before DECIMAL(12, 2) NOT NULL,
    balance_after DECIMAL(12, 2) NOT NULL,
    description TEXT,
    reference VARCHAR(100),
    status transaction_status DEFAULT 'pending',
    
    -- M-Pesa specific
    mpesa_receipt_number VARCHAR(50),
    mpesa_transaction_date TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- M-Pesa Disbursements
CREATE TABLE mpesa_disbursements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_wallet_id UUID REFERENCES wallets(id),
    recipient_phone VARCHAR(15) NOT NULL,
    recipient_name VARCHAR(200),
    amount DECIMAL(12, 2) NOT NULL,
    reason TEXT,
    
    -- Status
    status transaction_status DEFAULT 'pending',
    mpesa_conversation_id VARCHAR(100),
    mpesa_originator_conversation_id VARCHAR(100),
    mpesa_receipt_number VARCHAR(50),
    result_description TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
```

#### 8.2.10 Messaging

```sql
-- Chat Conversations
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    media_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bulk SMS Campaigns
CREATE TABLE sms_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES users(id),
    sender_id_name VARCHAR(11), -- Custom sender ID
    message TEXT NOT NULL,
    
    -- Targeting
    target_type VARCHAR(20), -- 'all_followers', 'region', 'demographic'
    target_region_type region_type,
    target_region_id UUID,
    target_gender gender_type,
    target_age_bracket age_bracket,
    
    -- Execution
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    total_recipients INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    
    -- Cost
    total_cost DECIMAL(12, 2),
    wallet_transaction_id UUID REFERENCES wallet_transactions(id),
    
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'completed'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SMS Recipients
CREATE TABLE sms_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES sms_campaigns(id) ON DELETE CASCADE,
    phone VARCHAR(15) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
    delivery_report TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ
);
```

### 8.3 Row Level Security (RLS) Policies

```sql
-- Example: Voters can only view candidates in their electoral line
CREATE POLICY "Voters see candidates in their line"
ON candidates FOR SELECT
USING (
    -- Check if candidate is in voter's electoral line
    auth.uid() IS NOT NULL
    AND (
        -- President (everyone can see)
        position = 'president'
        OR
        -- Same county for Governor, Senator, Women Rep
        (position IN ('governor', 'senator', 'women_rep') AND county_id IN (
            SELECT c.county_id FROM users u
            JOIN polling_stations ps ON u.polling_station_id = ps.id
            JOIN wards w ON ps.ward_id = w.id
            JOIN constituencies co ON w.constituency_id = co.id
            JOIN counties c ON co.county_id = c.id
            WHERE u.id = auth.uid()
        ))
        OR
        -- Same constituency for MP
        (position = 'mp' AND constituency_id IN (
            SELECT w.constituency_id FROM users u
            JOIN polling_stations ps ON u.polling_station_id = ps.id
            JOIN wards w ON ps.ward_id = w.id
            WHERE u.id = auth.uid()
        ))
        OR
        -- Same ward for MCA
        (position = 'mca' AND ward_id IN (
            SELECT ps.ward_id FROM users u
            JOIN polling_stations ps ON u.polling_station_id = ps.id
            WHERE u.id = auth.uid()
        ))
    )
);
```

---

## 9. Integrations

### 9.1 M-Pesa Integration (Safaricom Daraja API)

#### 9.1.1 Wallet Top-up (C2B / STK Push)

| Feature | Description |
|---------|-------------|
| **API** | Lipa Na M-Pesa Online (STK Push) |
| **Flow** | User initiates → STK prompt → PIN entry → Confirmation → Wallet credit |
| **Callback** | Receive payment confirmation and update wallet |

#### 9.1.2 Bulk Disbursement (B2C)

| Feature | Description |
|---------|-------------|
| **API** | Business to Customer (B2C) |
| **Flow** | Candidate initiates → Deduct from wallet → Send to recipient M-Pesa |
| **Use Case** | Paying agents, campaign expenses |

### 9.2 SMS Integration (Africa's Talking)

| Feature | Description |
|---------|-------------|
| **Bulk SMS** | Send to multiple recipients |
| **Sender ID** | Custom alphanumeric sender IDs |
| **Delivery Reports** | Track SMS delivery status |
| **Cost** | ~KES 0.80 per SMS |

### 9.3 USSD Integration (Africa's Talking / Safaricom)

| Feature | Description |
|---------|-------------|
| **Short Code** | *384*VOTE# (example) |
| **Session Handling** | Manage USSD sessions with state |
| **Menu Navigation** | Multi-level menu system |
| **Timeout** | 180 seconds session timeout |

**USSD Menu Structure:**
```
Level 1: Main Menu
├── 1. Register/Login
├── 2. My Profile
│   ├── 1. View Profile
│   ├── 2. Update Polling Station
│   └── 0. Back
├── 3. Opinion Polls
│   ├── 1. Vote Now
│   ├── 2. View Results
│   └── 0. Back
├── 4. View Candidates
├── 5. Election Results
│   ├── 1. Submit Results (Agents)
│   ├── 2. View Results
│   └── 0. Back
├── 6. My Wallet
│   ├── 1. Check Balance
│   ├── 2. Top Up
│   └── 0. Back
└── 0. Exit
```

### 9.4 WhatsApp Business API

| Feature | Description |
|---------|-------------|
| **Provider** | Meta (via partners like 360Dialog, Twilio) |
| **Templates** | Pre-approved message templates |
| **Rich Media** | Images, documents, buttons |
| **Cost** | ~$0.05 per message (varies by country) |

### 9.5 Metabase Integration

| Feature | Description |
|---------|-------------|
| **Connection** | Direct PostgreSQL connection to Supabase |
| **Dashboards** | Pre-built election analytics dashboards |
| **Embedding** | Embed dashboards in web app |
| **Alerts** | Automated alerts for key metrics |

**Key Dashboards:**
1. Voter Registration Trends
2. Follower Analytics per Candidate
3. Opinion Poll Results
4. Election Results Real-time
5. Financial Transactions
6. Regional Engagement Heat Maps

---

## 10. Monetization Strategy

### 10.1 Revenue Streams

#### 10.1.1 Freemium Features

| Feature | Free Tier | Paid Tier |
|---------|-----------|-----------|
| Voter Registration | ✅ | ✅ |
| Follow Candidates | ✅ (own region) | ✅ |
| Vote in Polls | ✅ | ✅ |
| View Results (own region) | ✅ | ✅ |
| View Results (other regions) | ❌ | ✅ |
| Candidate Profile (Basic) | ✅ | ✅ |
| Candidate Analytics (Basic) | ✅ | ✅ |
| Candidate Analytics (Advanced) | ❌ | ✅ |
| Bulk SMS | ❌ | ✅ |
| In-App Messaging | Limited | Unlimited |

#### 10.1.2 Wallet Credits Pricing

| Service | Cost (KES) |
|---------|------------|
| View results outside region (per view) | 10 |
| View detailed candidate analytics | 50 |
| Bulk SMS (per SMS) | 1.00 |
| WhatsApp message (per message) | 3.00 |
| Opinion poll creation (per poll) | 500 |
| Priority listing (per day) | 200 |
| Verified badge application | 2,000 |
| Export reports (per report) | 100 |

#### 10.1.3 Subscription Plans (Candidates)

| Plan | Price (KES/month) | Features |
|------|-------------------|----------|
| **Free** | 0 | Basic profile, 100 followers, limited analytics |
| **Starter** | 2,000 | 1,000 followers, basic analytics, 500 SMS credits |
| **Professional** | 10,000 | Unlimited followers, advanced analytics, 3,000 SMS, 10 agents |
| **Enterprise** | 50,000 | Everything + dedicated support, custom sender ID, unlimited agents |

#### 10.1.4 Party Subscription

| Plan | Price (KES/month) | Features |
|------|-------------------|----------|
| **Party Basic** | 20,000 | Party profile, symbol management, 10 candidates |
| **Party Pro** | 100,000 | Nominations module, unlimited candidates, analytics |
| **Party Enterprise** | 500,000 | White-label, API access, priority support |

### 10.2 Transaction Fees

| Transaction | Fee |
|-------------|-----|
| Wallet Top-up (M-Pesa) | 1.5% |
| M-Pesa Disbursement | 1% + KES 30 |
| Cross-region result views | KES 10 per view |

### 10.3 AI-Suggested Monetization Opportunities

1. **Data Insights Reports**: Sell anonymized, aggregated voter sentiment reports to researchers, media
2. **Premium Placement**: Candidates pay for top placement in search results
3. **Campaign Tools**: Advanced tools like A/B testing for messages, optimal send times
4. **API Access**: Charge for API access to poll results, statistics
5. **Event Management**: Charge for rally/event management features
6. **Advertising**: In-app ads for political merchandise, campaign services
7. **Result Alerts**: Premium real-time alerts for specific regions/candidates
8. **Historical Data**: Access to historical poll and election data
9. **Consulting Credits**: Connect candidates with campaign consultants
10. **Verification Fast-track**: Priority verification processing

---

## 11. Security & Compliance

### 11.1 Authentication & Authorization

| Requirement | Implementation |
|-------------|----------------|
| Phone OTP | Supabase Auth with SMS provider |
| Session Management | JWT tokens with refresh |
| Role-Based Access | Supabase RLS policies |
| Admin 2FA | TOTP-based two-factor |

### 11.2 Data Protection

| Requirement | Implementation |
|-------------|----------------|
| Encryption at Rest | Supabase default (AES-256) |
| Encryption in Transit | TLS 1.3 |
| PII Handling | Encrypted ID numbers, minimal data collection |
| Data Retention | Configurable retention policies |
| Anonymization | Poll votes anonymized after aggregation |

### 11.3 Compliance Requirements

| Regulation | Requirement |
|------------|-------------|
| **Kenya Data Protection Act 2019** | Consent, data minimization, breach notification |
| **IEBC Regulations** | No inducement, fair campaign practices |
| **CBK Regulations** | M-Pesa compliance for payments |
| **GDPR** (if applicable) | Right to access, erasure, portability |

### 11.4 Audit Trail

All critical actions logged:
- User authentication events
- Vote submissions (anonymized)
- Result submissions
- Financial transactions
- Admin actions
- Data exports

### 11.5 Vote Integrity

| Measure | Description |
|---------|-------------|
| One Vote Per Poll | Database constraint + user verification |
| Vote Immutability | No update/delete on poll_votes |
| Timestamp Verification | Server-side timestamps only |
| Geographic Verification | Optional GPS verification for result submission |

---

## 12. Technical Stack

### 12.1 Core Technologies

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Database** | Supabase (PostgreSQL) | Real-time subscriptions, RLS, Auth built-in |
| **Backend API** | Supabase Edge Functions | Serverless, scales automatically |
| **Web Frontend** | Next.js 14+ | SSR, App Router, excellent DX |
| **Mobile App** | React Native / Expo | Cross-platform, code sharing with web |
| **Styling** | Tailwind CSS + shadcn/ui | Clean design, accessible components |
| **State Management** | Zustand / React Query | Lightweight, server-state focused |
| **Analytics** | Metabase | Self-hosted BI, SQL-based |

### 12.2 External Services

| Service | Provider | Purpose |
|---------|----------|---------|
| SMS | Africa's Talking | Bulk SMS, USSD |
| Payments | Safaricom Daraja | M-Pesa integration |
| WhatsApp | 360Dialog / Twilio | WhatsApp Business API |
| Push Notifications | Firebase Cloud Messaging | Mobile push |
| File Storage | Supabase Storage | Images, documents |
| Maps | Mapbox / Google Maps | Location services |
| Monitoring | Sentry | Error tracking |
| Analytics | PostHog / Mixpanel | Product analytics |

### 12.3 Infrastructure

| Component | Provider | Configuration |
|-----------|----------|---------------|
| Database | Supabase Pro | 8GB RAM, 100GB storage |
| Edge Functions | Supabase | Auto-scaling |
| CDN | Vercel / Cloudflare | Global edge caching |
| DNS | Cloudflare | DDoS protection |

### 12.4 Development Tools

| Tool | Purpose |
|------|---------|
| TypeScript | Type safety |
| ESLint + Prettier | Code quality |
| Husky | Git hooks |
| GitHub Actions | CI/CD |
| Playwright | E2E testing |
| Vitest | Unit testing |

---

## 13. User Interface Guidelines

### 13.1 Design Principles

1. **Simplicity First**: Clean, uncluttered interfaces
2. **Mobile-First**: Design for smartphones, enhance for web
3. **Accessibility**: WCAG 2.1 AA compliance
4. **Legibility**: Large, readable fonts (min 16px body)
5. **Speed**: Optimistic UI, skeleton loaders
6. **Offline Support**: Core features work offline

### 13.2 Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Headings | Inter / Poppins | 24-36px | 600-700 |
| Body | Inter | 16-18px | 400 |
| Captions | Inter | 14px | 400 |
| Buttons | Inter | 16px | 500 |

### 13.3 Color Palette

| Usage | Color | Hex |
|-------|-------|-----|
| Primary | Kenyan Green | `#006600` |
| Secondary | Kenyan Red | `#BB0000` |
| Accent | Gold | `#FFD700` |
| Background | Off-White | `#FAFAFA` |
| Text Primary | Dark Gray | `#1A1A1A` |
| Text Secondary | Gray | `#666666` |
| Success | Green | `#22C55E` |
| Warning | Amber | `#F59E0B` |
| Error | Red | `#EF4444` |

### 13.4 Component Library

Using **shadcn/ui** components:
- Buttons (primary, secondary, ghost, destructive)
- Cards (candidate cards, stat cards)
- Forms (inputs, selects, radio groups)
- Modals (dialogs, sheets)
- Tables (data tables with sorting/filtering)
- Charts (bar charts, pie charts, line charts)
- Navigation (tabs, breadcrumbs, menus)

### 13.5 Key Screens

#### 13.5.1 Voter Screens
1. Onboarding / Registration
2. Home / Feed
3. Candidate Discovery
4. Candidate Profile
5. Opinion Poll Voting
6. Election Results
7. Profile / Settings
8. Wallet

#### 13.5.2 Candidate Screens
1. Dashboard (Overview)
2. Follower Analytics
3. Agent Management
4. Messaging Center
5. Campaign Tools (SMS, WhatsApp)
6. Poll Results
7. Election Results
8. Wallet / Payments
9. Profile / Settings

#### 13.5.3 Agent Screens
1. Home / Tasks
2. Result Submission
3. Reports
4. Messages
5. Earnings

---

## 14. Success Metrics

### 14.1 North Star Metric

**Active Engaged Users (AEU)**: Users who perform at least one meaningful action (vote in poll, follow candidate, view results) per week.

### 14.2 Key Performance Indicators (KPIs)

#### User Acquisition
| Metric | Target | Measurement |
|--------|--------|-------------|
| Total Registered Users | 5M | Database count |
| Monthly Active Users (MAU) | 2M | Users with session in 30 days |
| Daily Active Users (DAU) | 500K | Users with session in 24 hours |
| Voter Registration Conversion | 60% | Completed profiles / Started registration |

#### Engagement
| Metric | Target | Measurement |
|--------|--------|-------------|
| Poll Participation Rate | 40% | Votes / Eligible voters |
| Average Candidates Followed | 5 | Following count / Users |
| Session Duration | 8 min | Average time in app |
| Retention (D7) | 50% | Users returning after 7 days |

#### Revenue
| Metric | Target | Measurement |
|--------|--------|-------------|
| Monthly Recurring Revenue (MRR) | KES 10M | Subscription revenue |
| Average Revenue Per User (ARPU) | KES 50 | Total revenue / MAU |
| Wallet Top-up Volume | KES 50M/month | Total top-ups |
| Transaction Success Rate | 99% | Successful / Total transactions |

#### Quality
| Metric | Target | Measurement |
|--------|--------|-------------|
| App Store Rating | 4.5+ | Play Store / App Store |
| System Uptime | 99.9% | Monitoring |
| API Response Time (p95) | <500ms | Monitoring |
| Result Submission Accuracy | 99.5% | Verified / Total submissions |

---

## 15. Roadmap & Phases

### Phase 1: Foundation (Months 1-3)

**Goal**: Core platform with essential features

| Milestone | Features | Deliverable |
|-----------|----------|-------------|
| M1.1 | Database schema, Electoral units import | Database ready |
| M1.2 | User auth, Voter registration | Auth system |
| M1.3 | Candidate profiles, Following system | Core profiles |
| M1.4 | Basic web app | MVP web |
| M1.5 | Wallet system, M-Pesa integration | Payments |

### Phase 2: Engagement (Months 4-6)

**Goal**: Polls, messaging, and mobile app

| Milestone | Features | Deliverable |
|-----------|----------|-------------|
| M2.1 | Opinion polls system | Polls live |
| M2.2 | Android app (core features) | Mobile MVP |
| M2.3 | In-app messaging | Chat system |
| M2.4 | Bulk SMS integration | SMS campaigns |
| M2.5 | Agent management | Agent module |

### Phase 3: Elections (Months 7-9)

**Goal**: Election result tracking and USSD

| Milestone | Features | Deliverable |
|-----------|----------|-------------|
| M3.1 | Result submission (app) | Results module |
| M3.2 | Real-time tallying dashboard | Live results |
| M3.3 | USSD integration | USSD live |
| M3.4 | Result sheet uploads | Document management |
| M3.5 | Analytics dashboards (Metabase) | BI integration |

### Phase 4: Scale (Months 10-12)

**Goal**: Party features, advanced analytics, optimization

| Milestone | Features | Deliverable |
|-----------|----------|-------------|
| M4.1 | Political party management | Party module |
| M4.2 | Party nominations | Nominations |
| M4.3 | WhatsApp integration | WhatsApp campaigns |
| M4.4 | Advanced analytics | Candidate insights |
| M4.5 | Performance optimization | Production-ready |

### Future Roadmap

- **Phase 5**: AI-powered sentiment analysis
- **Phase 6**: Predictive polling models
- **Phase 7**: Multi-language support (Swahili, local languages)
- **Phase 8**: Civic education module
- **Phase 9**: Election observer tools
- **Phase 10**: Pan-African expansion

---

## 16. Appendices

### Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Aspirant** | A candidate seeking political office |
| **Electoral Line** | The hierarchy of electoral units a voter belongs to (polling station → ward → constituency → county → national) |
| **MCA** | Member of County Assembly |
| **MP** | Member of Parliament |
| **Women Rep** | Women Representative (county-level position) |
| **IEBC** | Independent Electoral and Boundaries Commission |
| **Polling Station** | Physical location where votes are cast |
| **Stream** | Sub-division of a polling station (A, B, C, etc.) |
| **Agent** | Representative of a candidate at polling stations |
| **Manifesto** | Document outlining a candidate's policies and promises |
| **USSD** | Unstructured Supplementary Service Data (text-based mobile interface) |
| **STK Push** | SIM Toolkit Push (M-Pesa payment prompt) |
| **B2C** | Business to Customer (M-Pesa disbursement) |
| **MODE** | Statistical mode - most frequently occurring value |

### Appendix B: Polling Station Data Import

The system will import polling station data from the provided Excel sheet with the following mapping:

| Excel Column | Database Field |
|--------------|----------------|
| County Name | counties.name |
| Constituency Name | constituencies.name |
| Ward Name | wards.name |
| Polling Station Name | polling_stations.name |
| Stream | polling_stations.stream |
| Registered Voters | polling_stations.registered_voters |

**Import Process:**
1. Parse Excel file
2. Create/match counties
3. Create/match constituencies (linked to county)
4. Create/match wards (linked to constituency)
5. Create polling stations with streams
6. Aggregate registered voters up the hierarchy

### Appendix C: USSD Session Flow Examples

**Example: Voter Registration via USSD**

```
User dials: *384*VOTE#

Screen 1:
"Welcome to myVote Kenya
1. Register
2. Login
0. Exit"

User enters: 1

Screen 2:
"Enter your full name:"

User enters: John Kamau

Screen 3:
"Select your gender:
1. Male
2. Female
3. Prefer not to say"

User enters: 1

Screen 4:
"Select your age bracket:
1. 18-24
2. 25-34
3. 35-44
4. 45-54
5. 55-64
6. 65+"

User enters: 2

Screen 5:
"Enter your county name or code:"

User enters: Nairobi

Screen 6:
"Select constituency:
1. Westlands
2. Dagoretti North
3. Dagoretti South
... (more options)"

User enters: 1

Screen 7:
"Select ward:
1. Kitisuru
2. Parklands
3. Karura
..."

User enters: 3

Screen 8:
"Select polling station:
1. Karura Primary A
2. Karura Primary B
3. Karura Forest Station
..."

User enters: 1

Screen 9:
"Registration successful!
Your account is ready.
You can now participate in polls and follow candidates.
Press 0 to exit."
```

### Appendix D: API Endpoints Overview

```
Authentication
├── POST /auth/register
├── POST /auth/verify-otp
├── POST /auth/login
└── POST /auth/logout

Users
├── GET  /users/me
├── PATCH /users/me
└── GET  /users/:id

Electoral Units
├── GET /counties
├── GET /counties/:id/constituencies
├── GET /constituencies/:id/wards
├── GET /wards/:id/polling-stations
└── GET /polling-stations/search

Candidates
├── GET  /candidates
├── GET  /candidates/:id
├── POST /candidates (create profile)
├── PATCH /candidates/:id
└── GET  /candidates/:id/followers

Following
├── POST /follow/:candidateId
├── DELETE /follow/:candidateId
└── GET  /following

Polls
├── GET  /polls/active
├── GET  /polls/:id
├── POST /polls/:id/vote
└── GET  /polls/:id/results

Election Results
├── POST /results/submit
├── GET  /results/polling-station/:id
├── GET  /results/ward/:id
├── GET  /results/constituency/:id
├── GET  /results/county/:id
└── GET  /results/national

Agents
├── POST /agents/invite
├── PATCH /agents/:id
├── GET  /agents
└── POST /agents/:id/report

Wallet
├── GET  /wallet
├── POST /wallet/topup
├── POST /wallet/disburse
└── GET  /wallet/transactions

Messaging
├── GET  /conversations
├── GET  /conversations/:id/messages
├── POST /conversations/:id/messages
└── POST /sms/campaign

USSD (Callback)
└── POST /ussd/callback
```

### Appendix E: Third-Party API References

| Integration | Documentation |
|-------------|---------------|
| Supabase | https://supabase.com/docs |
| Safaricom Daraja (M-Pesa) | https://developer.safaricom.co.ke/ |
| Africa's Talking | https://africastalking.com/docs |
| WhatsApp Business API | https://developers.facebook.com/docs/whatsapp |
| Metabase | https://www.metabase.com/docs |

### Appendix F: Estimated Infrastructure Costs

| Service | Monthly Cost (USD) |
|---------|-------------------|
| Supabase Pro | $25 - $100 |
| Vercel Pro | $20 - $50 |
| Africa's Talking SMS | Variable (usage-based) |
| M-Pesa API | Transaction fees only |
| WhatsApp API | Variable (per message) |
| Metabase Cloud | $85 - $500 |
| Monitoring (Sentry) | $26 - $80 |
| **Estimated Total** | **$200 - $800/month** (base) |

*Note: Costs will scale with usage. During election periods, expect 5-10x normal traffic.*

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | March 25, 2026 | Product Team | Initial draft |

---

## Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | | | |
| Tech Lead | | | |
| Design Lead | | | |
| Business Stakeholder | | | |

---

*This document is confidential and intended for internal use only.*
