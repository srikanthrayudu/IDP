package com.example.backend.service;

import com.example.backend.model.Complaint;
import com.example.backend.model.ComplaintHistory;
import com.example.backend.model.User;
import com.example.backend.repository.ComplaintHistoryRepository;
import com.example.backend.repository.ComplaintRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.repository.WardRepository;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.exception.BadRequestException;
import com.example.backend.dto.MlPredictionRequest;
import com.example.backend.dto.MlPredictionResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.stream.Collectors;
import java.time.LocalDateTime;
import java.util.Set;
import java.time.Duration;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.Objects;

@Service
public class ComplaintService {

    private static final Logger logger = LoggerFactory.getLogger(ComplaintService.class);
    private static final Set<String> VALID_STATUSES = Set.of("PENDING", "RESOLVED");
    private static final Set<String> VALID_PROGRESS_STATUSES = Set.of("NEW", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "BLOCKED");
    private static final Set<String> VALID_PRIORITIES = Set.of("LOW", "MEDIUM", "HIGH");
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private static final Map<String, String> ML_TO_CANONICAL = Map.ofEntries(
            Map.entry("Street Lights and Electrical", "Streetlights"),
            Map.entry("Garbage and Solid Waste", "Solid Waste (Garbage) Related"),
            Map.entry("Roads and Potholes", "Road Maintenance(Engg)"),
            Map.entry("Town Planning and Infrastructure", "Electrical")
    );

    private static final int SLA_HIGH_HOURS = 24;
    private static final int SLA_MEDIUM_HOURS = 48;
    private static final int SLA_LOW_HOURS = 72;

    @Autowired
    private ComplaintRepository repository;
    
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ComplaintHistoryRepository historyRepository;

    @Autowired
    private WardRepository wardRepository;

    @Value("${ml.service.url}")
    private String mlServiceUrl;

    @Value("${ml.category.confidence.min:0.45}")
    private double categoryConfidenceMin;

    @Value("${ml.priority.confidence.min:0.55}")
    private double priorityConfidenceMin;

    @Transactional
    public Complaint submitComplaint(Complaint complaint, Long userId) {
        // Implement Kill-Switch / CEIR mechanism from Sanchar Saathi
        // If a device is marked as fraud in any existing complaint, block it from submitting new ones
        if (complaint.getDeviceId() != null && repository.existsByDeviceIdAndIsFraudTrue(complaint.getDeviceId())) {
            throw new com.example.backend.exception.BadRequestException("Device " + complaint.getDeviceId() + " is blacklisted due to fraudulent activity (CEIR Security Measure).");
        }

        // Validate complaint text
        if (complaint.getText() == null || complaint.getText().isBlank()) {
            throw new com.example.backend.exception.BadRequestException("Complaint text cannot be empty");
        }

        if (userId != null) {
            User user = userRepository.findById(userId).orElseThrow(
                    () -> new ResourceNotFoundException("User not found with id: " + userId)
            );
            complaint.setUser(user);
        }

        String wardNumber = complaint.getWardNumber();
        if (wardNumber != null) {
            complaint.setWardNumber(wardNumber.trim());
        }
        Integer wardNumberValue = parseWardNumber(complaint.getWardNumber());
        if (wardNumberValue != null) {
            complaint.setWardNumber(String.valueOf(wardNumberValue));
            if (wardRepository.count() > 0 && !wardRepository.existsByNumber(wardNumberValue)) {
                throw new BadRequestException("Ward number does not exist.");
            }
        } else if (complaint.getWardNumber() != null && !complaint.getWardNumber().isBlank()) {
            throw new BadRequestException("Ward number must be numeric.");
        }
        User requester = complaint.getUser();
        if (requester != null && "ROLE_WARD_MEMBER".equals(requester.getRole())) {
            Integer requesterWard = requester.getWardNumber();
            if (requesterWard == null) {
                throw new BadRequestException("Ward member is not assigned to a ward.");
            }
            complaint.setWardNumber(String.valueOf(requesterWard));
        }

        // Call python ML service to classify text with improved error handling and logging
        try {
            RestTemplate restTemplate = new RestTemplate();
            MlPredictionRequest request = new MlPredictionRequest(complaint.getText());
            ResponseEntity<MlPredictionResponse> response = restTemplate.postForEntity(mlServiceUrl, request, MlPredictionResponse.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                MlPredictionResponse body = response.getBody();
                Double confidence = body.getConfidence();
                String mlCategoryRaw = body.getCategory();
                String normalizedMlCategory = normalizeCategory(mlCategoryRaw);
                String category;
                // Apply confidence threshold
                if (confidence != null && confidence < categoryConfidenceMin) {
                    category = "UNCLASSIFIED";
                } else {
                    category = mapMlCategoryToDisplay(normalizedMlCategory);
                }

                String priority = normalizePriorityValue(body.getPriority());
                Double priorityConfidence = body.getPriorityConfidence();

                // Apply priority confidence threshold
                if (priority == null || priorityConfidence == null || priorityConfidence < priorityConfidenceMin) {
                    priority = fallbackPriority(complaint.getText(), category);
                }

                // Enforce high priority for safety-critical issues
                String forcedPriority = enforceHighPriority(complaint.getText(), category);
                if (forcedPriority != null) {
                    priority = forcedPriority;
                }

                // Set ML-derived fields
                complaint.setCategory(category == null || category.isBlank() ? "UNCLASSIFIED" : category);
                complaint.setPriority(priority == null || priority.isBlank() ? "MEDIUM" : priority);
                complaint.setShapInterpretations(safeJson(body.getShapValues() == null ? Map.of() : body.getShapValues()));
                complaint.setMlConfidence(confidence != null ? confidence : 0.0);
                complaint.setPriorityConfidence(priorityConfidence != null ? priorityConfidence : 0.0);
                complaint.setRankedCategories(safeJson(body.getRankedCategories() == null ? List.of() : body.getRankedCategories()));
                complaint.setMlModelUsed(body.getModelUsed() != null ? body.getModelUsed() : "unknown");

                // Log successful ML prediction
                if (isInfoLogEnabled()) {
                    logInfo("ML prediction successful for complaint: category={}, priority={}, confidence={}",
                            complaint.getCategory(), complaint.getPriority(), complaint.getMlConfidence());
                }
            } else {
                handleMlServiceUnavailable(complaint, "ML service returned unsuccessful status: " + response.getStatusCode());
            }
        } catch (RestClientException e) {
            handleMlServiceUnavailable(complaint, "ML service unreachable: " + e.getMessage());
        }

        String department = normalizeDepartment(complaint.getDepartment());
        if (department == null) {
            department = resolveDepartmentFromCategory(complaint.getCategory());
        }
        complaint.setDepartment(department);

        if (complaint.getStatus() == null || complaint.getStatus().isBlank()) {
            complaint.setStatus("PENDING");
        }
        if (complaint.getProgressStatus() == null || complaint.getProgressStatus().isBlank()) {
            complaint.setProgressStatus("NEW");
        }
        complaint.setWorkflowRole("ROOT");
        complaint.setParentComplaintId(null);
        complaint.setDependsOnComplaintId(null);

        Complaint saved = repository.save(complaint);
        List<WorkflowTaskPlan> workflowPlans = buildWorkflowPlans(saved);
        if (workflowPlans.isEmpty()) {
            autoAssignWorker(saved);
            return repository.save(saved);
        }

        List<Complaint> workflowTasks = createWorkflowTasks(saved, workflowPlans);
        saved.setWorkflowTasks(workflowTasks);
        return saved;
    }

    private void autoAssignWorker(Complaint complaint) {
        User worker = resolveWorkerForComplaint(complaint);
        if (worker == null) {
            return;
        }
        applyAssignment(complaint, worker, "Auto-assigned to " + worker.getUsername());
    }

    private List<Complaint> createWorkflowTasks(Complaint rootComplaint, List<WorkflowTaskPlan> plans) {
        Map<Integer, Complaint> createdByIndex = new HashMap<>();
        List<Complaint> createdTasks = new ArrayList<>();
        for (int index = 0; index < plans.size(); index++) {
            WorkflowTaskPlan plan = plans.get(index);
            Complaint task = new Complaint();
            task.setUser(rootComplaint.getUser());
            task.setText(rootComplaint.getText());
            task.setCategory(plan.title());
            task.setDepartment(plan.department());
            task.setPriority(rootComplaint.getPriority());
            task.setStatus("PENDING");
            task.setProgressStatus(plan.dependsOnIndex() == null ? "NEW" : "BLOCKED");
            task.setLocation(rootComplaint.getLocation());
            task.setLatitude(rootComplaint.getLatitude());
            task.setLongitude(rootComplaint.getLongitude());
            task.setImageUrl(rootComplaint.getImageUrl());
            task.setImageContentType(rootComplaint.getImageContentType());
            task.setImageSizeBytes(rootComplaint.getImageSizeBytes());
            task.setImageOriginalName(rootComplaint.getImageOriginalName());
            task.setBbmpZone(rootComplaint.getBbmpZone());
            task.setWardNumber(rootComplaint.getWardNumber());
            task.setDeviceId(rootComplaint.getDeviceId());
            task.setIsFraud(false);
            task.setShapInterpretations(rootComplaint.getShapInterpretations());
            task.setMlConfidence(rootComplaint.getMlConfidence());
            task.setPriorityConfidence(rootComplaint.getPriorityConfidence());
            task.setRankedCategories(rootComplaint.getRankedCategories());
            task.setMlModelUsed(rootComplaint.getMlModelUsed());
            task.setParentComplaintId(rootComplaint.getId());
            task.setDependsOnComplaintId(null);
            task.setWorkflowRole("TASK");

            if (plan.dependsOnIndex() != null) {
                Complaint dependency = createdByIndex.get(plan.dependsOnIndex());
                if (dependency != null) {
                    task.setDependsOnComplaintId(dependency.getId());
                }
            }

            Complaint savedTask = repository.save(task);
            autoAssignWorker(savedTask);
            savedTask = repository.save(savedTask);
            createdByIndex.put(index, savedTask);
            createdTasks.add(savedTask);
        }
        return createdTasks;
    }

    private List<WorkflowTaskPlan> buildWorkflowPlans(Complaint complaint) {
        String text = complaint.getText() == null ? "" : complaint.getText().toLowerCase();
        LinkedHashMap<String, WorkflowTaskPlan> plansByDepartment = new LinkedHashMap<>();

        if (containsAny(text, "tree", "fallen tree", "branch", "branches", "tree fallen", "tree fall")) {
            plansByDepartment.putIfAbsent("Forest", new WorkflowTaskPlan("Forest", "Remove fallen tree", "Clear the tree, debris, or branch blocking the area.", null));
        }
        if (containsAny(text, "wire", "live wire", "current", "electrical", "electric", "transformer", "short circuit", "spark", "sparks")) {
            plansByDepartment.putIfAbsent("Electricity", new WorkflowTaskPlan("Electricity", "Repair electrical line", "Fix the wire, restore power, and secure the electrical hazard.", null));
        }
        if (containsAny(text, "traffic", "congestion", "road blocked", "blocked road", "vehicle", "junction")) {
            plansByDepartment.putIfAbsent("Traffic", new WorkflowTaskPlan("Traffic", "Restore traffic flow", "Clear the route and restore safe vehicle movement.", null));
        }
        if (containsAny(text, "road", "pothole", "footpath", "street", "lane")) {
            plansByDepartment.putIfAbsent("Roads", new WorkflowTaskPlan("Roads", "Repair road obstruction", "Fix the road surface or remove the obstruction safely.", null));
        }
        if (containsAny(text, "drain", "sewage", "flood", "overflow")) {
            plansByDepartment.putIfAbsent("Drainage", new WorkflowTaskPlan("Drainage", "Clear drainage blockage", "Remove the blockage and restore drainage flow.", null));
        }
        if (containsAny(text, "water", "pipe", "leak", "supply")) {
            plansByDepartment.putIfAbsent("Water Supply", new WorkflowTaskPlan("Water Supply", "Restore water supply", "Stop the leakage and restore water service.", null));
        }
        if (containsAny(text, "garbage", "waste", "dumping", "bin")) {
            plansByDepartment.putIfAbsent("Sanitation", new WorkflowTaskPlan("Sanitation", "Clear sanitation issue", "Remove waste and sanitize the affected area.", null));
        }

        if (plansByDepartment.isEmpty()) {
            return List.of();
        }

        boolean forestBarrier = plansByDepartment.containsKey("Forest") && plansByDepartment.size() > 1;
        List<WorkflowTaskPlan> plans = new ArrayList<>();
        Integer forestIndex = null;

        for (WorkflowTaskPlan plan : plansByDepartment.values()) {
            if ("Forest".equals(plan.department())) {
                forestIndex = plans.size();
                plans.add(plan);
            }
        }

        for (WorkflowTaskPlan plan : plansByDepartment.values()) {
            if ("Forest".equals(plan.department())) {
                continue;
            }
            if (forestBarrier && ("Electricity".equals(plan.department()) || "Traffic".equals(plan.department()))) {
                plans.add(plan.withDependency(forestIndex));
            } else {
                plans.add(plan);
            }
        }

        if (plans.size() > 1 && !forestBarrier) {
            return plans.stream()
                    .map(plan -> plan.withDependency(null))
                    .collect(Collectors.toList());
        }

        return plans;
    }

    private boolean containsAny(String text, String... tokens) {
        for (String token : tokens) {
            if (text.contains(token)) {
                return true;
            }
        }
        return false;
    }

    private void hydrateWorkflowTasks(Complaint complaint) {
        if (complaint == null || complaint.getId() == null || !"ROOT".equalsIgnoreCase(complaint.getWorkflowRole())) {
            return;
        }
        complaint.setWorkflowTasks(repository.findByParentComplaintIdOrderByCreatedAtAsc(complaint.getId()));
    }

    private Complaint getComplaintOrThrow(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + id));
    }

    private void syncWorkflowRootState(Long rootComplaintId, String remark) {
        Complaint root = getComplaintOrThrow(rootComplaintId);
        if (!"ROOT".equalsIgnoreCase(root.getWorkflowRole())) {
            return;
        }

        List<Complaint> tasks = repository.findByParentComplaintIdOrderByCreatedAtAsc(rootComplaintId);
        if (tasks.isEmpty()) {
            return;
        }

        refreshTaskAvailability(tasks);

        List<Complaint> safeTasks = tasks.stream().filter(Objects::nonNull).toList();
        boolean allResolved = safeTasks.stream().allMatch(task -> "RESOLVED".equalsIgnoreCase(task.getStatus()));
        boolean anyInProgress = safeTasks.stream().anyMatch(task -> "IN_PROGRESS".equalsIgnoreCase(task.getProgressStatus()));
        boolean anyAssigned = safeTasks.stream().anyMatch(task -> "ASSIGNED".equalsIgnoreCase(task.getProgressStatus()));
        boolean anyBlocked = safeTasks.stream().anyMatch(task -> "BLOCKED".equalsIgnoreCase(task.getProgressStatus()));

        String oldStatus = root.getStatus();
        String oldProgress = root.getProgressStatus();

        if (allResolved) {
            root.setStatus("RESOLVED");
            root.setProgressStatus("COMPLETED");
            root.setLastProgressAt(LocalDateTime.now());
        } else if (anyInProgress) {
            root.setStatus("PENDING");
            root.setProgressStatus("IN_PROGRESS");
        } else if (anyAssigned) {
            root.setStatus("PENDING");
            root.setProgressStatus("ASSIGNED");
        } else if (anyBlocked) {
            root.setStatus("PENDING");
            root.setProgressStatus("BLOCKED");
        } else {
            root.setStatus("PENDING");
            root.setProgressStatus("NEW");
        }

        repository.save(root);
        hydrateWorkflowTasks(root);
        historyRepository.save(new ComplaintHistory(root, oldStatus, root.getStatus(), oldProgress, root.getProgressStatus(), remark));
    }

    private void refreshTaskAvailability(List<Complaint> tasks) {
        for (Complaint task : tasks) {
            if (task == null) {
                continue;
            }
            if ("RESOLVED".equalsIgnoreCase(task.getStatus())) {
                continue;
            }
            String oldProgress = task.getProgressStatus();
            String newProgress;
            if (hasBlockingDependency(task)) {
                newProgress = "BLOCKED";
            } else if (task.getAssignedWorkerId() != null) {
                newProgress = "ASSIGNED";
            } else {
                newProgress = "NEW";
            }
            if (!Objects.equals(oldProgress, newProgress)) {
                task.setProgressStatus(newProgress);
                repository.save(task);
            }
        }
    }

    private boolean hasBlockingDependency(Complaint complaint) {
        if (complaint.getDependsOnComplaintId() == null) {
            return false;
        }
        Complaint dependency = repository.findById(complaint.getDependsOnComplaintId()).orElse(null);
        return dependency != null && !"RESOLVED".equalsIgnoreCase(dependency.getStatus());
    }

    private void ensureDependenciesSatisfied(Complaint complaint) {
        if (hasBlockingDependency(complaint)) {
            throw new BadRequestException("This task is blocked until the dependent department completes its action.");
        }
    }

    private record WorkflowTaskPlan(String department, String title, String description, Integer dependsOnIndex) {
        WorkflowTaskPlan withDependency(Integer dependencyIndex) {
            return new WorkflowTaskPlan(department, title, description, dependencyIndex);
        }
    }

    private User resolveWorkerForComplaint(Complaint complaint) {
        Integer wardNumber = parseWardNumber(complaint.getWardNumber());
        List<User> candidates = new ArrayList<>();
        if (wardNumber != null) {
            candidates.addAll(userRepository.findByRoleAndWardNumber("ROLE_WORKER", wardNumber));
        }
        if (candidates.isEmpty()) {
            candidates = userRepository.findByRole("ROLE_WORKER");
        }
        if (candidates.isEmpty()) {
            return null;
        }
        String category = complaint.getCategory() == null ? "" : complaint.getCategory();
        String priority = normalizePriorityValue(complaint.getPriority());
        if (priority == null) {
            priority = "MEDIUM";
        }
        Map<Long, Long> openLoad = getOpenLoadCounts(candidates);

        User bestCandidate = null;
        int bestScore = Integer.MIN_VALUE;
        long bestLoad = Long.MAX_VALUE;

        for (User candidate : candidates) {
            if (candidate == null) {
                continue;
            }
            int score = 0;
            if (wardNumber != null && wardNumber.equals(candidate.getWardNumber())) {
                score += 3;
            }
            if (candidate.getCategoryExpertise() != null && category.equalsIgnoreCase(candidate.getCategoryExpertise())) {
                score += 2;
            }
            long load = openLoad.getOrDefault(candidate.getId(), 0L);
            double urgencyFactor = 72.0 / resolveSlaHours(priority);
            int loadPenalty = (int) Math.min(Math.round(load * urgencyFactor), 10);
            score -= loadPenalty;

            if (score > bestScore || (score == bestScore && load < bestLoad)) {
                bestScore = score;
                bestLoad = load;
                bestCandidate = candidate;
            }
        }

        return bestCandidate == null ? candidates.get(0) : bestCandidate;
    }

    private Map<Long, Long> getOpenLoadCounts(List<User> candidates) {
        List<Long> workerIds = candidates.stream()
                .filter(Objects::nonNull)
                .map(User::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
        if (workerIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, Long> loadMap = new HashMap<>();
        List<Map<String, Object>> rows = repository.countOpenByWorkerIds(workerIds);
        for (Map<String, Object> row : rows) {
            Object workerId = row.get("workerId");
            Object count = row.get("count");
            if (workerId instanceof Number && count instanceof Number) {
                loadMap.put(((Number) workerId).longValue(), ((Number) count).longValue());
            }
        }
        return loadMap;
    }

    private Integer parseWardNumber(String wardNumber) {
        if (wardNumber == null || wardNumber.isBlank()) {
            return null;
        }
        try {
            return Integer.parseInt(wardNumber.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String fallbackClassification(String text) {
        String lowerText = text.toLowerCase();
        if (lowerText.contains("wire") || lowerText.contains("electrical") || lowerText.contains("short circuit") || lowerText.contains("sparks") || lowerText.contains("spark") || lowerText.contains("electrocute") || lowerText.contains("gas leak") || lowerText.contains("transformer")) {
            return "Electrical";
        } else if (lowerText.contains("pothole") || lowerText.contains("road") || lowerText.contains("traffic")) {
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
        return "UNCLASSIFIED";
    }

    private String fallbackPriority(String text, String category) {
        if (isHighRisk(text, category)) {
            return "HIGH";
        }
        String lowerText = text.toLowerCase();
        if (lowerText.contains("garbage") || lowerText.contains("waste")) {
            return "MEDIUM";
        }
        return "LOW";
    }

    private String enforceHighPriority(String text, String category) {
        return isHighRisk(text, category) ? "HIGH" : null;
    }

    private boolean isHighRisk(String text, String category) {
        if (text != null) {
            String lowerText = text.toLowerCase();
            if (lowerText.contains("gas leak") || lowerText.contains("electrocute") || lowerText.contains("electrocution") || lowerText.contains("live wire") || lowerText.contains("wire") || lowerText.contains("short circuit") || lowerText.contains("sparks") || lowerText.contains("spark") || lowerText.contains("fire") || lowerText.contains("explosion") || lowerText.contains("collapsed") || lowerText.contains("collapse")) {
                return true;
            }
        }
        return category != null && category.toLowerCase().contains("electrical");
    }

    private String normalizePriorityValue(String priority) {
        if (priority == null || priority.isBlank()) {
            return null;
        }
        String normalized = priority.trim().toUpperCase();
        return VALID_PRIORITIES.contains(normalized) ? normalized : null;
    }

    private String normalizeCategory(String category) {
        if (category == null || category.isBlank()) {
            return category;
        }
        return "unclassified".equalsIgnoreCase(category.trim()) ? "UNCLASSIFIED" : category;
    }

    private String mapMlCategoryToDisplay(String mlCategory) {
        if (mlCategory == null) {
            return null;
        }
        String key = mlCategory.trim();
        return ML_TO_CANONICAL.getOrDefault(key, mlCategory);
    }

    private String normalizeDepartment(String department) {
        if (department == null || department.isBlank()) {
            return null;
        }
        return department.trim();
    }

    private String resolveDepartmentFromCategory(String category) {
        if (category == null || category.isBlank()) {
            return null;
        }
        String normalized = category.toLowerCase();
        if (normalized.contains("electrical") || normalized.contains("streetlight")) {
            return "Electricity";
        }
        if (normalized.contains("traffic")) {
            return "Traffic";
        }
        if (normalized.contains("road")) {
            return "Roads";
        }
        if (normalized.contains("forest")) {
            return "Forest";
        }
        if (normalized.contains("water")) {
            return "Water Supply";
        }
        if (normalized.contains("drain")) {
            return "Drainage";
        }
        if (normalized.contains("waste") || normalized.contains("garbage") || normalized.contains("sanitation")) {
            return "Sanitation";
        }
        return null;
    }


    private String safeJson(Object value) {
        if (value == null) {
            return "";
        }
        try {
            return OBJECT_MAPPER.writeValueAsString(value);
        } catch (Exception ex) {
            return String.valueOf(value);
        }
    }

    public List<Complaint> getAllComplaints() {
        return repository.findAll();
    }

    public List<Complaint> getUserComplaints(Long userId) {
        List<Complaint> complaints = repository.findByUserIdAndParentComplaintIdIsNull(userId);
        complaints.forEach(this::hydrateWorkflowTasks);
        return complaints;
    }

    public List<Complaint> getComplaintsForRequester(User requester) {
        if (requester == null) {
            return List.of();
        }
        if ("ROLE_ADMIN".equals(requester.getRole()) || "ROLE_CUSTOMER_CARE".equals(requester.getRole())) {
            List<Complaint> complaints = repository.findAll();
            complaints.stream()
                    .filter(complaint -> "ROOT".equalsIgnoreCase(complaint.getWorkflowRole()))
                    .forEach(this::hydrateWorkflowTasks);
            return complaints;
        }
        if ("ROLE_WARD_MEMBER".equals(requester.getRole())) {
            String wardNumber = resolveWardNumber(requester.getWardNumber());
            if (wardNumber == null) {
                return List.of();
            }
            List<Complaint> complaints = repository.findByWardNumberAndParentComplaintIdIsNull(wardNumber);
            complaints.forEach(this::hydrateWorkflowTasks);
            return complaints;
        }
        if ("ROLE_DEPARTMENT".equals(requester.getRole())) {
            String department = resolveDepartment(requester.getDepartment());
            if (department == null) {
                return List.of();
            }
            return repository.findByDepartment(department);
        }
        return List.of();
    }
    
    public Map<String, Object> getDashboardStats() {
        List<Map<String, Object>> byStatus = repository.countByStatus();
        long total = repository.count();
        long resolved = byStatus.stream()
                .filter(m -> "RESOLVED".equals(m.get("status")))
                .mapToLong(m -> ((Number) m.get("count")).longValue())
                .sum();
        long pending = Math.max(0, total - resolved);

        List<Map<String, Object>> byCategory = repository.countByCategory();
        Map<String, Long> categoryCount = byCategory.stream()
                .collect(Collectors.toMap(
                        m -> (String) m.get("category"),
                        m -> ((Number) m.get("count")).longValue()
                ));

        Double avgRating = repository.averageFeedbackRating();

        Map<String, Object> stats = new java.util.HashMap<>();
        stats.put("totalComplaints", total);
        stats.put("pendingComplaints", pending);
        stats.put("resolvedComplaints", resolved);
        stats.put("categoryCount", categoryCount);
        stats.put("byCategory", byCategory);
        stats.put("byStatus", byStatus);
        stats.put("byZone", repository.countByZone());
        stats.put("byPriority", repository.countByPriority());
        stats.put("byProgress", repository.countByProgressStatus());
        stats.put("byWorker", repository.countByAssignedWorker());
        stats.put("averageRating", avgRating == null ? 0.0 : avgRating);

        return stats;
    }

    public Map<String, Object> getDashboardStats(User requester) {
        if (requester == null || "ROLE_ADMIN".equals(requester.getRole()) || "ROLE_CUSTOMER_CARE".equals(requester.getRole())) {
            return getDashboardStats();
        }
        if ("ROLE_WARD_MEMBER".equals(requester.getRole())) {
            String wardNumber = resolveWardNumber(requester.getWardNumber());
            if (wardNumber == null) {
                return Map.of();
            }

            List<Map<String, Object>> byStatus = repository.countByStatusForWard(wardNumber);
            long total = repository.countByWardNumber(wardNumber);
            long resolved = byStatus.stream()
                    .filter(m -> "RESOLVED".equals(m.get("status")))
                    .mapToLong(m -> ((Number) m.get("count")).longValue())
                    .sum();
            long pending = Math.max(0, total - resolved);

            List<Map<String, Object>> byCategory = repository.countByCategoryForWard(wardNumber);
            Map<String, Long> categoryCount = byCategory.stream()
                    .collect(Collectors.toMap(
                            m -> (String) m.get("category"),
                            m -> ((Number) m.get("count")).longValue()
                    ));

            Double avgRating = repository.averageFeedbackRatingForWard(wardNumber);

            Map<String, Object> stats = new java.util.HashMap<>();
            stats.put("totalComplaints", total);
            stats.put("pendingComplaints", pending);
            stats.put("resolvedComplaints", resolved);
            stats.put("categoryCount", categoryCount);
            stats.put("byCategory", byCategory);
            stats.put("byStatus", byStatus);
            stats.put("byZone", repository.countByZoneForWard(wardNumber));
            stats.put("byPriority", repository.countByPriorityForWard(wardNumber));
            stats.put("byProgress", repository.countByProgressStatusForWard(wardNumber));
            stats.put("byWorker", repository.countByAssignedWorkerForWard(wardNumber));
            stats.put("averageRating", avgRating == null ? 0.0 : avgRating);

            return stats;
        }
        if ("ROLE_DEPARTMENT".equals(requester.getRole())) {
            String department = resolveDepartment(requester.getDepartment());
            if (department == null) {
                return Map.of();
            }

            List<Map<String, Object>> byStatus = repository.countByStatusForDepartment(department);
            long total = repository.countByDepartment(department);
            long resolved = byStatus.stream()
                    .filter(m -> "RESOLVED".equals(m.get("status")))
                    .mapToLong(m -> ((Number) m.get("count")).longValue())
                    .sum();
            long pending = Math.max(0, total - resolved);

            List<Map<String, Object>> byCategory = repository.countByCategoryForDepartment(department);
            Map<String, Long> categoryCount = byCategory.stream()
                    .collect(Collectors.toMap(
                            m -> (String) m.get("category"),
                            m -> ((Number) m.get("count")).longValue()
                    ));

            Double avgRating = repository.averageFeedbackRatingForDepartment(department);

            Map<String, Object> stats = new java.util.HashMap<>();
            stats.put("totalComplaints", total);
            stats.put("pendingComplaints", pending);
            stats.put("resolvedComplaints", resolved);
            stats.put("categoryCount", categoryCount);
            stats.put("byCategory", byCategory);
            stats.put("byStatus", byStatus);
            stats.put("byZone", repository.countByZoneForDepartment(department));
            stats.put("byPriority", repository.countByPriorityForDepartment(department));
            stats.put("byProgress", repository.countByProgressStatusForDepartment(department));
            stats.put("byWorker", repository.countByAssignedWorkerForDepartment(department));
            stats.put("averageRating", avgRating == null ? 0.0 : avgRating);

            return stats;
        }
        return Map.of();
    }

    public Map<String, Object> getMonitoringStats(User requester) {
        if (requester == null) {
            return Map.of();
        }

        List<Complaint> openComplaints;
        List<Complaint> resolvedComplaints;
        List<Map<String, Object>> feedbackByCategory;
        List<Map<String, Object>> feedbackByWorker;
        Double averageRating;

        if ("ROLE_ADMIN".equals(requester.getRole()) || "ROLE_CUSTOMER_CARE".equals(requester.getRole())) {
            openComplaints = repository.findByStatusNot("RESOLVED");
            resolvedComplaints = repository.findByStatus("RESOLVED");
            feedbackByCategory = repository.averageFeedbackByCategory();
            feedbackByWorker = repository.averageFeedbackByWorker();
            averageRating = repository.averageFeedbackRating();
        } else if ("ROLE_WARD_MEMBER".equals(requester.getRole())) {
            String wardNumber = resolveWardNumber(requester.getWardNumber());
            if (wardNumber == null) {
                return Map.of();
            }
            openComplaints = repository.findByStatusNotAndWardNumber("RESOLVED", wardNumber);
            resolvedComplaints = repository.findByStatusAndWardNumber("RESOLVED", wardNumber);
            feedbackByCategory = repository.averageFeedbackByCategoryForWard(wardNumber);
            feedbackByWorker = repository.averageFeedbackByWorkerForWard(wardNumber);
            averageRating = repository.averageFeedbackRatingForWard(wardNumber);
        } else if ("ROLE_WORKER".equals(requester.getRole())) {
            openComplaints = repository.findByStatusNotAndAssignedWorkerId("RESOLVED", requester.getId());
            resolvedComplaints = repository.findByStatusAndAssignedWorkerId("RESOLVED", requester.getId());
            feedbackByCategory = repository.averageFeedbackByCategoryForWorker(requester.getId());
            feedbackByWorker = List.of();
            averageRating = repository.averageFeedbackRatingForWorker(requester.getId());
        } else if ("ROLE_DEPARTMENT".equals(requester.getRole())) {
            String department = resolveDepartment(requester.getDepartment());
            if (department == null) {
                return Map.of();
            }
            openComplaints = repository.findByStatusNotAndDepartment("RESOLVED", department);
            resolvedComplaints = repository.findByStatusAndDepartment("RESOLVED", department);
            feedbackByCategory = repository.averageFeedbackByCategoryForDepartment(department);
            feedbackByWorker = repository.averageFeedbackByWorkerForDepartment(department);
            averageRating = repository.averageFeedbackRatingForDepartment(department);
        } else {
            return Map.of();
        }

        Map<String, Long> slaBreaches = computeSlaBreaches(openComplaints);
        double avgResolutionHours = computeAverageResolutionHours(resolvedComplaints);

        Map<String, Object> stats = new HashMap<>();
        stats.put("openCount", openComplaints.size());
        stats.put("resolvedCount", resolvedComplaints.size());
        stats.put("slaBreaches", slaBreaches);
        stats.put("avgResolutionHours", avgResolutionHours);
        stats.put("averageRating", averageRating == null ? 0.0 : averageRating);
        stats.put("feedbackByCategory", feedbackByCategory);
        stats.put("feedbackByWorker", feedbackByWorker);
        return stats;
    }

    private Map<String, Long> computeSlaBreaches(List<Complaint> openComplaints) {
        Map<String, Long> breaches = new HashMap<>();
        breaches.put("HIGH", 0L);
        breaches.put("MEDIUM", 0L);
        breaches.put("LOW", 0L);

        LocalDateTime now = LocalDateTime.now();
        for (Complaint complaint : openComplaints) {
            String priority = normalizePriorityValue(complaint.getPriority());
            if (priority == null) {
                priority = "MEDIUM";
            }
            int slaHours = resolveSlaHours(priority);
            LocalDateTime createdAt = complaint.getCreatedAt();
            if (createdAt != null && createdAt.plusHours(slaHours).isBefore(now)) {
                breaches.put(priority, breaches.getOrDefault(priority, 0L) + 1);
            }
        }
        return breaches;
    }

    private int resolveSlaHours(String priority) {
        if ("HIGH".equalsIgnoreCase(priority)) {
            return SLA_HIGH_HOURS;
        }
        if ("MEDIUM".equalsIgnoreCase(priority)) {
            return SLA_MEDIUM_HOURS;
        }
        return SLA_LOW_HOURS;
    }

    private double computeAverageResolutionHours(List<Complaint> resolvedComplaints) {
        if (resolvedComplaints.isEmpty()) {
            return 0.0;
        }
        double totalHours = 0.0;
        int count = 0;
        for (Complaint complaint : resolvedComplaints) {
            if (complaint.getCreatedAt() == null) {
                continue;
            }
            LocalDateTime resolvedAt = complaint.getLastProgressAt();
            if (resolvedAt == null) {
                resolvedAt = complaint.getCreatedAt();
            }
            Duration duration = Duration.between(complaint.getCreatedAt(), resolvedAt);
            totalHours += Math.max(0.0, duration.toMinutes() / 60.0);
            count += 1;
        }
        return count == 0 ? 0.0 : totalHours / count;
    }

    public Complaint updateStatus(Long id, String status) {
        Complaint c = getComplaintOrThrow(id);
        String normalizedStatus = normalizeStatus(status, VALID_STATUSES, "status");
        if ("RESOLVED".equals(normalizedStatus) && "ROOT".equalsIgnoreCase(c.getWorkflowRole())) {
            List<Complaint> tasks = repository.findByParentComplaintIdOrderByCreatedAtAsc(c.getId());
            boolean allResolved = tasks.isEmpty() || tasks.stream().allMatch(task -> "RESOLVED".equalsIgnoreCase(task.getStatus()));
            if (!allResolved) {
                throw new BadRequestException("Cannot resolve the complaint before all department tasks are complete.");
            }
        }
        String oldStatus = c.getStatus();
        String oldProgress = c.getProgressStatus();
        c.setStatus(normalizedStatus);
        if ("RESOLVED".equals(normalizedStatus)) {
            c.setProgressStatus("COMPLETED");
            c.setLastProgressAt(LocalDateTime.now());
        }
        Complaint saved = repository.save(c);

        ComplaintHistory history = new ComplaintHistory(saved, oldStatus, saved.getStatus(), oldProgress, saved.getProgressStatus(), "Status updated to " + saved.getStatus());
        historyRepository.save(history);
        if (saved.getParentComplaintId() != null) {
            syncWorkflowRootState(saved.getParentComplaintId(), "Task status updated to " + saved.getStatus());
        }

        return saved;
    }

    public Complaint updateStatus(Long id, String status, User requester) {
        Complaint c = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + id));
        assertWardAccess(requester, c);
        return updateStatus(id, status);
    }

    public Complaint markAsFraud(Long id, Boolean isFraud) {
        Complaint c = getComplaintOrThrow(id);
        c.setIsFraud(isFraud);
        return repository.save(c);
    }

    public Complaint markAsFraud(Long id, Boolean isFraud, User requester) {
        Complaint c = getComplaintOrThrow(id);
        assertWardAccess(requester, c);
        c.setIsFraud(isFraud);
        return repository.save(c);
    }

    public List<ComplaintHistory> getComplaintHistory(Long complaintId) {
        return historyRepository.findByComplaintIdOrderByChangedAtDesc(complaintId);
    }

    public List<ComplaintHistory> getComplaintHistory(Long complaintId, User requester) {
        Complaint complaint = repository.findById(complaintId)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + complaintId));
        assertWardAccess(requester, complaint);
        assertUserAccess(requester, complaint);
        assertWorkerAccess(requester, complaint);
        assertDepartmentAccess(requester, complaint);
        return historyRepository.findByComplaintIdOrderByChangedAtDesc(complaintId);
    }

    public List<Complaint> getWorkerComplaints(Long workerId) {
        List<Complaint> complaints = repository.findByAssignedWorkerId(workerId);
        complaints.forEach(this::hydrateWorkflowTasks);
        return complaints;
    }

    public Complaint updateProgress(Long id, String progressStatus, String remarks) {
        Complaint c = getComplaintOrThrow(id);
        String normalizedProgress = normalizeStatus(progressStatus, VALID_PROGRESS_STATUSES, "progressStatus");
        if (c.getAssignedWorkerId() == null) {
            throw new BadRequestException("Cannot update progress before assignment.");
        }
        ensureDependenciesSatisfied(c);
        String oldStatus = c.getStatus();
        String oldProgress = c.getProgressStatus();
        c.setProgressStatus(normalizedProgress);
        c.setLastProgressAt(LocalDateTime.now());
        c.setWorkerRemarks(remarks);
        if ("COMPLETED".equalsIgnoreCase(normalizedProgress)) {
            c.setStatus("RESOLVED");
        }
        Complaint saved = repository.save(c);
        historyRepository.save(new ComplaintHistory(saved, oldStatus, saved.getStatus(), oldProgress, saved.getProgressStatus(), "Worker update: " + normalizedProgress + (remarks == null ? "" : " - " + remarks)));
        if (saved.getParentComplaintId() != null) {
            syncWorkflowRootState(saved.getParentComplaintId(), "Task progressed to " + saved.getProgressStatus());
        }
        return saved;
    }

    public Complaint updateProgress(Long id, String progressStatus, String remarks, User requester) {
        Complaint c = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + id));
        assertWardAccess(requester, c);
        assertWorkerAccess(requester, c);
        return updateProgress(id, progressStatus, remarks);
    }

    public Complaint submitFeedback(Long id, Integer rating, String comment) {
        Complaint c = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + id));
        if (!"RESOLVED".equals(c.getStatus())) {
            throw new BadRequestException("Feedback can be submitted only after resolution.");
        }
        String oldStatus = c.getStatus();
        String oldProgress = c.getProgressStatus();
        c.setFeedbackRating(rating);
        c.setFeedbackComment(comment);
        c.setFeedbackAt(LocalDateTime.now());
        Complaint saved = repository.save(c);
        historyRepository.save(new ComplaintHistory(saved, oldStatus, saved.getStatus(), oldProgress, saved.getProgressStatus(), "User feedback submitted"));
        return saved;
    }

    public Complaint submitFeedback(Long id, Integer rating, String comment, User requester) {
        Complaint c = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + id));
        assertUserAccess(requester, c);
        return submitFeedback(id, rating, comment);
    }

    public Complaint assignWorker(Long id, Long workerId, String remarks) {
        if (workerId == null) {
            throw new BadRequestException("workerId is required.");
        }
        Complaint c = getComplaintOrThrow(id);
        if ("RESOLVED".equalsIgnoreCase(c.getStatus())) {
            throw new BadRequestException("Cannot assign a resolved complaint.");
        }
        User worker = userRepository.findById(workerId)
                .orElseThrow(() -> new ResourceNotFoundException("Worker not found with id: " + workerId));
        if (!"ROLE_WORKER".equals(worker.getRole())) {
            throw new BadRequestException("Selected user is not a worker.");
        }
        applyAssignment(c, worker, remarks == null || remarks.isBlank() ? "Assigned to " + worker.getUsername() : remarks);
        Complaint saved = repository.save(c);
        if (saved.getParentComplaintId() != null) {
            syncWorkflowRootState(saved.getParentComplaintId(), "Task assigned to " + saved.getAssignedWorkerName());
        }
        return saved;
    }

    public Complaint assignWorker(Long id, Long workerId, String remarks, User requester) {
        Complaint c = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + id));
        assertWardAccess(requester, c);
        if ("ROLE_WARD_MEMBER".equals(requester == null ? null : requester.getRole())) {
            Integer requesterWard = requester.getWardNumber();
            if (requesterWard == null) {
                throw new BadRequestException("Ward member is not assigned to a ward.");
            }
            User worker = userRepository.findById(workerId)
                    .orElseThrow(() -> new ResourceNotFoundException("Worker not found with id: " + workerId));
            if (worker.getWardNumber() == null || !requesterWard.equals(worker.getWardNumber())) {
                throw new BadRequestException("Selected worker is outside your ward.");
            }
        }
        return assignWorker(id, workerId, remarks);
    }

    public Complaint updatePriority(Long id, String priority, String remarks) {
        Complaint c = getComplaintOrThrow(id);
        String normalizedPriority = normalizeStatus(priority, VALID_PRIORITIES, "priority");
        String oldPriority = c.getPriority();
        c.setPriority(normalizedPriority);
        Complaint saved = repository.save(c);
        String note = "Priority updated" + (oldPriority == null ? "" : " from " + oldPriority) + " to " + normalizedPriority;
        if (remarks != null && !remarks.isBlank()) {
            note = note + " - " + remarks;
        }
        historyRepository.save(new ComplaintHistory(saved, saved.getStatus(), saved.getStatus(), c.getProgressStatus(), c.getProgressStatus(), note));
        if (saved.getParentComplaintId() != null) {
            syncWorkflowRootState(saved.getParentComplaintId(), note);
        }
        return saved;
    }

    public Complaint updatePriority(Long id, String priority, String remarks, User requester) {
        Complaint c = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + id));
        assertWardAccess(requester, c);
        return updatePriority(id, priority, remarks);
    }

    private void applyAssignment(Complaint complaint, User worker, String remarks) {
        complaint.setAssignedWorkerId(worker.getId());
        complaint.setAssignedWorkerName(worker.getUsername());
        complaint.setAssignedAt(LocalDateTime.now());
        String oldProgress = complaint.getProgressStatus();
        if (!"COMPLETED".equalsIgnoreCase(oldProgress)) {
            complaint.setProgressStatus(hasBlockingDependency(complaint) ? "BLOCKED" : "ASSIGNED");
        }
        historyRepository.save(new ComplaintHistory(complaint, complaint.getStatus(), complaint.getStatus(), oldProgress, complaint.getProgressStatus(), remarks));
    }

    private String normalizeStatus(String value, Set<String> allowed, String label) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException(label + " is required.");
        }
        String normalized = value.trim().toUpperCase();
        if (!allowed.contains(normalized)) {
            throw new BadRequestException("Invalid " + label + ": " + value);
        }
        return normalized;
    }

    private void assertWardAccess(User requester, Complaint complaint) {
        if (requester == null) {
            return;
        }
        if (!"ROLE_WARD_MEMBER".equals(requester.getRole())) {
            return;
        }
        String wardNumber = resolveWardNumber(requester.getWardNumber());
        String complaintWard = complaint.getWardNumber();
        if (wardNumber == null || complaintWard == null || complaintWard.isBlank()) {
            throw new BadRequestException("Complaint is outside your ward.");
        }
        if (!wardNumber.equals(complaintWard.trim())) {
            throw new BadRequestException("Complaint is outside your ward.");
        }
    }

    private void assertUserAccess(User requester, Complaint complaint) {
        if (requester == null || !"ROLE_USER".equals(requester.getRole())) {
            return;
        }
        if (complaint.getUser() == null || !requester.getId().equals(complaint.getUser().getId())) {
            throw new BadRequestException("Complaint is not owned by the current user.");
        }
    }

    private void assertWorkerAccess(User requester, Complaint complaint) {
        if (requester == null || !"ROLE_WORKER".equals(requester.getRole())) {
            return;
        }
        if (complaint.getAssignedWorkerId() == null || !complaint.getAssignedWorkerId().equals(requester.getId())) {
            throw new BadRequestException("Complaint is not assigned to the current worker.");
        }
    }

    private void assertDepartmentAccess(User requester, Complaint complaint) {
        if (requester == null || !"ROLE_DEPARTMENT".equals(requester.getRole())) {
            return;
        }
        String requesterDepartment = resolveDepartment(requester.getDepartment());
        String complaintDepartment = resolveDepartment(complaint.getDepartment());
        if (requesterDepartment == null || complaintDepartment == null || !requesterDepartment.equalsIgnoreCase(complaintDepartment)) {
            throw new BadRequestException("Complaint is outside your department.");
        }
    }

    private String resolveWardNumber(Integer wardNumber) {
        if (wardNumber == null) {
            return null;
        }
        return String.valueOf(wardNumber);
    }

    private String resolveDepartment(String department) {
        if (department == null || department.isBlank()) {
            return null;
        }
        return department.trim();
    }

    private boolean isInfoLogEnabled() {
        return logger.isInfoEnabled();
    }

    private void logInfo(String format, Object... arguments) {
        logger.info(format, arguments);
    }

    private void handleMlServiceUnavailable(Complaint complaint, String reason) {
        logger.warn("ML Service unavailable: {}", reason);
        String fallbackCategory = normalizeCategory(fallbackClassification(complaint.getText()));
        String fallbackPriority = fallbackPriority(complaint.getText(), fallbackCategory);
        String forcedPriority = enforceHighPriority(complaint.getText(), fallbackCategory);
        complaint.setCategory(fallbackCategory);
        complaint.setPriority(forcedPriority == null ? fallbackPriority : forcedPriority);
        complaint.setMlConfidence(0.0);
        complaint.setPriorityConfidence(0.0);
        complaint.setRankedCategories("[]");
        complaint.setMlModelUsed("fallback");
    }

    public int backfillMissingShapInterpretations() {
        List<Complaint> complaints = repository.findComplaintsMissingShapInterpretations();
        if (complaints.isEmpty()) {
            return 0;
        }

        int updatedCount = 0;
        RestTemplate restTemplate = new RestTemplate();

        for (Complaint complaint : complaints) {
            if (complaint.getText() == null || complaint.getText().isBlank()) {
                continue;
            }

            try {
                ResponseEntity<MlPredictionResponse> response = restTemplate.postForEntity(
                        mlServiceUrl,
                        new MlPredictionRequest(complaint.getText()),
                        MlPredictionResponse.class
                );

                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    MlPredictionResponse body = response.getBody();
                    if (body.getShapValues() != null && !body.getShapValues().isEmpty()) {
                        complaint.setShapInterpretations(safeJson(body.getShapValues()));
                        if (complaint.getRankedCategories() == null || complaint.getRankedCategories().isBlank()) {
                            complaint.setRankedCategories(safeJson(body.getRankedCategories() == null ? List.of() : body.getRankedCategories()));
                        }
                        if (complaint.getMlModelUsed() == null || complaint.getMlModelUsed().isBlank()) {
                            complaint.setMlModelUsed(body.getModelUsed() != null ? body.getModelUsed() : "unknown");
                        }
                        repository.save(complaint);
                        updatedCount += 1;
                    }
                }
            } catch (RestClientException ex) {
                logger.warn("Skipping SHAP backfill for complaint {}: {}", complaint.getId(), ex.getMessage());
            }
        }

        return updatedCount;
    }

    @Transactional
    public int normalizeStoredCategories() {
        return repository.normalizeUnclassifiedCategory();
    }
}
