import os

# 1. Update SubscriptionPlan.java
path = 'd:/PROJECTS/CAKE SAAs1/backend/src/main/java/com/cakeplatform/api/modules/subscription/SubscriptionPlan.java'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()
text = text.replace('private Boolean isActive = true;', 'private Boolean isActive = true;\n\n    @Column(name = "display_order")\n    private Integer displayOrder = 0;')
with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

# 2. Update SubscriptionPlanRepository.java
path = 'd:/PROJECTS/CAKE SAAs1/backend/src/main/java/com/cakeplatform/api/modules/subscription/SubscriptionPlanRepository.java'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()
text = text.replace('List<SubscriptionPlan> findByIsActiveTrue();', 'List<SubscriptionPlan> findByIsActiveTrueOrderByDisplayOrderAsc();\n    List<SubscriptionPlan> findAllByOrderByDisplayOrderAsc();')
with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

# 3. Add Reorder API to AdminSubscriptionPlanController.java
path = 'd:/PROJECTS/CAKE SAAs1/backend/src/main/java/com/cakeplatform/api/modules/admin/AdminSubscriptionPlanController.java'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()
# We need to add the endpoint
if 'public ResponseEntity<Map<String, Object>> updateDisplayOrder' not in text:
    api_method = """
    @PutMapping("/reorder")
    public ResponseEntity<Map<String, Object>> updateDisplayOrder(
            @RequestBody java.util.List<Long> planIds) {
        for (int i = 0; i < planIds.size(); i++) {
            Long id = planIds.get(i);
            subscriptionPlanRepository.findById(id).ifPresent(plan -> {
                plan.setDisplayOrder(planIds.indexOf(id));
                subscriptionPlanRepository.save(plan);
            });
        }
        return ResponseEntity.ok(java.util.Map.of("success", true));
    }
"""
    text = text.replace('public ResponseEntity<SubscriptionPlan> updatePlan(', api_method + '\n    public ResponseEntity<SubscriptionPlan> updatePlan(')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
