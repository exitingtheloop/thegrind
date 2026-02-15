using System.Net;
using System.Web;
using Azure.Data.Tables;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using TheGrind.Api.Models;

namespace TheGrind.Api.Functions;

public class GetScores
{
    private readonly TableClient _table;

    public GetScores(TableClient table) => _table = table;

    [Function("GetScores")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "scores")] HttpRequestData req)
    {
        var query = HttpUtility.ParseQueryString(req.Url.Query);
        var limit = int.TryParse(query["limit"], out var l) ? Math.Clamp(l, 1, 50) : 5;

        var all = new List<object>();

        await foreach (var entity in _table.QueryAsync<ScoreEntity>(
            filter: "PartitionKey eq 'wedding'"))
        {
            all.Add(new { name = entity.PlayerName, score = entity.Score, createdAt = entity.Timestamp });
        }

        // Best score per name, top N
        var top = all
            .GroupBy(s => ((dynamic)s).name.ToString().Trim().ToLowerInvariant())
            .Select(g => g.OrderByDescending(s => (double)((dynamic)s).score).First())
            .OrderByDescending(s => (double)((dynamic)s).score)
            .Take(limit)
            .ToList();

        var response = req.CreateResponse(HttpStatusCode.OK);
        await response.WriteAsJsonAsync(top);
        return response;
    }
}
