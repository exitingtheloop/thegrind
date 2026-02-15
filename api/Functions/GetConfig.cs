using System.Net;
using Azure;
using Azure.Data.Tables;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using TheGrind.Api.Models;

namespace TheGrind.Api.Functions;

public class GetConfig
{
    private readonly TableClient _configTable;

    public GetConfig(ConfigTableClient configWrapper)
        => _configTable = configWrapper.Table;

    [Function("GetConfig")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "config")] HttpRequestData req)
    {
        ConfigEntity? entity = null;
        try
        {
            var result = await _configTable.GetEntityAsync<ConfigEntity>("config", "deadline");
            entity = result.Value;
        }
        catch (RequestFailedException ex) when (ex.Status == 404)
        {
            // No deadline set yet
        }

        var serverNowUtc = DateTimeOffset.UtcNow;

        var response = req.CreateResponse(HttpStatusCode.OK);
        await response.WriteAsJsonAsync(new
        {
            serverTimeUtc = serverNowUtc.ToString("o"),
            deadlineUtc = entity?.DeadlineUtc
        });
        return response;
    }
}
