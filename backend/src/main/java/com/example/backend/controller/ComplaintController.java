package com.example.backend.controller;

import com.example.backend.model.Complaint;
import com.example.backend.model.ComplaintHistory;
import com.example.backend.service.ComplaintService;
import org.springframework.beans.factory.annotation.Autowired;
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
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api/complaints")
@CrossOrigin(origins = "*") // Allow for React Dashboard integration
public class ComplaintController {

    @Autowired
    private ComplaintService complaintService;

    @GetMapping("/{id}/history")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN') or hasRole('WARD_MEMBER')")
    public ResponseEntity<List<ComplaintHistory>> getComplaintHistory(@PathVariable Long id) {
        return ResponseEntity.ok(complaintService.getComplaintHistory(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN') or hasRole('WARD_MEMBER')")
    public ResponseEntity<Complaint> submitComplaint(@RequestBody Complaint complaint, Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Complaint saved = complaintService.submitComplaint(complaint, userDetails.getId());
        return ResponseEntity.ok(saved);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('WARD_MEMBER')") // Admins and Ward Members see everything
    public ResponseEntity<List<Complaint>> getAllComplaints() {
        return ResponseEntity.ok(complaintService.getAllComplaints());
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN') or hasRole('WARD_MEMBER')")
    public ResponseEntity<List<Complaint>> getMyComplaints(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(complaintService.getUserComplaints(userDetails.getId()));
    }
    
    @GetMapping("/dashboard/stats")
    @PreAuthorize("hasRole('ADMIN') or hasRole('WARD_MEMBER')")
    public ResponseEntity<Map<String, Object>> getDashboardStats() {
        return ResponseEntity.ok(complaintService.getDashboardStats());
    }
    
    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN') or hasRole('WARD_MEMBER')") // Admins and Ward members can update status
    public ResponseEntity<Complaint> updateStatus(@PathVariable Long id, @RequestParam String status) {
        return ResponseEntity.ok(complaintService.updateStatus(id, status));
    }

    @PutMapping("/{id}/fraud")
    @PreAuthorize("hasRole('ADMIN') or hasRole('WARD_MEMBER')")
    public ResponseEntity<Complaint> markAsFraud(@PathVariable Long id, @RequestParam Boolean isFraud) {
        return ResponseEntity.ok(complaintService.markAsFraud(id, isFraud));
    }

    @PostMapping("/upload")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN') or hasRole('WARD_MEMBER')")
    public ResponseEntity<Map<String, String>> uploadImage(@RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File is empty"));
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Only image uploads are allowed"));
        }

        Path uploadDir = Paths.get("uploads");
        Files.createDirectories(uploadDir);

        String originalName = file.getOriginalFilename();
        String extension = "";
        if (originalName != null && originalName.contains(".")) {
            extension = originalName.substring(originalName.lastIndexOf('.'));
        }

        String filename = UUID.randomUUID() + extension;
        Path target = uploadDir.resolve(filename);
        Files.copy(file.getInputStream(), target);

        String url = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/uploads/")
                .path(filename)
                .toUriString();

        return ResponseEntity.ok(Map.of("url", url));
    }
}
