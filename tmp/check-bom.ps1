$bytes = [System.IO.File]::ReadAllBytes("src\i18n\en.ts")
Write-Host "First 10 bytes:"
for ($i = 0; $i -lt 10; $i++) {
    Write-Host ("0x{0:X2}" -f $bytes[$i])
}
Write-Host "Last 10 bytes:"
for ($i = $bytes.Length - 10; $i -lt $bytes.Length; $i++) {
    Write-Host ("0x{0:X2}" -f $bytes[$i])
}
