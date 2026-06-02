package com.example.backend.repository;

import com.example.backend.model.Complaint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public interface ComplaintRepository extends JpaRepository<Complaint, Long> {
    List<Complaint> findByUserId(Long userId);
    List<Complaint> findByAssignedWorkerId(Long assignedWorkerId);
    long countByAssignedWorkerId(Long assignedWorkerId);

    boolean existsByDeviceIdAndIsFraudTrue(String deviceId);

    @Query("SELECT c.category AS category, COUNT(c) AS count FROM Complaint c GROUP BY c.category")
    List<Map<String, Object>> countByCategory();

    @Query("SELECT c.status AS status, COUNT(c) AS count FROM Complaint c GROUP BY c.status")
    List<Map<String, Object>> countByStatus();

    @Query("SELECT c.bbmpZone AS zone, COUNT(c) AS count FROM Complaint c WHERE c.bbmpZone IS NOT NULL GROUP BY c.bbmpZone")
    List<Map<String, Object>> countByZone();

    @Query("SELECT c.priority AS priority, COUNT(c) AS count FROM Complaint c WHERE c.priority IS NOT NULL GROUP BY c.priority")
    List<Map<String, Object>> countByPriority();

    @Query("SELECT c.progressStatus AS progressStatus, COUNT(c) AS count FROM Complaint c WHERE c.progressStatus IS NOT NULL GROUP BY c.progressStatus")
    List<Map<String, Object>> countByProgressStatus();

    @Query("SELECT c.assignedWorkerName AS worker, COUNT(c) AS count FROM Complaint c WHERE c.assignedWorkerName IS NOT NULL GROUP BY c.assignedWorkerName")
    List<Map<String, Object>> countByAssignedWorker();

    @Query("SELECT AVG(c.feedbackRating) FROM Complaint c WHERE c.feedbackRating IS NOT NULL")
    Double averageFeedbackRating();

    @Query("SELECT c.category AS category, AVG(c.feedbackRating) AS avgRating, COUNT(c) AS count FROM Complaint c WHERE c.feedbackRating IS NOT NULL GROUP BY c.category")
    List<Map<String, Object>> averageFeedbackByCategory();

    @Query("SELECT c.assignedWorkerName AS worker, AVG(c.feedbackRating) AS avgRating, COUNT(c) AS count FROM Complaint c WHERE c.feedbackRating IS NOT NULL AND c.assignedWorkerName IS NOT NULL GROUP BY c.assignedWorkerName")
    List<Map<String, Object>> averageFeedbackByWorker();

    @Modifying
    @Query("UPDATE Complaint c SET c.category = 'UNCLASSIFIED' WHERE LOWER(c.category) = 'unclassified'")
    int normalizeUnclassifiedCategory();

    @Query("SELECT c.assignedWorkerId AS workerId, COUNT(c) AS count FROM Complaint c WHERE c.assignedWorkerId IN :workerIds AND c.status <> 'RESOLVED' GROUP BY c.assignedWorkerId")
    List<Map<String, Object>> countOpenByWorkerIds(@Param("workerIds") List<Long> workerIds);

    List<Complaint> findByStatusNot(String status);
    List<Complaint> findByStatus(String status);
    List<Complaint> findByStatusNotAndWardNumber(String status, String wardNumber);
    List<Complaint> findByStatusAndWardNumber(String status, String wardNumber);
    List<Complaint> findByStatusNotAndAssignedWorkerId(String status, Long assignedWorkerId);
    List<Complaint> findByStatusAndAssignedWorkerId(String status, Long assignedWorkerId);

    List<Complaint> findByWardNumber(String wardNumber);
    long countByWardNumber(String wardNumber);

    List<Complaint> findByDepartment(String department);
    long countByDepartment(String department);

    @Query("SELECT c.category AS category, COUNT(c) AS count FROM Complaint c WHERE c.wardNumber = :wardNumber GROUP BY c.category")
    List<Map<String, Object>> countByCategoryForWard(@Param("wardNumber") String wardNumber);

    @Query("SELECT c.category AS category, COUNT(c) AS count FROM Complaint c WHERE c.department = :department GROUP BY c.category")
    List<Map<String, Object>> countByCategoryForDepartment(@Param("department") String department);

    @Query("SELECT c.status AS status, COUNT(c) AS count FROM Complaint c WHERE c.wardNumber = :wardNumber GROUP BY c.status")
    List<Map<String, Object>> countByStatusForWard(@Param("wardNumber") String wardNumber);

    @Query("SELECT c.status AS status, COUNT(c) AS count FROM Complaint c WHERE c.department = :department GROUP BY c.status")
    List<Map<String, Object>> countByStatusForDepartment(@Param("department") String department);

    @Query("SELECT c.bbmpZone AS zone, COUNT(c) AS count FROM Complaint c WHERE c.bbmpZone IS NOT NULL AND c.wardNumber = :wardNumber GROUP BY c.bbmpZone")
    List<Map<String, Object>> countByZoneForWard(@Param("wardNumber") String wardNumber);

    @Query("SELECT c.bbmpZone AS zone, COUNT(c) AS count FROM Complaint c WHERE c.bbmpZone IS NOT NULL AND c.department = :department GROUP BY c.bbmpZone")
    List<Map<String, Object>> countByZoneForDepartment(@Param("department") String department);

    @Query("SELECT c.priority AS priority, COUNT(c) AS count FROM Complaint c WHERE c.priority IS NOT NULL AND c.wardNumber = :wardNumber GROUP BY c.priority")
    List<Map<String, Object>> countByPriorityForWard(@Param("wardNumber") String wardNumber);

    @Query("SELECT c.priority AS priority, COUNT(c) AS count FROM Complaint c WHERE c.priority IS NOT NULL AND c.department = :department GROUP BY c.priority")
    List<Map<String, Object>> countByPriorityForDepartment(@Param("department") String department);

    @Query("SELECT c.progressStatus AS progressStatus, COUNT(c) AS count FROM Complaint c WHERE c.progressStatus IS NOT NULL AND c.wardNumber = :wardNumber GROUP BY c.progressStatus")
    List<Map<String, Object>> countByProgressStatusForWard(@Param("wardNumber") String wardNumber);

    @Query("SELECT c.progressStatus AS progressStatus, COUNT(c) AS count FROM Complaint c WHERE c.progressStatus IS NOT NULL AND c.department = :department GROUP BY c.progressStatus")
    List<Map<String, Object>> countByProgressStatusForDepartment(@Param("department") String department);

    @Query("SELECT c.assignedWorkerName AS worker, COUNT(c) AS count FROM Complaint c WHERE c.assignedWorkerName IS NOT NULL AND c.wardNumber = :wardNumber GROUP BY c.assignedWorkerName")
    List<Map<String, Object>> countByAssignedWorkerForWard(@Param("wardNumber") String wardNumber);

    @Query("SELECT c.assignedWorkerName AS worker, COUNT(c) AS count FROM Complaint c WHERE c.assignedWorkerName IS NOT NULL AND c.department = :department GROUP BY c.assignedWorkerName")
    List<Map<String, Object>> countByAssignedWorkerForDepartment(@Param("department") String department);

    @Query("SELECT AVG(c.feedbackRating) FROM Complaint c WHERE c.feedbackRating IS NOT NULL AND c.wardNumber = :wardNumber")
    Double averageFeedbackRatingForWard(@Param("wardNumber") String wardNumber);

    @Query("SELECT AVG(c.feedbackRating) FROM Complaint c WHERE c.feedbackRating IS NOT NULL AND c.department = :department")
    Double averageFeedbackRatingForDepartment(@Param("department") String department);

    @Query("SELECT c.category AS category, AVG(c.feedbackRating) AS avgRating, COUNT(c) AS count FROM Complaint c WHERE c.feedbackRating IS NOT NULL AND c.wardNumber = :wardNumber GROUP BY c.category")
    List<Map<String, Object>> averageFeedbackByCategoryForWard(@Param("wardNumber") String wardNumber);

    @Query("SELECT c.category AS category, AVG(c.feedbackRating) AS avgRating, COUNT(c) AS count FROM Complaint c WHERE c.feedbackRating IS NOT NULL AND c.department = :department GROUP BY c.category")
    List<Map<String, Object>> averageFeedbackByCategoryForDepartment(@Param("department") String department);

    @Query("SELECT c.assignedWorkerName AS worker, AVG(c.feedbackRating) AS avgRating, COUNT(c) AS count FROM Complaint c WHERE c.feedbackRating IS NOT NULL AND c.assignedWorkerName IS NOT NULL AND c.wardNumber = :wardNumber GROUP BY c.assignedWorkerName")
    List<Map<String, Object>> averageFeedbackByWorkerForWard(@Param("wardNumber") String wardNumber);

    @Query("SELECT c.assignedWorkerName AS worker, AVG(c.feedbackRating) AS avgRating, COUNT(c) AS count FROM Complaint c WHERE c.feedbackRating IS NOT NULL AND c.assignedWorkerName IS NOT NULL AND c.department = :department GROUP BY c.assignedWorkerName")
    List<Map<String, Object>> averageFeedbackByWorkerForDepartment(@Param("department") String department);

    @Query("SELECT AVG(c.feedbackRating) FROM Complaint c WHERE c.feedbackRating IS NOT NULL AND c.assignedWorkerId = :workerId")
    Double averageFeedbackRatingForWorker(@Param("workerId") Long workerId);

    @Query("SELECT c.category AS category, AVG(c.feedbackRating) AS avgRating, COUNT(c) AS count FROM Complaint c WHERE c.feedbackRating IS NOT NULL AND c.assignedWorkerId = :workerId GROUP BY c.category")
    List<Map<String, Object>> averageFeedbackByCategoryForWorker(@Param("workerId") Long workerId);

    List<Complaint> findByStatusNotAndDepartment(String status, String department);
    List<Complaint> findByStatusAndDepartment(String status, String department);
}
