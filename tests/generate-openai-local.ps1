$ErrorActionPreference = "Stop"

if (-not $env:OPENAI_API_KEY) {
    throw "Set OPENAI_API_KEY in this PowerShell session first."
}

$root = Split-Path -Parent $PSScriptRoot
$outputDir = Join-Path $root "output"
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$prompt = @"
Create a promotional poster.

Brand: Mark's Coffee
Product: coffee
Offer: 20% off
Format: 1024x1536
Style: Bold, modern, high contrast, clean retail promo style.
Headline: 20% OFF COFFEE
CTA: Order today

Keep all poster text readable.
Do not invent extra brand names.
Do not add unreadable small text.
"@

$body = @{
    model = "gpt-image-1-mini"
    prompt = $prompt
    size = "1024x1536"
    quality = "low"
    n = 1
} | ConvertTo-Json

$headers = @{
    Authorization = "Bearer $env:OPENAI_API_KEY"
    "Content-Type" = "application/json"
}

$response = Invoke-RestMethod `
    -Uri "https://api.openai.com/v1/images/generations" `
    -Method Post `
    -Headers $headers `
    -Body $body

$base64 = $response.data[0].b64_json
if (-not $base64) {
    throw "OpenAI response did not include image data."
}

$bytes = [Convert]::FromBase64String($base64)
$file = Join-Path $outputDir ("coffee-poster-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".png")
[IO.File]::WriteAllBytes($file, $bytes)

Write-Host "Generated poster:"
Write-Host $file

