using System.Net;
using System.Text.Json;
using System.Web;
using Azure.Data.Tables;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using TheGrind.Api.Models;

namespace TheGrind.Api.Functions;

/// <summary>
/// Single admin function handling GET (list scores), POST (set deadline), DELETE (reset scores).
/// Route: /api/admin?key=xxx
/// </summary>
public class Admin
{
    private readonly TableClient _scoresTable;
    private readonly TableClient _configTable;

    public Admin(TableClient scoresTable, ConfigTableClient configWrapper)
    {
        _scoresTable = scoresTable;
        _configTable = configWrapper.Table;
    }

    [Function("Admin")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", "delete", Route = "admin")] HttpRequestData req)
    {
        // ── Auth ────────────────────────────────────────────────
        var query = HttpUtility.ParseQueryString(req.Url.Query);
        var key = query["key"];
        var expected = Environment.GetEnvironmentVariable("ADMIN_KEY") ?? "gabnadine2026";
        if (key != expected)
        {
            var forbidden = req.CreateResponse(HttpStatusCode.Forbidden);
            await forbidden.WriteAsJsonAsync(new { error = "Unauthorized" });
            return forbidden;
        }

        return req.Method.ToUpperInvariant() switch
        {
            "GET" => await HandleGetScores(req),
            "POST" => await HandleSetDeadline(req),
            "DELETE" => await HandleReset(req),
            _ => req.CreateResponse(HttpStatusCode.MethodNotAllowed)
        };
    }

    // ── GET: list all scores with device IDs ────────────────────
    private async Task<HttpResponseData> HandleGetScores(HttpRequestData req)
    {
        var all = new List<object>();

        await foreach (var entity in _scoresTable.QueryAsync<ScoreEntity>(
            filter: "PartitionKey eq 'wedding'"))
        {
            all.Add(new
            {
                name = entity.PlayerName,
                score = entity.Score,
                deviceId = entity.DeviceId,
                createdAt = entity.Timestamp
            });
        }

        var sorted = all
            .OrderByDescending(s => ((dynamic)s).score)
            .ToList();

        var response = req.CreateResponse(HttpStatusCode.OK);
        await response.WriteAsJsonAsync(new
        {
            totalSubmissions = sorted.Count,
            scores = sorted
        });
        return response;
    }

    // ── POST: set event deadline ────────────────────────────────
    private async Task<HttpResponseData> HandleSetDeadline(HttpRequestData req)
    {
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        AdminConfigRequest? body;
        try
        {
            body = await JsonSerializer.DeserializeAsync<AdminConfigRequest>(req.Body, options);
        }
        catch
        {
            var bad = req.CreateResponse(HttpStatusCode.BadRequest);
            await bad.WriteAsJsonAsync(new { error = "Invalid JSON" });
            return bad;
        }

        if (body is null || string.IsNullOrWhiteSpace(body.DeadlineUtc))
        {
            var bad = req.CreateResponse(HttpStatusCode.BadRequest);
            await bad.WriteAsJsonAsync(new { error = "deadlineUtc is required (ISO-8601 UTC string)" });
            return bad;
        }

        if (!DateTimeOffset.TryParse(body.DeadlineUtc, out var parsed))
        {
            var bad = req.CreateResponse(HttpStatusCode.BadRequest);
            await bad.WriteAsJsonAsync(new { error = "deadlineUtc is not a valid ISO-8601 date" });
            return bad;
        }

        var entity = new ConfigEntity
        {
            PartitionKey = "config",
            RowKey = "deadline",
            DeadlineUtc = parsed.ToUniversalTime().ToString("o")
        };

        await _configTable.UpsertEntityAsync(entity, TableUpdateMode.Replace);

        var response = req.CreateResponse(HttpStatusCode.OK);
        await response.WriteAsJsonAsync(new { success = true, deadlineUtc = entity.DeadlineUtc });
        return response;
    }

    // ── DELETE: wipe all scores ─────────────────────────────────
    private async Task<HttpResponseData> HandleReset(HttpRequestData req)
    {
        var deleted = 0;
        await foreach (var entity in _scoresTable.QueryAsync<ScoreEntity>(
            filter: "PartitionKey eq 'wedding'"))
        {
            await _scoresTable.DeleteEntityAsync(entity.PartitionKey, entity.RowKey);
            deleted++;
        }

        var response = req.CreateResponse(HttpStatusCode.OK);
        await response.WriteAsJsonAsync(new { success = true, deletedCount = deleted });
        return response;
    }
}

record AdminConfigRequest(string? DeadlineUtc);
