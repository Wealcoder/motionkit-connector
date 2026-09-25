Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$sourceDir = "c:\Users\UseR\Local Sites\development\app\public\wp-content\plugins\motionkit-with-gsap"
$zipPath = "C:\Users\UseR\Downloads\motionkit-with-gsap.zip"

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)

$excludePatterns = @(
    '\.git',
    '\.github',
    '\.gitignore',
    '\.gitattributes',
    '\.distignore',
    '\.vscode',
    '\.idea',
    '\.claude',
    '\.env',
    '(\\|/)src($|\\|/)',
    '(\\|/)scripts($|\\|/)',
    '(\\|/)node_modules($|\\|/)',
    '\.md$',
    'package.*\.json$',
    'webpack.*\.js$'
)

Get-ChildItem -Path $sourceDir -Recurse | ForEach-Object {
    if (-not $_.PSIsContainer) {
        $relPath = $_.FullName.Substring($sourceDir.Length + 1)
        $skip = $false
        foreach ($pattern in $excludePatterns) {
            if ($relPath -match $pattern) {
                $skip = $true
                break
            }
        }
        if (-not $skip) {
            $entryName = "motionkit-with-gsap/" + ($relPath -replace '\\', '/')
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $entryName, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
        }
    }
}

$zip.Dispose()
Write-Host "Zip with POSIX forward slashes created successfully at $zipPath"
