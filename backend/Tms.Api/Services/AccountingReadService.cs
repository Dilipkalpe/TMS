using Dapper;
using Npgsql;

namespace Tms.Api.Services;

/// <summary>High-performance accounting reads via PostgreSQL stored procedures.</summary>
public sealed class AccountingReadService(IConfiguration config, ILogger<AccountingReadService> logger)
{
    public const int DefaultRegisterLimit = 5000;
    public const int MaxRegisterLimit = 50_000;

    public async Task<List<object>?> TryGetCustomerLedgerAsync(
        Guid companyId,
        string? customerId,
        DateOnly? fromDate,
        DateOnly? toDate,
        CancellationToken ct = default)
    {
        try
        {
            await using var conn = await SqlReadConnection.OpenReadAsync(config, ct);
            var rows = (await conn.QueryAsync<LedgerReportRow>(
                new CommandDefinition(
                    """
                    SELECT * FROM sp_accounting_customer_ledger(
                        @p_company_id, @p_customer_id, @p_from_date, @p_to_date)
                    """,
                    new
                    {
                        p_company_id = companyId,
                        p_customer_id = (object?)customerId ?? DBNull.Value,
                        p_from_date = (object?)fromDate ?? DBNull.Value,
                        p_to_date = (object?)toDate ?? DBNull.Value,
                    },
                    commandTimeout: SchemaMigrationHelper.CommandTimeoutSeconds,
                    cancellationToken: ct))).ToList();

            return rows.Select(r => r.ToApiObject()).Cast<object>().ToList();
        }
        catch (PostgresException ex) when (ex.SqlState is "42883")
        {
            logger.LogDebug("sp_accounting_customer_ledger not installed — using EF fallback");
            return null;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Customer ledger SP failed — using EF fallback");
            return null;
        }
    }

    public async Task<List<object>?> TryGetLedgerReportAsync(
        Guid companyId,
        DateOnly? fromDate,
        DateOnly? toDate,
        CancellationToken ct = default)
    {
        try
        {
            await using var conn = await SqlReadConnection.OpenReadAsync(config, ct);
            var rows = (await conn.QueryAsync<LedgerReportRow>(
                new CommandDefinition(
                    """
                    SELECT * FROM sp_accounting_ledger_report(
                        @p_company_id, @p_from_date, @p_to_date)
                    """,
                    new
                    {
                        p_company_id = companyId,
                        p_from_date = (object?)fromDate ?? DBNull.Value,
                        p_to_date = (object?)toDate ?? DBNull.Value,
                    },
                    commandTimeout: SchemaMigrationHelper.CommandTimeoutSeconds,
                    cancellationToken: ct))).ToList();

            return rows.Select(r => r.ToApiObject()).Cast<object>().ToList();
        }
        catch (PostgresException ex) when (ex.SqlState is "42883")
        {
            logger.LogDebug("sp_accounting_ledger_report not installed — using EF fallback");
            return null;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Ledger report SP failed — using EF fallback");
            return null;
        }
    }

    public async Task<object?> TryGetRegisterAsync(
        Guid companyId,
        string registerType,
        int limit = DefaultRegisterLimit,
        DateOnly? fromDate = null,
        DateOnly? toDate = null,
        CancellationToken ct = default)
    {
        if (!AccountingRegisterJobService.RegisterTypes.Contains(registerType))
            return null;

        var spName = RegisterProcedureName(registerType);
        var boundedLimit = Math.Clamp(limit, 1, MaxRegisterLimit);

        try
        {
            await using var conn = await SqlReadConnection.OpenReadAsync(config, ct);
            var rows = registerType switch
            {
                "journal" => await QueryRegisterAsync<JournalRegisterRow>(
                    conn, spName, companyId, boundedLimit, fromDate, toDate, ct),
                "receipt" => await QueryRegisterAsync<ReceiptPaymentRegisterRow>(
                    conn, spName, companyId, boundedLimit, fromDate, toDate, ct),
                "payment" => await QueryRegisterAsync<ReceiptPaymentRegisterRow>(
                    conn, spName, companyId, boundedLimit, fromDate, toDate, ct),
                "purchase" => await QueryRegisterAsync<PurchaseRegisterRow>(
                    conn, spName, companyId, boundedLimit, fromDate, toDate, ct),
                "sales" => await QueryRegisterAsync<SalesRegisterRow>(
                    conn, spName, companyId, boundedLimit, fromDate, toDate, ct),
                _ => null,
            };

            return rows;
        }
        catch (PostgresException ex) when (ex.SqlState is "42883")
        {
            logger.LogDebug("{Sp} not installed — using EF fallback for {Type}", spName, registerType);
            return null;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Register SP {Type} failed — using EF fallback", registerType);
            return null;
        }
    }

    static string RegisterProcedureName(string registerType) => registerType switch
    {
        "journal" => "sp_accounting_register_journal",
        "receipt" => "sp_accounting_register_receipt",
        "payment" => "sp_accounting_register_payment",
        "purchase" => "sp_accounting_register_purchase",
        "sales" => "sp_accounting_register_sales",
        _ => throw new ArgumentException($"Unknown register type: {registerType}", nameof(registerType)),
    };

    static async Task<object> QueryRegisterAsync<TRow>(
        NpgsqlConnection conn,
        string spName,
        Guid companyId,
        int limit,
        DateOnly? fromDate,
        DateOnly? toDate,
        CancellationToken ct)
        where TRow : IRegisterApiRow
    {
        var sql = $"""
            SELECT * FROM {spName}(
                @p_company_id, @p_limit, @p_from_date, @p_to_date)
            """;
        var rows = (await conn.QueryAsync<TRow>(
            new CommandDefinition(
                sql,
                new
                {
                    p_company_id = companyId,
                    p_limit = limit,
                    p_from_date = (object?)fromDate ?? DBNull.Value,
                    p_to_date = (object?)toDate ?? DBNull.Value,
                },
                commandTimeout: SchemaMigrationHelper.CommandTimeoutSeconds,
                cancellationToken: ct))).ToList();

        return rows.Select(r => r.ToApiObject()).ToList();
    }

    interface IRegisterApiRow { object ToApiObject(); }

    sealed class LedgerReportRow
    {
        public DateOnly line_date { get; init; }
        public string voucher { get; init; } = "";
        public string particular { get; init; } = "";
        public string ref_no { get; init; } = "";
        public decimal debit { get; init; }
        public decimal credit { get; init; }
        public decimal balance { get; init; }

        public object ToApiObject() => new
        {
            date = line_date.ToString("yyyy-MM-dd"),
            voucher,
            voucherNo = voucher,
            particular,
            refNo = ref_no ?? "",
            debit,
            credit,
            balance,
        };
    }

    sealed class JournalRegisterRow : IRegisterApiRow
    {
        public DateOnly row_date { get; init; }
        public string voucher_no { get; init; } = "";
        public string debit_ledger { get; init; } = "";
        public string credit_ledger { get; init; } = "";
        public decimal amount { get; init; }
        public string? narration { get; init; }

        public object ToApiObject() => new
        {
            date = row_date.ToString("yyyy-MM-dd"),
            voucherNo = voucher_no,
            debitLedger = debit_ledger,
            creditLedger = credit_ledger,
            amount,
            narration,
        };
    }

    sealed class ReceiptPaymentRegisterRow : IRegisterApiRow
    {
        public DateOnly row_date { get; init; }
        public string voucher_no { get; init; } = "";
        public string? party { get; init; }
        public string? mode { get; init; }
        public decimal amount { get; init; }
        public string? narration { get; init; }

        public object ToApiObject() => new
        {
            date = row_date.ToString("yyyy-MM-dd"),
            voucherNo = voucher_no,
            party,
            mode,
            amount,
            narration,
        };
    }

    sealed class PurchaseRegisterRow : IRegisterApiRow
    {
        public DateOnly row_date { get; init; }
        public string bill_no { get; init; } = "";
        public string? vendor { get; init; }
        public decimal amount { get; init; }
        public decimal gst { get; init; }
        public decimal total { get; init; }

        public object ToApiObject() => new
        {
            date = row_date.ToString("yyyy-MM-dd"),
            billNo = bill_no,
            vendor,
            amount,
            gst,
            total,
        };
    }

    sealed class SalesRegisterRow : IRegisterApiRow
    {
        public DateOnly row_date { get; init; }
        public string lr_no { get; init; } = "";
        public string? customer { get; init; }
        public string route { get; init; } = "";
        public decimal freight { get; init; }
        public decimal gst { get; init; }
        public decimal total { get; init; }

        public object ToApiObject() => new
        {
            date = row_date.ToString("yyyy-MM-dd"),
            lrNo = lr_no,
            customer,
            route,
            freight,
            gst,
            total,
        };
    }
}
