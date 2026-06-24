package com.example.backend.controller;

import com.example.backend.dto.WorkerCreateRequest;
import com.example.backend.dto.WorkerResponse;
import com.example.backend.dto.WorkerUpdateRequest;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.model.User;
import com.example.backend.repository.ComplaintRepository;
import com.example.backend.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import com.example.backend.security.UserDetailsImpl;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/workers")
@CrossOrigin(origins = "*")
@Validated
public class WorkerController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ComplaintRepository complaintRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @GetMapping
    @PreAuthorize("hasRole('ROLE_ADMIN') or hasRole('ROLE_WARD_MEMBER')")
    public ResponseEntity<List<WorkerResponse>> getWorkers(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        User requester = userRepository.findById(userDetails.getId()).orElse(null);
        List<User> workers = resolveWorkersForRequester(requester);
        List<WorkerResponse> response = workers.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @PreAuthorize("hasRole('ROLE_ADMIN') or hasRole('ROLE_WARD_MEMBER')")
    public ResponseEntity<WorkerResponse> createWorker(@Valid @RequestBody WorkerCreateRequest request, Authentication authentication) {
        if (userRepository.existsByUsername(request.getUsername())) {
            return ResponseEntity.badRequest().build();
        }

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        User requester = userRepository.findById(userDetails.getId()).orElse(null);
        Integer wardNumber = resolveWardNumberForCreate(requester, request.getWardNumber());

        User worker = new User();
        worker.setUsername(request.getUsername());
        worker.setPassword(passwordEncoder.encode(request.getPassword()));
        worker.setRole("ROLE_WORKER");
        worker.setWardNumber(wardNumber);
        worker.setCategoryExpertise(request.getCategoryExpertise());

        User saved = userRepository.save(worker);
        return ResponseEntity.ok(toResponse(saved));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_ADMIN') or hasRole('ROLE_WARD_MEMBER')")
    public ResponseEntity<WorkerResponse> updateWorker(@PathVariable Long id, @Valid @RequestBody WorkerUpdateRequest request, Authentication authentication) {
        User worker = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Worker not found with id: " + id));
        if (!"ROLE_WORKER".equals(worker.getRole())) {
            return ResponseEntity.badRequest().build();
        }
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        User requester = userRepository.findById(userDetails.getId()).orElse(null);
        if (requester != null && "ROLE_WARD_MEMBER".equals(requester.getRole())) {
            if (worker.getWardNumber() == null || !worker.getWardNumber().equals(requester.getWardNumber())) {
                return ResponseEntity.status(403).build();
            }
        }
        Integer wardNumber = resolveWardNumberForCreate(requester, request.getWardNumber());
        worker.setWardNumber(wardNumber);
        worker.setCategoryExpertise(request.getCategoryExpertise());
        User saved = userRepository.save(worker);
        return ResponseEntity.ok(toResponse(saved));
    }

    private List<User> resolveWorkersForRequester(User requester) {
        if (requester == null) {
            return List.of();
        }
        if ("ROLE_WARD_MEMBER".equals(requester.getRole())) {
            Integer wardNumber = requester.getWardNumber();
            if (wardNumber == null) {
                return List.of();
            }
            return userRepository.findByRoleAndWardNumber("ROLE_WORKER", wardNumber);
        }
        return userRepository.findByRole("ROLE_WORKER");
    }

    private Integer resolveWardNumberForCreate(User requester, Integer requestedWard) {
        if (requester != null && "ROLE_WARD_MEMBER".equals(requester.getRole())) {
            return requester.getWardNumber();
        }
        return requestedWard;
    }

    private WorkerResponse toResponse(User worker) {
        Long assignedCount = complaintRepository.countByAssignedWorkerId(worker.getId());
        return new WorkerResponse(
                worker.getId(),
                worker.getUsername(),
                worker.getWardNumber(),
                worker.getCategoryExpertise(),
                assignedCount
        );
    }
}
