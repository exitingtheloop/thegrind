using System.Net;
using System.Text.Json;
using System.Web;
using Azure.Data.Tables;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using TheGrind.Api.Models;

namespace TheGrind.Api.Functions;

public class AdminConfig
{
    private readonly TableClient _configTable;

    public AdminConfig(ConfigTableClient configWrapper)
        => _configTable = configWrapper.Table;

    /// <summary>
    /// POST /api/admin/config?key=xxx
    /// Body: { "deadlineUtc": "2026-06-15T20:00:00Z" }
    /// </summary>
    [Function("AdminSetConfig")]
    public async Task<HttpResponseData> SetDeadline(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "admin-config")] HttpRequestData req)
    {
        // ── Auth
        var query = HttpUtility.ParseQueryString(req.Url.Query);
        var key = query["key"];
        var expected = Environment.GetEnvironmentVariable("ADMIN_KEY") ?? "gabnadine2026";
        if (key != expected)
        {
            var forbidden = req.CreateResponse(HttpStatusCode.Forbidden);
            await forbidden.WriteStringAsync("Unauthorized");
            return forbidden;
        }

        // ── Parse body
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

        // Validate it parses as a date
        if (!DateTimeOffset.TryParse(body.DeadlineUtc, out var parsed))
        {
            var bad = req.CreateResponse(HttpStatusCode.BadRequest);
            await bad.WriteAsJsonAsync(new { error = "deadlineUtc is not a valid ISO-8601 date" });
            return bad;
        }

        // ── Upsert config entity
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
}

public record AdminConfigRequest(string? DeadlineUtc);
