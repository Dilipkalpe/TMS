using Npgsql;
using NpgsqlTypes;

namespace Tms.Api.Services;

/// <summary>Typed PostgreSQL parameters — prevents "unknown" type when calling stored procedures with NULLs.</summary>
public static class NpgsqlParameterHelper
{
    public static NpgsqlParameter Uuid(string name, Guid value) => new(name, NpgsqlDbType.Uuid) { Value = value };

    public static NpgsqlParameter Uuid(string name, Guid? value) => new(name, NpgsqlDbType.Uuid)
    {
        Value = value is Guid g ? g : DBNull.Value,
    };

    public static NpgsqlParameter Date(string name, DateOnly? value) => new(name, NpgsqlDbType.Date)
    {
        Value = value is DateOnly d ? d : DBNull.Value,
    };

    public static NpgsqlParameter Text(string name, string? value) => new(name, NpgsqlDbType.Text)
    {
        Value = string.IsNullOrWhiteSpace(value) ? DBNull.Value : value,
    };

    public static NpgsqlParameter Varchar(string name, string? value) => new(name, NpgsqlDbType.Varchar)
    {
        Value = string.IsNullOrWhiteSpace(value) ? DBNull.Value : value,
    };

    public static NpgsqlParameter Numeric(string name, decimal value) => new(name, NpgsqlDbType.Numeric) { Value = value };

    public static NpgsqlParameter Bool(string name, bool value) => new(name, NpgsqlDbType.Boolean) { Value = value };
}
