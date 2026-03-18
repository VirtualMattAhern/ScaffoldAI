# SkafoldAI Container Apps Deployment
# Creates ACR, Container Apps Environment, builds and deploys API + Web as Container Apps
# Aligns with Azure Highlevel Structure.txt: skafoldai-acr, skafoldai-env, skafoldai-api, skafoldai-web
#
# Prerequisites: az login, Docker, subscription SkafoldAI-Prod
# Run: .\scripts\azure-container-apps-deploy.ps1 -SqlServerName skafoldai-sql-cus -OpenAIKey "<key>"

param(
    [string]$SubscriptionName = "SkafoldAI-Prod",
    [string]$ResourceGroup = "skafoldai-rg",  # or rg-skafoldai-prod
    [string]$Region = "centralus",            # Co-locate with SQL (East was unavailable for SQL)
    [string]$SqlServerName = "skafoldai-sql-cus",  # Central US (East was unavailable). Use -cus for Central.
    [string]$OpenAIResourceName = "skafoldai-openai",  # or skafoldai-ai
    [string]$OpenAIKey = "",
    [string]$EntraTenantId = "",   # From Entra app registration (Directory/tenant ID)
    [string]$EntraClientId = "",  # From Entra app registration (Application/client ID)
    [switch]$BuildOnly,   # Build and push images only, skip Container App creation
    [switch]$SkipBuild    # Skip build; use existing images (for app updates only)
)

$ErrorActionPreference = "Stop"

# Azure CLI containerapp extension emits warnings to stderr; avoid treating as errors
$script:AzErrorAction = "SilentlyContinue"

$ACR_NAME = "skafoldaiacr"  # ACR names: 5-50 chars, alphanumeric, globally unique. Add suffix if taken (e.g. skafoldaiacrprod)
$ENV_NAME = "skafoldai-env"
$API_APP = "skafoldai-api"
$WEB_APP = "skafoldai-web"

Write-Host "`n=== SkafoldAI Container Apps Deployment ===" -ForegroundColor Cyan
Write-Host "Region: $Region | RG: $ResourceGroup | SQL: $SqlServerName" -ForegroundColor White

az account set --subscription $SubscriptionName

# 1. Create ACR (if not exists)
Write-Host "`n=== 1. Container Registry (skafoldai-acr) ===" -ForegroundColor Cyan
$acrList = az acr list --resource-group $ResourceGroup --query "[?name=='$ACR_NAME']" -o json 2>$null
if ($acrList -eq "[]" -or -not $acrList) {
    az acr create --name $ACR_NAME --resource-group $ResourceGroup --location $Region --sku Basic --output table
} else {
    Write-Host "ACR $ACR_NAME exists." -ForegroundColor Gray
}

# Enable admin for Container Apps pull (or use managed identity)
az acr update --name $ACR_NAME --admin-enabled true --output none 2>$null

$acrLoginServer = az acr show --name $ACR_NAME --query loginServer -o tsv
$acrUser = az acr credential show --name $ACR_NAME --query username -o tsv
$acrPass = az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv

# 2. Create Container Apps Environment (if not exists)
Write-Host "`n=== 2. Container Apps Environment ($ENV_NAME) ===" -ForegroundColor Cyan
$envList = (az containerapp env list --resource-group $ResourceGroup --query "[?name=='$ENV_NAME']" -o json 2>$null)
if ($envList -eq "[]" -or -not $envList) {
    az containerapp env create `
        --name $ENV_NAME `
        --resource-group $ResourceGroup `
        --location $Region `
        --output table
} else {
    Write-Host "Environment $ENV_NAME exists." -ForegroundColor Gray
}

# 3. Build and push images (unless SkipBuild)
if (-not $SkipBuild) {
    Write-Host "`n=== 3. Build and Push Images ===" -ForegroundColor Cyan
    az acr login --name $ACR_NAME

    $rootDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
    if (-not (Test-Path $rootDir)) { $rootDir = (Get-Location).Path }

    # API image
    Write-Host "Building API image..." -ForegroundColor Gray
    docker build -t "${acrLoginServer}/skafoldai-api:latest" "$rootDir/src/api" 2>&1
    if ($LASTEXITCODE -ne 0) { throw "API build failed" }
    docker push "${acrLoginServer}/skafoldai-api:latest" 2>&1

    # Web image (VITE_API_URL for production - browser calls API directly)
    $apiUrl = "https://api.skafoldai.com/api"
    Write-Host "Building Web image (VITE_API_URL=$apiUrl)..." -ForegroundColor Gray
    docker build --build-arg VITE_API_URL=$apiUrl -t "${acrLoginServer}/skafoldai-web:latest" "$rootDir/src/web" 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Web build failed" }
    docker push "${acrLoginServer}/skafoldai-web:latest" 2>&1

    Write-Host "Images pushed." -ForegroundColor Green
}

if ($BuildOnly) {
    Write-Host "`nBuildOnly: Skipping Container App creation." -ForegroundColor Yellow
    exit 0
}

# 4. Get SQL password from Key Vault
$sqlPwd = az keyvault secret show --vault-name skafoldai-kv --name SqlAdminPassword --query value -o tsv 2>$null
if (-not $sqlPwd) {
    Write-Host "WARNING: SqlAdminPassword not in Key Vault. Set DATABASE_URL manually." -ForegroundColor Yellow
    $dbUrl = ""
} else {
    $dbUrl = "Server=tcp:${SqlServerName}.database.windows.net,1433;Database=skafoldai-db;User ID=skafoldaiadmin;Password=$sqlPwd;Encrypt=true;TrustServerCertificate=false;"
}

# 5. Get OpenAI key if not provided
if (-not $OpenAIKey) {
    $OpenAIKey = az cognitiveservices account keys list --name $OpenAIResourceName --resource-group $ResourceGroup --query key1 -o tsv 2>$null
}

# 6. Create or update API Container App
Write-Host "`n=== 4. API Container App ($API_APP) ===" -ForegroundColor Cyan
$apiExists = az containerapp show --name $API_APP --resource-group $ResourceGroup 2>$null
$image = "${acrLoginServer}/skafoldai-api:latest"

# Build secrets and env vars (sensitive values as secrets)
$secretsList = @()
if ($OpenAIKey) { $secretsList += "openai-key=$OpenAIKey" }
if ($dbUrl) { $secretsList += "database-url=$dbUrl" }

$envVarsList = @(
    "PORT=8080",
    "NODE_ENV=production",
    "AZURE_OPENAI_ENDPOINT=https://${OpenAIResourceName}.openai.azure.com",
    "AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o-mini",
    "CORS_ORIGINS=https://www.skafoldai.com,https://skafoldai.com,https://skafoldai-web.wonderfulhill-b35e6c76.centralus.azurecontainerapps.io,https://white-mushroom-02850580f.2.azurestaticapps.net,http://localhost:5173"
)
if ($OpenAIKey) { $envVarsList += "AZURE_OPENAI_API_KEY=secretref:openai-key" }
if ($dbUrl) { $envVarsList += "DATABASE_URL=secretref:database-url" }
if ($EntraTenantId) { $envVarsList += "ENTRA_TENANT_ID=$EntraTenantId" }
if ($EntraClientId) { $envVarsList += "ENTRA_CLIENT_ID=$EntraClientId" }

if (-not $apiExists) {
    $cmd = "az containerapp create --name $API_APP --resource-group $ResourceGroup --environment $ENV_NAME " +
        "--image $image --registry-server $acrLoginServer --registry-username $acrUser --registry-password $acrPass " +
        "--target-port 8080 --ingress external --min-replicas 1 --max-replicas 3 --cpu 0.5 --memory 1Gi "
    if ($secretsList.Count -gt 0) {
        $cmd += "--secrets " + (($secretsList | ForEach-Object { "`"$_`"" }) -join " ") + " "
    }
    $cmd += "--env-vars " + (($envVarsList | ForEach-Object { "`"$_`"" }) -join " ") + " --output table"
    Invoke-Expression $cmd
} else {
    az containerapp update --name $API_APP --resource-group $ResourceGroup --image $image --output table
    if ($EntraTenantId -or $EntraClientId) {
        $envUpdate = @()
        if ($EntraTenantId) { $envUpdate += "ENTRA_TENANT_ID=$EntraTenantId" }
        if ($EntraClientId) { $envUpdate += "ENTRA_CLIENT_ID=$EntraClientId" }
        if ($envUpdate.Count -gt 0) {
            az containerapp update --name $API_APP --resource-group $ResourceGroup --set-env-vars ($envUpdate -join " ") --output none
            Write-Host "Entra ID env vars updated." -ForegroundColor Gray
        }
    }
    Write-Host "API updated. Set env vars in Portal if needed." -ForegroundColor Gray
}

# 7. Create or update Web Container App
Write-Host "`n=== 5. Web Container App ($WEB_APP) ===" -ForegroundColor Cyan
$webExists = az containerapp show --name $WEB_APP --resource-group $ResourceGroup 2>$null
$webImage = "${acrLoginServer}/skafoldai-web:latest"

if (-not $webExists) {
    az containerapp create `
        --name $WEB_APP `
        --resource-group $ResourceGroup `
        --environment $ENV_NAME `
        --image $webImage `
        --registry-server $acrLoginServer `
        --registry-username $acrUser `
        --registry-password $acrPass `
        --target-port 8080 `
        --ingress external `
        --min-replicas 1 `
        --max-replicas 3 `
        --cpu 0.25 `
        --memory 0.5Gi `
        --output table
} else {
    az containerapp update --name $WEB_APP --resource-group $ResourceGroup --image $webImage --output table
}

# 8. Output URLs
$apiFqdn = az containerapp show --name $API_APP --resource-group $ResourceGroup --query "properties.configuration.ingress.fqdn" -o tsv 2>$null
$webFqdn = az containerapp show --name $WEB_APP --resource-group $ResourceGroup --query "properties.configuration.ingress.fqdn" -o tsv 2>$null

Write-Host "`n=== Done ===" -ForegroundColor Green
Write-Host "API: https://${apiFqdn}" -ForegroundColor Cyan
Write-Host "API Health: https://${apiFqdn}/api/health" -ForegroundColor Cyan
Write-Host "Web: https://${webFqdn}" -ForegroundColor Cyan
Write-Host "`nNext: Add custom domains (api.skafoldai.com, www.skafoldai.com) in Azure Portal." -ForegroundColor Yellow
