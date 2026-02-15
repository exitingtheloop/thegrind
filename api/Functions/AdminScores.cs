using System.Net;
using System.Web;
using Azure.Data.Tables;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using TheGrind.Api.Models;

namespace TheGrind.Api.Functions;

public class AdminScores
{
    private readonly TableClient _table;

    public AdminScores(TableClient table) => _table = table;

    [Function("AdminScores")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "admin/scores")] HttpRequestData req)
    {
        // Simple secret key check
        var query = HttpUtility.ParseQueryString(req.Url.Query);
        var key = query["key"];
        var expected = Environment.GetEnvironmentVariable("ADMIN_KEY") ?? "gabnadine2026";

        if (key != expected)
        {
            var forbidden = req.CreateResponse(HttpStatusCode.Forbidden);
            await forbidden.WriteStringAsync("Unauthorized");
            return forbidden;
        }

        var all = new List<object>();

        await foreach (var entity in _table.QueryAsync<ScoreEntity>(
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
}
