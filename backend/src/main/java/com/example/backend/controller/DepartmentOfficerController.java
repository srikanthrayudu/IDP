package com.example.backend.controller;

import com.example.backend.dto.DepartmentOfficerCreateRequest;
import com.example.backend.dto.DepartmentOfficerResponse;
import com.example.backend.dto.DepartmentOfficerUpdateRequest;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.model.User;
import com.example.backend.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/department-officers")
@CrossOrigin(origins = "*")
public class DepartmentOfficerController {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DepartmentOfficerController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<DepartmentOfficerResponse> listDepartmentOfficers() {
        return userRepository.findByRole("ROLE_DEPARTMENT").stream()
                .sorted(Comparator.comparing(User::getDepartment, Comparator.nullsLast(String::compareTo))
                        .thenComparing(User::getUsername))
                .map(user -> new DepartmentOfficerResponse(user.getId(), user.getUsername(), user.getDepartment()))
                .collect(Collectors.toList());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DepartmentOfficerResponse> createDepartmentOfficer(@Valid @RequestBody DepartmentOfficerCreateRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            return ResponseEntity.badRequest().build();
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole("ROLE_DEPARTMENT");
        user.setDepartment(request.getDepartment());
        user.setWardNumber(null);
        user.setCategoryExpertise(null);

        User saved = userRepository.save(user);
        DepartmentOfficerResponse response = new DepartmentOfficerResponse(saved.getId(), saved.getUsername(), saved.getDepartment());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DepartmentOfficerResponse> updateDepartmentOfficer(@PathVariable Long id, @Valid @RequestBody DepartmentOfficerUpdateRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department officer not found with id: " + id));
        if (!"ROLE_DEPARTMENT".equals(user.getRole())) {
            return ResponseEntity.badRequest().build();
        }
        if (request.getDepartment() != null && !request.getDepartment().isBlank()) {
            user.setDepartment(request.getDepartment().trim());
        }
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }
        User saved = userRepository.save(user);
        DepartmentOfficerResponse response = new DepartmentOfficerResponse(saved.getId(), saved.getUsername(), saved.getDepartment());
        return ResponseEntity.ok(response);
    }
}

