# Technology Stack

This inventory records declared/current technologies from the repository manifests and source configuration. It does not propose a target stack.

## Languages and runtimes

| Area | Technology | Declared requirement |
|---|---|---|
| Backend | Java | Java 17 (`backend/pom.xml`) |
| Backend framework | Spring Boot | 3.3.2 |
| Frontend | TypeScript / JavaScript | Frontend `typescript` dependency `^5`; strict TypeScript is enabled |
| Frontend runtime/framework | Node.js / Next.js / React | Next.js 14.2.5; React and React DOM `^18.3.1`; no Node `engines` constraint is declared |
| Root package | TypeScript | Root `package.json` declares TypeScript `^7.0.2`, separate from the frontend package's TypeScript `^5` |
| Database | PostgreSQL | Driver declared; server version is not pinned in the application manifest |

## Backend dependencies

### Spring Boot-managed dependencies

The following are declared without explicit versions and are managed through the Spring Boot 3.3.2 parent:

- `spring-boot-starter-web`
- `spring-boot-starter-data-jpa`
- `spring-boot-starter-security`
- `spring-boot-starter-validation`
- `spring-boot-starter-websocket`
- `spring-boot-starter-mail`
- `spring-boot-starter-actuator`
- `spring-boot-starter-cache`
- `spring-boot-starter-test` (test scope)
- `spring-security-test` (test scope)
- `org.postgresql:postgresql` (runtime scope)
- `org.flywaydb:flyway-core`
- `org.flywaydb:flyway-database-postgresql`
- `org.projectlombok:lombok` (optional)
- `io.micrometer:micrometer-registry-prometheus`

### Explicitly versioned dependencies

| Dependency | Version | Use indicated by project |
|---|---:|---|
| `com.twilio.sdk:twilio` | 9.14.1 | SMS integration |
| `io.jsonwebtoken:jjwt-api`, `jjwt-impl`, `jjwt-jackson` | 0.12.6 | JWT handling |
| `com.github.librepdf:openpdf` | 1.3.32 | PDF generation |
| `com.bucket4j:bucket4j-core` | 8.9.0 | Rate limiting |
| `com.razorpay:razorpay-java` | 1.4.6 | Payment integration |
| `com.cloudinary:cloudinary-http44` | 1.36.0 | Media integration |
| `com.azure:azure-storage-blob` | 12.25.1 | Azure Blob Storage |
| `com.azure:azure-identity` | 1.12.0 | Azure identity/authentication |
| `net.logstash.logback:logstash-logback-encoder` | 7.4 | Structured logging |

The Maven parent also supplies plugin/dependency version management. PostgreSQL, Flyway, Spring, Lombok, and Micrometer versions are not independently pinned at each dependency declaration in this POM.

## Frontend dependencies

### Runtime dependencies

| Package | Declared version |
|---|---:|
| `next` | 14.2.5 |
| `react`, `react-dom` | ^18.3.1 |
| `@stomp/stompjs` | ^7.3.0 |
| `sockjs-client` | ^1.6.1 |
| `recharts` | ^2.12.7 |
| `lucide-react` | ^0.469.0 |
| `clsx` | ^2.1.1 |
| `tailwind-merge` | ^2.5.5 |
| `es-toolkit` | ^1.52.0 |

### Development dependencies

`typescript ^5`, `eslint ^8`, `eslint-config-next 14.2.5`, `tailwindcss ^3.4.17`, `postcss ^8.4.49`, `autoprefixer ^10.4.20`, and React/Node type packages are declared in `frontend_v2/package.json`.

## Runtime and integration configuration

- Persistence is PostgreSQL with Spring Data JPA/Hibernate; schema evolution is managed by Flyway. Hibernate `ddl-auto` is configured to validate rather than generate the schema.
- The default application configuration contains local-development fallbacks for database connection settings and a fallback JWT signing key. The production profile instead expects the JWT secret and database credentials from environment configuration. Ensure production uses the production profile and secret provisioning as intended.
- Storage can be selected through `APP_STORAGE_PROVIDER`; source configuration defaults to local storage and the production profile defaults to Azure Blob. Azure account/container identifiers are external configuration.
- Payment integration is Razorpay; email is configured through Spring Mail/Resend settings; SMS uses Twilio.
- Observability uses Spring Actuator, Micrometer Prometheus registry, and Logstash Logback encoding. The production profile exposes fewer actuator endpoints than the default profile.
- WebSocket support is used for realtime chat/notification surfaces.
- Next.js is configured for standalone output and runs on port 3001 in the declared scripts. The frontend backend URL is controlled by `NEXT_PUBLIC_API_URL`.

## Build and test tooling

- Backend: Maven, Spring Boot Maven plugin, Flyway Maven plugin.
- Frontend: npm scripts for `next dev`, `next build`, and `next start`; `next lint` is declared as the lint script.
- Containerization: backend and frontend Dockerfiles plus a root Compose file.
- Backend tests: Spring Boot test and Spring Security test dependencies; 50 Java test source files were present at analysis time.
- API request collections: 17 `.http` files under `api-tests/`.
- Frontend test runner: no frontend test/spec files or test script were found in the package manifest/source tree.

## Version and compatibility observations

- The root package and frontend package declare different TypeScript major tracks (`^7.0.2` and `^5` respectively); they are separate package manifests, and the root is not configured as a workspace.
- The frontend package does not declare a supported Node.js engine range.
- The Java runtime is pinned to 17, while the database server version is not pinned by the source manifests.
- No explicit deprecated API usage was established by this manifest/config inventory. Dependency support/EOL status is not inferred from version numbers alone.

