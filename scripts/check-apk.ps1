param(
    [Parameter(Mandatory=$true)][string]$Path,
    [string]$ExpectedBackend = 'https://foodguard.littlemelon.top'
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$root = Split-Path -Parent $PSScriptRoot
$values = [System.Collections.Generic.HashSet[string]]::new()
foreach ($name in @('.env.local', '.env.server.local', '.env')) {
    $file = Join-Path $root $name
    if (-not (Test-Path -LiteralPath $file)) { continue }
    foreach ($line in [System.IO.File]::ReadAllLines($file)) {
        if ($line -notmatch '^([A-Z_][A-Z_0-9]*)\s*=\s*(.*)$') { continue }
        $setting = $matches[1]
        $value = $matches[2].Trim().Trim('"', "'")
        if ($setting -match 'KEY|TOKEN|PASSWORD|SECRET' -and $value.Length -ge 12 -and $value -notmatch '^(your_|example|placeholder)') { [void]$values.Add($value) }
    }
}
$rules = @{
    'API key' = '\bsk-[A-Za-z0-9_-]{24,}'
    'GitHub token' = '\b(gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})'
    'Private key' = '-----BEGIN (RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----'
    'QA configuration' = 'qa-only-not-a-real-key|provider-[ab]\.example\.com|10\.0\.2\.2:8789'
}
$findings = [System.Collections.Generic.List[object]]::new()
$zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $Path).Path)
try {
    $scripts = [System.Text.StringBuilder]::new()
    $config = $null
    foreach ($entry in $zip.Entries) {
        if (-not $entry.Length) { continue }
        $stream = $entry.Open()
        $memory = [System.IO.MemoryStream]::new()
        try { $stream.CopyTo($memory); $bytes = $memory.ToArray() } finally { $stream.Dispose(); $memory.Dispose() }
        $utf8 = [System.Text.Encoding]::UTF8.GetString($bytes)
        $utf16 = [System.Text.Encoding]::Unicode.GetString($bytes)
        foreach ($rule in $rules.Keys) {
            if ($utf8 -match $rules[$rule] -or $utf16 -match $rules[$rule]) { $findings.Add(@{ entry=$entry.FullName; rule=$rule }) }
        }
        foreach ($value in $values) {
            if ($utf8.Contains($value) -or $utf16.Contains($value)) { $findings.Add(@{ entry=$entry.FullName; rule='Local credential match' }); break }
        }
        if ($entry.FullName -eq 'assets/capacitor.config.json') { $config = $utf8 | ConvertFrom-Json }
        if ($entry.FullName -like 'assets/public/assets/*.js') { [void]$scripts.Append($utf8) }
    }
    $web = $scripts.ToString()
    if (-not $config -or $config.loggingBehavior -ne 'none' -or $config.android.allowMixedContent -ne $false) { $findings.Add(@{ entry='assets/capacitor.config.json'; rule='Unsafe or missing WebView configuration' }) }
    if (-not $web.Contains($ExpectedBackend)) { $findings.Add(@{ entry='assets/public/assets'; rule='Expected backend URL missing' }) }
    foreach ($marker in @('report-charts', 'report-chart-tabs', 'Expand all ingredient details')) {
        if (-not $web.Contains($marker)) { $findings.Add(@{ entry='assets/public/assets'; rule='Report-layout marker missing' }) }
    }
    [pscustomobject]@{
        apk_entries=$zip.Entries.Count; findings=$findings.ToArray();
        size_bytes=(Get-Item -LiteralPath $Path).Length;
        sha256=(Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
    } | ConvertTo-Json -Depth 4
    if ($findings.Count) { exit 1 }
} finally { $zip.Dispose(); $values.Clear() }
