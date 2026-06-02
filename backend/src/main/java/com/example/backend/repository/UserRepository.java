package com.example.backend.repository;

import com.example.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Boolean existsByUsername(String username);

    List<User> findByRole(String role);
    List<User> findByRoleAndWardNumber(String role, Integer wardNumber);
    List<User> findByRoleAndDepartment(String role, String department);
}
