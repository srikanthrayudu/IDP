package com.example.backend.config;

import com.example.backend.model.User;
import com.example.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.security.crypto.password.PasswordEncoder;

@Component
public class DemoDataInitializer implements CommandLineRunner {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${demo.admin.username:admin}")
    private String adminUsername;

    @Value("${demo.admin.password:admin123}")
    private String adminPassword;

    @Value("${demo.ward.username:ward}")
    private String wardUsername;

    @Value("${demo.ward.password:ward123}")
    private String wardPassword;

    public DemoDataInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        ensureUser(adminUsername, adminPassword, "ROLE_ADMIN");
        ensureUser(wardUsername, wardPassword, "ROLE_WARD_MEMBER");
    }

    private void ensureUser(String username, String rawPassword, String role) {
        if (userRepository.existsByUsername(username)) {
            return;
        }
        User user = new User(username, passwordEncoder.encode(rawPassword), role);
        userRepository.save(user);
    }
}

