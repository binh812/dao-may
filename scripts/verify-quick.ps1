# Cổng kiểm tra NHANH cho hook Stop của pb-dev (khoảng 5 giây).
# Cổng đầy đủ là scripts/ci.ps1 (cùng khung này, thêm bước chậm) — chạy trước khi merge.
# File PHẢI lưu UTF-8 có BOM: PowerShell 5.1 đọc file không BOM theo mã ANSI, chữ Việt vỡ.
$ErrorActionPreference = 'Stop'
# Hook đọc đầu ra dạng UTF-8; không đặt thì tiếng Việt thành '?'.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Set-Location (Join-Path $PSScriptRoot '..')

# Chạy lệnh ngoài; thoát 1 ngay khi lệnh không có trên PATH hoặc trả mã khác 0 (fail-fast).
function Invoke-Step([string]$Exe, [string[]]$Arguments) {
    if (-not (Get-Command $Exe -CommandType Application -ErrorAction SilentlyContinue)) {
        Write-Host "verify-quick: không tìm thấy lệnh '$Exe' trên PATH"
        exit 1
    }
    $ErrorActionPreference = 'Continue'
    & $Exe @Arguments
    if ($LASTEXITCODE -ne 0) {
        Write-Host "verify-quick: '$Exe $($Arguments -join ' ')' lỗi (mã $LASTEXITCODE)"
        exit 1
    }
}

# Web tĩnh three.js (ES module thuần, không build): cú pháp + liên kết import/export + giới hạn dòng.
Invoke-Step node @('scripts/check-modules.mjs')

# Mở trang thật trong Edge headless ở mức Vừa: không lỗi runtime, vòng lặp khung hình chạy.
# Cần mạng (three.js nạp từ CDN). Máy không có mạng: đặt GAMES3D_SKIP_SMOKE=1 để bỏ qua kèm cảnh báo.
if ($env:GAMES3D_SKIP_SMOKE -eq '1') {
    Write-Host "verify-quick: CẢNH BÁO bỏ qua kiểm khởi động (GAMES3D_SKIP_SMOKE=1)"
} else {
    Invoke-Step node @('scripts/smoke.mjs', 'q=medium')
}

exit 0
