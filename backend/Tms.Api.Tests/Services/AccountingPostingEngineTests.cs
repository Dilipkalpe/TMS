using Tms.Api.Models;
using Tms.Api.Services.Accounting;

namespace Tms.Api.Tests.Services;

public class AccountingPostingEngineTests
{
    [Fact]
    public void ValidateBalanced_AcceptsEqualDebitCredit()
    {
        var a = Guid.NewGuid();
        var b = Guid.NewGuid();
        var lines = new List<PostingLine>
        {
            new(a, "AR", 1000, 0),
            new(b, "Income", 0, 1000),
        };
        AccountingPostingEngine.ValidateBalanced(lines);
    }

    [Fact]
    public void ValidateBalanced_RejectsUnequal()
    {
        var a = Guid.NewGuid();
        var b = Guid.NewGuid();
        var lines = new List<PostingLine>
        {
            new(a, "AR", 1000, 0),
            new(b, "Income", 0, 900),
        };
        Assert.Throws<InvalidOperationException>(() => AccountingPostingEngine.ValidateBalanced(lines));
    }

    [Fact]
    public void ValidateBalanced_RejectsSingleLine()
    {
        var lines = new List<PostingLine> { new(Guid.NewGuid(), "AR", 100, 0) };
        Assert.Throws<InvalidOperationException>(() => AccountingPostingEngine.ValidateBalanced(lines));
    }

    [Fact]
    public void ValidateBalanced_RejectsBothDebitAndCreditOnLine()
    {
        var lines = new List<PostingLine>
        {
            new(Guid.NewGuid(), "A", 50, 50),
            new(Guid.NewGuid(), "B", 0, 0),
        };
        Assert.Throws<InvalidOperationException>(() => AccountingPostingEngine.ValidateBalanced(lines));
    }

    [Fact]
    public void ValidateBalanced_InvoiceWithGst_Balances()
    {
        var ar = Guid.NewGuid();
        var income = Guid.NewGuid();
        var gst = Guid.NewGuid();
        var lines = new List<PostingLine>
        {
            new(ar, "AR", 1180, 0),
            new(income, "Freight", 0, 1000),
            new(gst, "Output IGST", 0, 180),
        };
        AccountingPostingEngine.ValidateBalanced(lines);
        Assert.Equal(1180, lines.Sum(l => l.Debit));
        Assert.Equal(1180, lines.Sum(l => l.Credit));
    }

    [Fact]
    public void ValidateBalanced_VendorPaymentWithTds_Balances()
    {
        var ap = Guid.NewGuid();
        var bank = Guid.NewGuid();
        var tds = Guid.NewGuid();
        var lines = new List<PostingLine>
        {
            new(ap, "AP", 10000, 0),
            new(bank, "Bank", 0, 9900),
            new(tds, "TDS Payable", 0, 100),
        };
        AccountingPostingEngine.ValidateBalanced(lines);
    }

    [Fact]
    public void ValidateBalanced_ReceiptWithTdsReceivable_Balances()
    {
        var bank = Guid.NewGuid();
        var tds = Guid.NewGuid();
        var ar = Guid.NewGuid();
        var lines = new List<PostingLine>
        {
            new(bank, "Bank", 9800, 0),
            new(tds, "TDS Receivable", 200, 0),
            new(ar, "AR", 0, 10000),
        };
        AccountingPostingEngine.ValidateBalanced(lines);
    }
}
