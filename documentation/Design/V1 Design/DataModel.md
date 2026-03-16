# SkafoldAI Data Model & API Contracts

All entities are scoped by `userId`. Designed for Azure SQL; compatible with SQLite for local dev.

---

## Entities

### User
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| email | string | Unique |
| displayName | string | |
| createdAt | datetime | |

### Goal
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| userId | uuid | FK → User |
| title | string | |
| createdAt | datetime | |

### Playbook
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| userId | uuid | FK → User |
| title | string | |
| type | enum | `repeat` \| `playbook` |
| steps | json array | Ordered step strings |
| lastUsedAt | datetime | Nullable |
| suggestedByAi | boolean | Default false |
| createdAt | datetime | |

### Task
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| userId | uuid | FK → User |
| goalId | uuid | FK → Goal, nullable |
| playbookId | uuid | FK → Playbook, nullable |
| title | string | |
| status | enum | `open` \| `in_progress` \| `paused` \| `done` |
| type | enum | `one_off` \| `repeat` \| `playbook` |
| timeboxMinutes | int | Nullable |
| nextStep | string | "Next 10 min" micro-task |
| top3Candidate | boolean | AI-suggested for Daily Rule of 3 |
| createdAt | datetime | |
| completedAt | datetime | Nullable |
| pausedUntil | datetime | Nullable, for "schedule for later" |

### Decision
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| userId | uuid | FK → User |
| taskId | uuid | FK → Task |
| question | string | |
| options | json array | `[{ label, description }]` |
| chosenOption | int | Index 0–2 |
| createdAt | datetime | |

### BrainDump
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| userId | uuid | FK → User |
| rawText | string | User input |
| weekStart | date | Week identifier |
| convertedAt | datetime | Nullable |
| createdAt | datetime | |

### UserSettings
| Column | Type | Notes |
|--------|------|-------|
| userId | uuid | PK, FK → User |
| highContrast | boolean | Default false |
| fontSizePercent | int | 90, 100, 110, 125 |
| dyslexiaFont | boolean | Default false |

---

## API Endpoints (REST)

### Auth (placeholder for V1)
- `POST /api/auth/login` — Returns mock user for dev
- `GET /api/auth/me` — Current user

### Goals
- `GET /api/goals` — List user goals
- `POST /api/goals` — Create goal
- `PATCH /api/goals/:id` — Update goal
- `DELETE /api/goals/:id` — Delete goal

### Playbooks
- `GET /api/playbooks` — List user playbooks
- `POST /api/playbooks` — Create playbook
- `PATCH /api/playbooks/:id` — Update playbook
- `DELETE /api/playbooks/:id` — Delete playbook
- `GET /api/playbooks/suggestions` — AI-suggested playbooks (async)

### Tasks
- `GET /api/tasks` — List tasks (filter: status, goalId, week)
- `POST /api/tasks` — Create task
- `PATCH /api/tasks/:id` — Update task (status, nextStep, etc.)
- `DELETE /api/tasks/:id` — Delete task
- `GET /api/tasks/top3` — Today's top 3 (AI-suggested)
- `POST /api/tasks/ai-suggest-top3` — Trigger AI to suggest top 3 (async)

### Brain Dump
- `GET /api/brain-dump` — Get current week's dump
- `PUT /api/brain-dump` — Save raw text
- `POST /api/brain-dump/convert` — AI convert to goals/tasks (async)

### Decisions
- `POST /api/decisions` — Create decision (from Decision Helper)
- `GET /api/decisions?taskId=` — List decisions for task

### Focus Sentence
- `GET /api/focus-sentence` — Get today's focus sentence
- `PUT /api/focus-sentence` — Save focus sentence
- `POST /api/focus-sentence/suggest` — AI suggest (async)

### Settings
- `GET /api/settings` — User settings
- `PATCH /api/settings` — Update settings (highContrast, fontSizePercent, dyslexiaFont)
