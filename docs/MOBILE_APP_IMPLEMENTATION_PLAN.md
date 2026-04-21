# Mobile App Implementation Plan (MVP to Launch)

## Scope
Build Expo mobile app for:
- Voters (discovery, polls, results, profile)
- Candidates (campaign overview, field operations)
- Agents (assigned polling station announced-result capture)

## Delivery Phases

### Phase 1 — Foundation (Week 1)
- [x] Auth + role-aware routing baseline
- [x] Home, candidates, polls, profile, public results tabs
- [x] Candidate/agent `Field Ops` tab shell
- [x] Result submission screen for announced polling-station totals

### Phase 2 — Election Day Core (Weeks 2-3)
- [ ] Polling-station assignment sync from backend
- [x] Offline draft save + retry queue
- [x] Image/PDF evidence capture + upload pipeline
- [ ] Validation rules (totals, duplicates, form references)
- [x] Submission status timeline (`submitted`, `flagged`, `approved`, `rejected`) with reviewer comments

### Phase 3 — Candidate Portal (Weeks 3-4)
- [ ] Candidate dashboard metrics
- [ ] Agent management (invite, assign, revoke)
- [ ] Broadcast announcements and alerting
- [ ] Regional performance snapshots

### Phase 4 — Launch Readiness (Weeks 5-6)
- [ ] Push notification integration
- [x] Security hardening (signed mobile API token auth; production header fallback removed)
- [ ] QA matrix (Android devices, low network)
- [ ] EAS build pipeline + release checklist

## API Contracts Needed
- `GET /api/mobile/candidate/summary`
- `GET /api/mobile/field/assignments`
- `GET /api/mobile/field/submissions`
- `POST /api/mobile/field/submissions`

## Acceptance Criteria
- Candidate/agent can open assigned station, capture tallies, and submit with evidence.
- Non-field roles cannot access field submission workflow.
- Submission can be reviewed and status returned to mobile app.
- Candidate can monitor incoming submissions in near real-time.
