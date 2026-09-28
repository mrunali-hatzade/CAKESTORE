# Phase 4 Final Report: Owner Notifications & Chat Implementation

## Implementation Summary
Phase 4 has been successfully implemented, bringing in comprehensive chat capabilities between Owners and Admins, and introducing dynamic notification badges and popups to the Owner Dashboard. The existing underlying architecture, state machine, and customer storefront logic were preserved completely. 

---

### 1. File Modifications
**Backend Changes:**
- `NotificationRepository.java`: Added `@Query` for `countUnreadGroupedByType`
- `NotificationService.java`: Implemented `getUnreadSummary(Long userId)` which aggregates unread notifications by type.
- `NotificationController.java`: Added endpoint `GET /api/notifications/unread-summary`.

**Frontend Changes:**
- `Sidebar.tsx`: Implemented `useSWR` polling for `/api/notifications/unread-summary` and `/api/owner/chat/unread-count`. Applied badges next to Orders, Enquiries, Feedback, and the new Support / Chat tab.
- `Header.tsx`: Integrated the new `NotificationsDropdown` component to display the unified total unread count and render the popover list.
- `DashboardLayoutWrapper.tsx`: Integrated the `LoginSummaryPopup` inside the root div. 

---

### 2. Files Created
**Backend Entities & Data:**
- `V28__add_chat_tables.sql` (Flyway migration script for Chat DB tables)
- `Conversation.java` & `Message.java` (JPA Entities)
- `ConversationStatus.java` (Enum)
- `ConversationRepository.java` & `MessageRepository.java`
- `CreateMessageRequest.java`, `MessageResponse.java`, `ConversationResponse.java`

**Backend Services & Controllers:**
- `ChatService.java`
- `OwnerChatController.java` & `AdminChatController.java`

**Frontend Next.js Components & Pages:**
- `NotificationsDropdown.tsx`
- `LoginSummaryPopup.tsx`
- `app/dashboard/owner/chat/page.tsx`
- `app/dashboard/admin/chat/page.tsx`

---

### 3. Migration Details
A new Flyway script `V28__add_chat_tables.sql` was safely created, implementing:
- `conversations` table linking `owner_id` to the `users` table.
- `messages` table linking to conversations.
- Necessary indexes for speedy lookup (`idx_messages_conversation_id`, `idx_conversations_owner_id`).
- Constraint: Unique active conversation per owner (`idx_unique_active_conversation_per_owner`).

---

### 4. APIs & Endpoints
- **Existing Reused**: `GET /api/notifications`, `PATCH /api/notifications/{id}/read`, `PATCH /api/notifications/read-all`
- **New Notification API**: `GET /api/notifications/unread-summary`
- **Owner Chat APIs**:
  - `GET /api/owner/chat/conversations` (Retrieve existing thread)
  - `POST /api/owner/chat/conversations` (Create thread)
  - `GET /api/owner/chat/messages`
  - `POST /api/owner/chat/messages`
  - `PATCH /api/owner/chat/read`
  - `GET /api/owner/chat/unread-count`
- **Admin Chat APIs**:
  - `GET /api/admin/chat/conversations`
  - `GET /api/admin/chat/conversations/{ownerId}/messages`
  - `POST /api/admin/chat/conversations/{ownerId}/messages`
  - `PATCH /api/admin/chat/conversations/{ownerId}/read`
  - `GET /api/admin/chat/unread-count`

---

### 5. Notification Event Flow (Untouched)
- `NEW_ORDER`: Generated securely in `CustomerStorefrontService`.
- `CUSTOM_ORDER_REQUEST` / `NEW_ENQUIRY`: Sourced from `InteractionService`. 
- `NEW_FEEDBACK`: Dispatched by `ProductReviewService`. 

---

### 6. Sidebar Badge Behavior
- Using `SWR`, queries `/api/notifications/unread-summary` periodically. 
- Custom Orders / Enquiries badge merges both `CUSTOM_ORDER_REQUEST` and `NEW_ENQUIRY` together.
- Badges strictly hide on `0`. When `> 99`, display `99+`.

---

### 7. Login Popup Behavior
- Evaluates the current state via the backend API upon load. 
- If `totalUnread > 0` and `sessionStorage.getItem('hasSeenNotificationsPopup')` is `null`, it renders.
- Shows dynamic itemized summaries (Orders, Enquiries, Feedback).
- Clicks trigger `sessionStorage` persistence to suppress popup recurrence in the session tab.

---

### 8. Chat Behavior
- **Data Model:** REST based polling (per requirements).
- **Owner View:** Fetches current message stack for the owner session, automatically clearing unread admin messages. Owner `POST`s automatically trigger a new Thread if one wasn't present.
- **Admin View:** Splits UI by Active Owners. Clicking an Owner opens the respective Message stack and marks it as read. 

---

### 9. Security Verification
- **Tenant Isolation:** In `ChatService.java`, the Owner Context determines fetch targets. All lookups use `findByOwnerIdAndStatus(ownerId, ...)` where `ownerId` comes explicitly from the `@AuthenticationPrincipal`.
- **Admin Auth:** AdminChat endpoints strictly enforce `@PreAuthorize("hasRole('ADMIN')")`.
- No `ownerId` can be spoofed in API payloads.

---

### 10. QA & Compilation Results
- **Backend Tests:** PASSED (`Tests run: 432, Failures: 0, Errors: 0, Skipped: 0`).
- **TypeScript:** PASSED (All newly authored and modified components pass `--noEmit` cleanly).
- **ESLint:** PASSED (`✔ No ESLint warnings or errors`).
- **Production Functionality Check:** Existing storefront architecture was not touched or rewired, safely leaving all current features pristine. 
