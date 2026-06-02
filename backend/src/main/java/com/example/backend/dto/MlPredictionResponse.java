package com.example.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.Map;

public class MlPredictionResponse {
    private String category;
    private Double confidence;
    private String priority;
    @JsonProperty("priority_confidence")
    private Double priorityConfidence;
    @JsonProperty("ranked_categories")
    private List<MlRankedCategory> rankedCategories;
    @JsonProperty("shap_values")
    private Map<String, Double> shapValues;
    @JsonProperty("model_used")
    private String modelUsed;
    @JsonProperty("model_name")
    private String modelName;

    public MlPredictionResponse() {
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public Double getConfidence() {
        return confidence;
    }

    public void setConfidence(Double confidence) {
        this.confidence = confidence;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public Double getPriorityConfidence() {
        return priorityConfidence;
    }

    public void setPriorityConfidence(Double priorityConfidence) {
        this.priorityConfidence = priorityConfidence;
    }

    public List<MlRankedCategory> getRankedCategories() {
        return rankedCategories;
    }

    public void setRankedCategories(List<MlRankedCategory> rankedCategories) {
        this.rankedCategories = rankedCategories;
    }

    public Map<String, Double> getShapValues() {
        return shapValues;
    }

    public void setShapValues(Map<String, Double> shapValues) {
        this.shapValues = shapValues;
    }

    public String getModelUsed() {
        return modelUsed;
    }

    public void setModelUsed(String modelUsed) {
        this.modelUsed = modelUsed;
    }

    public String getModelName() {
        return modelName;
    }

    public void setModelName(String modelName) {
        this.modelName = modelName;
    }
}

