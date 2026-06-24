package com.example.backend.controller;

import com.example.backend.dto.WardMemberCreateRequest;
import com.example.backend.dto.WardMemberResponse;
import com.example.backend.dto.WardMemberUpdateRequest;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.model.User;
import com.example.backend.repository.UserRepository;
import com.example.backend.repository.WardRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/customer-care")
@CrossOrigin(origins = "*")
public class CustomerCareController {
    private final UserRepository userRepository;
    private final WardRepository wardRepository;
    private final PasswordEncoder passwordEncoder;

    public CustomerCareController(UserRepository userRepository, WardRepository wardRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.wardRepository = wardRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public List<WardMemberResponse> listCustomerCare() {
        return userRepository.findByRole("ROLE_CUSTOMER_CARE").stream()
                .sorted(Comparator.comparing(User::getWardNumber, Comparator.nullsLast(Integer::compareTo))
                        .thenComparing(User::getUsername))
                .map(user -> new WardMemberResponse(user.getId(), user.getUsername(), user.getWardNumber()))
                .collect(Collectors.toList());
    }

    @PostMapping
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<WardMemberResponse> createCustomerCare(@Valid @RequestBody WardMemberCreateRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            return ResponseEntity.badRequest().build();
        }
        if (!wardRepository.existsByNumber(request.getWardNumber())) {
            return ResponseEntity.badRequest().build();
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole("ROLE_CUSTOMER_CARE");
        user.setWardNumber(request.getWardNumber());

        User saved = userRepository.save(user);
        WardMemberResponse response = new WardMemberResponse(saved.getId(), saved.getUsername(), saved.getWardNumber());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<WardMemberResponse> updateCustomerCare(@PathVariable Long id, @Valid @RequestBody WardMemberUpdateRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer care not found with id: " + id));
        if (!"ROLE_CUSTOMER_CARE".equals(user.getRole())) {
            return ResponseEntity.badRequest().build();
        }
        if (request.getWardNumber() != null) {
            if (!wardRepository.existsByNumber(request.getWardNumber())) {
                return ResponseEntity.badRequest().build();
            }
            user.setWardNumber(request.getWardNumber());
        }
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }
        User saved = userRepository.save(user);
        WardMemberResponse response = new WardMemberResponse(saved.getId(), saved.getUsername(), saved.getWardNumber());
        return ResponseEntity.ok(response);
    }
}