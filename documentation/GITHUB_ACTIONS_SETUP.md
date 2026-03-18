# GitHub Actions Setup for SkafoldAI

**Add the AZURE_CREDENTIALS secret to GitHub** to enable automated deployment to Azure Container Apps.

## One-step: Add secret (service principal already created)

**Option A: GitHub CLI** (after `gh auth login`)

```powershell
gh secret set AZURE_CREDENTIALS --body '{"clientId":"<SP_APP_ID>","clientSecret":"<SP_PASSWORD>","tenantId":"<TENANT_ID>","subscriptionId":"<SUBSCRIPTION_ID>"}'
```

Replace placeholders with values from `az ad sp create-for-rbac` output.

**Option B: GitHub UI**

1. **GitHub** → repo → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** → Name: `AZURE_CREDENTIALS`
3. Value: JSON with `clientId`, `clientSecret`, `tenantId`, `subscriptionId` from your service principal

## Verify

Push a change to `src/api` or `src/web` on `main`. The workflow will build and deploy both Container Apps.

## Rotate credentials

If compromised: delete the service principal, create a new one, and update the secret.
