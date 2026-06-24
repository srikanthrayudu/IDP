package com.example.backend.controller;

import com.example.backend.model.Ward;
import com.example.backend.repository.WardRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;

import java.util.List;

@RestController
@RequestMapping("/api/wards")
@CrossOrigin(origins = "*")
public class WardController {
    private final WardRepository wardRepository;

    public WardController(WardRepository wardRepository) {
        this.wardRepository = wardRepository;
    }

    @GetMapping
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public List<Ward> getAllWards() {
        return wardRepository.findAllByOrderByNumberAsc();
    }
}
