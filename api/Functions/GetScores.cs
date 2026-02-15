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

        var all = new List<ScoreResponse>();

        await foreach (var entity in _table.QueryAsync<ScoreEntity>(
            filter: "PartitionKey eq 'wedding'"))
        {
            all.Add(new ScoreResponse(entity.PlayerName, entity.Score, entity.Timestamp));
        }

        // Best score per name, top N
        var top = all
            .GroupBy(s => s.Name.Trim().ToLowerInvariant())
            .Select(g => g.OrderByDescending(s => s.Score).First())
            .OrderByDescending(s => s.Score)
            .Take(limit)
            .ToList();

        var response = req.CreateResponse(HttpStatusCode.OK);
        await response.WriteAsJsonAsync(top);
        return response;
    }
}
