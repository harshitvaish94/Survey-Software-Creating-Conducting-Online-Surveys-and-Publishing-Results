# TC-Sec-01: TLS 1.2+ and HTTP -> HTTPS redirect (SMS-32)
# Run from the repo root:  powershell -ExecutionPolicy Bypass -File scripts\tc-sec-01.ps1
# Requires: proxy container up, backend on :3000, frontend on :5173, Docker Desktop running.

$out = Join-Path $env:TEMP 'sms-32-evidence.txt'

function SClient([string]$flag) {
    $dockerArgs = @('run', '--rm', '-i', 'alpine/openssl', 's_client',
        '-connect', 'host.docker.internal:443', '-servername', 'localhost', $flag)
    if ($flag -eq '-tls1_1') { $dockerArgs += @('-cipher', 'ALL:@SECLEVEL=0') }
    '' | & docker @dockerArgs 2>&1 |
        Select-String -Pattern 'Protocol|Cipher is|alert|error|wrong version|handshake' |
        ForEach-Object { $_.Line }
}

& {
    "TC-Sec-01 run: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

    "`n=== 1. HTTP -> HTTPS redirect (expect 301 + Location: https://localhost/) ==="
    curl.exe -s -I http://localhost

    "`n=== 1b. Redirect preserves path (expect 301 + Location: https://localhost/api/health) ==="
    curl.exe -s -I http://localhost/api/health

    "`n=== 2. HTTPS reachable (expect 200) ==="
    curl.exe -k -s -I https://localhost

    "`n=== 3. curl TLS 1.1 only (expect failure) ==="
    curl.exe -k -sS --tlsv1.1 --tls-max 1.1 https://localhost
    "curl exit code: $LASTEXITCODE (non-zero = refused)"

    "`n=== 4. curl TLS 1.2 (expect 200) ==="
    curl.exe -k -s --tlsv1.2 -I https://localhost

    "`n=== 5. API health via proxy (expect {`"status`":`"ok`"}) ==="
    curl.exe -k -s https://localhost/api/health

    "`n`n=== 6. OpenSSL TLS 1.1 (expect alert / protocol version error, no Cipher) ==="
    SClient '-tls1_1'

    "`n=== 7. OpenSSL TLS 1.2 (expect Protocol: TLSv1.2) ==="
    SClient '-tls1_2'

    "`n=== 8. OpenSSL TLS 1.3 (expect Protocol: TLSv1.3) ==="
    SClient '-tls1_3'
} 2>&1 | Tee-Object -FilePath $out

"`nEvidence saved to $out"
