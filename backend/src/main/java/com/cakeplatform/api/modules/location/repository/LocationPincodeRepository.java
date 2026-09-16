package com.cakeplatform.api.modules.location.repository;

import com.cakeplatform.api.modules.location.entity.LocationPincode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LocationPincodeRepository extends JpaRepository<LocationPincode, String> {
    List<LocationPincode> findByDistrictIdAndIsActiveTrueOrderByPincodeAsc(Integer districtId);

    @Query("SELECT p FROM LocationPincode p JOIN FETCH p.district d JOIN FETCH d.state s WHERE p.pincode = :pincode AND p.isActive = true")
    Optional<LocationPincode> findByPincodeWithDistrictAndState(@Param("pincode") String pincode);

    @Query("SELECT COUNT(p) > 0 FROM LocationPincode p JOIN p.district d WHERE p.pincode = :pincode AND d.state.id = :stateId AND p.isActive = true")
    boolean existsByPincodeAndStateId(@Param("pincode") String pincode, @Param("stateId") Integer stateId);

    @Query("SELECT COUNT(p) > 0 FROM LocationPincode p WHERE p.pincode = :pincode AND p.district.id = :districtId AND p.isActive = true")
    boolean existsByPincodeAndDistrictId(@Param("pincode") String pincode, @Param("districtId") Integer districtId);

    @Query(value = "SELECT llp.pincode FROM location_locality_pincodes llp " +
                   "JOIN location_pincodes lp ON llp.pincode = lp.pincode " +
                   "WHERE llp.locality_id = :localityId AND lp.is_active = true " +
                   "ORDER BY llp.is_primary DESC, llp.pincode ASC", nativeQuery = true)
    List<String> findPincodesByLocalityId(@Param("localityId") Integer localityId);
}
