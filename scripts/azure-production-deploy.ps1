# SkafoldAI Production Deployment - Create App Service + Static Web App
# Run after: az login, az account set --subscription "SkafoldAI-Prod"
# Prerequisites: Resource group, skafoldai-openai (or skafoldai-ai), skafoldai-db exist

param(
    [string]$SubscriptionName = "SkafoldAI-Prod",
    [string]$ResourceGroup = "skafoldai-rg",  # Use skafoldai-rg for existing; rg-skafoldai-prod for new
    [string]$Region = "eastus",
    [string]$OpenAIKey = "",
    [string]$OpenAIName = "skafoldai-openai"  # Your Azure OpenAI resource name (skafoldai-openai or skafoldai-ai)
)

$ErrorActionPreference = "Stop"

az account set --subscription $SubscriptionName

# App Service Plan
Write-Host "`n=== Creating App Service Plan ===" -ForegroundColor Cyan
az appservice plan create --name skafoldai-plan --resource-group $ResourceGroup --location $Region --is-linux --sku F1 --output none 2>$null
Write-Host "Plan ready."

# Web App (API)
Write-Host "`n=== Creating Web App (API) ===" -ForegroundColor Cyan
az webapp create --name skafoldai-api --resource-group $ResourceGroup --plan skafoldai-plan --runtime "NODE:20-lts" --output table

# Configure startup
az webapp config set --name skafoldai-api --resource-group $ResourceGroup --startup-file "node dist/index.js" --output none

# Get SQL password and build DATABASE_URL
$sqlPwd = az keyvault secret show --vault-name skafoldai-kv --name SqlAdminPassword --query value -o tsv 2>$null
$dbUrl = "Server=tcp:skafoldai-sql-wus.database.windows.net,1433;Database=skafoldai-db;User ID=skafoldaiadmin;Password=$sqlPwd;Encrypt=true;TrustServerCertificate=false;"

Write-Host "`n=== Configuring API settings ===" -ForegroundColor Cyan
az webapp config appsettings set --name skafoldai-api --resource-group $ResourceGroup --settings `
  "DATABASE_URL=$dbUrl" `
  "AZURE_OPENAI_ENDPOINT=https://$OpenAIName.openai.azure.com" `
  "AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o-mini" `
  "PORT=8080" `
  "CORS_ORIGINS=https://www.skafoldai.com,https://skafoldai.com,https://skafoldai-web.azurestaticapps.net" `
  --output table

if ($OpenAIKey) {
  az webapp config appsettings set --name skafoldai-api --resource-group $ResourceGroup --settings "AZURE_OPENAI_API_KEY=$OpenAIKey" --output none
}

if (-not $OpenAIKey) {
    Write-Host "`nWARNING: AZURE_OPENAI_API_KEY not set. Add it manually in Azure Portal:" -ForegroundColor Yellow
    Write-Host "  skafoldai-api -> Configuration -> Application settings" -ForegroundColor White
}

# Static Web App (requires GitHub connection - create manually or use CLI)
Write-Host "`n=== Static Web App ===" -ForegroundColor Cyan
Write-Host "Create manually in Azure Portal: Static Web App, connect to GitHub, app_location=src/web, output_location=dist" -ForegroundColor Yellow
Write-Host "Or run: az staticwebapp create --name skafoldai-web --resource-group $ResourceGroup --location $Region --source <github-url> --branch main --app-location src/web --output-location dist --login-with-github" -ForegroundColor Gray

Write-Host "`n=== Next steps ===" -ForegroundColor Green
Write-Host "1. Add AZURE_OPENAI_API_KEY in Portal if not set" -ForegroundColor White
Write-Host "2. Create Static Web App and connect GitHub" -ForegroundColor White
Write-Host "3. Add GitHub secrets: VITE_API_URL, AZURE_WEBAPP_PUBLISH_PROFILE, AZURE_STATIC_WEB_APPS_API_TOKEN" -ForegroundColor White
Write-Host "4. Add custom domains: www.skafoldai.com, api.skafoldai.com" -ForegroundColor White
Write-Host "5. Configure DNS in GoDaddy" -ForegroundColor White
Write-Host "`nAPI URL: https://skafoldai-api.azurewebsites.net" -ForegroundColor Cyan
Write-Host "Health: https://skafoldai-api.azurewebsites.net/api/health" -ForegroundColor Cyan
