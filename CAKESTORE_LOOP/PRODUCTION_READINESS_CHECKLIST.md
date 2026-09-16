# Production Readiness Checklist

## Backend
- [x] **READY**: Java 17 / Spring Boot 3.3.2 baseline established.
- [x] **READY**: \pplication-prod.yml\ strips unsafe Actuator endpoints and developer debug tools.
- [ ] **REQUIRES DEPLOYMENT-TIME CONFIGURATION**: Setting \SPRING_PROFILES_ACTIVE=prod\.
- [ ] **DECISION PENDING**: Target hosting environment (Google Cloud Run vs AWS App Runner).

## Frontend
- [x] **READY**: Next.js App Router successfully compiles production SSG/SSR build.
- [x] **READY**: API client dynamically honors \NEXT_PUBLIC_API_BASE_URL\ instead of hardcoding localhost.
- [ ] **REQUIRES DEPLOYMENT-TIME CONFIGURATION**: Provisioning Vercel project and injecting environment variables.

## Database (Supabase)
- [x] **READY**: Flyway is configured to start from an empty production database and safely apply V1 through current migrations automatically on startup.
- [x] **READY**: Hibernate \ddl-auto\ explicitly disabled (\
one\/disabled) to prevent structural corruption.
- [ ] **REQUIRES DEPLOYMENT-TIME CONFIGURATION**: Injecting Supabase \DB_URL\ (Must use port 5432 Direct Connection or session-pooling, NOT transaction-pooling on 6543), \DB_USERNAME\, and \DB_PASSWORD\.

## Cloudinary
- [x] **READY**: Backend refuses to launch Cloudinary service if \CLOUDINARY_URL\ is missing.
- [x] **READY**: Robust SQL migration runner written, isolated behind a strict startup feature flag.
- [x] **READY**: Signed URL capabilities proven secure for private documents.
- [ ] **REQUIRES DEPLOYMENT-TIME CONFIGURATION**: Executing the production migration process strictly ordered as: BACKUP -> DRY RUN -> VERIFY -> ENABLE MIGRATION -> VERIFY DATABASE + CLOUDINARY -> KEEP LEGACY FILES -> ONLY THEN CONSIDER CLEANUP.

## Razorpay
- [x] **READY**: Webhook signature verification operates strictly based on the configured secret. Both application and code support Test and Live modes interchangeably.
- [ ] **REQUIRES DEPLOYMENT-TIME CONFIGURATION**: Generating Live production Razorpay Key ID, Key Secret, and Webhook Secret. No live payment operations should be performed until deployed.

## Email (Resend)
- [x] **READY**: Core workflows (Password Reset, Notifications) abstract safely between local logging and Resend API.
- [ ] **REQUIRES DEPLOYMENT-TIME CONFIGURATION**: Generating Resend API key and verifying the production domain.

## Security
- [x] **READY**: Cross-Origin Resource Sharing (CORS) enforces explicit allowed origins via \CORS_ALLOWED_ORIGINS\.
- [x] **READY**: Multi-tenant isolation verified; owners cannot modify cross-shop inventory or settings.
- [ ] **REQUIRES DEPLOYMENT-TIME CONFIGURATION**: A strong, rotated \JWT_SECRET\.

## Deployment
- [x] **NOT LOCALLY VALIDATED**: Dockerfile was audited and verified conceptually correct, but Docker Desktop was unavailable locally for physical container startup testing.
- [ ] **DECISION PENDING**: Docker container registry pipeline.
- [ ] **DECISION PENDING**: CI/CD GitHub Actions setup.
- [ ] **DECISION PENDING**: Post-deployment smoke testing scripts.
