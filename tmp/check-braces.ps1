$content = Get-Content -LiteralPath 'src\i18n\en.ts' -Raw
$open = ($content.ToCharArray() | Where-Object { $_ -eq '{' }).Count
$close = ($content.ToCharArray() | Where-Object { $_ -eq '}' }).Count
Write-Host "Open: $open, Close: $close, Diff: $($open - $close)"
