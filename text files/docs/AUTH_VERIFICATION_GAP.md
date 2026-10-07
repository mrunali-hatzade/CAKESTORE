# CakeStore Backend Authentication & Verification Gap Analysis

**Document Version:** 1.0  
**Date:** September 4, 2026  
**Target Project:** CakeStore SaaS (`D:\PROJECTS\CAKE SAAs1`)  
**Scope:** Verification & Authentication System Reality vs. UI Mockup Expectations

---

## 1. Executive Summary

During the visual review and architectural audit of `frontend_v2`, several design patterns assume multi-factor OTP verification (SMS OTP, Email verification links/codes, and step-by-step phone confirmations). 

However, a strict code-level audit of the backend repository (`D:\PROJECTS\CAKE SAAs1\backend`) and database migrations (`db/migration/V1__init_schema.sql` through `V8__coupons_and_discounts.sql`) proves that **no user-level OTP or email verification infrastructure exists**.

Attempting to implement client-side OTP inputs or countdown timers in `frontend_v2` without real backend support produces "theater verification" (fake security), which violates enterprise engineering standards. This document details the exact technical reality and provides actionable architecture recommendations for `frontend_v2`.

---

## 2. Detailed Backend Codebase Audit

### 2.1 Database Schema Inspection (Flyway Migrations V1 – V8)
Across all database migration files:
- **`users` table (`V1__init_schema.sql`)**:
  - Columns: `id`, `email`, `password_hash`, `role`, `status`, `created_at`, `updated_at`.
  - There are **no columns** for `is_email_verified`, `is_phone_verified`, `email_verification_token`, `phone_otp_code`, `otp_expires_at`, or `otp_attempts`.
- **No OTP tables**: There is no `user_otps`, `phone_verifications`, or `token_verifications` table in any migration script.

### 2.2 Backend Authentication Controllers & Services
- **`AuthController.java` (`/api/auth`)**:
  - `POST /api/auth/register`: Accepts `RegisterRequest` (with optional `verificationFile` `MultipartFile`). Directly hashes the password, creates the `User` and `Shop` entities in PostgreSQL, and persists them immediately.
  - `POST /api/auth/login`: Validates email and BCrypt-hashed password via `AuthenticationManager`. Immediately signs and returns a JWT Bearer token:
    ```json
    {
      "token": "eyJhbGci...",
      "role": "ROLE_SHOP_OWNER",
      "email": "owner@example.com",
      "shopId": 1
    }
    ```
  - `POST /api/auth/make-admin`: Utility endpoint to elevate roles.
- **`VerificationController.java` (`/api/verification`)**:
  - Contains `POST /api/verification/documents`.
  - **Purpose:** Handles business compliance document uploads (e.g., FSSAI registration certificate, GST document, government photo ID) to the server's upload directory (`/uploads/...`) and updates `ShopVerification` status.
  - **Does NOT** send or verify OTPs, SMS, or email verification codes.

### 2.3 External Communication Services
- **SMS Gateway:** Zero references to Twilio, Msg91, Fast2SMS, AWS SNS, or any SMS gateway client in `pom.xml` or source code.
- **Email Service:** Zero references to `spring-boot-starter-mail`, JavaMailSender, SendGrid, Amazon SES, or Mailgun. No email notification triggers exist in the backend.

---

## 3. The Gap: Visual Designs vs. Actual Capabilities

| Feature / UI Expectation | Visual Reference (frontend_v2 mockups) | Actual Backend Capability | Status / Gap |
| :--- | :--- | :--- | :--- |
| **Email Verification Code** | 6-digit OTP modal on registration | No endpoint, no email sender, no DB token | **Missing in Backend** |
| **Mobile SMS OTP** | 4/6-digit SMS verification on register/login | No SMS provider, no phone OTP endpoint | **Missing in Backend** |
| **Password Reset via OTP** | "Send OTP to mobile / email" | No forgot-password or reset-token endpoint | **Missing in Backend** |
| **Business Verification** | FSSAI document upload step | Supported via `/api/verification/documents` or directly in `POST /api/auth/register` | **Fully Supported** |
| **Owner Onboarding** | Multi-field registration (Address, Shop name, Phone) | Supported via `RegisterRequest` | **Fully Supported** |
| **JWT Authentication** | Bearer token stored in storage/cookies | Supported via `/api/auth/login` | **Fully Supported** |

---

## 4. Architectural Directives for Frontend V2

To ensure production integrity without modifying the backend or breaking the existing working app:

1. **NO "Fake" OTP Inputs:**
   `frontend_v2` must **never** render OTP inputs that accept arbitrary digits or simulate verification using `setTimeout()`. Fake OTP screens deceive users and break when legitimate production validation is introduced.
2. **Streamlined Direct Registration:**
   The registration flow in `frontend_v2` must submit all user and business parameters directly to `POST /api/auth/register` in a single well-structured multi-step or tabbed form.
3. **Seamless Post-Registration Login:**
   Upon successful `200/201` response from `/api/auth/register`, the frontend must immediately log the user in via `/api/auth/login` or prompt them to enter their credentials on `/login`, acquiring the real JWT token.
4. **Document Verification Display:**
   FSSAI and identity verification documents submitted during registration or via Owner Settings should reflect real database statuses (`PENDING`, `VERIFIED`, `REJECTED`) retrieved from the backend shop profile APIs.

---

## 5. Future Backend Roadmap (When Backend Changes Are Permitted)

When the project initiates backend feature additions in a subsequent phase, the following enhancements should be implemented:
1. Add `spring-boot-starter-mail` or integrate an SMS provider (Msg91 / Twilio).
2. Create Flyway migration `V9__user_verification_tokens.sql` with columns `token_hash`, `channel` (SMS/EMAIL), `expires_at`, `verified_at`.
3. Add endpoints:
   - `POST /api/auth/otp/send`
   - `POST /api/auth/otp/verify`
   - `POST /api/auth/password-reset/request`
   - `POST /api/auth/password-reset/confirm`
