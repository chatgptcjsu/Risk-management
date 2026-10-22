package com.safetyon.controller;

import com.safetyon.model.ApiDtos.ImprovementCreateRequest;
import com.safetyon.model.ApiDtos.ImprovementItemDto;
import com.safetyon.model.ApiDtos.StatusChangeDto;
import com.safetyon.model.ApiDtos.StatusUpdateRequest;
import com.safetyon.service.ImprovementService;
import jakarta.validation.Valid;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/improvements")
public class ImprovementController {
    private final ImprovementService service;

    private String actorName(Authentication authentication) {
        return authentication == null || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken
                ? "비로그인 사용자"
                : authentication.getName();
    }

    public ImprovementController(ImprovementService service) {
        this.service = service;
    }

    @GetMapping("/high-risk")
    public List<ImprovementItemDto> highRisk() {
        return service.getHighRiskOpenItems();
    }

    @GetMapping("/completed")
    public List<ImprovementItemDto> completed(@RequestParam(defaultValue = "desc") String sort) {
        return service.getCompletedItems(sort);
    }

    @PostMapping
    public ImprovementItemDto create(@Valid @RequestBody ImprovementCreateRequest request,
                                     Authentication authentication) {
        return service.create(request, actorName(authentication));
    }

    @PatchMapping("/{id}/status")
    public ImprovementItemDto updateStatus(@PathVariable long id,
                                           @Valid @RequestBody StatusUpdateRequest request,
                                           Authentication authentication) {
        return service.updateStatus(id, request, actorName(authentication));
    }

    @GetMapping("/{id}/history")
    public List<StatusChangeDto> history(@PathVariable long id) {
        return service.getHistory(id);
    }

    @GetMapping("/summary")
    public Map<String, Object> summary() {
        List<ImprovementItemDto> open = service.getHighRiskOpenItems();
        List<ImprovementItemDto> completed = service.getCompletedItems("desc");
        return Map.of(
                "highRiskOpenCount", open.size(),
                "completedCount", completed.size(),
                "threshold", ImprovementService.HIGH_RISK_THRESHOLD
        );
    }
}
