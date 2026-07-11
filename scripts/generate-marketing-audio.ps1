# Generates TMS Pro marketing voiceover (Windows SAPI)
$ErrorActionPreference = "Stop"
$outDir = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "..\marketing"
$wav = Join-Path $outDir "TMS-Pro-Marketing-narration.wav"

$text = @"
TMS Pro. The complete transport management system for Indian logistics.
Manage bookings and lorry receipts from one dashboard.
Track your fleet with live GPS monitoring.
HR, payroll, and accounting — all integrated in one platform.
Transform your transport business today.
Visit codeestack dot vercel dot app, or call 9 9 2 3 2 6 2 4 8 9.
"@

Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.Rate = 0
$synth.Volume = 100
$synth.SetOutputToWaveFile($wav)
$synth.Speak($text.Trim())
$synth.Dispose()

Write-Host "Narration saved: $wav"
