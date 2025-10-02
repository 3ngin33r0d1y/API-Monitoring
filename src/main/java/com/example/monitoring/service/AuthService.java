package com.example.monitoring.service;

import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class AuthService {
    // Exact credentials required
    private static final Map<String, String> USERS = Map.of(
            "admin","admin123",
            "dashboard","password",
            "user","user123",
            "demo","demo",
            "manager","manager2024",
            "developer","dev@2024"
    );

    public boolean valid(String username, String password) {
        return USERS.containsKey(username) && USERS.get(username).equals(password);
    }
}
