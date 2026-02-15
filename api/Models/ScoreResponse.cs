namespace TheGrind.Api.Models;

public record ScoreResponse(
    string Name,
    double Score,
    DateTimeOffset? CreatedAt
);
