import sys

# 1. Update Service
service_path = 'd:/PROJECTS/CAKE SAAs1/backend/src/main/java/com/cakeplatform/api/modules/notification/AdminNotificationService.java'
with open(service_path, 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    "public List<AdminNotification> getNotificationsForAdmin(",
    "public org.springframework.data.domain.Page<AdminNotification> getNotificationsForAdmin("
)
text = text.replace(
    "String search) {",
    "String search,\n            org.springframework.data.domain.Pageable pageable) {"
)
text = text.replace(
    "isRead,\n                search\n        );",
    "isRead,\n                search,\n                pageable\n        );"
)

with open(service_path, 'w', encoding='utf-8') as f:
    f.write(text)

# 2. Update Controller
controller_path = 'd:/PROJECTS/CAKE SAAs1/backend/src/main/java/com/cakeplatform/api/modules/notification/controller/AdminNotificationController.java'
with open(controller_path, 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    "public ResponseEntity<List<AdminNotification>> getNotifications(",
    "public ResponseEntity<org.springframework.data.domain.Page<AdminNotification>> getNotifications("
)
text = text.replace(
    "@RequestParam(required = false) String search) {",
    "@RequestParam(required = false) String search,\n            @RequestParam(defaultValue = \"0\") int page,\n            @RequestParam(defaultValue = \"20\") int size) {"
)
text = text.replace(
    "List<AdminNotification> notifications = adminNotificationService.getNotificationsForAdmin(\n                userDetails.getId(), category, isRead, search);",
    "org.springframework.data.domain.Page<AdminNotification> notifications = adminNotificationService.getNotificationsForAdmin(\n                userDetails.getId(), category, isRead, search, org.springframework.data.domain.PageRequest.of(page, size, org.springframework.data.domain.Sort.by(\"createdAt\").descending()));"
)

with open(controller_path, 'w', encoding='utf-8') as f:
    f.write(text)
