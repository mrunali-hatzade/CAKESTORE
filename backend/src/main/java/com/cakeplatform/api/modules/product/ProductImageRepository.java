package com.cakeplatform.api.modules.product;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductImageRepository extends JpaRepository<ProductImage, Long> {
    List<ProductImage> findByProductIdOrderByDisplayOrderAscCreatedAtAsc(Long productId);
    long countByProductId(Long productId);
    void deleteByProductId(Long productId);
}
