namespace Tms.Api.Services;

/// <summary>Shared validation for Expense Management supporting documents.</summary>
public static class ExpenseAttachmentRules
{
    public static readonly HashSet<string> AllowedExtensions =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx", ".xls", ".xlsx"
        };

    public const long MaxUploadBytes = 5 * 1024 * 1024;
    public const int MaxAttachmentsPerExpense = 10;

    public static bool IsAllowedExtension(string? fileNameOrExtension)
    {
        if (string.IsNullOrWhiteSpace(fileNameOrExtension)) return false;
        var ext = fileNameOrExtension.Contains('.')
            ? Path.GetExtension(fileNameOrExtension)
            : "." + fileNameOrExtension.Trim().TrimStart('.');
        return AllowedExtensions.Contains(ext.ToLowerInvariant());
    }

    public static string? ValidateUpload(string? fileName, long length, int currentActiveCount)
    {
        if (string.IsNullOrWhiteSpace(fileName) || length <= 0)
            return "No file uploaded.";
        if (length > MaxUploadBytes)
            return "File exceeds the 5 MB maximum size.";
        if (!IsAllowedExtension(fileName))
            return "Allowed types: PDF, JPG, JPEG, PNG, DOC, DOCX, XLS, XLSX.";
        if (currentActiveCount >= MaxAttachmentsPerExpense)
            return $"Maximum {MaxAttachmentsPerExpense} documents per expense.";
        return null;
    }
}
