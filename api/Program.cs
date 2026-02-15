using Azure.Data.Tables;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using TheGrind.Api.Models;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureServices(services =>
    {
        var connStr = Environment.GetEnvironmentVariable("AzureWebJobsStorage")
                      ?? "UseDevelopmentStorage=true";

        // Scores table
        var scoresTable = new TableClient(connStr, "scores");
        scoresTable.CreateIfNotExists();
        services.AddSingleton(scoresTable);

        // Config table (deadline etc.) — wrapped to avoid DI collision
        var configTable = new TableClient(connStr, "config");
        configTable.CreateIfNotExists();
        services.AddSingleton(new ConfigTableClient(configTable));
    })
    .Build();

host.Run();
