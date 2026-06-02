package com.example.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.example.backend.repository.UserRepository;
import com.example.backend.model.User;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

@SpringBootApplication
public class BackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }

    @Bean
    @ConditionalOnProperty(name = "app.seed.java.enabled", havingValue = "true", matchIfMissing = true)
    public CommandLineRunner initData(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            if (!userRepository.existsByUsername("admin")) {
                User admin = new User("admin", passwordEncoder.encode("Admin@123"), "ROLE_ADMIN");
                userRepository.save(admin);
            }
            if (!userRepository.existsByUsername("citizen")) {
                User user = new User("citizen", passwordEncoder.encode("Citizen@123"), "ROLE_USER");
                userRepository.save(user);
            }
            if (!userRepository.existsByUsername("ward")) {
                User ward = new User("ward", passwordEncoder.encode("Ward@123"), "ROLE_WARD_MEMBER");
                userRepository.save(ward);
            }
        };
    }
}
