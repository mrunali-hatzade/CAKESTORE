package com.cakeplatform.api.modules.location.repository;

import com.cakeplatform.api.modules.location.entity.LocationDistrict;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LocationDistrictRepository extends JpaRepository<LocationDistrict, Integer> {
    List<LocationDistrict> findByStateIdAndIsActiveTrueOrderByNameAsc(Integer stateId);
    Optional<LocationDistrict> findByStateIdAndNormalizedName(Integer stateId, String normalizedName);
    Optional<LocationDistrict> findByLgdCode(Integer lgdCode);
}
