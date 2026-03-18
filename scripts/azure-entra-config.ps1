# SkafoldAI Entra ID Configuration
# Adds ENTRA_TENANT_ID and ENTRA_CLIENT_ID to the API Container App for Microsoft sign-in
#
# Run: .\scripts\azure-entra-config.ps1 -EntraTenantId "<tenant-id>" -EntraClientId "<client-id>"
# Get these from Entra app registration: Applications -> App registrations -> SkafoldAI

param(
    [string]$ResourceGroup = "skafoldai-rg",
    [string]$API_APP = "skafoldai-api",
    [Parameter(Mandatory=$true)]
    [string]$EntraTenantId,
    [Parameter(Mandatory=$true)]
    [string]$EntraClientId
)

$ErrorActionPreference = "Stop"
az account set --subscription "SkafoldAI-Prod"

Write-Host "`n=== SkafoldAI Entra ID Configuration ===" -ForegroundColor Cyan
az containerapp update `
    --name $API_APP `
    --resource-group $ResourceGroup `
    --set-env-vars "ENTRA_TENANT_ID=$EntraTenantId" "ENTRA_CLIENT_ID=$EntraClientId" `
    --output table

Write-Host "`nDone. API will now validate Entra ID tokens." -ForegroundColor Green
Write-Host "Ensure frontend has VITE_ENTRA_CLIENT_ID and VITE_ENTRA_TENANT_ID set." -ForegroundColor Gray
