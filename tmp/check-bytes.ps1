$bytes = [System.IO.File]::ReadAllBytes("src\i18n\en.ts")
Write-Host "Total bytes: $($bytes.Length)"
$line789Start = 0
$lineNum = 1
for ($i = 0; $i -lt $bytes.Length; $i++) {
    if ($bytes[$i] -eq 0x0A) {
        $lineNum++
        if ($lineNum -eq 789) {
            $line789Start = $i + 1
        }
        if ($lineNum -eq 790) {
            $line789End = $i
            break
        }
    }
}
if ($line789Start -eq 0) {
    $line789Start = $bytes.Length - 20
    $line789End = $bytes.Length
}
Write-Host "Line 789 bytes:"
for ($i = $line789Start; $i -lt $line789End; $i++) {
    Write-Host ("0x{0:X2}" -f $bytes[$i])
}
