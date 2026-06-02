package com.example.backend.dto;

public class DepartmentOfficerResponse {
    private Long id;
    private String username;
    private String department;

    public DepartmentOfficerResponse(Long id, String username, String department) {
        this.id = id;
        this.username = username;
        this.department = department;
    }

    public Long getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public String getDepartment() {
        return department;
    }
}

