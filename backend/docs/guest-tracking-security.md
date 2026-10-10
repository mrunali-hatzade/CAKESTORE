# Guest Tracking Security

## Rate Limiting and Client IP Resolution
The Guest Tracking and Invoice Download endpoints (`/orders/{orderNumber}` and `/orders/{orderNumber}/invoice`) enforce a Tier 2 rate limit of **20 requests per minute**.
- **IP-Based Behavior:** Rate limits are tracked based strictly on the client's resolved IP address via `request.getRemoteAddr()`. The application does **not** manually parse `X-Forwarded-For` headers, successfully preventing trivial rate-limit spoofing by malicious clients.
- **Proxy Configuration Requirement:** If this application is deployed behind a reverse proxy or load balancer (e.g., Azure Container Apps ingress, NGINX), the underlying proxy must be trusted. You must configure Spring Boot (via `server.forward-headers-strategy: framework` in `application.yml` and configuring Tomcat's internal proxies) to securely resolve the real client IP. Failure to do so will result in all requests being rate-limited under the single proxy IP.

## Verification Requirements
- **Order Details & Invoice Access:** A guest request strictly requires both the `orderNumber` and the `trackPhone` (matching the customer's phone). It is impossible to enumerate orders via `orderNumber` alone.
- **Exception Masking:** Order non-existence correctly returns an HTTP 404 WITHOUT disclosing unexpected server errors as a 404 (preventing internal state leakage). However, the implementation currently relies on matching the exact exception message (`"Order not found or invalid order number"`). In the future, this should be refactored to use `ResourceNotFoundException`.

## Residual Risks
1. **Volumetric Abuse from Genuine IPs:** The IP-based rate limiting blocks simple, localized brute force or enumeration scripts. However, an attacker utilizing a distributed botnet with millions of genuine, unique IPs could still perform a slow-rate enumeration attack across the infrastructure without tripping the 20 req/min/IP limit.
2. **Weaker Guest Authentication:** The current guest verification model (Order Number + Phone Number) is inherently weaker than the established OTP/JWT flow. If an attacker discovers both the order number and the customer's phone number through external means, they can access the order details. If this poses an unacceptable business risk, a CAPTCHA or mandatory OTP should be introduced for all guest tracking.
