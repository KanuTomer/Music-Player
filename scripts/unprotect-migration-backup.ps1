param(
  [Parameter(Mandatory = $true)][string]$EncryptedArchive,
  [Parameter(Mandatory = $true)][string]$OutputDirectory
)

$ErrorActionPreference = "Stop"
$archive = (Resolve-Path -LiteralPath $EncryptedArchive).Path
$backupRoot = (Resolve-Path -LiteralPath (Split-Path -Parent $archive)).Path
$expectedRoot = "C:\Kanu\Kanu(D)\Music App\migration-backups"
if ($backupRoot -ne $expectedRoot) { throw "Encrypted archive is outside the approved backup root" }

$outputParent = [IO.Path]::GetFullPath((Split-Path -Parent $OutputDirectory))
if ($outputParent -ne $expectedRoot) { throw "Output directory is outside the approved backup root" }
if (Test-Path -LiteralPath $OutputDirectory) { throw "Output directory already exists" }

$decryptedBytes = [Security.Cryptography.ProtectedData]::Unprotect(
  [IO.File]::ReadAllBytes($archive),
  $null,
  [Security.Cryptography.DataProtectionScope]::CurrentUser
)
$temporaryZip = Join-Path $backupRoot ((Split-Path -Leaf $OutputDirectory) + ".zip")
[IO.File]::WriteAllBytes($temporaryZip, $decryptedBytes)
try {
  Expand-Archive -LiteralPath $temporaryZip -DestinationPath $OutputDirectory
} finally {
  [IO.File]::Delete($temporaryZip)
}

Write-Output "Decrypted backup into approved temporary directory"
