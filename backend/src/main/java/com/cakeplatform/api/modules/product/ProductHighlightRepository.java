package com.cakeplatform.api.modules.product;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductHighlightRepository extends JpaRepository<ProductHighlight, Long> {
    List<ProductHighlight> findByProductIdOrderByDisplayOrderAscCreatedAtAsc(Long productId);
    void deleteByProductId(Long productId);
}
