$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$assetRoot = Join-Path $root "templates\asset-folder-example"
$commandText = "poster wakepark day pass promo portrait"

function Parse-PosterCommand {
    param([string]$Text)

    if ($Text -notmatch '^poster\s+') {
        throw "Invalid command. Use: poster product offer size"
    }

    $body = ($Text -replace '^poster\s*', '').Trim()
    $tokens = $body -split '\s+' | Where-Object { $_ }
    $product = $tokens[0].ToLowerInvariant()
    $sizeToken = ($tokens | Where-Object { $_ -in @('square', 'portrait', 'story', 'landscape') } | Select-Object -First 1)
    if (-not $sizeToken) { $sizeToken = "portrait" }
    $size = if ($sizeToken -eq "square") { "1024x1024" } elseif ($sizeToken -eq "landscape") { "1536x1024" } else { "1024x1536" }
    $offer = (($tokens | Select-Object -Skip 1) | Where-Object { $_ -notin @('square', 'portrait', 'story', 'landscape') }) -join ' '

    [pscustomobject]@{
        product = $product
        offer = if ($offer) { $offer } else { "Special offer" }
        size = $size
        cta = "Order today"
    }
}

function Find-Manifest {
    param([string]$Product)

    foreach ($folder in Get-ChildItem -Path $assetRoot -Directory) {
        $manifestPath = Join-Path $folder.FullName "manifest.json"
        if (Test-Path $manifestPath) {
            $manifest = Get-Content -Raw $manifestPath | ConvertFrom-Json
            $names = @($manifest.product) + @($manifest.aliases)
            if ($names.ToLowerInvariant() -contains $Product.ToLowerInvariant()) {
                return [pscustomobject]@{ folder = $folder.FullName; manifest = $manifest }
            }
        }
    }

    throw "No manifest found for product '$Product'."
}

function Test-ManifestAssets {
    param($Match)

    $categoryFolders = $Match.manifest.categoryFolders.PSObject.Properties
    $missingCategories = @()
    foreach ($category in $categoryFolders) {
        $path = Join-Path $Match.folder $category.Value
        if (-not (Test-Path $path)) {
            $missingCategories += "$($category.Name): $($category.Value)"
        }
    }

    $assets = $Match.manifest.assets.PSObject.Properties
    $missing = @()
    foreach ($asset in $assets) {
        $path = Join-Path $Match.folder $asset.Value
        if (-not (Test-Path $path)) {
            $missing += "$($asset.Name): $($asset.Value)"
        }
    }

    if ($missingCategories.Count -gt 0) {
        throw "Missing category folders: $($missingCategories -join ', ')"
    }

    if ($missing.Count -gt 0) {
        throw "Missing assets: $($missing -join ', ')"
    }
}

function Build-Prompt {
    param($Command, $Manifest)

    @(
        "Create a promotional poster."
        ""
        "Brand: $($Manifest.brand)"
        "Product: $($Manifest.product)"
        "Offer: $($Command.offer)"
        "Format: $($Command.size)"
        "Style: $($Manifest.styleNotes)"
        "Available asset categories: $((($Manifest.categoryFolders.PSObject.Properties | Select-Object -ExpandProperty Name) -join ', '))"
        "Headline: $($Command.offer.ToUpperInvariant()) $($Manifest.product.ToUpperInvariant())"
        "CTA: $($Command.cta)"
        ""
        "Use the provided brand and product assets."
        "Keep all poster text readable."
        "Do not invent extra brand names."
    ) -join [Environment]::NewLine
}

function Build-CanvaBrief {
    param($Command, $Manifest, [string]$Prompt)

    [pscustomobject]@{
        title = "$($Manifest.product) - $($Command.offer)"
        designType = "poster"
        brand = $Manifest.brand
        product = $Manifest.product
        offer = $Command.offer
        size = $Command.size
        cta = $Command.cta
        assetCategories = @($Manifest.categoryFolders.PSObject.Properties | Select-Object -ExpandProperty Name)
        requiredAssets = $Manifest.assets
        prompt = $Prompt
    }
}

$parsed = Parse-PosterCommand $commandText
$match = Find-Manifest $parsed.product
Test-ManifestAssets $match
$prompt = Build-Prompt $parsed $match.manifest
$canvaBrief = Build-CanvaBrief $parsed $match.manifest $prompt

Write-Host "Local checks passed."
Write-Host ""
Write-Host "Sample command: $commandText"
Write-Host ""
Write-Host "Generated prompt:"
Write-Host $prompt
Write-Host ""
Write-Host "Canva brief:"
$canvaBrief | ConvertTo-Json -Depth 5
