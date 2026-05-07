package com.example.backend.service;

import com.example.backend.model.Complaint;
import com.example.backend.model.ComplaintHistory;
import com.example.backend.model.User;
import com.example.backend.repository.ComplaintHistoryRepository;
import com.example.backend.repository.ComplaintRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ComplaintService {

    @Autowired
    private ComplaintRepository repository;
    
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ComplaintHistoryRepository historyRepository;

    @Value("${ml.service.url}")
    private String mlServiceUrl;

    public Complaint submitComplaint(Complaint complaint, Long userId) {
        // Implement Kill-Switch / CEIR mechanism from Sanchar Saathi
        // If a device is marked as fraud in any existing complaint, block it from submitting new ones
        if (complaint.getDeviceId() != null && repository.existsByDeviceIdAndIsFraudTrue(complaint.getDeviceId())) {
            throw new com.example.backend.exception.BadRequestException("Device " + complaint.getDeviceId() + " is blacklisted due to fraudulent activity (CEIR Security Measure).");
        }

        if (userId != null) {
            User user = userRepository.findById(userId).orElse(null);
            complaint.setUser(user);
        }

        // Call python ML service to classify text
        try {
            RestTemplate restTemplate = new RestTemplate();
            Map<String, String> request = Map.of("text", complaint.getText());
            ResponseEntity<Map> response = restTemplate.postForEntity(mlServiceUrl, request, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                complaint.setCategory((String) body.getOrDefault("category", "UNCLASSIFIED"));
                complaint.setShapInterpretations(String.valueOf(body.get("shap_values")));
            }
        } catch (Exception e) {
            System.err.println("ML Service unreachable. Using heuristic fallback.");
            complaint.setCategory(fallbackClassification(complaint.getText()));
        }
        
        return repository.save(complaint);
    }
    
    private String fallbackClassification(String text) {
        String lowerText = text.toLowerCase();
        if (lowerText.contains("pothole") || lowerText.contains("road") || lowerText.contains("traffic")) {
            return "Roads & Traffic";
        } else if (lowerText.contains("garbage") || lowerText.contains("waste") || lowerText.contains("dustbin")) {
            return "Waste Management";
        } else if (lowerText.contains("water") || lowerText.contains("pipe") || lowerText.contains("leak")) {
            return "Water Supply";
        } else if (lowerText.contains("light") || lowerText.contains("street") || lowerText.contains("dark")) {
            return "Streetlights";
        } else if (lowerText.contains("drain") || lowerText.contains("sewage") || lowerText.contains("flood")) {
            return "Drainage";
        }
        return "Unclassified";
    }

    public List<Complaint> getAllComplaints() {
        return repository.findAll();
    }
    
    public List<Complaint> getUserComplaints(Long userId) {
        return repository.findByUserId(userId);
    }
    
    public Map<String, Object> getDashboardStats() {
        List<Map<String, Object>> byStatus = repository.countByStatus();
        long total = repository.count();
        long pending = byStatus.stream()
                .filter(m -> "PENDING".equals(m.get("status")))
                .mapToLong(m -> ((Number) m.get("count")).longValue())
                .sum();
        long resolved = byStatus.stream()
                .filter(m -> "RESOLVED".equals(m.get("status")))
                .mapToLong(m -> ((Number) m.get("count")).longValue())
                .sum();
                
        List<Map<String, Object>> byCategory = repository.countByCategory();
        Map<String, Long> categoryCount = byCategory.stream()
                .collect(Collectors.toMap(
                        m -> (String) m.get("category"),
                        m -> ((Number) m.get("count")).longValue()
                ));
        
        return Map.of(
            "totalComplaints", total,
            "pendingComplaints", pending,
            "resolvedComplaints", resolved,
            "categoryCount", categoryCount,
            "byCategory", byCategory,
            "byStatus", byStatus,
            "byZone", repository.countByZone()
        );
    }
    
    public Complaint updateStatus(Long id, String status) {
        Complaint c = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + id));
        String oldStatus = c.getStatus();
        c.setStatus(status);
        Complaint saved = repository.save(c);

        ComplaintHistory history = new ComplaintHistory(saved, oldStatus, status, "Status updated to " + status);
        historyRepository.save(history);

        return saved;
    }

    public Complaint markAsFraud(Long id, Boolean isFraud) {
        Complaint c = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + id));
        c.setIsFraud(isFraud);
        return repository.save(c);
    }

    public List<ComplaintHistory> getComplaintHistory(Long complaintId) {
        return historyRepository.findByComplaintIdOrderByChangedAtDesc(complaintId);
    }
}
