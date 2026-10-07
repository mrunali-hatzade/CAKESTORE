# Production Deployment Architecture

This document describes the intended production architecture for CakeStore. **No cloud resources have been provisioned yet.**

## Target Architecture Components

### 1. Frontend (Storefront & Admin Dashboard)
- **Host**: Vercel
- **Technology**: Next.js App Router (React 18), Server-Side Rendering (SSR) & Static Site Generation (SSG).
- **Communication**: Interacts exclusively via REST APIs with the Backend. Environment variables inject the backend URL securely. File proxying handles local/dev, but direct absolute Cloudinary URLs are used in production.

### 2. Backend (Core API)
- **Host**: DECISION PENDING (Candidate: Google Cloud Run, AWS App Runner, or similar containerized managed service)
- **Technology**: Spring Boot 3.3.2 (Java 17).
- **Configuration**: Deployed as a stateless Docker container. 
- **Responsibilities**: 
  - Exclusive source of truth for business rules, pricing, validation, and lifecycle transitions.
  - Generates cryptographically secure access URLs for private business documents.
  - Verifies payment signatures and webhook payloads.

### 3. Database
- **Host**: Supabase PostgreSQL
- **Technology**: PostgreSQL 15+
- **Management**: Schema is strictly managed by Spring Boot via Flyway Migrations on startup. The application connects to an empty database provided by Supabase and executes V1 through current migrations automatically.
- **Connection**: Connections from the backend are managed by HikariCP with connection timeouts optimized for cloud networking. The connection string must use Supabase's direct connection (port 5432) or a session-pooled connection to allow Flyway schema locking to operate safely.

### 4. Media Storage
- **Host**: Cloudinary
- **Capabilities**: 
  - Dynamic image resizing, optimization, and CDN delivery for public assets (products, logos).
  - Secure vault (authenticated delivery type) for private verification documents (GST, FSSAI). Access is mediated by backend-signed tokens.

### 5. Payments
- **Host**: Razorpay
- **Capabilities**: Secure checkout UI integration and asynchronous, signed server-to-server webhook confirmations. (Live mode for production, Test mode for development).

### 6. Email Notifications
- **Host**: Resend
- **Capabilities**: Delivers password recovery emails, contact inquiries, and transactional alerts via standard HTTPS API integration.

## Networking & Security
- **Data in Transit**: Strict TLS/HTTPS across all connections. HSTS enforced by the backend API.
- **Tenant Isolation**: Backend intercepts all requests, extracting the authenticated JWT and ensuring actions map precisely to the isolated Shop ID.
- **Secrets Management**: Vercel Environment Variables (Frontend) and Cloud Secret Manager (Backend).
