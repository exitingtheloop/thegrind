namespace TheGrind.Api.Models;

public record ScoreRequest(
    string Name,
    double Score,
    string? WeddingCode = null,
    string? DeviceId = null
);
