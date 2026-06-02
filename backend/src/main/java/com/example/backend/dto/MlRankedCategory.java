package com.example.backend.dto;

public class MlRankedCategory {
    private String category;
    private Double score;

    public MlRankedCategory() {
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public Double getScore() {
        return score;
    }

    public void setScore(Double score) {
        this.score = score;
    }
}

