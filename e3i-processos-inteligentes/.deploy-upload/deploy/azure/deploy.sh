#!/usr/bin/env bash
set -euo pipefail

LOCATION="${AZURE_LOCATION:-brazilsouth}"
RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-rg-e3i-portal-test}"
ENVIRONMENT="${AZURE_CONTAINERAPPS_ENV:-cae-e3i-test}"
APP_NAME="${AZURE_CONTAINERAPP_NAME:-e3i-portal-test}"
SUFFIX="${AZURE_RESOURCE_SUFFIX:-$(date +%s | tail -c 7)}"
ACR_NAME="${AZURE_ACR_NAME:-acre3i${SUFFIX}}"
STORAGE_ACCOUNT="${AZURE_STORAGE_ACCOUNT:-ste3i${SUFFIX}}"
FILE_SHARE="${AZURE_FILE_SHARE:-e3idata}"
STORAGE_MOUNT="e3idatamount"
IMAGE="${ACR_NAME}.azurecr.io/e3i-portal:$(date +%Y%m%d%H%M%S)"

az extension add --name containerapp --upgrade --yes
az provider register --namespace Microsoft.App --wait
az provider register --namespace Microsoft.ContainerRegistry --wait
az provider register --namespace Microsoft.OperationalInsights --wait
az provider register --namespace Microsoft.Storage --wait

az group create --name "$RESOURCE_GROUP" --location "$LOCATION"
az acr create --resource-group "$RESOURCE_GROUP" --name "$ACR_NAME" --sku Basic --admin-enabled true
az acr build --registry "$ACR_NAME" --image "${IMAGE#*/}" .

az storage account create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$STORAGE_ACCOUNT" \
  --location "$LOCATION" \
  --sku Standard_LRS \
  --kind StorageV2 \
  --allow-blob-public-access false

az storage share-rm create \
  --resource-group "$RESOURCE_GROUP" \
  --storage-account "$STORAGE_ACCOUNT" \
  --name "$FILE_SHARE" \
  --quota 5

az containerapp env create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ENVIRONMENT" \
  --location "$LOCATION"

STORAGE_KEY="$(az storage account keys list --resource-group "$RESOURCE_GROUP" --account-name "$STORAGE_ACCOUNT" --query '[0].value' --output tsv)"
az containerapp env storage set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ENVIRONMENT" \
  --storage-name "$STORAGE_MOUNT" \
  --access-mode ReadWrite \
  --azure-file-account-name "$STORAGE_ACCOUNT" \
  --azure-file-account-key "$STORAGE_KEY" \
  --azure-file-share-name "$FILE_SHARE"
unset STORAGE_KEY

ACR_USER="$(az acr credential show --name "$ACR_NAME" --query username --output tsv)"
ACR_PASSWORD="$(az acr credential show --name "$ACR_NAME" --query 'passwords[0].value' --output tsv)"

az containerapp create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_NAME" \
  --environment "$ENVIRONMENT" \
  --image "$IMAGE" \
  --registry-server "${ACR_NAME}.azurecr.io" \
  --registry-username "$ACR_USER" \
  --registry-password "$ACR_PASSWORD" \
  --ingress external \
  --target-port 3000 \
  --cpu 0.5 \
  --memory 1.0Gi \
  --min-replicas 0 \
  --max-replicas 1 \
  --env-vars NODE_ENV=production PORT=3000 ALLOW_PUBLIC_REGISTRATION=false AI_FEATURES_ENABLED=false
unset ACR_PASSWORD

SPEC_FILE="$(mktemp)"
sed "s|IMAGE_PLACEHOLDER|${IMAGE}|g" deploy/azure/containerapp.yaml > "$SPEC_FILE"
az containerapp update --resource-group "$RESOURCE_GROUP" --name "$APP_NAME" --yaml "$SPEC_FILE"
rm -f "$SPEC_FILE"

FQDN="$(az containerapp show --resource-group "$RESOURCE_GROUP" --name "$APP_NAME" --query properties.configuration.ingress.fqdn --output tsv)"
printf 'Portal: https://%s\nHealth: https://%s/api/health/live\n' "$FQDN" "$FQDN"
