$sourceDir = "c:\Users\UseR\Local Sites\development\app\public\wp-content\plugins\motionkit-with-gsap"
$zipPath = "C:\Users\UseR\Downloads\motionkit-with-gsap.zip"
$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) "motionkit-zip-temp"

if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

New-Item -ItemType Directory -Path "$tempDir\motionkit-with-gsap" | Out-Null

$excludePatterns = @(
    '\\\.git',
    '\\\.github',
    '\\\.gitignore',
    '\\\.gitattributes',
    '\\\.distignore',
    '\\\.vscode',
    '\\\.idea',
    '\\\.claude',
    '\\\.env',
    '\\src($|\\)',
    '\\scripts($|\\)',
    '\\node_modules($|\\)',
    '\\\.md$',
    '\\package.*\.json$',
    '\\webpack.*\.js$'
)

Get-ChildItem -Path $sourceDir -Recurse | ForEach-Object {
    $relPath = $_.FullName.Substring($sourceDir.Length)
    $skip = $false
    foreach ($pattern in $excludePatterns) {
        if ($relPath -match $pattern) {
            $skip = $true
            break
        }
    }
    if (-not $skip) {
        $destPath = Join-Path "$tempDir\motionkit-with-gsap" $relPath
        if ($_.PSIsContainer) {
            if (-not (Test-Path $destPath)) {
                New-Item -ItemType Directory -Path $destPath -Force | Out-Null
            }
        } else {
            $parent = Split-Path $destPath
            if (-not (Test-Path $parent)) {
                New-Item -ItemType Directory -Path $parent -Force | Out-Null
            }
            Copy-Item $_.FullName -Destination $destPath -Force
        }
    }
}

Compress-Archive -Path "$tempDir\motionkit-with-gsap" -DestinationPath $zipPath
Remove-Item $tempDir -Recurse -Force
Write-Host "Zip created successfully at $zipPath"
