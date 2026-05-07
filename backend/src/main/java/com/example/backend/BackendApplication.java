package com.example.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.example.backend.repository.UserRepository;
import com.example.backend.model.User;

@SpringBootApplication
public class BackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }

    @Bean
    public CommandLineRunner initData(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            if (!userRepository.existsByUsername("admin")) {
                User admin = new User("admin", passwordEncoder.encode("admin123"), "ROLE_ADMIN");
                userRepository.save(admin);
            }
            if (!userRepository.existsByUsername("user")) {
                User user = new User("user", passwordEncoder.encode("user123"), "ROLE_USER");
                userRepository.save(user);
            }
            if (!userRepository.existsByUsername("ward")) {
                User ward = new User("ward", passwordEncoder.encode("ward123"), "ROLE_WARD_MEMBER");
                userRepository.save(ward);
            }
        };
    }
}
