# Сборка на Windows без bash/Python — делает то же, что build.sh:
# src/index.src.html + встроенные фото src/thumbs.html -> index.html, и меняет версию офлайн-кэша в sw.js.
# Запуск из PowerShell:  .\build.ps1   (или: powershell -ExecutionPolicy Bypass -File .\build.ps1)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$utf8 = New-Object System.Text.UTF8Encoding($false)
$src = [IO.File]::ReadAllText("src\index.src.html", $utf8).Replace("`r`n", "`n")
$th = [IO.File]::ReadAllText("src\thumbs.html", $utf8).Replace("`r`n", "`n")
if (-not $src.Contains("<!--THUMBS-->`n")) { throw "Marker <!--THUMBS--> not found in src/index.src.html" }
$out = $src.Replace("<!--THUMBS-->`n", $th)
[IO.File]::WriteAllText("index.html", $out, $utf8)
$md5 = [Security.Cryptography.MD5]::Create()
$ver = (-join ($md5.ComputeHash($utf8.GetBytes($out)) | ForEach-Object { $_.ToString("x2") })).Substring(0, 10)
$sw = [IO.File]::ReadAllText("sw.js", $utf8)
$sw = [regex]::Replace($sw, 'const VERSION = "qz-[^"]*";', "const VERSION = `"qz-$ver`";")
[IO.File]::WriteAllText("sw.js", $sw, $utf8)
Write-Host ("index.html built: {0} KB, cache version {1}" -f [Math]::Floor($utf8.GetByteCount($out) / 1024), $ver)
