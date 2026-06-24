package com.example.backend.controller;

import com.example.backend.model.Complaint;
import com.example.backend.model.ComplaintHistory;
import com.example.backend.service.ComplaintService;
import com.example.backend.dto.ComplaintAssignRequest;
import com.example.backend.dto.ComplaintPriorityUpdateRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.security.core.Authentication;
import com.example.backend.security.UserDetailsImpl;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.Set;
import java.util.Arrays;
import java.util.stream.Collectors;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import jakarta.validation.Valid;
import org.springframework.validation.annotation.Validated;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import com.example.backend.repository.UserRepository;

@RestController
@RequestMapping("/api/complaints")
@CrossOrigin(origins = "*") // Allow for React Dashboard integration
@Validated
public class ComplaintController {

    @Autowired
    private ComplaintService complaintService;

    @Autowired
    private UserRepository userRepository;

    @Value("${app.upload.image.max-bytes:5242880}")
    private long maxImageBytes;

    @Value("${app.upload.image.allowed-types:image/jpeg,image/png,image/webp}")
    private String allowedImageTypes;

    @Value("${app.upload.image.upload-dir:uploads}")
    private String uploadDir;

    @GetMapping("/{id}/history")
    @PreAuthorize("hasRole('ROLE_USER') or hasRole('ROLE_ADMIN') or hasRole('ROLE_WARD_MEMBER') or hasRole('ROLE_WORKER') or hasRole('ROLE_DEPARTMENT') or hasRole('ROLE_CUSTOMER_CARE')")
    public ResponseEntity<List<ComplaintHistory>> getComplaintHistory(@PathVariable Long id, Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(complaintService.getComplaintHistory(id, userRepository.findById(userDetails.getId()).orElse(null)));
    }

    @PostMapping
    @PreAuthorize("hasRole('ROLE_USER') or hasRole('ROLE_ADMIN') or hasRole('ROLE_WARD_MEMBER')")
    public ResponseEntity<Complaint> submitComplaint(@RequestBody Complaint complaint, Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Complaint saved = complaintService.submitComplaint(complaint, userDetails.getId());
        return ResponseEntity.ok(saved);
    }

    @GetMapping
    @PreAuthorize("hasRole('ROLE_ADMIN') or hasRole('ROLE_WARD_MEMBER') or hasRole('ROLE_DEPARTMENT') or hasRole('ROLE_CUSTOMER_CARE')") // Admins, Ward Members, Department officers, and Customer Care see scoped views
    public ResponseEntity<List<Complaint>> getAllComplaints(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(complaintService.getComplaintsForRequester(userRepository.findById(userDetails.getId()).orElse(null)));
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<List<Complaint>> getAllComplaintsForAdmin() {
        return ResponseEntity.ok(complaintService.getAllComplaints());
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('ROLE_USER') or hasRole('ROLE_ADMIN') or hasRole('ROLE_WARD_MEMBER')")
    public ResponseEntity<List<Complaint>> getMyComplaints(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(complaintService.getUserComplaints(userDetails.getId()));
    }

    @GetMapping("/dashboard/stats")
    @PreAuthorize("hasRole('ROLE_ADMIN') or hasRole('ROLE_WARD_MEMBER') or hasRole('ROLE_DEPARTMENT') or hasRole('ROLE_CUSTOMER_CARE')")
    public ResponseEntity<Map<String, Object>> getDashboardStats(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(complaintService.getDashboardStats(userRepository.findById(userDetails.getId()).orElse(null)));
    }

    @GetMapping("/dashboard/monitoring")
    @PreAuthorize("hasRole('ROLE_ADMIN') or hasRole('ROLE_WARD_MEMBER') or hasRole('ROLE_WORKER') or hasRole('ROLE_DEPARTMENT') or hasRole('ROLE_CUSTOMER_CARE')")
    public ResponseEntity<Map<String, Object>> getMonitoringStats(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(complaintService.getMonitoringStats(userRepository.findById(userDetails.getId()).orElse(null)));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ROLE_ADMIN') or hasRole('ROLE_WARD_MEMBER')") // Admins and Ward members can update status
    public ResponseEntity<Complaint> updateStatus(
            @PathVariable Long id,
            @NotBlank @Pattern(regexp = "(?i)PENDING|RESOLVED") @RequestParam String status,
            Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(complaintService.updateStatus(id, status, userRepository.findById(userDetails.getId()).orElse(null)));
    }

    @PutMapping("/{id}/assign")
    @PreAuthorize("hasRole('ROLE_ADMIN') or hasRole('ROLE_WARD_MEMBER')")
    public ResponseEntity<Complaint> assignWorker(@PathVariable Long id, @Valid @RequestBody ComplaintAssignRequest request, Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(complaintService.assignWorker(id, request.getWorkerId(), request.getRemarks(), userRepository.findById(userDetails.getId()).orElse(null)));
    }

    @PutMapping("/{id}/priority")
    @PreAuthorize("hasRole('ROLE_ADMIN') or hasRole('ROLE_WARD_MEMBER')")
    public ResponseEntity<Complaint> updatePriority(@PathVariable Long id, @Valid @RequestBody ComplaintPriorityUpdateRequest request, Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(complaintService.updatePriority(id, request.getPriority(), request.getRemarks(), userRepository.findById(userDetails.getId()).orElse(null)));
    }

    @PutMapping("/normalize-categories")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<Map<String, Object>> normalizeCategories() {
        int updated = complaintService.normalizeStoredCategories();
        return ResponseEntity.ok(Map.of("updated", updated));
    }

    @PutMapping("/{id}/fraud")
    @PreAuthorize("hasRole('ROLE_ADMIN') or hasRole('ROLE_WARD_MEMBER')")
    public ResponseEntity<Complaint> markAsFraud(@PathVariable Long id, @NotNull @RequestParam Boolean isFraud, Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(complaintService.markAsFraud(id, isFraud, userRepository.findById(userDetails.getId()).orElse(null)));
    }

    @PostMapping("/upload")
    @PreAuthorize("hasRole('ROLE_USER') or hasRole('ROLE_ADMIN') or hasRole('ROLE_WARD_MEMBER')")
    public ResponseEntity<Map<String, Object>> uploadImage(@RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File is empty"));
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Only image uploads are allowed"));
        }
        if (file.getSize() > maxImageBytes) {
            return ResponseEntity.badRequest().body(Map.of("error", "Image exceeds max size of " + maxImageBytes + " bytes"));
        }
        Set<String> allowedTypes = Arrays.stream(allowedImageTypes.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .collect(Collectors.toSet());
        if (!allowedTypes.isEmpty() && !allowedTypes.contains(contentType)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Unsupported image type"));
        }

        Path uploadPath = Paths.get(uploadDir);
        Files.createDirectories(uploadPath);

        String originalName = file.getOriginalFilename();
        String extension = resolveExtension(contentType, originalName);

        String filename = UUID.randomUUID() + extension;
        Path target = uploadPath.resolve(filename);
        Files.copy(file.getInputStream(), target);

        String url = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/uploads/")
                .path(filename)
                .toUriString();

        return ResponseEntity.ok(Map.of(
                "url", url,
                "contentType", contentType,
                "sizeBytes", file.getSize(),
                "originalName", originalName == null ? "" : originalName
        ));
    }

    private String resolveExtension(String contentType, String originalName) {
        if (originalName != null && originalName.contains(".")) {
            return originalName.substring(originalName.lastIndexOf('.'));
        }
        if ("image/jpeg".equals(contentType)) {
            return ".jpg";
        }
        if ("image/png".equals(contentType)) {
            return ".png";
        }
        if ("image/webp".equals(contentType)) {
            return ".webp";
        }
        return "";
    }

    @GetMapping("/assigned")
    @PreAuthorize("hasRole('ROLE_WORKER')")
    public ResponseEntity<List<Complaint>> getAssignedComplaints(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(complaintService.getWorkerComplaints(userDetails.getId()));
    }

    @PutMapping("/{id}/progress")
    @PreAuthorize("hasRole('ROLE_WORKER') or hasRole('ROLE_ADMIN') or hasRole('ROLE_WARD_MEMBER')")
    public ResponseEntity<Complaint> updateProgress(
            @PathVariable Long id,
            @NotBlank @Pattern(regexp = "(?i)NEW|ASSIGNED|IN_PROGRESS|COMPLETED") @RequestParam String progressStatus,
            @RequestParam(required = false) String remarks,
            Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(complaintService.updateProgress(id, progressStatus, remarks, userRepository.findById(userDetails.getId()).orElse(null)));
    }

    @PostMapping("/{id}/feedback")
    @PreAuthorize("hasRole('ROLE_USER')")
    public ResponseEntity<Complaint> submitFeedback(
            @PathVariable Long id,
            @NotNull @Min(1) @Max(5) @RequestParam Integer rating,
            @RequestParam(required = false) String comment,
            Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(complaintService.submitFeedback(id, rating, comment, userRepository.findById(userDetails.getId()).orElse(null)));
    }
}
