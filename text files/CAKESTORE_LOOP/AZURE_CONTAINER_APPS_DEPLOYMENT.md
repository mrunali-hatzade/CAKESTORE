# Azure Container Apps Deployment Design

## 1. Architecture
CakeStore will use Azure Container Apps (ACA) exclusively as the compute layer for the Spring Boot backend. PostgreSQL (Supabase), Media (Cloudinary), Email (Resend), and Payments (Razorpay) remain externalized to prevent vendor lock-in. 

## 2. Azure Container Apps Role
ACA is a fully managed, serverless container service built on Azure Kubernetes Service (AKS) without the overhead of managing K8s. It will run the stateless Spring Boot API container and handle scaling, TLS termination, and HTTPS routing.

## 3. Resource Group
A single resource group (e.g., \g-cakestore-prod\) will encapsulate the Container Registry, Container Apps Environment, and the App itself for clean cost tracking and deletion capability.

## 4. Container Apps Environment
Provides a secure isolation boundary and VNet (Virtual Network). For this SaaS, an internal VNet is not required since the database is externalized to Supabase. A consumption-based ACA Environment will be used.

## 5. Container App
- **Name**: \cakestore-api\
- **Image**: Pulled securely from the Azure Container Registry.
- **Port**: 8080.
- **Ingress**: External Ingress enabled.

## 6. Container Registry
Azure Container Registry (ACR) will act as the private registry holding the Docker images built by the CI pipeline.

## 7. Secrets
ACA handles secrets natively. Sensitive values (\DB_URL\, \JWT_SECRET\, \RAZORPAY_KEY_SECRET\, etc.) will be stored as ACA secrets and mapped into environment variables.

## 8. Environment Variables
Mapped directly to the Spring Boot application configuration:
- \SPRING_PROFILES_ACTIVE=prod\
- \CORS_ALLOWED_ORIGINS\
- Reference to secrets (e.g., \DB_URL=secretref:db-url\)

## 9. Networking
Ingress will be fully managed by Azure, routing port 443 (HTTPS) down to the container's exposed port 8080.

## 10. HTTPS
Azure provides a default \.azurecontainerapps.io\ TLS certificate out of the box, with support for custom domain binding later.

## 11. Health Checks
Spring Boot Actuator (\/actuator/health\) will serve as the Liveness and Readiness probe to ensure traffic is only routed to healthy container replicas.

## 12. Scaling
- **Minimum Replicas**: 0 or 1 (depending on cold-start tolerance; 0 saves maximum cost).
- **Maximum Replicas**: 2 (Conservative maximum to prevent budget overruns).
- **Rules**: HTTP concurrent request scaling rule.

## 13. Logging
Azure Log Analytics Workspace will capture stdout/stderr from the Spring Boot container for debugging and audit purposes.

## 14. Deployment Flow
ACR Push -> ACA Revision Update -> Traffic split/cutover (Zero-downtime deployment).

## 15. Rollback Strategy
ACA natively supports Revision Management. Rolling back involves simply shifting 100% of ingress traffic to the previous known-good revision.

## 16. Supabase Connection
ACA will communicate externally over the internet to Supabase using standard TLS (port 5432 / direct connection for Flyway compatibility).

## 17. Cloudinary
Media operations route directly from the Next.js frontend or backend to Cloudinary's APIs. No Azure Blob Storage involved.

## 18. Razorpay
Webhook delivery will target the ACA ingress public HTTPS URL securely.

## 19. Resend
HTTP calls from ACA to Resend's API.

## 20. Vercel Connection
Vercel (Frontend) will configure its \NEXT_PUBLIC_API_BASE_URL\ to point to the ACA public HTTPS domain.
