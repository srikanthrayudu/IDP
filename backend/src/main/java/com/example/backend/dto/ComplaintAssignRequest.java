package com.example.backend.dto;

import jakarta.validation.constraints.NotNull;

public class ComplaintAssignRequest extends RemarkedRequest {
    @NotNull
    private Long workerId;

    public ComplaintAssignRequest() {
    }

    public Long getWorkerId() {
        return workerId;
    }

    public void setWorkerId(Long workerId) {
        this.workerId = workerId;
    }
}
