using System.Net;
using System.Text.Json;
using Azure.Data.Tables;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using TheGrind.Api.Models;

namespace TheGrind.Api.Functions;

public class SubmitScore
{
    private readonly TableClient _table;

    public SubmitScore(TableClient table) => _table = table;

    [Function("SubmitScore")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "scores")] HttpRequestData req)
    {
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        ScoreRequest? body;

        try
        {
            body = await JsonSerializer.DeserializeAsync<ScoreRequest>(req.Body, options);
        }
        catch
        {
            var bad = req.CreateResponse(HttpStatusCode.BadRequest);
            await bad.WriteAsJsonAsync(new { error = "Invalid JSON" });
            return bad;
        }

        // ── Validate ────────────────────────────────────────────
        if (body is null || string.IsNullOrWhiteSpace(body.Name) || body.Score <= 0)
        {
            var bad = req.CreateResponse(HttpStatusCode.BadRequest);
            await bad.WriteAsJsonAsync(new { error = "Name and positive score required" });
            return bad;
        }

        if (body.Name.Trim().Length > 30)
        {
            var bad = req.CreateResponse(HttpStatusCode.BadRequest);
            await bad.WriteAsJsonAsync(new { error = "Name too long (max 30 chars)" });
            return bad;
        }


        // ── Best-score-per-device: check existing ───────────────
        var trimmedName = body.Name.Trim();
        var deviceId = body.DeviceId?.Trim() ?? "";

        ScoreEntity? existingByDevice = null;
        ScoreEntity? existingByName = null;

        await foreach (var entity in _table.QueryAsync<ScoreEntity>(
            filter: $"PartitionKey eq 'wedding'"))
        {
            // Primary match: same device
            if (!string.IsNullOrEmpty(deviceId)
                && string.Equals(entity.DeviceId, deviceId, StringComparison.Ordinal))
            {
                existingByDevice = entity;
            }

            // Secondary match: same name (case-insensitive)
            if (string.Equals(entity.PlayerName.Trim(), trimmedName,
                              StringComparison.OrdinalIgnoreCase))
            {
                existingByName = entity;
            }
        }

        // Prefer device match, fall back to name match
        var existing = existingByDevice ?? existingByName;

        if (existing is not null)
        {
            if (body.Score > existing.Score)
            {
                existing.Score = body.Score;
                existing.PlayerName = trimmedName;
                existing.DeviceId = string.IsNullOrEmpty(deviceId) ? existing.DeviceId : deviceId;
                existing.Timestamp = DateTimeOffset.UtcNow;
                await _table.UpdateEntityAsync(existing, existing.ETag, TableUpdateMode.Replace);

                var updated = req.CreateResponse(HttpStatusCode.OK);
                await updated.WriteAsJsonAsync(new { success = true, message = "New personal best!" });
                return updated;
            }

            var kept = req.CreateResponse(HttpStatusCode.OK);
            await kept.WriteAsJsonAsync(new
            {
                success = true,
                message = "Score submitted but your previous best was higher",
                bestScore = existing.Score
            });
            return kept;
        }

        // ── First submission for this device/name ───────────────
        var newEntity = new ScoreEntity
        {
            PartitionKey = "wedding",
            RowKey = Guid.NewGuid().ToString(),
            PlayerName = trimmedName,
            Score = body.Score,
            DeviceId = string.IsNullOrEmpty(deviceId) ? null : deviceId,
            Timestamp = DateTimeOffset.UtcNow
        };

        await _table.AddEntityAsync(newEntity);

        var response = req.CreateResponse(HttpStatusCode.Created);
        await response.WriteAsJsonAsync(new { success = true, message = "Score submitted!" });
        return response;
    }
}
