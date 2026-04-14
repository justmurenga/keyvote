# myVote Kenya - Mobile App

React Native mobile application built with **Expo** for the myVote Kenya election management platform.

## Features

- 📱 **Native Android/iOS** experience via Expo Go
- 🔐 **Phone OTP Authentication** — Passwordless login with Supabase Auth
- 👥 **Candidate Browser** — Search and filter by electoral position
- 📊 **Opinion Polls** — Vote and view results in real-time
- 📈 **Election Results** — Live results with auto-refresh
- 👤 **Profile Management** — Complete profile with polling station selection
- 🇰🇪 **Kenya Electoral Hierarchy** — County → Constituency → Ward → Polling Station
- 🌙 **Dark Mode** — Automatic system theme support

## Tech Stack

- **Framework:** React Native + Expo SDK 52
- **Router:** Expo Router (file-based routing)
- **State:** Zustand
- **Data Fetching:** TanStack React Query
- **Backend:** Supabase (Auth + Database)
- **Icons:** @expo/vector-icons (Ionicons)
- **Storage:** expo-secure-store (for auth tokens)

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 8
- Expo Go app on your Android device
- Supabase project (shared with web app)

### Setup

1. Install dependencies from the monorepo root:
   ```bash
   pnpm install
   ```

2. Create your environment file:
   ```bash
   cp apps/mobile/.env.example apps/mobile/.env.local
   ```

3. Fill in your Supabase credentials in `.env.local`

4. Start the dev server:
   ```bash
   cd apps/mobile
   pnpm dev
   ```

5. Scan the QR code with **Expo Go** on your Android device

## Project Structure

```
apps/mobile/
├── app.json                 # Expo configuration
├── babel.config.js          # Babel + Reanimated plugin
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
└── src/
    ├── app/                 # Expo Router file-based routes
    │   ├── _layout.tsx      # Root layout (providers)
    │   ├── index.tsx        # Entry redirect
    │   ├── (auth)/          # Auth screens (welcome, login, register)
    │   ├── (tabs)/          # Tab navigator (home, candidates, polls, results, profile)
    │   └── candidate/       # Candidate detail screen
    ├── components/
    │   └── ui/              # Reusable components (Button, Card, Input, Avatar, Badge, etc.)
    ├── constants/           # Theme, app constants, electoral positions
    ├── hooks/               # Custom hooks (useTheme)
    ├── lib/                 # Supabase client
    ├── services/            # API layer (candidates, polls, results, regions, following)
    └── stores/              # Zustand auth store
```

## Screens

| Screen | Description |
|--------|-------------|
| Welcome | Onboarding with features & CTA |
| Login | Phone + OTP verification |
| Register | 4-step wizard (phone → OTP → details → polling station) |
| Home | Dashboard with quick actions & stats |
| Candidates | Searchable, filterable candidate list |
| Polls | Opinion polls with voting |
| Results | Live election results with auto-refresh |
| Profile | User profile, settings, sign out |
| Candidate Detail | Full candidate profile with follow/unfollow |
