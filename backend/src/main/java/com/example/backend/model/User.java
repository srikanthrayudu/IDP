package com.example.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String role; // "ROLE_USER", "ROLE_ADMIN", "ROLE_WARD_MEMBER", "ROLE_WORKER", "ROLE_DEPARTMENT", "ROLE_CUSTOMER_CARE"

    @Column(name = "ward_number")
    private Integer wardNumber;

    @Column(name = "department")
    private String department;

    @Column(name = "category_expertise")
    private String categoryExpertise;

    public User() {}

    public User(String username, String password, String role) {
        this.username = username;
        this.password = password;
        this.role = role;
    }

    public User(String username, String password, String role, Integer wardNumber) {
        this.username = username;
        this.password = password;
        this.role = role;
        this.wardNumber = wardNumber;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public Integer getWardNumber() { return wardNumber; }
    public void setWardNumber(Integer wardNumber) { this.wardNumber = wardNumber; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getCategoryExpertise() { return categoryExpertise; }
    public void setCategoryExpertise(String categoryExpertise) { this.categoryExpertise = categoryExpertise; }
}
