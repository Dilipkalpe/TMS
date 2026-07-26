# Phase 1 commercial E2E verification against a live TMS API.
# Usage: .\deploy\verify-phase1.ps1 [-BaseUrl http://144.91.98.218:8080/api]

param(
    [string]$BaseUrl = "http://144.91.98.218:8080/api",
    [string]$Username = "admin",
    [string]$Password = "admin123"
)

$ErrorActionPreference = "Stop"
$outDir = Join-Path $PSScriptRoot "verify-evidence"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = Join-Path $outDir "phase1-$stamp.jsonl"

function Write-Evidence($step, $method, $path, $status, $body) {
    $safeBody = $body
    if ($safeBody -is [string]) {
        $safeBody = $safeBody -replace 'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+', '[REDACTED_JWT]'
    }
    elseif ($safeBody -is [System.Management.Automation.PSObject] -or $safeBody -is [hashtable]) {
        $clone = $safeBody | ConvertTo-Json -Depth 12 | ConvertFrom-Json
        if ($clone.PSObject.Properties.Name -contains 'token') { $clone.token = '[REDACTED_JWT]' }
        if ($clone.PSObject.Properties.Name -contains 'accessToken') { $clone.accessToken = '[REDACTED_JWT]' }
        $safeBody = $clone
    }
    $entry = [ordered]@{
        at     = (Get-Date).ToString("o")
        step   = $step
        method = $method
        path   = $path
        status = $status
        body   = $safeBody
    }
    ($entry | ConvertTo-Json -Depth 12 -Compress) | Add-Content -Path $logFile
    Write-Host ""
    Write-Host "=== $step [$status] $method $path ===" -ForegroundColor Cyan
    $preview = if ($null -eq $safeBody) { "(empty)" } elseif ($safeBody -is [string]) { $safeBody } else { ($safeBody | ConvertTo-Json -Depth 8) }
    if ($preview.Length -gt 1200) { $preview = $preview.Substring(0, 1200) + "..." }
    Write-Host $preview
}

function Invoke-Api {
    param(
        [string]$Step,
        [string]$Method,
        [string]$Path,
        [object]$Body = $null,
        [hashtable]$Headers = @{},
        [int[]]$OkStatuses = @(200, 201)
    )
    $uri = "$BaseUrl$Path"
    $hdrs = @{ "Content-Type" = "application/json" } + $Headers
    $jsonBody = if ($null -ne $Body) { ($Body | ConvertTo-Json -Depth 10 -Compress) } else { $null }
    try {
        if ($null -ne $jsonBody) {
            $resp = Invoke-WebRequest -Uri $uri -Method $Method -Headers $hdrs -Body $jsonBody -UseBasicParsing
        } else {
            $resp = Invoke-WebRequest -Uri $uri -Method $Method -Headers $hdrs -UseBasicParsing
        }
        $parsed = $null
        try { $parsed = $resp.Content | ConvertFrom-Json } catch { $parsed = $resp.Content }
        Write-Evidence $Step $Method $Path ([int]$resp.StatusCode) $parsed
        if ($OkStatuses -notcontains [int]$resp.StatusCode) {
            throw "Unexpected status $([int]$resp.StatusCode) for $Step"
        }
        return $parsed
    }
    catch {
        $status = 0
        $errBody = $_.Exception.Message
        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
            try {
                $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
                $errBody = $reader.ReadToEnd()
                try { $errBody = $errBody | ConvertFrom-Json } catch {}
            } catch {}
        }
        Write-Evidence $Step $Method $Path $status $errBody
        throw
    }
}

Write-Host "Phase 1 E2E against $BaseUrl" -ForegroundColor Yellow
Write-Host "Evidence: $logFile"

# 0) Health
$health = Invoke-Api -Step "health" -Method GET -Path "/health" -OkStatuses @(200)

# 1) Login
$login = Invoke-Api -Step "login" -Method POST -Path "/auth/login" -Body @{
    username = $Username
    password = $Password
}
$token = $login.token
if (-not $token) { $token = $login.accessToken }
if (-not $token) { throw "Login succeeded but no token field found." }
$auth = @{ Authorization = "Bearer $token" }
$companyId = $login.companyId
if (-not $companyId -and $login.isPlatformAdmin) {
    $companies = Invoke-Api -Step "list-platform-companies" -Method GET -Path "/platform/companies" -Headers $auth
    $first = @($companies) | Select-Object -First 1
    $companyId = $first.id
}
if ($companyId) { $auth["X-Company-Id"] = [string]$companyId }
else { throw "No companyId available for tenant-scoped API calls." }

# Probe commercial routes exist
try {
    $null = Invoke-Api -Step "probe-freight-rates" -Method GET -Path "/freight-rates" -Headers $auth -OkStatuses @(200)
} catch {
    Write-Host ""
    Write-Host "FAIL: /freight-rates not available on this server." -ForegroundColor Red
    Write-Host "Deploy commit 87d4ec8 (or later) before Phase 1 E2E can pass." -ForegroundColor Red
    Write-Host "Health build stamp: $($health.build)" -ForegroundColor Yellow
    exit 2
}

# 2) Create freight rate
$rate = Invoke-Api -Step "create-freight-rate" -Method POST -Path "/freight-rates" -Headers $auth -Body @{
    fromCity    = "Mumbai"
    toCity      = "Pune"
    vehicleType = "32ft"
    rateAmount  = 18500
    rateUnit    = "PerTrip"
    isActive    = $true
    notes       = "Phase1 E2E $stamp"
} -OkStatuses @(200, 201)

# 3) Create quotation (linked to rate)
$quote = Invoke-Api -Step "create-quotation" -Method POST -Path "/quotations" -Headers $auth -Body @{
    customerName  = "E2E Verify Customer"
    fromCity       = "Mumbai"
    toCity         = "Pune"
    vehicleType    = "32ft"
    freight        = 18500
    freightRateId  = $rate.id
    notes          = "Phase1 E2E $stamp"
} -OkStatuses @(200, 201)

# 4) Send + Accept
$null = Invoke-Api -Step "send-quotation" -Method POST -Path "/quotations/$($quote.id)/send" -Headers $auth
$accepted = Invoke-Api -Step "accept-quotation" -Method POST -Path "/quotations/$($quote.id)/accept" -Headers $auth

# 5) Convert to booking
$converted = Invoke-Api -Step "convert-to-booking" -Method POST -Path "/quotations/$($quote.id)/convert-to-booking" -Headers $auth
$bookingId = $converted.booking.id
if (-not $bookingId) { $bookingId = $converted.bookingId }
if (-not $bookingId) { throw "Convert response missing booking id" }

# 6) Create freight invoice from booking
$invoice = Invoke-Api -Step "create-freight-invoice" -Method POST -Path "/freight-invoices" -Headers $auth -Body @{
    bookingId = $bookingId
    billType  = "FC"
} -OkStatuses @(200, 201)

# 7) Payment allocation to invoice
$payAmount = [math]::Round([decimal]$invoice.balance / 2, 2)
if ($payAmount -le 0) { $payAmount = [math]::Round([decimal]$invoice.totalAmount / 2, 2) }
if ($payAmount -le 0) { $payAmount = 1000 }
$payment = Invoke-Api -Step "payment-to-invoice" -Method POST -Path "/bookings/$bookingId/payments" -Headers $auth -Body @{
    amount           = $payAmount
    paymentMode      = "NEFT"
    referenceNo      = "E2E-$stamp"
    remarks          = "Phase1 invoice allocation"
    freightInvoiceId = $invoice.id
} -OkStatuses @(200, 201)

# 8) Sales register
$sales = Invoke-Api -Step "sales-register" -Method GET -Path "/accounting/sales-register" -Headers $auth
$salesArr = @()
if ($sales -is [System.Array]) { $salesArr = $sales }
elseif ($sales.items) { $salesArr = @($sales.items) }
elseif ($sales -is [object]) { $salesArr = @($sales) }

$invoiceNo = $invoice.invoiceNo
$hit = $salesArr | Where-Object {
    ($_.lrNo -eq $invoiceNo) -or ($_.invoiceNo -eq $invoiceNo) -or ("$($_.lrNo)" -eq "$invoiceNo")
} | Select-Object -First 1

$summary = [ordered]@{
    baseUrl              = $BaseUrl
    healthBuild          = $health.build
    freightRateId        = $rate.id
    quotationId          = $quote.id
    quotationStatus      = $accepted.status
    bookingId            = $bookingId
    freightInvoiceId     = $invoice.id
    freightInvoiceNo     = $invoiceNo
    paymentId            = $payment.id
    paymentAmount        = $payAmount
    salesRegisterCount   = $salesArr.Count
    salesRegisterHasInv  = [bool]$hit
    salesRegisterSample  = $hit
    evidenceFile         = $logFile
    passed               = [bool]$hit
}

$summaryPath = Join-Path $outDir "phase1-summary-$stamp.json"
$summary | ConvertTo-Json -Depth 8 | Set-Content -Path $summaryPath
Write-Host ""
Write-Host "SUMMARY -> $summaryPath" -ForegroundColor Green
$summary | ConvertTo-Json -Depth 6
if (-not $hit) {
    Write-Host "WARN: Invoice $invoiceNo not found in sales register rows (count=$($salesArr.Count))." -ForegroundColor Yellow
    exit 3
}
Write-Host "PASS: Phase 1 E2E verified." -ForegroundColor Green
exit 0
