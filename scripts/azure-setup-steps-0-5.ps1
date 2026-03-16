# SkafoldAI Azure Setup - Steps 0 through 5
# Run this script from the project root after: az login
# Ensure SkafoldAI-Prod subscription is selected: az account set --subscription "SkafoldAI-Prod"

param(
    [string]$SubscriptionName = "SkafoldAI-Prod",
    [string]$Region = "eastus",
    [string]$StorageSuffix = "",  # Add suffix if skafoldaisa is taken (e.g., "prod" -> skafoldaisaprod)
    [string]$SqlAdminUser = "skafoldaiadmin",
    [string]$SqlAdminPassword = "",  # Required for Step 5 unless -SkipStep5
    [switch]$SkipStep4,  # Skip moving Foundry (do it manually)
    [switch]$SkipStep5,  # Skip Azure SQL (use SQLite on Azure Files for now)
    [string]$ExistingOpenAIResourceId = ""  # For Step 4: full resource ID of existing Azure OpenAI/Foundry resource to move
)

$ErrorActionPreference = "Stop"
$RG = "rg-skafoldai-prod"
$StorageName = "skafoldaisa" + $StorageSuffix

# Validate
if (-not $SkipStep5 -and [string]::IsNullOrWhiteSpace($SqlAdminPassword)) {
    Write-Host "ERROR: -SqlAdminPassword is required for Step 5 (Azure SQL). Use -SkipStep5 to skip." -ForegroundColor Red
    Write-Host "Example: .\azure-setup-steps-0-5.ps1 -SqlAdminPassword 'YourSecureP@ssw0rd'" -ForegroundColor Yellow
    exit 1
}

# Set subscription
Write-Host "`n=== Setting subscription to $SubscriptionName ===" -ForegroundColor Cyan
az account set --subscription $SubscriptionName
$subId = az account show --query id -o tsv
Write-Host "Subscription ID: $subId"

# Step 0: Resource Group
Write-Host "`n=== Step 0: Resource Group ($RG) ===" -ForegroundColor Cyan
az group create --name $RG --location $Region --output table

# Step 1: Log Analytics + Application Insights
Write-Host "`n=== Step 1: Log Analytics + Application Insights ===" -ForegroundColor Cyan
az monitor log-analytics workspace create `
    --resource-group $RG `
    --workspace-name skafoldai-logs `
    --location $Region `
    --output table

$workspaceId = az monitor log-analytics workspace show `
    --resource-group $RG `
    --workspace-name skafoldai-logs `
    --query id -o tsv

az monitor app-insights component create `
    --app skafoldai-ins `
    --location $Region `
    --resource-group $RG `
    --kind web `
    --workspace $workspaceId `
    --output table

# Step 2: Key Vault
Write-Host "`n=== Step 2: Key Vault ===" -ForegroundColor Cyan
az keyvault create `
    --name skafoldai-kv `
    --resource-group $RG `
    --location $Region `
    --output table

# Step 3: Storage Account + File Share
Write-Host "`n=== Step 3: Storage Account + File Share ===" -ForegroundColor Cyan
az storage account create `
    --name $StorageName `
    --resource-group $RG `
    --location $Region `
    --sku Standard_LRS `
    --kind StorageV2 `
    --output table

$storageKey = az storage account keys list --resource-group $RG --account-name $StorageName --query "[0].value" -o tsv
az storage share create --name skafoldai-data --account-name $StorageName --account-key $storageKey --output table

# Step 4: Move existing Azure OpenAI / Foundry to rg-skafoldai-prod
if (-not $SkipStep4) {
    if ([string]::IsNullOrWhiteSpace($ExistingOpenAIResourceId)) {
        Write-Host "`n=== Step 4: Azure OpenAI / Foundry (MOVE EXISTING) ===" -ForegroundColor Yellow
        Write-Host "Foundry is already set up. To move it into rg-skafoldai-prod:" -ForegroundColor Yellow
        Write-Host "1. Find your Azure OpenAI resource in Azure Portal (Cognitive Services)" -ForegroundColor Yellow
        Write-Host "2. Get its Resource ID (Properties -> Resource ID)" -ForegroundColor Yellow
        Write-Host "3. Run:" -ForegroundColor Yellow
        Write-Host "   az resource move --destination-group $RG --ids '<YOUR-RESOURCE-ID>'" -ForegroundColor White
        Write-Host "`nOr list Cognitive Services in your subscription:" -ForegroundColor Yellow
        az cognitiveservices account list --query "[].{name:name, resourceGroup:resourceGroup, id:id}" -o table
        Write-Host "`nThen run this script again with: -ExistingOpenAIResourceId '<resource-id>'" -ForegroundColor Yellow
    } else {
        Write-Host "`n=== Step 4: Moving Azure OpenAI to $RG ===" -ForegroundColor Cyan
        az resource move --destination-group $RG --ids $ExistingOpenAIResourceId
        Write-Host "Move completed. Verify in Azure Portal." -ForegroundColor Green
    }
} else {
    Write-Host "`n=== Step 4: Skipped (use -SkipStep4 to skip) ===" -ForegroundColor Gray
}

# Step 5: Azure SQL Database
if ($SkipStep5) {
    Write-Host "`n=== Step 5: Skipped (use SQLite on Azure Files until migration) ===" -ForegroundColor Gray
} else {
Write-Host "`n=== Step 5: Azure SQL Database ===" -ForegroundColor Cyan
$sqlServer = "skafoldai-sql-eus"
az sql server create `
    --name $sqlServer `
    --resource-group $RG `
    --location $Region `
    --admin-user $SqlAdminUser `
    --admin-password $SqlAdminPassword `
    --output table

# Allow Azure services
az sql server firewall-rule create `
    --resource-group $RG `
    --server $sqlServer `
    --name AllowAzureServices `
    --start-ip-address 0.0.0.0 `
    --end-ip-address 0.0.0.0 `
    --output table

# Add current client IP for dev access
$myIp = (Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing).Content
az sql server firewall-rule create `
    --resource-group $RG `
    --server $sqlServer `
    --name AllowMyIP `
    --start-ip-address $myIp `
    --end-ip-address $myIp `
    --output table

az sql db create `
    --resource-group $RG `
    --server $sqlServer `
    --name skafoldai-db `
    --service-objective Basic `
    --output table
}

Write-Host "Resource group: $RG" -ForegroundColor White
Write-Host "Storage account: $StorageName (file share: skafoldai-data)" -ForegroundColor White
if (-not $SkipStep5) {
    Write-Host "SQL Server: $sqlServer.database.windows.net" -ForegroundColor White
    Write-Host "Database: skafoldai-db" -ForegroundColor White
    Write-Host "`nConnection string (replace {password}):" -ForegroundColor Yellow
    Write-Host "Server=tcp:$sqlServer.database.windows.net,1433;Database=skafoldai-db;User ID=$SqlAdminUser;Password={password};Encrypt=true;TrustServerCertificate=false;Connection Timeout=30;" -ForegroundColor Gray
}
Write-Host "`nNOTE: App uses SQLite. Use SQLite on Azure Files (DATABASE_PATH=/home/data/skafoldai.db) until Azure SQL migration." -ForegroundColor Yellow
