$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$assetRoot = Join-Path $root "templates\asset-folder-example"

function Parse-KeyValueArgs {
    param([string]$Body)

    $result = @{}
    [regex]::Matches($Body, '(\w+)=("[^"]+"|''[^'']+''|[^\s]+)') | ForEach-Object {
        $result[$_.Groups[1].Value.ToLowerInvariant()] = ($_.Groups[2].Value -replace '^["'']|["'']$', '')
    }
    $result
}

function Remove-KeyValueArgs {
    param([string]$Body)
    [regex]::Replace($Body, '(\w+)=("[^"]+"|''[^'']+''|[^\s]+)', '').Trim()
}

function Test-SizeToken {
    param([string]$Token)
    $Token.ToLowerInvariant() -in @('square', 'portrait', 'story', 'landscape')
}

function ConvertTo-PosterSize {
    param([string]$Size)
    $value = $Size.ToLowerInvariant()
    if ($value -eq "square") { return "1024x1024" }
    if ($value -eq "landscape") { return "1536x1024" }
    "1024x1536"
}

function Parse-PosterCommand {
    param([string]$Text)

    if ($Text -notmatch '^poster\s+') {
        throw "Invalid command. Use: poster product offer size"
    }

    $body = ($Text -replace '^poster\s*', '').Trim()
    $kv = Parse-KeyValueArgs $body
    $positionalBody = Remove-KeyValueArgs $body
    $tokens = $positionalBody -split '\s+' | Where-Object { $_ }
    $productToken = $tokens | Where-Object { -not (Test-SizeToken $_) } | Select-Object -First 1
    $sizeToken = $tokens | Where-Object { Test-SizeToken $_ } | Select-Object -First 1
    if (-not $sizeToken) { $sizeToken = "portrait" }

    $mode = if ($kv.mode) { $kv.mode.ToLowerInvariant() } else { "canva" }
    if ($mode -eq "image") { $mode = "openai" }
    if ($mode -eq "test") { $mode = "local" }
    if ($mode -notin @("canva", "openai", "local")) { throw "Invalid mode. Use mode=canva, mode=openai or mode=local." }

    [pscustomobject]@{
        product = if ($kv.product) { $kv.product.ToLowerInvariant() } elseif ($productToken) { $productToken.ToLowerInvariant() } else { "" }
        offer = if ($kv.offer) { $kv.offer } else { "" }
        size = ConvertTo-PosterSize $sizeToken
        mode = $mode
        cta = if ($kv.cta) { $kv.cta } else { "" }
        pegNotes = if ($kv.peg) { $kv.peg } elseif ($kv.pegnotes) { $kv.pegnotes } elseif ($kv.inspo) { $kv.inspo } else { "" }
        positionalBody = $positionalBody
        hasExplicitOffer = [bool]$kv.offer
        hasExplicitCta = [bool]$kv.cta
    }
}

function Normalize-LookupText {
    param([string]$Value)
    ($Value -replace '\s+', ' ').Trim().ToLowerInvariant()
}

function Find-Manifest {
    param($Command)

    $target = Normalize-LookupText $Command.product
    $body = Normalize-LookupText $(if ($Command.positionalBody) { $Command.positionalBody } else { $Command.product })
    $prefixMatch = $null

    foreach ($folder in Get-ChildItem -Path $assetRoot -Directory) {
        $manifestPath = Join-Path $folder.FullName "manifest.json"
        if (-not (Test-Path $manifestPath)) { continue }

        $manifest = Get-Content -Raw $manifestPath | ConvertFrom-Json
        $names = @($manifest.product) + @($manifest.aliases) | ForEach-Object { Normalize-LookupText $_ }

        if ($names -contains $target) {
            return [pscustomobject]@{ folder = $folder.FullName; manifest = $manifest; matchedName = $target }
        }

        foreach ($name in $names) {
            if (($body -eq $name -or $body.StartsWith("$name ")) -and (-not $prefixMatch -or $name.Length -gt $prefixMatch.matchedName.Length)) {
                $prefixMatch = [pscustomobject]@{ folder = $folder.FullName; manifest = $manifest; matchedName = $name }
            }
        }
    }

    if ($prefixMatch) { return $prefixMatch }
    throw "No manifest found for product '$($Command.product)'."
}

function Apply-ManifestDefaults {
    param($Command, $Match)

    $Command.product = $Match.manifest.product

    if (-not $Command.hasExplicitOffer) {
        $body = Normalize-LookupText $Command.positionalBody
        $matchedName = Normalize-LookupText $Match.matchedName
        if ($body -eq $matchedName) {
            $remaining = ""
        } elseif ($body.StartsWith("$matchedName ")) {
            $remaining = $Command.positionalBody.Substring($Match.matchedName.Length).Trim()
        } else {
            $remaining = $Command.positionalBody
        }

        $Command.offer = (($remaining -split '\s+') | Where-Object { $_ -and -not (Test-SizeToken $_) }) -join ' '
        if (-not $Command.offer) { $Command.offer = "Special offer" }
    }

    if (-not $Command.hasExplicitCta) {
        $Command.cta = if ($Match.manifest.defaultCta) { $Match.manifest.defaultCta } else { "Order today" }
    }
}

function Test-ManifestAssets {
    param($Match)

    foreach ($category in $Match.manifest.categoryFolders.PSObject.Properties) {
        $path = Join-Path $Match.folder $category.Value
        if (-not (Test-Path $path)) {
            throw "Missing category folder $($category.Name): $($category.Value)"
        }
    }

    foreach ($asset in $Match.manifest.assets.PSObject.Properties) {
        $path = Join-Path $Match.folder $asset.Value
        if (-not (Test-Path $path)) {
            throw "Missing asset $($asset.Name): $($asset.Value)"
        }
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

function Invoke-Case {
    param(
        [string]$Name,
        [string]$CommandText,
        [string]$ExpectedProduct,
        [string]$ExpectedOffer,
        [string]$ExpectedCta,
        [string]$ExpectedMode = "canva"
    )

    $parsed = Parse-PosterCommand $CommandText
    $match = Find-Manifest $parsed
    Apply-ManifestDefaults $parsed $match
    Test-ManifestAssets $match
    $prompt = Build-Prompt $parsed $match.manifest

    if ($parsed.product -ne $ExpectedProduct) { throw "$Name failed product: expected '$ExpectedProduct', got '$($parsed.product)'" }
    if ($parsed.offer -ne $ExpectedOffer) { throw "$Name failed offer: expected '$ExpectedOffer', got '$($parsed.offer)'" }
    if ($parsed.cta -ne $ExpectedCta) { throw "$Name failed CTA: expected '$ExpectedCta', got '$($parsed.cta)'" }
    if ($parsed.mode -ne $ExpectedMode) { throw "$Name failed mode: expected '$ExpectedMode', got '$($parsed.mode)'" }
    if (-not $prompt.Contains("CTA: $ExpectedCta")) { throw "$Name failed prompt CTA check." }

    [pscustomobject]@{
        name = $Name
        command = $CommandText
        product = $parsed.product
        offer = $parsed.offer
        cta = $parsed.cta
        mode = $parsed.mode
    }
}

$results = @(
    Invoke-Case "wakepark default CTA" 'poster wakepark day pass promo portrait peg="bold sports layout with energetic color"' "wakepark" "day pass promo" "Ride with us"
    Invoke-Case "multi-word alias" 'poster pro shop summer sale portrait' "proshop" "summer sale" "Shop the gear"
    Invoke-Case "quoted product" 'poster product="homies messhall" offer="rice bowl promo" size=portrait' "homies messhall" "rice bowl promo" "Eat with us"
    Invoke-Case "explicit CTA" 'poster ayo brunch special portrait cta="Visit today"' "ayo" "brunch special" "Visit today"
    Invoke-Case "local mode" 'poster wakepark test promo portrait mode=local' "wakepark" "test promo" "Ride with us" "local"
)

Write-Host "Local checks passed."
Write-Host ""
$results | Format-Table -AutoSize
