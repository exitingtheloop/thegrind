using System.Net;
using System.Web;
using Azure.Data.Tables;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using TheGrind.Api.Models;

namespace TheGrind.Api.Functions;

public class AdminReset
{
    private readonly TableClient _scoresTable;

    public AdminReset(TableClient scoresTable)
    {
        _scoresTable = scoresTable;
    }

    /// <summary>
    /// DELETE /api/admin/scores?key=xxx
    /// Deletes ALL score entities from the scores table.
    /// </summary>
    [Function("AdminReset")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "admin/scores")] HttpRequestData req)
    {
        var query = HttpUtility.ParseQueryString(req.Url.Query);
        var key = query["key"];
        var expected = Environment.GetEnvironmentVariable("ADMIN_KEY") ?? "gabnadine2026";
        if (key != expected)
        {
            var forbidden = req.CreateResponse(HttpStatusCode.Forbidden);
            await forbidden.WriteStringAsync("Unauthorized");
            return forbidden;
        }

        // Delete all score entities
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
