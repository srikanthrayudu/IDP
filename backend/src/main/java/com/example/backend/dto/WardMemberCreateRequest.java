package com.example.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public class WardMemberCreateRequest {
    @NotBlank
    private String username;

    @NotBlank
    private String password;

    @NotNull
    @Positive
    private Integer wardNumber;

    public WardMemberCreateRequest() {
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Integer getWardNumber() {
        return wardNumber;
    }

    public void setWardNumber(Integer wardNumber) {
        this.wardNumber = wardNumber;
    }
}

