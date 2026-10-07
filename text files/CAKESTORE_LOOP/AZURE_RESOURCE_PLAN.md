# Azure Resource Plan

This document outlines the minimal Azure resources required to host the CakeStore API using Azure Container Apps. 

**Cost Control Note**: This deployment targets an Azure Education subscription. Resources must be heavily constrained to avoid accidental credit consumption.

## Required Azure Resources

### 1. Azure Resource Group
- **Name**: `rg-cakestore-prod`
- **Region**: (Choose closest to target audience)
- **Purpose**: Logical container for all CakeStore infrastructure, allowing 1-click deletion if credits run low.

### 2. Azure Container Registry (ACR)
- **Name**: `crcakestoreprod` (must be globally unique)
- **SKU**: Basic
- **Purpose**: Private registry for storing the `cakestore-api` Docker images.
- **Cost Control**: Basic SKU is sufficient and cost-effective.

### 3. Azure Container Apps Environment (ACA Env)
- **Name**: `cae-cakestore-prod`
- **Type**: Consumption only (No Dedicated/Workload profiles)
- **Purpose**: The managed environment boundary for the container app.
- **Cost Control**: Consumption billing means we only pay for active vCPU/RAM seconds.

### 4. Azure Container App (ACA)
- **Name**: `ca-cakestore-api`
- **Compute Allocation**: 
  - CPU: 0.5 vCPU (or 0.25 if Spring Boot memory footprint permits)
  - Memory: 1.0 GiB (Java applications typically require at least 512MB-1GB to boot comfortably without thrashing the garbage collector).
- **Replica Scaling**: 
  - Minimum replicas: 0 (Scale-to-zero saves credits when inactive, though it introduces a "cold start" latency of 10-20 seconds on the first request). If cold start is unacceptable, set to 1.
  - Maximum replicas: 2 (Hard cap to prevent unexpected runaway billing).
- **Ingress**: External (HTTPS)

## Resources NOT Required (Cost Avoidance)
Do **NOT** create the following resources as part of this architecture:
- Azure Database for PostgreSQL (We are using Supabase)
- Azure Redis Cache (Not introduced yet)
- Azure Blob Storage (We are using Cloudinary)
- Azure Kubernetes Service (AKS)
- Azure App Service
- Virtual Network (VNet) Gateways or NAT Gateways

## Shutdown / Cleanup Strategy
If the Education credits approach 80% exhaustion, the entire `rg-cakestore-prod` resource group can be deleted in a single operation. Because the database (Supabase) and media (Cloudinary) exist externally, deleting the Azure Resource Group will **not** cause permanent data loss. The application can be redeployed via CI/CD when credits are replenished.
