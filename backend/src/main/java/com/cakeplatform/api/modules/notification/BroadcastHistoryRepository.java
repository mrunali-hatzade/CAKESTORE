package com.cakeplatform.api.modules.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BroadcastHistoryRepository extends JpaRepository<BroadcastHistory, Long> {
    List<BroadcastHistory> findAllByOrderBySentAtDesc();
}
