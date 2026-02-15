using Azure.Data.Tables;

namespace TheGrind.Api.Models;

/// <summary>
/// Wrapper to distinguish the config TableClient from the scores TableClient in DI.
/// </summary>
public class ConfigTableClient
{
    public TableClient Table { get; }
    public ConfigTableClient(TableClient table) => Table = table;
}
