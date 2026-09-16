package com.cakeplatform.api.modules.interaction;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CustomCakeRequestFieldValueRepository extends JpaRepository<CustomCakeRequestFieldValue, Long> {
    List<CustomCakeRequestFieldValue> findByRequestId(Long requestId);
    void deleteByRequestId(Long requestId);
}
