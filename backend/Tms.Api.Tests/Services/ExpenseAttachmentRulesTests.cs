using Tms.Api.Services;

namespace Tms.Api.Tests.Services;

public class ExpenseAttachmentRulesTests
{
    [Theory]
    [InlineData("fuel_bill.pdf", true)]
    [InlineData("receipt.JPG", true)]
    [InlineData("invoice.jpeg", true)]
    [InlineData("scan.PNG", true)]
    [InlineData("note.doc", true)]
    [InlineData("note.docx", true)]
    [InlineData("sheet.xls", true)]
    [InlineData("sheet.xlsx", true)]
    [InlineData("malware.exe", false)]
    [InlineData("script.bat", false)]
    [InlineData("payload.js", false)]
    [InlineData("archive.zip", false)]
    [InlineData("", false)]
    [InlineData(null, false)]
    public void IsAllowedExtension_whitelist(string? name, bool expected)
    {
        ExpenseAttachmentRules.IsAllowedExtension(name).Should().Be(expected);
    }

    [Fact]
    public void ValidateUpload_accepts_valid_pdf_under_limit()
    {
        ExpenseAttachmentRules.ValidateUpload("bill.pdf", 1024, currentActiveCount: 0)
            .Should().BeNull();
    }

    [Fact]
    public void ValidateUpload_rejects_oversized_file()
    {
        ExpenseAttachmentRules.ValidateUpload("bill.pdf", ExpenseAttachmentRules.MaxUploadBytes + 1, 0)
            .Should().Contain("5 MB");
    }

    [Fact]
    public void ValidateUpload_rejects_unsafe_extension()
    {
        ExpenseAttachmentRules.ValidateUpload("hack.exe", 100, 0)
            .Should().Contain("Allowed types");
    }

    [Fact]
    public void ValidateUpload_rejects_when_max_attachments_reached()
    {
        ExpenseAttachmentRules.ValidateUpload(
                "extra.pdf",
                100,
                currentActiveCount: ExpenseAttachmentRules.MaxAttachmentsPerExpense)
            .Should().Contain("Maximum");
    }

    [Fact]
    public void ValidateUpload_allows_expense_without_forcing_file()
    {
        // Creating expense without document is optional at API create; upload validator only applies when a file is posted.
        ExpenseAttachmentRules.ValidateUpload(null, 0, 0).Should().Be("No file uploaded.");
    }
}
