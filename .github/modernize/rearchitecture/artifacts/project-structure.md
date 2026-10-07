# Project Structure

## Classification

CakeStore is a full-stack web application repository. It contains a Spring Boot REST backend and a separately built Next.js frontend. It is not configured as a JavaScript monorepo/workspace: the backend and frontend have independent build manifests, and the root `package.json` has no scripts.

## Root layout

| Path | Role |
|---|---|
| `backend/` | Java 17 / Spring Boot API, persistence, security, scheduled tasks, file storage, and backend tests |
| `frontend_v2/` | Next.js App Router frontend, React components, API clients, and frontend container configuration |
| `api-tests/` | 17 HTTP request collections for manually exercising API areas |
| `ui-designs/` | UI design assets/documentation |
| `text files/` | Project data/reference files |
| `docker-compose.yml` | Root local/container orchestration |
| `.env.example` | Root environment-variable example |
| `package.json` / `package-lock.json` | Root-level TypeScript dependency; no root scripts or workspace declaration |

Generated and vendor paths such as `backend/target/`, `frontend_v2/node_modules/`, and `frontend_v2/.next/` are build outputs, not application source.

## Backend structure

The Java application has 303 Java source files under `backend/src/main/java/com/cakeplatform/api/`, with a feature-module organization and conventional web/service/data layers:

| Layer / role | Files | Notes |
|---|---:|---|
| REST controllers | 46 | Public, customer, owner, and admin API surfaces |
| Services | 37 | Business workflows and integration orchestration |
| Spring Data repositories | 46 | Persistence and query access |
| JPA entities | 47 | Persisted domain and operational records |

Package/module file counts:

| Module | Java files |
|---|---:|
| `shop` | 60 |
| `location` | 30 |
| `product` | 20 |
| `interaction` | 20 |
| `notification` | 20 |
| `storefront` | 19 |
| `communication` | 13 |
| `auth` | 13 |
| `chat` | 11 |
| `review` | 11 |
| `security` | 10 |
| `subscription` | 10 |
| `admin` | 9 |
| `payment` | 9 |
| `order` | 8 |
| `user` | 7 |
| `media` | 7 |
| `settings` | 6 |
| `audit` | 3 |
| `email` | 4 |
| `automation` | 1 |
| `common` | 1 |

Shared application concerns live in `config/`, `security/`, and `exception/`; feature modules contain their own controller, service, repository, DTO, and entity classes. The application entry point is `backend/src/main/java/com/cakeplatform/api/CakePlatformApplication.java`.

## Frontend structure

The Next.js App Router application has 37 `page.tsx` route entry files and 41 TSX files under `app/` (including layouts). The main source areas are:

- `app/`: public marketplace and information pages, authentication and checkout, dynamic storefront/order pages, owner dashboard, and admin console.
- `components/`: 83 reusable TSX components grouped under admin, checkout, customer, owner, and shared UI.
- `lib/`: 28 API, auth, service, constant, and utility files.
- `types/`: shared TypeScript contracts.

`frontend_v2/app/layout.tsx` is the root layout. The route tree includes public marketplace/catalogue flows, account recovery, customer checkout and tracking, owner operations, and admin operations.

## Entry points and runtime flow

- Backend: `CakePlatformApplication.main`; Spring component scanning discovers annotated REST controllers and services.
- HTTP API: controller classes map paths under `/api/...`; security is centralized in `security/SecurityConfig.java`.
- Scheduled work: `modules/automation/SystemAutomationsScheduler.java` enables scheduling and runs a daily KYC reminder task.
- Frontend: Next.js App Router pages, served on port 3001 by the package scripts.
- Browser-to-API: frontend `lib/api/client.ts` uses `NEXT_PUBLIC_API_URL` (defaults to the local API URL in source), JSON requests, and bearer-token authentication.
- Persistent data: PostgreSQL accessed through Spring Data JPA; Flyway migrations are in `backend/src/main/resources/db/migration/`.
- Realtime: backend chat/notification code includes WebSocket/STOMP support; the frontend includes STOMP and SockJS clients.

## Major functional areas

1. Identity, login, OTP verification, password recovery, JWT authentication, and account management.
2. Bakery/owner onboarding, shop profile and verification/KYC, storefront settings, and public storefront discovery.
3. Product catalogue, categories, variants, add-ons, ingredients/allergens, reviews, and gallery/media.
4. Customer orders, delivery slots, coupons, custom-cake requests, enquiries, and guest order tracking.
5. Subscription plans, owner subscriptions, payments, Razorpay webhooks, and payouts.
6. Owner and admin dashboards, analytics, shop management, settings, notifications, and broadcasts.
7. Customer/owner feedback, contact enquiries, owner-admin chat, email/SMS, and audit logging.
8. Canonical location reference data and location search.

## Configuration and build files

| File | Role |
|---|---|
| `backend/pom.xml` | Maven build, Java version, Spring Boot parent, direct dependencies, and packaging plugins |
| `backend/src/main/resources/application.yml` | Default Spring, database, Flyway/JPA, CORS, storage, payment, mail, and actuator settings |
| `backend/src/main/resources/application-prod.yml` | Production-profile external configuration and production-oriented defaults |
| `backend/src/main/resources/db/migration/V1__...sql` through `V40__...sql` | Ordered PostgreSQL schema/data migrations |
| `backend/src/main/java/com/cakeplatform/api/security/SecurityConfig.java` | Stateless JWT security, authorization allow-list, CORS, and security headers |
| `frontend_v2/package.json` | Next.js scripts and frontend dependencies |
| `frontend_v2/next.config.mjs` | Next configuration, standalone output, image host rules, and static generation timeout |
| `frontend_v2/tsconfig.json` | Strict TypeScript and Next.js module/path settings |
| `backend/Dockerfile`, `frontend_v2/Dockerfile`, `docker-compose.yml` | Container build and local orchestration inputs |

## Tests and evidence boundary

There are 50 Java files under `backend/src/test/` and 17 API `.http` request collections. No frontend unit/spec test files were found in the frontend source tree. This is a source-tree inventory, not a claim that all test cases pass or that production topology was validated.

