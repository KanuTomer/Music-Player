param(
  [Parameter(Mandatory = $true)][string]$SourceDirectory
)

$ErrorActionPreference = "Stop"
$source = (Resolve-Path -LiteralPath $SourceDirectory).Path
$backupRoot = (Resolve-Path -LiteralPath (Split-Path -Parent $source)).Path
$expectedRoot = "C:\Kanu\Kanu(D)\Music App\migration-backups"
if ($backupRoot -ne $expectedRoot) { throw "Backup source is outside the approved backup root" }

$baseName = Split-Path -Leaf $source
$plainArchive = Join-Path $backupRoot "$baseName.zip"
$encryptedArchive = "$plainArchive.dpapi"
$hashManifest = Join-Path $backupRoot "$baseName.sha256.txt"
$verificationDirectory = Join-Path $backupRoot "$baseName-verification"

Compress-Archive -Path (Join-Path $source "*") -DestinationPath $plainArchive -CompressionLevel Optimal
$plainHash = (Get-FileHash -LiteralPath $plainArchive -Algorithm SHA256).Hash
$plainBytes = [IO.File]::ReadAllBytes($plainArchive)
$encryptedBytes = [Security.Cryptography.ProtectedData]::Protect(
  $plainBytes,
  $null,
  [Security.Cryptography.DataProtectionScope]::CurrentUser
)
[IO.File]::WriteAllBytes($encryptedArchive, $encryptedBytes)
$encryptedHash = (Get-FileHash -LiteralPath $encryptedArchive -Algorithm SHA256).Hash

$roundTrip = [Security.Cryptography.ProtectedData]::Unprotect(
  [IO.File]::ReadAllBytes($encryptedArchive),
  $null,
  [Security.Cryptography.DataProtectionScope]::CurrentUser
)
$verificationArchive = Join-Path $backupRoot "$baseName-verification.zip"
[IO.File]::WriteAllBytes($verificationArchive, $roundTrip)
if ((Get-FileHash -LiteralPath $verificationArchive -Algorithm SHA256).Hash -ne $plainHash) {
  throw "DPAPI round-trip hash mismatch"
}
Expand-Archive -LiteralPath $verificationArchive -DestinationPath $verificationDirectory
$required = @("schema.dump", "recovery.dump", "approved-data.dump", "approved-data.toc", "source-inventory.json", "snapshot-time.txt")
foreach ($name in $required) {
  if (-not (Test-Path -LiteralPath (Join-Path $verificationDirectory $name))) { throw "Archive missing $name" }
}
& "C:\Program Files\PostgreSQL\17\bin\pg_restore.exe" --list (Join-Path $verificationDirectory "recovery.dump") | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Recovery dump is unreadable" }

[IO.File]::WriteAllLines($hashManifest, @(
  "plaintext_zip_sha256=$plainHash",
  "encrypted_dpapi_sha256=$encryptedHash"
))
Remove-Item -LiteralPath $verificationDirectory -Recurse -Force
Remove-Item -LiteralPath $verificationArchive -Force
Remove-Item -LiteralPath $plainArchive -Force
Remove-Item -LiteralPath $source -Recurse -Force

Write-Output "Encrypted backup verified: $baseName.zip.dpapi"
