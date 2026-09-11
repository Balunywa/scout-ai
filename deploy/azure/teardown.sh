#!/usr/bin/env bash
# =====================================================================================
# Digital Scout — teardown helper
# Deletes the resource group that a Digital Scout deployment was provisioned into.
# This removes every resource created by main.bicep / azuredeploy.json.
#
# Usage:
#   ./teardown.sh <resource-group-name> [subscription-id]
#
# Example:
#   ./teardown.sh rg-digital-scout
# =====================================================================================
set -euo pipefail

RESOURCE_GROUP="${1:-}"
SUBSCRIPTION_ID="${2:-}"

if [[ -z "${RESOURCE_GROUP}" ]]; then
  echo "Usage: ./teardown.sh <resource-group-name> [subscription-id]" >&2
  exit 1
fi

if [[ -n "${SUBSCRIPTION_ID}" ]]; then
  az account set --subscription "${SUBSCRIPTION_ID}"
fi

echo "This will DELETE resource group '${RESOURCE_GROUP}' and everything in it."
read -r -p "Type the resource group name to confirm: " CONFIRM
if [[ "${CONFIRM}" != "${RESOURCE_GROUP}" ]]; then
  echo "Confirmation did not match. Aborting." >&2
  exit 1
fi

echo "Deleting resource group '${RESOURCE_GROUP}'..."
az group delete --name "${RESOURCE_GROUP}" --yes --no-wait

# Purge soft-deleted Key Vaults so their names can be reused immediately.
echo "Checking for soft-deleted Key Vaults to purge..."
for kv in $(az keyvault list-deleted --query "[].name" -o tsv 2>/dev/null || true); do
  case "${kv}" in
    digitalscout*|*kv*)
      echo "Purging soft-deleted Key Vault '${kv}'..."
      az keyvault purge --name "${kv}" 2>/dev/null || true
      ;;
  esac
done

echo "Teardown initiated. Resource group deletion is running in the background."
