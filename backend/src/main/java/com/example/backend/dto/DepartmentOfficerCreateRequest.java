package com.example.backend.dto;

import jakarta.validation.constraints.NotBlank;

public class DepartmentOfficerCreateRequest {
    @NotBlank
    private String username;

    @NotBlank
    private String password;

    @NotBlank
    private String department;

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }
}

