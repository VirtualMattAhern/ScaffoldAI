# SkafoldAI Monitoring Setup
# Creates Log Analytics workspace + Application Insights, links to Container Apps environment
#
# Run: .\scripts\azure-monitoring-setup.ps1
# Prerequisites: az login, subscription SkafoldAI-Prod

param(
    [string]$ResourceGroup = "skafoldai-rg",
    [string]$Region = "centralus",
    [string]$EnvName = "skafoldai-env",
    [string]$LogWorkspaceName = "skafoldai-logs",
    [string]$AppInsightsName = "skafoldai-insights"
)

$ErrorActionPreference = "Stop"
az account set --subscription "SkafoldAI-Prod"

Write-Host "`n=== SkafoldAI Monitoring Setup ===" -ForegroundColor Cyan

# 1. Create Log Analytics workspace (if not exists)
$ws = az monitor log-analytics workspace list -g $ResourceGroup --query "[?name=='$LogWorkspaceName']" -o json 2>$null
if ($ws -eq "[]" -or -not $ws) {
    Write-Host "Creating Log Analytics workspace: $LogWorkspaceName" -ForegroundColor Gray
    az monitor log-analytics workspace create `
        --resource-group $ResourceGroup `
        --workspace-name $LogWorkspaceName `
        --location $Region `
        --output table
} else {
    Write-Host "Log Analytics workspace $LogWorkspaceName exists." -ForegroundColor Gray
}

# 2. Create Application Insights (if not exists)
$ai = az resource list -g $ResourceGroup --resource-type "Microsoft.Insights/components" --query "[?name=='$AppInsightsName']" -o json 2>$null
if ($ai -eq "[]" -or -not $ai) {
    Write-Host "Creating Application Insights: $AppInsightsName" -ForegroundColor Gray
    $workspaceId = az monitor log-analytics workspace show -g $ResourceGroup -n $LogWorkspaceName --query id -o tsv
    az monitor app-insights component create `
        --app $AppInsightsName `
        --location $Region `
        --resource-group $ResourceGroup `
        --workspace $workspaceId `
        --output table
} else {
    Write-Host "Application Insights $AppInsightsName exists." -ForegroundColor Gray
}

# 3. Get App Insights connection string
$appInsightsConnStr = az monitor app-insights component show -g $ResourceGroup -a $AppInsightsName --query connectionString -o tsv 2>$null
if (-not $appInsightsConnStr) {
    Write-Host "WARNING: Could not get App Insights connection string." -ForegroundColor Yellow
    exit 1
}

# 4. Link App Insights to Container Apps environment (telemetry)
Write-Host "`nLinking App Insights to Container Apps environment..." -ForegroundColor Cyan
az containerapp env telemetry app-insights set `
    --name $EnvName `
    --resource-group $ResourceGroup `
    --connection-string $appInsightsConnStr `
    --enable-open-telemetry-traces true `
    --enable-open-telemetry-logs true `
    --output table 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "Note: If telemetry set fails, add APPLICATIONINSIGHTS_CONNECTION_STRING to each Container App manually." -ForegroundColor Yellow
    Write-Host "Connection string for manual config:" -ForegroundColor Gray
    Write-Host $appInsightsConnStr -ForegroundColor DarkGray
}

Write-Host "`n=== Done ===" -ForegroundColor Green
Write-Host "Log Analytics: $LogWorkspaceName" -ForegroundColor Cyan
Write-Host "Application Insights: $AppInsightsName" -ForegroundColor Cyan
Write-Host "`nView logs: Azure Portal -> Container Apps -> skafoldai-api/skafoldai-web -> Log stream" -ForegroundColor White
Write-Host "View telemetry: Azure Portal -> Application Insights -> skafoldai-insights" -ForegroundColor White
