package com.example.backend.dto;

import jakarta.validation.constraints.NotBlank;

public class ComplaintPriorityUpdateRequest extends RemarkedRequest {
    @NotBlank
    private String priority;

    public ComplaintPriorityUpdateRequest() {
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }
}
