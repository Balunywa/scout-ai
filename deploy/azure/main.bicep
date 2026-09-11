// =====================================================================================
// Digital Scout — Azure-native accelerator infrastructure
// Provisions the target architecture from the README: the App & Agent plane
// (App Service web app, Azure AI Foundry Agent Service, Cosmos DB conversation
// store, PostgreSQL domain data), the Knowledge plane (Azure AI Search + Blob),
// and the supporting platform (Key Vault, Log Analytics + Application Insights).
//
// Everything is keyless: the web app runs under a system-assigned managed
// identity that is granted data-plane RBAC on each backing service, so no
// connection strings or keys are stored in app settings. Every component is
// behind a feature flag so the same template scales from "web app only" (the
// original Phase-0 deployment) up to the full stack.
// =====================================================================================

targetScope = 'resourceGroup'

// ------------------------------------------------------------------------------------
// Core parameters
// ------------------------------------------------------------------------------------
@description('Base name used to derive resource names. Lowercase letters and numbers, 3-20 chars.')
@minLength(3)
@maxLength(20)
param namePrefix string = 'digitalscout'

@description('Azure region for all resources. Defaults to the resource group location.')
param location string = resourceGroup().location

@description('Globally unique name for the web app. Leave blank to auto-generate one from the resource group id.')
param webAppName string = ''

@description('App Service plan SKU (compute tier) for the web app.')
@allowed([ 'B1', 'B2', 'B3', 'S1', 'S2', 'S3', 'P0v3', 'P1v3', 'P2v3' ])
param appServiceSku string = 'B1'

@description('Public URL of the prebuilt, self-contained web app zip. App Service mounts it read-only via WEBSITE_RUN_FROM_PACKAGE.')
param packageUrl string = 'https://github.com/Balunywa/scout-ai/releases/download/app-latest/scout-ai-app.zip'

// ------------------------------------------------------------------------------------
// Feature flags — turn each plane of the architecture on or off
// ------------------------------------------------------------------------------------
@description('Deploy Log Analytics + Application Insights for monitoring and telemetry.')
param deployMonitoring bool = true

@description('Deploy an Azure Key Vault (RBAC mode) for secrets and keys.')
param deployKeyVault bool = true

@description('Deploy a Storage account with blob containers for documents and reports.')
param deployStorage bool = true

@description('Deploy Azure AI Search for the knowledge plane (semantic + vector index).')
param deploySearch bool = true

@description('Azure AI Search SKU.')
@allowed([ 'basic', 'standard', 'standard2', 'standard3' ])
param searchSku string = 'basic'

@description('Deploy Azure Cosmos DB for NoSQL for agent state and conversation history.')
param deployCosmos bool = true

@description('Deploy Azure Database for PostgreSQL Flexible Server for the relational domain model (with pgvector).')
param deployPostgres bool = true

@description('PostgreSQL administrator login name.')
param postgresAdminLogin string = 'scoutadmin'

@description('PostgreSQL administrator password. Required only when PostgreSQL is deployed.')
@secure()
param postgresAdminPassword string = ''

@description('Deploy an Azure AI Foundry (AI Services) account with chat + embedding model deployments for the agent plane.')
param deployAiFoundry bool = true

@description('Chat/reasoning model to deploy in Azure AI Foundry.')
param chatModelName string = 'gpt-4o-mini'

@description('Chat model version.')
param chatModelVersion string = '2024-07-18'

@description('Chat model deployment capacity, in thousands of tokens per minute (TPM).')
param chatModelCapacity int = 20

@description('Embedding model to deploy in Azure AI Foundry (used for vector search).')
param embeddingModelName string = 'text-embedding-3-large'

@description('Embedding model version.')
param embeddingModelVersion string = '1'

@description('Embedding model deployment capacity, in thousands of tokens per minute (TPM).')
param embeddingModelCapacity int = 20

@description('Tags applied to every resource.')
param tags object = {
  solution: 'digital-scout'
  environment: 'poc'
}

// ------------------------------------------------------------------------------------
// Variables
// ------------------------------------------------------------------------------------
var suffix = toLower(uniqueString(resourceGroup().id))
var effectiveWebAppName = empty(webAppName) ? '${namePrefix}-${suffix}' : webAppName
var appServicePlanName = '${effectiveWebAppName}-plan'
var logAnalyticsName = '${namePrefix}-logs-${suffix}'
var appInsightsName = '${namePrefix}-appi-${suffix}'
var keyVaultName = take('${namePrefix}kv${suffix}', 24)
var storageAccountName = take('${namePrefix}st${suffix}', 24)
var searchServiceName = take('${namePrefix}-search-${suffix}', 60)
var cosmosAccountName = take('${namePrefix}-cosmos-${suffix}', 44)
var aiFoundryName = '${namePrefix}-aifoundry-${suffix}'
var postgresServerName = '${namePrefix}-pg-${suffix}'

var cosmosDatabaseName = 'digitalscout'
var cosmosConversationsContainer = 'conversations'
var postgresDatabaseName = 'digitalscout'
var documentsContainerName = 'documents'
var reportsContainerName = 'reports'

// Built-in Azure RBAC role definition IDs (data-plane, keyless access).
var storageBlobDataContributorRoleId = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'
var searchIndexDataContributorRoleId = '8ebe5a00-799e-43f5-93ac-243d3dce84a7'
var searchServiceContributorRoleId = '7ca78c08-252a-4471-8644-bb5ff32d4ba0'
var cognitiveServicesOpenAiUserRoleId = '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd'
var cognitiveServicesUserRoleId = 'a97b65f3-24c7-4388-baec-2e87135dc908'
var keyVaultSecretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'
// Cosmos DB for NoSQL built-in data-plane role: Data Contributor (fixed GUID).
var cosmosDataContributorRoleId = '00000000-0000-0000-0000-000000000002'

// ------------------------------------------------------------------------------------
// Monitoring — Log Analytics workspace + Application Insights
// ------------------------------------------------------------------------------------
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = if (deployMonitoring) {
  name: logAnalyticsName
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = if (deployMonitoring) {
  name: appInsightsName
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: deployMonitoring ? logAnalytics.id : null
  }
}

// ------------------------------------------------------------------------------------
// Key Vault (RBAC authorization mode)
// ------------------------------------------------------------------------------------
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = if (deployKeyVault) {
  name: keyVaultName
  location: location
  tags: tags
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    publicNetworkAccess: 'Enabled'
  }
}

// ------------------------------------------------------------------------------------
// Storage account + blob containers (documents & reports)
// ------------------------------------------------------------------------------------
resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = if (deployStorage) {
  name: storageAccountName
  location: location
  tags: tags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = if (deployStorage) {
  parent: storage
  name: 'default'
}

resource documentsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = if (deployStorage) {
  parent: blobService
  name: documentsContainerName
  properties: {
    publicAccess: 'None'
  }
}

resource reportsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = if (deployStorage) {
  parent: blobService
  name: reportsContainerName
  properties: {
    publicAccess: 'None'
  }
}

// ------------------------------------------------------------------------------------
// Azure AI Search — knowledge plane index
// ------------------------------------------------------------------------------------
resource searchService 'Microsoft.Search/searchServices@2024-06-01-preview' = if (deploySearch) {
  name: searchServiceName
  location: location
  tags: tags
  sku: {
    name: searchSku
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    replicaCount: 1
    partitionCount: 1
    hostingMode: 'default'
    publicNetworkAccess: 'enabled'
    authOptions: {
      aadOrApiKey: {
        aadAuthFailureMode: 'http401WithBearerChallenge'
      }
    }
    semanticSearch: 'free'
  }
}

// ------------------------------------------------------------------------------------
// Azure Cosmos DB for NoSQL — agent state & conversation history
// ------------------------------------------------------------------------------------
resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2024-11-15' = if (deployCosmos) {
  name: cosmosAccountName
  location: location
  tags: tags
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    disableLocalAuth: true
    enableAutomaticFailover: false
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
  }
}

resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-11-15' = if (deployCosmos) {
  parent: cosmos
  name: cosmosDatabaseName
  properties: {
    resource: {
      id: cosmosDatabaseName
    }
  }
}

resource cosmosConversations 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-11-15' = if (deployCosmos) {
  parent: cosmosDatabase
  name: cosmosConversationsContainer
  properties: {
    resource: {
      id: cosmosConversationsContainer
      partitionKey: {
        paths: [ '/conversationId' ]
        kind: 'Hash'
      }
    }
  }
}

// ------------------------------------------------------------------------------------
// Azure Database for PostgreSQL Flexible Server — relational domain model + pgvector
// ------------------------------------------------------------------------------------
resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = if (deployPostgres) {
  name: postgresServerName
  location: location
  tags: tags
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: postgresAdminLogin
    administratorLoginPassword: postgresAdminPassword
    authConfig: {
      activeDirectoryAuth: 'Enabled'
      passwordAuth: 'Enabled'
      tenantId: subscription().tenantId
    }
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
  }
}

// Allow-list the pgvector extension so embeddings can be stored/queried in-database.
resource postgresExtensions 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2024-08-01' = if (deployPostgres) {
  parent: postgres
  name: 'azure.extensions'
  properties: {
    value: 'VECTOR'
    source: 'user-override'
  }
}

resource postgresDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = if (deployPostgres) {
  parent: postgres
  name: postgresDatabaseName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
  dependsOn: [
    postgresExtensions
  ]
}

// Open the server to other Azure services (App Service outbound). Tighten with
// VNet integration / private endpoints for production.
resource postgresAllowAzure 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = if (deployPostgres) {
  parent: postgres
  name: 'AllowAllAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// ------------------------------------------------------------------------------------
// Azure AI Foundry (AI Services) — agent plane reasoning + embeddings
// ------------------------------------------------------------------------------------
resource aiFoundry 'Microsoft.CognitiveServices/accounts@2024-10-01' = if (deployAiFoundry) {
  name: aiFoundryName
  location: location
  tags: tags
  kind: 'AIServices'
  sku: {
    name: 'S0'
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    customSubDomainName: aiFoundryName
    publicNetworkAccess: 'Enabled'
    disableLocalAuth: true
  }
}

resource chatDeployment 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = if (deployAiFoundry) {
  parent: aiFoundry
  name: chatModelName
  sku: {
    name: 'GlobalStandard'
    capacity: chatModelCapacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: chatModelName
      version: chatModelVersion
    }
    versionUpgradeOption: 'NoAutoUpgrade'
  }
}

resource embeddingDeployment 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = if (deployAiFoundry) {
  parent: aiFoundry
  name: embeddingModelName
  sku: {
    name: 'Standard'
    capacity: embeddingModelCapacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: embeddingModelName
      version: embeddingModelVersion
    }
    versionUpgradeOption: 'NoAutoUpgrade'
  }
  dependsOn: [
    chatDeployment
  ]
}

// ------------------------------------------------------------------------------------
// App Service — the web app (system-assigned identity, run-from-package)
// ------------------------------------------------------------------------------------
resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  tags: tags
  sku: {
    name: appServiceSku
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: effectiveWebAppName
  location: location
  tags: tags
  kind: 'app,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|22-lts'
      appCommandLine: 'node server/index.mjs'
      alwaysOn: true
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      http20Enabled: true
      appSettings: concat([
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: packageUrl
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'false'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~22'
        }
        {
          name: 'NODE_ENV'
          value: 'production'
        }
      ],
      deployMonitoring ? [
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
      ] : [],
      deployStorage ? [
        {
          name: 'AZURE_STORAGE_BLOB_ENDPOINT'
          value: storage.properties.primaryEndpoints.blob
        }
        {
          name: 'AZURE_STORAGE_DOCUMENTS_CONTAINER'
          value: documentsContainerName
        }
      ] : [],
      deployKeyVault ? [
        {
          name: 'AZURE_KEYVAULT_URI'
          value: keyVault.properties.vaultUri
        }
      ] : [],
      deploySearch ? [
        {
          name: 'AZURE_SEARCH_ENDPOINT'
          value: 'https://${searchServiceName}.search.windows.net'
        }
      ] : [],
      deployCosmos ? [
        {
          name: 'AZURE_COSMOS_ENDPOINT'
          value: cosmos.properties.documentEndpoint
        }
        {
          name: 'AZURE_COSMOS_DATABASE'
          value: cosmosDatabaseName
        }
      ] : [],
      deployPostgres ? [
        {
          name: 'POSTGRES_HOST'
          value: postgres.properties.fullyQualifiedDomainName
        }
        {
          name: 'POSTGRES_DATABASE'
          value: postgresDatabaseName
        }
        {
          name: 'POSTGRES_USER'
          value: postgresAdminLogin
        }
      ] : [],
      deployAiFoundry ? [
        {
          name: 'AZURE_AI_FOUNDRY_ENDPOINT'
          value: aiFoundry.properties.endpoint
        }
        {
          name: 'AZURE_OPENAI_ENDPOINT'
          value: aiFoundry.properties.endpoint
        }
        {
          name: 'AZURE_OPENAI_CHAT_DEPLOYMENT'
          value: chatModelName
        }
        {
          name: 'AZURE_OPENAI_EMBEDDING_DEPLOYMENT'
          value: embeddingModelName
        }
      ] : [])
    }
  }
}

// ------------------------------------------------------------------------------------
// RBAC — grant the web app's managed identity keyless data-plane access
// ------------------------------------------------------------------------------------
resource storageBlobRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (deployStorage) {
  name: guid(storage.id, webApp.id, storageBlobDataContributorRoleId)
  scope: storage
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageBlobDataContributorRoleId)
    principalId: webApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource searchDataRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (deploySearch) {
  name: guid(searchService.id, webApp.id, searchIndexDataContributorRoleId)
  scope: searchService
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', searchIndexDataContributorRoleId)
    principalId: webApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource searchServiceRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (deploySearch) {
  name: guid(searchService.id, webApp.id, searchServiceContributorRoleId)
  scope: searchService
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', searchServiceContributorRoleId)
    principalId: webApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource keyVaultSecretsRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (deployKeyVault) {
  name: guid(keyVault.id, webApp.id, keyVaultSecretsUserRoleId)
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', keyVaultSecretsUserRoleId)
    principalId: webApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource aiFoundryOpenAiRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (deployAiFoundry) {
  name: guid(aiFoundry.id, webApp.id, cognitiveServicesOpenAiUserRoleId)
  scope: aiFoundry
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', cognitiveServicesOpenAiUserRoleId)
    principalId: webApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource aiFoundryUserRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (deployAiFoundry) {
  name: guid(aiFoundry.id, webApp.id, cognitiveServicesUserRoleId)
  scope: aiFoundry
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', cognitiveServicesUserRoleId)
    principalId: webApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Let Azure AI Search read/embed content from the AI Foundry account (skillset).
resource searchToAiFoundryRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (deploySearch && deployAiFoundry) {
  name: guid(aiFoundry.id, searchService.id, cognitiveServicesOpenAiUserRoleId)
  scope: aiFoundry
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', cognitiveServicesOpenAiUserRoleId)
    principalId: deploySearch ? searchService.identity.principalId : ''
    principalType: 'ServicePrincipal'
  }
}

// Let Azure AI Search read documents from Blob storage (indexer data source).
resource searchToStorageRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (deploySearch && deployStorage) {
  name: guid(storage.id, searchService.id, storageBlobDataContributorRoleId)
  scope: storage
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageBlobDataContributorRoleId)
    principalId: deploySearch ? searchService.identity.principalId : ''
    principalType: 'ServicePrincipal'
  }
}

// Cosmos DB uses its own data-plane RBAC (SQL role assignments), not Azure RBAC.
resource cosmosDataRole 'Microsoft.DocumentDB/databaseAccounts/sqlRoleAssignments@2024-11-15' = if (deployCosmos) {
  parent: cosmos
  name: guid(cosmos.id, webApp.id, cosmosDataContributorRoleId)
  properties: {
    roleDefinitionId: resourceId('Microsoft.DocumentDB/databaseAccounts/sqlRoleDefinitions', cosmosAccountName, cosmosDataContributorRoleId)
    principalId: webApp.identity.principalId
    scope: cosmos.id
  }
}

// ------------------------------------------------------------------------------------
// Outputs
// ------------------------------------------------------------------------------------
@description('Name of the deployed web app.')
output webAppName string = effectiveWebAppName

@description('Public URL of the web app.')
output webAppUrl string = 'https://${webApp.properties.defaultHostName}'

@description('Principal (object) id of the web app managed identity.')
output webAppPrincipalId string = webApp.identity.principalId

@description('Application Insights connection string (empty when monitoring is disabled).')
output appInsightsConnectionString string = deployMonitoring ? appInsights.properties.ConnectionString : 'not-deployed'

@description('Key Vault URI (empty when Key Vault is disabled).')
output keyVaultUri string = deployKeyVault ? keyVault.properties.vaultUri : 'not-deployed'

@description('Blob endpoint of the documents storage account.')
output storageBlobEndpoint string = deployStorage ? storage.properties.primaryEndpoints.blob : 'not-deployed'

@description('Azure AI Search endpoint.')
output searchEndpoint string = deploySearch ? 'https://${searchServiceName}.search.windows.net' : 'not-deployed'

@description('Cosmos DB document endpoint.')
output cosmosEndpoint string = deployCosmos ? cosmos.properties.documentEndpoint : 'not-deployed'

@description('PostgreSQL fully qualified domain name.')
output postgresHost string = deployPostgres ? postgres.properties.fullyQualifiedDomainName : 'not-deployed'

@description('Azure AI Foundry (AI Services) endpoint.')
output aiFoundryEndpoint string = deployAiFoundry ? aiFoundry.properties.endpoint : 'not-deployed'

@description('Deployed chat model deployment name.')
output chatDeploymentName string = deployAiFoundry ? chatModelName : 'not-deployed'

@description('Deployed embedding model deployment name.')
output embeddingDeploymentName string = deployAiFoundry ? embeddingModelName : 'not-deployed'
