package com.example.monitoring.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Forwards all non-API frontend routes to index.html so the React router can handle them.
 * Anything under /api/** remains handled by the backend.
 */
@Controller
public class IndexController {

    @GetMapping({
            "/",                       // root
            "/login",                  // login route in SPA
            "/projects",               // Projects tab
            "/apis",                   // All APIs tab
            "/apis/**",                // API Details tab (e.g., /apis/123)
            "/services",               // Services tab
            "/compliance",             // Compliance tab
            "/dashboard"               // (if you use /dashboard)
    })
    public String index() {
        return "forward:/index.html";
    }
}
