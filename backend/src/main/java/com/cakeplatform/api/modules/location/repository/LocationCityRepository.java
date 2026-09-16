package com.cakeplatform.api.modules.location.repository;

import com.cakeplatform.api.modules.location.entity.LocationCity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LocationCityRepository extends JpaRepository<LocationCity, Integer> {
    List<LocationCity> findByDistrictIdAndIsActiveTrueOrderByNameAsc(Integer districtId);
    Optional<LocationCity> findByDistrictIdAndNormalizedName(Integer districtId, String normalizedName);
    Optional<LocationCity> findByNormalizedName(String normalizedName);
}
