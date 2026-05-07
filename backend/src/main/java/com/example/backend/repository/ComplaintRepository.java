package com.example.backend.repository;

import com.example.backend.model.Complaint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public interface ComplaintRepository extends JpaRepository<Complaint, Long> {
    List<Complaint> findByUserId(Long userId);

    boolean existsByDeviceIdAndIsFraudTrue(String deviceId);

    @Query("SELECT c.category AS category, COUNT(c) AS count FROM Complaint c GROUP BY c.category")
    List<Map<String, Object>> countByCategory();

    @Query("SELECT c.status AS status, COUNT(c) AS count FROM Complaint c GROUP BY c.status")
    List<Map<String, Object>> countByStatus();

    @Query("SELECT c.bbmpZone AS zone, COUNT(c) AS count FROM Complaint c WHERE c.bbmpZone IS NOT NULL GROUP BY c.bbmpZone")
    List<Map<String, Object>> countByZone();
}
