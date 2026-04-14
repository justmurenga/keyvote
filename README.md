# myVote Kenya - Election Management System

A comprehensive election management platform designed for Kenya, enabling candidates to connect with voters and providing transparent, real-time election monitoring.

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- Supabase account
- Africa's Talking account (for SMS/USSD)
- Safaricom Daraja account (for M-Pesa)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/my-vote.git
cd my-vote

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Start development servers
pnpm dev
```

## 📁 Project Structure

```
my-vote/
├── .github/
│   └── workflows/    # CI/CD pipelines
├── apps/
│   ├── web/          # Next.js web application
│   │   ├── src/
│   │   │   ├── app/          # App router pages
│   │   │   ├── components/   # React components
│   │   │   ├── lib/          # Utilities and clients
│   │   │   └── styles/       # Global styles
│   │   └── public/           # Static assets
│   ├── mobile/       # React Native / Expo mobile app (TODO)
│   └── ussd/         # USSD handler service
│       └── src/
│           ├── handlers/     # USSD menu handlers
│           └── routes/       # Express routes
├── packages/
│   ├── database/     # Database schema, migrations, types
│   │   ├── migrations/       # SQL migration files
│   │   └── src/types/        # TypeScript type definitions
│   └── shared/       # Shared utilities and types
│       └── src/
│           ├── constants.ts  # Application constants
│           ├── schemas.ts    # Zod validation schemas
│           └── utils.ts      # Utility functions
├── scripts/
│   └── import-electoral-data.ts  # IEBC data import
├── supabase/         # Supabase configuration
├── docs/             # Documentation
│   ├── PRD.md                # Product Requirements
│   └── IMPLEMENTATION_PLAN.md
└── do-app-spec.yaml  # Digital Ocean deployment spec
```

## 🛠️ Tech Stack

- **Web**: Next.js 14, Tailwind CSS, shadcn/ui
- **Mobile**: React Native, Expo
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (Phone OTP)
- **Payments**: M-Pesa via Safaricom Daraja
- **SMS/USSD**: Africa's Talking
- **Deployment**: Digital Ocean App Platform

## 📊 Features

- **Voter Management**: Registration, profile, polling station selection
- **Candidate Profiles**: Manifesto, party affiliation, verification
- **Following System**: Voters follow candidates within their electoral line
- **Opinion Polls**: Scheduled polls by electoral position
- **Election Results**: Real-time result tracking from polling station to national
- **Agent Management**: Candidate agents for ground operations
- **Wallet System**: M-Pesa integration for payments
- **USSD Access**: Feature phone support

## 🗄️ Database Schema

See [packages/database/README.md](packages/database/README.md) for detailed schema documentation.

## 📱 Mobile App

See [apps/mobile/README.md](apps/mobile/README.md) for mobile development setup.

## 🔐 Environment Variables

See [.env.example](.env.example) for required environment variables.

## 📄 Documentation

- [Product Requirements Document](docs/PRD.md)
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md)
- [API Documentation](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

## 🤝 Contributing

1. Create a feature branch from `develop`
2. Make your changes
3. Run tests: `pnpm test`
4. Submit a pull request

## 📝 License

Proprietary - All rights reserved
