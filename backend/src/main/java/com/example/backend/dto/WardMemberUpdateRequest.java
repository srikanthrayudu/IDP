package com.example.backend.dto;

import jakarta.validation.constraints.Positive;

public class WardMemberUpdateRequest {
    @Positive
    private Integer wardNumber;
    private String password;

    public WardMemberUpdateRequest() {
    }

    public Integer getWardNumber() {
        return wardNumber;
    }

    public void setWardNumber(Integer wardNumber) {
        this.wardNumber = wardNumber;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}

