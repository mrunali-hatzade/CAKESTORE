# Production Environment Variable Contract

This document specifies the required and optional environment variables necessary to deploy the CakeStore application in a production environment.

## Frontend (.env.production)

| Variable | Requirement | Type | Description |
|---|---|---|---|
| \NEXT_PUBLIC_API_BASE_URL\ | **MANDATORY** | Public | The base URL of the deployed Spring Boot backend. Used for API requests and rewrites. Example: \https://api.cakestore.com\ |

## Backend (Spring Boot Environment Variables)

### Database (Supabase PostgreSQL)
| Variable | Requirement | Type | Description |
|---|---|---|---|
| \DB_URL\ | **MANDATORY** | Secret | PostgreSQL connection string. **IMPORTANT**: Flyway requires a direct connection (port 5432) or session-pooled connection to perform schema migrations safely. Do not use Supabase's transaction pooler (port 6543 transaction mode) for the primary JDBC URL unless Spring Boot/Flyway is explicitly configured to separate migration and runtime data sources. |
| \DB_USERNAME\ | **MANDATORY** | Secret | PostgreSQL database user. |
| \DB_PASSWORD\ | **MANDATORY** | Secret | PostgreSQL database password. |
| \DB_POOL_MAX_SIZE\ | Optional | Public | Maximum Hikari connection pool size. Default: 20 |

### Security & Authentication
| Variable | Requirement | Type | Description |
|---|---|---|---|
| \JWT_SECRET\ | **MANDATORY** | Secret | A strong, randomly generated 256-bit+ secret key used for signing JWT tokens. |
| \CORS_ALLOWED_ORIGINS\ | **MANDATORY** | Public | Comma-separated list of allowed frontend origins. Example: \https://www.cakestore.com,https://admin.cakestore.com\ |

### Payments (Razorpay)
| Variable | Requirement | Type | Description |
|---|---|---|---|
| \RAZORPAY_KEY_ID\ | **MANDATORY** | Public | Razorpay Key ID (Live mode for production, Test mode for development). |
| \RAZORPAY_KEY_SECRET\ | **MANDATORY** | Secret | Razorpay Key Secret (Live mode for production). |
| \RAZORPAY_WEBHOOK_SECRET\ | **MANDATORY** | Secret | The secret used to cryptographically verify Razorpay webhooks. |

### Media (Cloudinary)
| Variable | Requirement | Type | Description |
|---|---|---|---|
| \pp.storage.provider\ | **MANDATORY** | Public | Must be explicitly set to \cloudinary\ for production. |
| \CLOUDINARY_URL\ | **MANDATORY** | Secret | Cloudinary connection string. Example: \cloudinary://API_KEY:API_SECRET@CLOUD_NAME\ |

### Email (Resend)
| Variable | Requirement | Type | Description |
|---|---|---|---|
| \RESEND_API_KEY\ | **MANDATORY** | Secret | API key for the Resend email service. |

### Application 
| Variable | Requirement | Type | Description |
|---|---|---|---|
| \SPRING_PROFILES_ACTIVE\ | **MANDATORY** | Public | Must be set to \prod\. |

> **IMPORTANT**: NEVER commit actual secrets to source control. Use your hosting provider's Secret Manager or secure environment variables settings.
