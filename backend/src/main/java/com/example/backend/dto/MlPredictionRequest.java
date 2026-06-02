package com.example.backend.dto;

public class MlPredictionRequest {
    private String text;

    public MlPredictionRequest() {
    }

    public MlPredictionRequest(String text) {
        this.text = text;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }
}

