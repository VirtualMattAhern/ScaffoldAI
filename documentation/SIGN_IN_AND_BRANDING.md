# Sign-in & branding (skafold)

## Who uses what

| Method | Audience | Notes |
|--------|----------|--------|
| **Email** (Continue) | Everyone | Primary path on the landing page. No Microsoft account required. |
| **Microsoft (Entra)** | Team / admins / maintainers | Collapsed under “Team / work sign-in” so regular visitors aren’t nudged toward work accounts. |
| **Google / Apple** | Planned | Shown as disabled “coming soon” until wired up (see below). |

End users do **not** need to be “in Azure.” Microsoft sign-in uses Entra ID for *your* tenant and invited operators—not for general consumers.

## Adding Google or Apple

Choose one approach:

1. **Microsoft Entra External ID / Azure AD B2C** — Add Google & Apple as identity providers; front-end uses MSAL against the B2C tenant.
2. **Third-party auth** (Auth0, Clerk, Supabase Auth, etc.) — Federated providers with one integration.

Until then, the UI keeps placeholders so expectations are clear.

## Email sign-in & security

Today’s `/api/auth/login` creates or looks up a user by email **without** verifying ownership of the inbox. For a public launch, plan **magic links**, **OTP**, or **OAuth** so accounts can’t be impersonated.

## Brand assets

- **Full logo** (`/brand/skafold-logo.png`) — landing page only.
- **App icon** (`/brand/skafold-icon.png`) — favicon, `apple-touch-icon`, PWA manifest.

Replace these files in `src/web/public/brand/` if the artwork updates.
