package com.example.backend.dto;

import jakarta.validation.constraints.Positive;

public class WorkerProfileRequest {
    @Positive
    private Integer wardNumber;
    private String categoryExpertise;

    public WorkerProfileRequest() {
    }

    public Integer getWardNumber() {
        return wardNumber;
    }

    public void setWardNumber(Integer wardNumber) {
        this.wardNumber = wardNumber;
    }

    public String getCategoryExpertise() {
        return categoryExpertise;
    }

    public void setCategoryExpertise(String categoryExpertise) {
        this.categoryExpertise = categoryExpertise;
    }
}
