# Cổng kiểm tra ĐẦY ĐỦ (chạy trước khi merge): như verify-quick, thêm kiểm khởi động ở cả ba mức đồ họa
# và từng kiểu thời tiết (mỗi kiểu biên dịch thêm shader riêng).
# File PHẢI lưu UTF-8 có BOM: PowerShell 5.1 đọc file không BOM theo mã ANSI, chữ Việt vỡ.
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Set-Location (Join-Path $PSScriptRoot '..')

function Invoke-Step([string]$Exe, [string[]]$Arguments) {
    if (-not (Get-Command $Exe -CommandType Application -ErrorAction SilentlyContinue)) {
        Write-Host "ci: không tìm thấy lệnh '$Exe' trên PATH"
        exit 1
    }
    $ErrorActionPreference = 'Continue'
    & $Exe @Arguments
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ci: '$Exe $($Arguments -join ' ')' lỗi (mã $LASTEXITCODE)"
        exit 1
    }
}

Invoke-Step node @('scripts/check-modules.mjs')

if ($env:GAMES3D_SKIP_SMOKE -eq '1') {
    Write-Host "ci: CẢNH BÁO bỏ qua kiểm khởi động (GAMES3D_SKIP_SMOKE=1)"
} else {
    foreach ($q in @('q=low', 'q=medium', 'q=high')) { Invoke-Step node @('scripts/smoke.mjs', $q) }
    foreach ($w in @('wind', 'mist', 'rain', 'storm', 'snow', 'night')) { Invoke-Step node @('scripts/smoke.mjs', "q=medium&w=$w") }
}

exit 0
