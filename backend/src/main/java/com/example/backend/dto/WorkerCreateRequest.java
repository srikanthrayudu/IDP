package com.example.backend.dto;

import jakarta.validation.constraints.NotBlank;

public class WorkerCreateRequest extends WorkerProfileRequest {
    @NotBlank
    private String username;
    @NotBlank
    private String password;

    public WorkerCreateRequest() {
    }

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
}
