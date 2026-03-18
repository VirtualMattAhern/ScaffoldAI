# Add Entra ID values to GitHub Secrets for SkafoldAI deploy
# Run from repo root. Requires: gh CLI (https://cli.github.com/) authenticated.
#
# Usage: .\scripts\github-secrets-entra.ps1
#
# Security: Values are stored in GitHub Secrets (encrypted at rest, masked in logs).
# Client ID and Tenant ID are not highly sensitive (they appear in frontend bundle)
# but keeping them in secrets avoids committing to repo and follows key management best practice.

$ErrorActionPreference = "Stop"

$CLIENT_ID = "5b66d72f-e8e0-46fb-b90d-edb27c3b07d2"
$TENANT_ID = "8e6d83f9-fbb3-46e9-9f63-ef2ccb6766df"

Write-Host "`n=== Adding Entra ID to GitHub Secrets ===" -ForegroundColor Cyan
Write-Host "Repo: $(gh repo view --json nameWithOwner -q .nameWithOwner)" -ForegroundColor Gray

gh secret set VITE_ENTRA_CLIENT_ID --body $CLIENT_ID
gh secret set VITE_ENTRA_TENANT_ID --body $TENANT_ID

Write-Host "`nDone. Next push to main (or workflow_dispatch) will build web with Entra enabled." -ForegroundColor Green
