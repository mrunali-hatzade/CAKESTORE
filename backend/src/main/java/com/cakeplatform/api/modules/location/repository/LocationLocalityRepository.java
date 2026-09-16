package com.cakeplatform.api.modules.location.repository;

import com.cakeplatform.api.modules.location.entity.LocationLocality;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LocationLocalityRepository extends JpaRepository<LocationLocality, Integer> {
    List<LocationLocality> findByCityIdAndIsActiveTrueOrderByNameAsc(Integer cityId);
    Optional<LocationLocality> findByCityIdAndNormalizedName(Integer cityId, String normalizedName);

    @Query(value = "SELECT l.* FROM location_localities l " +
                   "JOIN location_locality_pincodes llp ON l.id = llp.locality_id " +
                   "WHERE llp.pincode = :pincode AND l.is_active = true " +
                   "ORDER BY llp.is_primary DESC, l.name ASC", nativeQuery = true)
    List<LocationLocality> findByPincode(@Param("pincode") String pincode);
}
