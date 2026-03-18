# SkafoldAI Managed Identity for ACR Pull
# Creates user-assigned managed identity, grants AcrPull on ACR, configures Container Apps to use it
# Removes need for ACR admin credentials
#
# Run: .\scripts\azure-managed-identity-acr.ps1
# Prerequisites: az login, subscription SkafoldAI-Prod

param(
    [string]$ResourceGroup = "skafoldai-rg",
    [string]$Region = "centralus",
    [string]$ACR_NAME = "skafoldaiacr",
    [string]$API_APP = "skafoldai-api",
    [string]$WEB_APP = "skafoldai-web",
    [string]$IdentityName = "skafoldai-acr-pull"
)

$ErrorActionPreference = "Stop"
# Azure CLI warnings go to stderr; avoid treating as errors
$script:AzIgnoreStderr = $true
az account set --subscription "SkafoldAI-Prod"

Write-Host "`n=== SkafoldAI Managed Identity for ACR ===" -ForegroundColor Cyan

# 1. Enable ARM token auth on ACR (required for managed identity)
Write-Host "`nEnabling ARM auth on ACR..." -ForegroundColor Gray
az acr config authentication-as-arm update --registry $ACR_NAME --status enabled 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Note: If this fails, ensure ACR exists and you have Owner/Contributor." -ForegroundColor Yellow
}

# 2. Create user-assigned managed identity (if not exists)
$identity = az identity list -g $ResourceGroup --query "[?name=='$IdentityName']" -o json 2>$null
if ($identity -eq "[]" -or -not $identity) {
    Write-Host "Creating managed identity: $IdentityName" -ForegroundColor Gray
    az identity create `
        --name $IdentityName `
        --resource-group $ResourceGroup `
        --location $Region `
        --output table
} else {
    Write-Host "Managed identity $IdentityName exists." -ForegroundColor Gray
}

# 3. Get identity principal ID and resource ID
$principalId = az identity show -g $ResourceGroup -n $IdentityName --query principalId -o tsv
$identityResourceId = az identity show -g $ResourceGroup -n $IdentityName --query id -o tsv
$acrResourceId = az acr show -n $ACR_NAME --query id -o tsv

# 4. Grant AcrPull role to the identity on ACR
Write-Host "`nGranting AcrPull to managed identity on ACR..." -ForegroundColor Gray
az role assignment create `
    --assignee $principalId `
    --role AcrPull `
    --scope $acrResourceId `
    --output none 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "Role assignment may already exist. Continuing..." -ForegroundColor Gray
}

# 5. Add user-assigned identity to API Container App
Write-Host "`nAdding managed identity to API Container App..." -ForegroundColor Gray
az containerapp identity assign `
    --name $API_APP `
    --resource-group $ResourceGroup `
    --user-assigned $identityResourceId `
    --output none 2>$null

# 6. Configure API to use managed identity for ACR (replaces username/password)
az containerapp registry set `
    --name $API_APP `
    --resource-group $ResourceGroup `
    --server "$ACR_NAME.azurecr.io" `
    --identity $identityResourceId `
    --output none 2>$null

# 7. Add user-assigned identity to Web Container App
Write-Host "`nAdding managed identity to Web Container App..." -ForegroundColor Gray
az containerapp identity assign `
    --name $WEB_APP `
    --resource-group $ResourceGroup `
    --user-assigned $identityResourceId `
    --output none 2>$null

# 8. Configure Web to use managed identity for ACR
az containerapp registry set `
    --name $WEB_APP `
    --resource-group $ResourceGroup `
    --server "$ACR_NAME.azurecr.io" `
    --identity $identityResourceId `
    --output none 2>$null

# 9. Disable ACR admin (optional - improves security)
Write-Host "`nDisabling ACR admin credentials (optional)..." -ForegroundColor Gray
az acr update --name $ACR_NAME --admin-enabled false --output none 2>$null

Write-Host "`n=== Done ===" -ForegroundColor Green
Write-Host "Container Apps now pull images using managed identity (no admin credentials)." -ForegroundColor Cyan
Write-Host "ACR admin disabled. Re-enable with: az acr update -n $ACR_NAME --admin-enabled true" -ForegroundColor Gray
