package com.example.backend.config;

import com.example.backend.model.User;
import com.example.backend.model.Ward;
import com.example.backend.repository.UserRepository;
import com.example.backend.repository.WardRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.security.crypto.password.PasswordEncoder;

@ConditionalOnProperty(name = "app.seed.java.enabled", havingValue = "true", matchIfMissing = true)
@Component
public class DemoDataInitializer implements CommandLineRunner {
    private final UserRepository userRepository;
    private final WardRepository wardRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${demo.admin.username:admin}")
    private String adminUsername;

    @Value("${demo.admin.password:Admin@123}")
    private String adminPassword;

    @Value("${demo.ward.username:ward}")
    private String wardUsername;

    @Value("${demo.ward.password:Ward@123}")
    private String wardPassword;

    @Value("${demo.ward.count:20}")
    private int wardCount;

    @Value("${demo.user.username:citizen}")
    private String userUsername;

    @Value("${demo.user.password:Citizen@123}")
    private String userPassword;

    @Value("${demo.user.count:10}")
    private int userCount;

    @Value("${demo.worker.username:worker}")
    private String workerUsername;

    @Value("${demo.worker.password:Worker@123}")
    private String workerPassword;

    @Value("${demo.worker.count:5}")
    private int workerCount;

    @Value("${demo.department.password:Department@123}")
    private String departmentPassword;

    @Value("${demo.customer.care.username:care}")
    private String customerCareUsername;

    @Value("${demo.customer.care.password:Care@123}")
    private String customerCarePassword;

    private static final String[] DEPARTMENTS = {
            "Roads",
            "Water Supply",
            "Sanitation",
            "Electricity",
            "Drainage",
            "Public Health",
            "Traffic",
            "Forest",
            "Animal Welfare",
            "Pollution Control",
            "Town Planning",
            "Parks & Horticulture"
    };

    public DemoDataInitializer(UserRepository userRepository, WardRepository wardRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.wardRepository = wardRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        ensureAdminUser(adminUsername, adminPassword);
        ensureUser(wardUsername, wardPassword, "ROLE_WARD_MEMBER");
        ensureWardNumbers(wardCount);
        ensureWardMembers(wardCount, wardUsername, wardPassword);
        ensureUsers(userCount, userUsername, userPassword);
        ensureWorkers(workerCount, workerUsername, workerPassword, wardCount);
        ensureDepartmentOfficers(departmentPassword);
        ensureCustomerCare(customerCareUsername, customerCarePassword);
    }

    private void ensureAdminUser(String username, String rawPassword) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            user = new User(username, passwordEncoder.encode(rawPassword), "ROLE_ADMIN");
        }
        user.setRole("ROLE_ADMIN");
        user.setWardNumber(null);
        user.setCategoryExpertise(null);
        user.setPassword(passwordEncoder.encode(rawPassword));
        userRepository.save(user);
    }

    private void ensureUser(String username, String rawPassword, String role) {
        if (userRepository.existsByUsername(username)) {
            return;
        }
        User user = new User(username, passwordEncoder.encode(rawPassword), role);
        userRepository.save(user);
    }

    private void ensureWardNumbers(int total) {
        for (int ward = 1; ward <= total; ward++) {
            if (!wardRepository.existsByNumber(ward)) {
                wardRepository.save(new Ward(ward));
            }
        }
    }

    private void ensureWardMembers(int total, String usernamePrefix, String rawPassword) {
        for (int index = 1; index <= total; index++) {
            String username = usernamePrefix + index;
            String wardPassword = rawPassword + index;
            User user = userRepository.findByUsername(username).orElse(null);
            if (user == null) {
                user = new User(username, passwordEncoder.encode(wardPassword), "ROLE_WARD_MEMBER", index);
            }
            user.setRole("ROLE_WARD_MEMBER");
            user.setWardNumber(index);
            user.setPassword(passwordEncoder.encode(wardPassword));
            userRepository.save(user);
        }
    }

    private void ensureUsers(int total, String usernamePrefix, String rawPassword) {
        for (int index = 1; index <= total; index++) {
            String username = usernamePrefix + index;
            String userPassword = rawPassword + index;
            User user = userRepository.findByUsername(username).orElse(null);
            if (user == null) {
                user = new User(username, passwordEncoder.encode(userPassword), "ROLE_USER");
            }
            user.setRole("ROLE_USER");
            user.setWardNumber(null);
            user.setCategoryExpertise(null);
            user.setPassword(passwordEncoder.encode(userPassword));
            userRepository.save(user);
        }
    }

    private void ensureWorkers(int total, String usernamePrefix, String rawPassword, int wardTotal) {
        String[] categories = {"Electrical", "Solid Waste (Garbage) Related", "Road Maintenance(Engg)", "Water Supply", "Streetlights"};
        for (int index = 1; index <= total; index++) {
            String username = usernamePrefix + index;
            String workerPassword = rawPassword + index;
            User user = userRepository.findByUsername(username).orElse(null);
            if (user == null) {
                user = new User(username, passwordEncoder.encode(workerPassword), "ROLE_WORKER", wardTotal > 0 ? ((index - 1) % wardTotal) + 1 : null);
            }
            user.setRole("ROLE_WORKER");
            user.setWardNumber(wardTotal > 0 ? ((index - 1) % wardTotal) + 1 : null);
            user.setCategoryExpertise(categories[(index - 1) % categories.length]);
            user.setPassword(passwordEncoder.encode(workerPassword));
            userRepository.save(user);
        }
    }

    private void ensureDepartmentOfficers(String rawPassword) {
        for (String department : DEPARTMENTS) {
            String username = "dept_" + department.toLowerCase().replace(" ", "_").replace("&", "and");
            User user = userRepository.findByUsername(username).orElse(null);
            if (user == null) {
                user = new User(username, passwordEncoder.encode(rawPassword), "ROLE_DEPARTMENT");
            }
            user.setRole("ROLE_DEPARTMENT");
            user.setWardNumber(null);
            user.setCategoryExpertise(null);
            user.setDepartment(department);
            user.setPassword(passwordEncoder.encode(rawPassword));
            userRepository.save(user);
        }
    }

    private void ensureCustomerCare(String username, String rawPassword) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            user = new User(username, passwordEncoder.encode(rawPassword), "ROLE_CUSTOMER_CARE");
        }
        user.setRole("ROLE_CUSTOMER_CARE");
        user.setWardNumber(null);
        user.setDepartment(null);
        user.setCategoryExpertise(null);
        user.setPassword(passwordEncoder.encode(rawPassword));
        userRepository.save(user);
    }
}
