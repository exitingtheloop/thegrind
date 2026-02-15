using Azure;
using Azure.Data.Tables;

namespace TheGrind.Api.Models;

public class ScoreEntity : ITableEntity
{
    public string PartitionKey { get; set; } = "wedding";
    public string RowKey { get; set; } = Guid.NewGuid().ToString();
    public string PlayerName { get; set; } = "";
    public double Score { get; set; }
    public string? DeviceId { get; set; }
    public DateTimeOffset? Timestamp { get; set; }
    public ETag ETag { get; set; }
}
