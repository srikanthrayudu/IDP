package com.example.backend.model;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.LocalDateTime;

@Entity
@Table(name = "complaints")
public class Complaint {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @JsonIgnore
    private User user;

    @Column(nullable = false, length = 1000)
    private String text;

    private String category;

    private String department;

    private String status = "PENDING";

    private String priority;

    private String progressStatus = "NEW";

    @Column(name = "assigned_worker_id")
    private Long assignedWorkerId;

    @Column(name = "assigned_worker_name")
    private String assignedWorkerName;

    private LocalDateTime assignedAt;

    private LocalDateTime lastProgressAt;

    @Column(columnDefinition = "TEXT")
    private String workerRemarks;

    private Integer feedbackRating;

    @Column(columnDefinition = "TEXT")
    private String feedbackComment;

    private LocalDateTime feedbackAt;

    private String location;
    
    private String bbmpZone;
    
    private String wardNumber;

    private Double latitude;

    private Double longitude;

    private String imageUrl;

    private String imageContentType;

    private Long imageSizeBytes;

    private String imageOriginalName;

    @Column(name = "device_id")
    private String deviceId; // Like IMEI for tracking asset/device

    @Column(name = "is_fraud")
    private Boolean isFraud = false; // Flag for spam/fraud reporting (Chakshu insight)

    @Column(columnDefinition = "TEXT")
    private String shapInterpretations;

    private Double mlConfidence;

    private Double priorityConfidence;

    @Column(columnDefinition = "TEXT")
    private String rankedCategories;

    private String mlModelUsed;

    @CreationTimestamp
    private LocalDateTime createdAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public String getProgressStatus() {
        return progressStatus;
    }

    public void setProgressStatus(String progressStatus) {
        this.progressStatus = progressStatus;
    }

    public Long getAssignedWorkerId() {
        return assignedWorkerId;
    }

    public void setAssignedWorkerId(Long assignedWorkerId) {
        this.assignedWorkerId = assignedWorkerId;
    }

    public String getAssignedWorkerName() {
        return assignedWorkerName;
    }

    public void setAssignedWorkerName(String assignedWorkerName) {
        this.assignedWorkerName = assignedWorkerName;
    }

    public LocalDateTime getAssignedAt() {
        return assignedAt;
    }

    public void setAssignedAt(LocalDateTime assignedAt) {
        this.assignedAt = assignedAt;
    }

    public LocalDateTime getLastProgressAt() {
        return lastProgressAt;
    }

    public void setLastProgressAt(LocalDateTime lastProgressAt) {
        this.lastProgressAt = lastProgressAt;
    }

    public String getWorkerRemarks() {
        return workerRemarks;
    }

    public void setWorkerRemarks(String workerRemarks) {
        this.workerRemarks = workerRemarks;
    }

    public Integer getFeedbackRating() {
        return feedbackRating;
    }

    public void setFeedbackRating(Integer feedbackRating) {
        this.feedbackRating = feedbackRating;
    }

    public String getFeedbackComment() {
        return feedbackComment;
    }

    public void setFeedbackComment(String feedbackComment) {
        this.feedbackComment = feedbackComment;
    }

    public LocalDateTime getFeedbackAt() {
        return feedbackAt;
    }

    public void setFeedbackAt(LocalDateTime feedbackAt) {
        this.feedbackAt = feedbackAt;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }
    
    public String getBbmpZone() {
        return bbmpZone;
    }

    public void setBbmpZone(String bbmpZone) {
        this.bbmpZone = bbmpZone;
    }

    public String getWardNumber() {
        return wardNumber;
    }

    public void setWardNumber(String wardNumber) {
        this.wardNumber = wardNumber;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public String getImageContentType() {
        return imageContentType;
    }

    public void setImageContentType(String imageContentType) {
        this.imageContentType = imageContentType;
    }

    public Long getImageSizeBytes() {
        return imageSizeBytes;
    }

    public void setImageSizeBytes(Long imageSizeBytes) {
        this.imageSizeBytes = imageSizeBytes;
    }

    public String getImageOriginalName() {
        return imageOriginalName;
    }

    public void setImageOriginalName(String imageOriginalName) {
        this.imageOriginalName = imageOriginalName;
    }

    public String getDeviceId() {
        return deviceId;
    }

    public void setDeviceId(String deviceId) {
        this.deviceId = deviceId;
    }

    public Boolean getIsFraud() {
        return isFraud;
    }

    public void setIsFraud(Boolean fraud) {
        isFraud = fraud;
    }

    public String getShapInterpretations() {
        return shapInterpretations;
    }

    public void setShapInterpretations(String shapInterpretations) {
        this.shapInterpretations = shapInterpretations;
    }

    public Double getMlConfidence() {
        return mlConfidence;
    }

    public void setMlConfidence(Double mlConfidence) {
        this.mlConfidence = mlConfidence;
    }

    public Double getPriorityConfidence() {
        return priorityConfidence;
    }

    public void setPriorityConfidence(Double priorityConfidence) {
        this.priorityConfidence = priorityConfidence;
    }

    public String getRankedCategories() {
        return rankedCategories;
    }

    public void setRankedCategories(String rankedCategories) {
        this.rankedCategories = rankedCategories;
    }

    public String getMlModelUsed() {
        return mlModelUsed;
    }

    public void setMlModelUsed(String mlModelUsed) {
        this.mlModelUsed = mlModelUsed;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
