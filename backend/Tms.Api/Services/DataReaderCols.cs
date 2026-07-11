using System.Data;

namespace Tms.Api.Services;

static class DataReaderCols
{
    public static bool HasColumn(IDataReader r, string name)
    {
        for (var i = 0; i < r.FieldCount; i++)
        {
            if (string.Equals(r.GetName(i), name, StringComparison.OrdinalIgnoreCase))
                return true;
        }
        return false;
    }

    public static int ColOrdinal(IDataReader r, string name) =>
        HasColumn(r, name) ? r.GetOrdinal(name) : -1;

    public static Guid ColGuid(IDataReader r, string name) => r.GetGuid(r.GetOrdinal(name));

    public static string ColString(IDataReader r, string name) => r.GetString(r.GetOrdinal(name));

    public static int ColInt32(IDataReader r, string name) => r.GetInt32(r.GetOrdinal(name));

    public static long ColInt64(IDataReader r, string name) => r.GetInt64(r.GetOrdinal(name));

    public static decimal ColDecimal(IDataReader r, string name) => r.GetDecimal(r.GetOrdinal(name));

    public static bool ColBool(IDataReader r, string name) => r.GetBoolean(r.GetOrdinal(name));

    public static string? ColStringN(IDataReader r, string name)
    {
        var i = ColOrdinal(r, name);
        return i < 0 || r.IsDBNull(i) ? null : r.GetString(i);
    }

    public static DateTime? ColDateTimeN(IDataReader r, string name)
    {
        var i = ColOrdinal(r, name);
        return i < 0 || r.IsDBNull(i) ? null : r.GetDateTime(i);
    }

    public static Guid? ColGuidN(IDataReader r, string name)
    {
        var i = ColOrdinal(r, name);
        return i < 0 || r.IsDBNull(i) ? null : r.GetGuid(i);
    }

    public static decimal ColDecimalN(IDataReader r, string name)
    {
        var i = ColOrdinal(r, name);
        return i < 0 || r.IsDBNull(i) ? 0 : r.GetDecimal(i);
    }

    public static int? ColInt32N(IDataReader r, string name)
    {
        var i = ColOrdinal(r, name);
        return i < 0 || r.IsDBNull(i) ? null : r.GetInt32(i);
    }

    public static DateOnly? ColDateOnlyN(IDataReader r, string name)
    {
        var i = ColOrdinal(r, name);
        return i < 0 || r.IsDBNull(i) ? null : DateOnly.FromDateTime(r.GetDateTime(i));
    }
}
