$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$assetRoot = Join-Path $root "templates\asset-folder-example"
$commandText = 'poster wakepark day pass promo portrait peg="bold sports layout with energetic color"'

function Parse-PosterCommand {
    param([string]$Text)

    if ($Text -notmatch '^poster\s+') {
        throw "Invalid command. Use: poster product offer size"
    }

    $body = ($Text -replace '^poster\s*', '').Trim()
    $kv = @{}
    [regex]::Matches($body, '(\w+)=("[^"]+"|''[^'']+''|[^\s]+)') | ForEach-Object {
        $kv[$_.Groups[1].Value.ToLowerInvariant()] = ($_.Groups[2].Value -replace '^["'']|["'']$', '')
    }
    $positionalBody = [regex]::Replace($body, '(\w+)=("[^"]+"|''[^'']+''|[^\s]+)', '').Trim()
    $tokens = $positionalBody -split '\s+' | Where-Object { $_ }
    $productToken = $tokens | Where-Object {
        $_ -notin @('square', 'portrait', 'story', 'landscape') -and $_ -notmatch '^\w+='
    } | Select-Object -First 1
    $product = if ($kv.product) { $kv.product.ToLowerInvariant() } elseif ($productToken) { $productToken.ToLowerInvariant() } else { "" }
    $sizeToken = ($tokens | Where-Object { $_ -in @('square', 'portrait', 'story', 'landscape') } | Select-Object -First 1)
    if (-not $sizeToken) { $sizeToken = "portrait" }
    $size = if ($sizeToken -eq "square") { "1024x1024" } elseif ($sizeToken -eq "landscape") { "1536x1024" } else { "1024x1536" }
    $mode = if ($kv.mode) { $kv.mode.ToLowerInvariant() } else { "canva" }
    if ($mode -eq "image") { $mode = "openai" }
    if ($mode -eq "test") { $mode = "local" }
    if ($mode -notin @("canva", "openai", "local")) { throw "Invalid mode. Use mode=canva, mode=openai or mode=local." }
    $pegNotes = if ($kv.peg) { $kv.peg } elseif ($kv.pegnotes) { $kv.pegnotes } elseif ($kv.inspo) { $kv.inspo } else { "" }
    $offer = if ($kv.offer) {
        $kv.offer
    } else {
        (($tokens | Select-Object -Skip 1) | Where-Object {
            $_ -notin @('square', 'portrait', 'story', 'landscape') -and $_ -notmatch '^\w+='
        }) -join ' '
    }

    [pscustomobject]@{
        product = $product
        offer = if ($offer) { $offer } else { "Special offer" }
        size = $size
        mode = $mode
        cta = "Order today"
        pegNotes = $pegNotes
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

    $lines = @(
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
    )

    if ($Command.pegNotes) {
        $lines += @(
            ""
            "Inspiration direction: $($Command.pegNotes)"
            "Use the inspiration only for mood, layout logic, composition, color direction or typography feel."
            "Do not copy the reference design, logos, characters, exact layout, competitor branding or copyrighted elements."
        )
    }

    ($lines + @(
        ""
        "Use the provided brand and product assets."
        "Keep all poster text readable."
        "Do not invent extra brand names."
    )) -join [Environment]::NewLine
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
        mode = $Command.mode
        cta = $Command.cta
        pegNotes = $Command.pegNotes
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
Write-Host "Resolved mode: $($parsed.mode)"
Write-Host ""
Write-Host "Generated prompt:"
Write-Host $prompt
Write-Host ""
Write-Host "Canva brief:"
$canvaBrief | ConvertTo-Json -Depth 5
