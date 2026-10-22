package com.safetyon.controller;

import com.safetyon.model.ApiDtos.CurrentUserDto;
import com.safetyon.model.ApiDtos.LoginRequest;
import com.safetyon.model.AppUser;
import com.safetyon.repository.AppUserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;
    private final AppUserRepository users;

    public AuthController(AuthenticationManager authenticationManager,
                          SecurityContextRepository securityContextRepository,
                          AppUserRepository users) {
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = securityContextRepository;
        this.users = users;
    }

    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken token) {
        return Map.of("token", token.getToken());
    }

    @PostMapping("/login")
    public CurrentUserDto login(@Valid @RequestBody LoginRequest request,
                                HttpServletRequest servletRequest,
                                HttpServletResponse servletResponse) {
        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(request.username().trim(), request.password()));
        } catch (AuthenticationException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호를 확인해 주세요.");
        }
        if (servletRequest.getSession(false) != null) servletRequest.changeSessionId();
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, servletRequest, servletResponse);
        return currentUser(authentication.getName());
    }

    @GetMapping("/me")
    public CurrentUserDto me(Authentication authentication) {
        return currentUser(authentication.getName());
    }

    private CurrentUserDto currentUser(String username) {
        AppUser user = users.findById(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        return new CurrentUserDto(user.getUsername(), user.getDisplayName(), user.getRole().name());
    }
}
