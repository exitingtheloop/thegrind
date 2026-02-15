using Azure.Data.Tables;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureServices(services =>
    {
        var connStr = Environment.GetEnvironmentVariable("AzureWebJobsStorage")
                      ?? "UseDevelopmentStorage=true";

        var tableClient = new TableClient(connStr, "scores");
        tableClient.CreateIfNotExists();

        services.AddSingleton(tableClient);
    })
    .Build();

host.Run();
