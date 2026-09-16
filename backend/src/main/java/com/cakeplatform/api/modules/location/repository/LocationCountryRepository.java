package com.cakeplatform.api.modules.location.repository;

import com.cakeplatform.api.modules.location.entity.LocationCountry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LocationCountryRepository extends JpaRepository<LocationCountry, Integer> {
    List<LocationCountry> findByIsActiveTrueOrderByNameAsc();
    Optional<LocationCountry> findByCodeIgnoreCase(String code);
    Optional<LocationCountry> findByNameIgnoreCase(String name);
}
