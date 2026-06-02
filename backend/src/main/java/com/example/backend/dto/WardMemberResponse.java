package com.example.backend.dto;

public class WardMemberResponse {
    private Long id;
    private String username;
    private Integer wardNumber;

    public WardMemberResponse(Long id, String username, Integer wardNumber) {
        this.id = id;
        this.username = username;
        this.wardNumber = wardNumber;
    }

    public Long getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public Integer getWardNumber() {
        return wardNumber;
    }
}

