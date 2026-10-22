package com.safetyon.controller;

import com.safetyon.model.ApiDtos.CreateUserRequest;
import com.safetyon.model.ApiDtos.UserDto;
import com.safetyon.model.AppUser;
import com.safetyon.model.UserRole;
import com.safetyon.repository.AppUserRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/admin/users")
public class UserAdminController {
    private final AppUserRepository users;
    private final PasswordEncoder passwordEncoder;

    public UserAdminController(AppUserRepository users, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping
    public List<UserDto> list() {
        return users.findAll().stream().map(user -> new UserDto(user.getUsername(), user.getDisplayName(),
                user.getRole().name(), user.isEnabled())).toList();
    }

    @PostMapping
    public UserDto create(@Valid @RequestBody CreateUserRequest request) {
        if (request.password().length() < 12) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "임시 비밀번호는 12자 이상이어야 합니다.");
        }
        UserRole role;
        try {
            role = UserRole.valueOf(request.role().trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "FIELD, MANAGER, ADMIN 중 역할을 선택해 주세요.");
        }
        if (users.existsById(request.username().trim())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 아이디입니다.");
        }
        AppUser user = users.save(new AppUser(request.username().trim(), passwordEncoder.encode(request.password()),
                request.displayName().trim(), role));
        return new UserDto(user.getUsername(), user.getDisplayName(), user.getRole().name(), user.isEnabled());
    }
}
