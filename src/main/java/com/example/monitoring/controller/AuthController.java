package com.example.monitoring.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final SecurityContextRepository securityContextRepository;

    public AuthController(SecurityContextRepository securityContextRepository) {
        this.securityContextRepository = securityContextRepository;
    }

    // In-memory users per your spec
    private static final Map<String, String> USERS = Map.of(
            "admin", "admin123",
            "dashboard", "password",
            "user", "user123",
            "demo", "demo",
            "manager", "manager2024",
            "developer", "dev@2024"
    );

    private static final Map<String, List<String>> USER_ROLES = Map.of(
            "admin", List.of("ROLE_ADMIN", "ROLE_USER"),
            "dashboard", List.of("ROLE_USER"),
            "user", List.of("ROLE_USER"),
            "demo", List.of("ROLE_USER"),
            "manager", List.of("ROLE_MANAGER", "ROLE_USER"),
            "developer", List.of("ROLE_DEVELOPER", "ROLE_USER")
    );

    public record LoginRequest(String username, String password) {}
    public record LoginResponse(String username, List<String> authorities) {}

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req,
                                   HttpServletRequest request,
                                   HttpServletResponse response) {
        if (req == null || req.username() == null || req.password() == null) {
            return ResponseEntity.status(400).body("Missing credentials");
        }

        String expected = USERS.get(req.username());
        if (expected == null || !expected.equals(req.password())) {
            return ResponseEntity.status(401).build();
        }

        // Build authorities
        List<String> roles = USER_ROLES.getOrDefault(req.username(), List.of("ROLE_USER"));
        var authorities = roles.stream().map(SimpleGrantedAuthority::new).toList();

        // Create an authenticated token and store it in the session-backed SecurityContext
        Authentication auth = UsernamePasswordAuthenticationToken.authenticated(
                req.username(), null, authorities);

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        securityContextRepository.saveContext(context, request, response);

        // Also ensure a session exists (JSESSIONID cookie)
        HttpSession session = request.getSession(true);
        session.setAttribute("username", req.username());

        return ResponseEntity.ok(new LoginResponse(req.username(), roles));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request, HttpServletResponse response) {
        SecurityContextHolder.clearContext();
        HttpSession session = request.getSession(false);
        if (session != null) session.invalidate();
        return ResponseEntity.ok().build();
    }

    @GetMapping("/me")
    public ResponseEntity<?> me() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }
        List<String> roles = auth.getAuthorities().stream().map(a -> a.getAuthority()).toList();
        return ResponseEntity.ok(new LoginResponse(auth.getName(), roles));
    }
}
