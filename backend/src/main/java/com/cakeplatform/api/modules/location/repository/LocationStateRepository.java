package com.cakeplatform.api.modules.location.repository;

import com.cakeplatform.api.modules.location.entity.LocationState;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LocationStateRepository extends JpaRepository<LocationState, Integer> {
    List<LocationState> findByCountryIdAndIsActiveTrueOrderByNameAsc(Integer countryId);
    List<LocationState> findByCountryCodeIgnoreCaseAndIsActiveTrueOrderByNameAsc(String countryCode);
    Optional<LocationState> findByNormalizedName(String normalizedName);
    Optional<LocationState> findByCodeIgnoreCase(String code);
    Optional<LocationState> findByLgdCode(Integer lgdCode);
}
