package com.example.backend.dto;

import jakarta.validation.constraints.NotBlank;

public class WorkerPasswordResetRequest {
    @NotBlank
    private String password;

    public WorkerPasswordResetRequest() {
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
