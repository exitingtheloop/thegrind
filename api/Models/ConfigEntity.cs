using Azure;
using Azure.Data.Tables;

namespace TheGrind.Api.Models;

public class ConfigEntity : ITableEntity
{
    public string PartitionKey { get; set; } = "config";
    public string RowKey { get; set; } = "deadline";

    /// <summary>ISO-8601 deadline timestamp (UTC).</summary>
    public string? DeadlineUtc { get; set; }

    public DateTimeOffset? Timestamp { get; set; }
    public ETag ETag { get; set; }
}
