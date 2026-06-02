package com.example.backend.dto;

public class WorkerResponse {
    private Long id;
    private String username;
    private Integer wardNumber;
    private String categoryExpertise;
    private Long assignedCount;

    public WorkerResponse() {
    }

    public WorkerResponse(Long id, String username, Integer wardNumber, String categoryExpertise, Long assignedCount) {
        this.id = id;
        this.username = username;
        this.wardNumber = wardNumber;
        this.categoryExpertise = categoryExpertise;
        this.assignedCount = assignedCount;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
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

    public Long getAssignedCount() {
        return assignedCount;
    }

    public void setAssignedCount(Long assignedCount) {
        this.assignedCount = assignedCount;
    }
}

