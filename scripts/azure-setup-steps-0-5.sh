#!/bin/bash
# SkafoldAI Azure Setup - Steps 0 through 5
# Run: az login first, then: ./azure-setup-steps-0-5.sh
# Ensure SkafoldAI-Prod: az account set --subscription "SkafoldAI-Prod"

set -e
SUBSCRIPTION="${SUBSCRIPTION:-SkafoldAI-Prod}"
REGION="${REGION:-eastus}"
RG="rg-skafoldai-prod"
STORAGE_SUFFIX="${STORAGE_SUFFIX:-}"
STORAGE_NAME="skafoldaisa${STORAGE_SUFFIX}"
SQL_ADMIN_USER="${SQL_ADMIN_USER:-skafoldaiadmin}"
SQL_ADMIN_PASSWORD="${SQL_ADMIN_PASSWORD:-}"
EXISTING_OPENAI_ID="${EXISTING_OPENAI_ID:-}"
SKIP_STEP4="${SKIP_STEP4:-false}"

if [ -z "$SQL_ADMIN_PASSWORD" ]; then
  echo "ERROR: SQL_ADMIN_PASSWORD is required for Step 5."
  echo "Example: SQL_ADMIN_PASSWORD='YourSecureP@ssw0rd' ./azure-setup-steps-0-5.sh"
  exit 1
fi

echo ""
echo "=== Setting subscription to $SUBSCRIPTION ==="
az account set --subscription "$SUBSCRIPTION"

echo ""
echo "=== Step 0: Resource Group ($RG) ==="
az group create --name "$RG" --location "$REGION" --output table

echo ""
echo "=== Step 1: Log Analytics + Application Insights ==="
az monitor log-analytics workspace create \
  --resource-group "$RG" \
  --workspace-name skafoldai-logs \
  --location "$REGION" \
  --output table

WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --resource-group "$RG" \
  --workspace-name skafoldai-logs \
  --query id -o tsv)

az monitor app-insights component create \
  --app skafoldai-ins \
  --location "$REGION" \
  --resource-group "$RG" \
  --kind web \
  --workspace "$WORKSPACE_ID" \
  --output table

echo ""
echo "=== Step 2: Key Vault ==="
az keyvault create \
  --name skafoldai-kv \
  --resource-group "$RG" \
  --location "$REGION" \
  --output table

echo ""
echo "=== Step 3: Storage Account + File Share ==="
az storage account create \
  --name "$STORAGE_NAME" \
  --resource-group "$RG" \
  --location "$REGION" \
  --sku Standard_LRS \
  --kind StorageV2 \
  --output table

STORAGE_KEY=$(az storage account keys list --resource-group "$RG" --account-name "$STORAGE_NAME" --query "[0].value" -o tsv)
az storage share create --name skafoldai-data --account-name "$STORAGE_NAME" --account-key "$STORAGE_KEY" --output table

echo ""
echo "=== Step 4: Azure OpenAI / Foundry (MOVE EXISTING) ==="
if [ -n "$EXISTING_OPENAI_ID" ]; then
  az resource move --destination-group "$RG" --ids "$EXISTING_OPENAI_ID"
  echo "Move completed."
else
  echo "To move existing Foundry resource, run:"
  echo "  az resource move --destination-group $RG --ids '<YOUR-RESOURCE-ID>'"
  echo ""
  echo "List Cognitive Services:"
  az cognitiveservices account list --query "[].{name:name, resourceGroup:resourceGroup, id:id}" -o table
fi

echo ""
echo "=== Step 5: Azure SQL Database ==="
SQL_SERVER="skafoldai-sql-eus"
az sql server create \
  --name "$SQL_SERVER" \
  --resource-group "$RG" \
  --location "$REGION" \
  --admin-user "$SQL_ADMIN_USER" \
  --admin-password "$SQL_ADMIN_PASSWORD" \
  --output table

az sql server firewall-rule create \
  --resource-group "$RG" \
  --server "$SQL_SERVER" \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0 \
  --output table

MY_IP=$(curl -s https://api.ipify.org)
az sql server firewall-rule create \
  --resource-group "$RG" \
  --server "$SQL_SERVER" \
  --name AllowMyIP \
  --start-ip-address "$MY_IP" \
  --end-ip-address "$MY_IP" \
  --output table

az sql db create \
  --resource-group "$RG" \
  --server "$SQL_SERVER" \
  --name skafoldai-db \
  --service-objective Basic \
  --output table

echo ""
echo "=== DONE: Steps 0-5 ==="
echo "Connection string: Server=tcp:${SQL_SERVER}.database.windows.net,1433;Database=skafoldai-db;User ID=${SQL_ADMIN_USER};Password=***;Encrypt=true;"
