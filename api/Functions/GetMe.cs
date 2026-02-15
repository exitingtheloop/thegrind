using System.Net;
using System.Web;
using Azure.Data.Tables;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using TheGrind.Api.Models;

namespace TheGrind.Api.Functions;

/// <summary>
/// GET /api/me?deviceId=xxx
/// Returns the player's locked name and best score for this device.
/// </summary>
public class GetMe
{
    private readonly TableClient _table;

    public GetMe(TableClient table) => _table = table;

    [Function("GetMe")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "me")] HttpRequestData req)
    {
        var query = HttpUtility.ParseQueryString(req.Url.Query);
        var deviceId = query["deviceId"]?.Trim();

        if (string.IsNullOrEmpty(deviceId))
        {
            var response = req.CreateResponse(HttpStatusCode.OK);
            await response.WriteAsJsonAsync(new { found = false });
            return response;
        }

        await foreach (var entity in _table.QueryAsync<ScoreEntity>(
            filter: $"PartitionKey eq 'wedding'"))
        {
            if (string.Equals(entity.DeviceId, deviceId, StringComparison.Ordinal))
            {
                var response = req.CreateResponse(HttpStatusCode.OK);
                await response.WriteAsJsonAsync(new
                {
                    found = true,
                    name = entity.PlayerName,
                    score = entity.Score
                });
                return response;
            }
        }

        var notFound = req.CreateResponse(HttpStatusCode.OK);
        await notFound.WriteAsJsonAsync(new { found = false });
        return notFound;
    }
}
