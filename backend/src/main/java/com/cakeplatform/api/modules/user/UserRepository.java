package com.cakeplatform.api.modules.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByEmailIgnoreCase(String email);
    Optional<User> findByMobile(String mobile);
    boolean existsByEmailIgnoreCase(String email);
    boolean existsByMobile(String mobile);
    
    java.util.List<User> findByRole(UserRole role);
    
    long countByCreatedAtGreaterThanEqual(java.time.LocalDateTime startOfDay);
}
