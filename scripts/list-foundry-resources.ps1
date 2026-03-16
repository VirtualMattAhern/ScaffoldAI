# List Azure OpenAI / Foundry (Cognitive Services) resources
# Use the Resource ID with: az resource move --destination-group rg-skafoldai-prod --ids "<resource-id>"

# Switch to SkafoldAI-Prod if available (ignore error if not in account list)
try { az account set --subscription "SkafoldAI-Prod" 2>$null } catch {}
az account show --query "{subscription:name, id:id}" -o table
Write-Host ""
Write-Host "Cognitive Services (Azure OpenAI / Foundry) resources:" -ForegroundColor Cyan
az cognitiveservices account list --query "[].{Name:name, ResourceGroup:resourceGroup, Location:location, Id:id}" -o table
Write-Host ""
Write-Host "To move a resource to rg-skafoldai-prod:" -ForegroundColor Yellow
Write-Host 'az resource move --destination-group rg-skafoldai-prod --ids "<paste-Id-from-above>"' -ForegroundColor White
