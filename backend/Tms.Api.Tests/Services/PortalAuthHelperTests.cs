using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Tms.Api.Models;
using Tms.Api.Services;

namespace Tms.Api.Tests.Services;

public class PortalAuthHelperTests
{
    static readonly Guid CompanyId = Guid.Parse("00000000-0000-4000-8000-000000000099");

    [Theory]
    [InlineData("919876543210", "9876543210")]
    [InlineData("9876543210", "9876543210")]
    public void PhoneSuffix_returns_last_ten_digits(string normalized, string expected)
    {
        PortalAuthHelper.PhoneSuffix(normalized).Should().Be(expected);
    }

    [Fact]
    public void WherePortalPhoneMayMatch_filters_in_sql_before_bcrypt()
    {
        var customers = new List<Customer>
        {
            new() { Id = "C1", CompanyId = CompanyId, Name = "Match", Phone = "9876543210", PortalEnabled = true, PortalPinHash = "x" },
            new() { Id = "C2", CompanyId = CompanyId, Name = "Other", Phone = "9123456789", PortalEnabled = true, PortalPinHash = "x" },
            new() { Id = "C3", CompanyId = CompanyId, Name = "PortalPhone", PortalPhone = "+91 98765 43210", PortalEnabled = true, PortalPinHash = "x" },
        }.AsQueryable();

        var normalized = NotificationTemplateRenderer.NormalizePhone("9876543210");
        var filtered = PortalAuthHelper
            .WherePortalPhoneMayMatch(customers.Where(c => c.PortalEnabled), normalized)
            .ToList();

        filtered.Should().HaveCount(2);
        filtered.Select(c => c.Id).Should().BeEquivalentTo(["C1", "C3"]);
    }

    [Fact]
    public void PhoneMatches_compares_normalized_values()
    {
        PortalAuthHelper.PhoneMatches("09876543210", "919876543210").Should().BeTrue();
        PortalAuthHelper.PhoneMatches("9123456789", "919876543210").Should().BeFalse();
    }
}
