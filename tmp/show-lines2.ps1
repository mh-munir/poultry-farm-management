$lines = Get-Content -LiteralPath 'src\i18n\en.ts'
$i = 785
while ($i -lt 800 -and $i -lt $lines.Length) {
    Write-Host ("{0,4}: {1}" -f ($i+1), $lines[$i])
    $i++
}
