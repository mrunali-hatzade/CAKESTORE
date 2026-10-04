package com.cakeplatform.api.modules.audit;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
    List<ActivityLog> findByShopIdOrderByTimestampDesc(Long shopId);
    List<ActivityLog> findByShopIdAndEntityTypeInOrderByTimestampDesc(Long shopId, java.util.Collection<String> entityTypes);
    List<ActivityLog> findTop50ByOrderByTimestampDesc();
    List<ActivityLog> findTop50ByEntityTypeInOrderByTimestampDesc(java.util.Collection<String> entityTypes);
}
