package com.example.backend.dto;

public class DepartmentOfficerUpdateRequest {
    private String department;
    private String password;

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}

