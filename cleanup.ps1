# Script to clean up unused files and directories in the AGENT-X project

# Define directories and files to remove
$itemsToRemove = @(
    "agent",
    "models",
    "examples",
    "scripts",
    "test_models.py",
    "tests/test_models_integration.py",
    "tests/test_starcoder2.py",
    "tests/test_file_edit_smoke.py"
)

Write-Host "Starting cleanup of AGENT-X project..." -ForegroundColor Cyan

# Remove each item if it exists
foreach ($item in $itemsToRemove) {
    $fullPath = Join-Path -Path $PSScriptRoot -ChildPath $item
    
    if (Test-Path $fullPath) {
        try {
            if ((Get-Item $fullPath) -is [System.IO.DirectoryInfo]) {
                Write-Host "Removing directory: $item" -ForegroundColor Yellow
                Remove-Item -Path $fullPath -Recurse -Force -ErrorAction Stop
            } else {
                Write-Host "Removing file: $item" -ForegroundColor Yellow
                Remove-Item -Path $fullPath -Force -ErrorAction Stop
            }
            Write-Host "Successfully removed: $item" -ForegroundColor Green
        } catch {
            Write-Host "Error removing $item : $_" -ForegroundColor Red
        }
    } else {
        Write-Host "Item not found, skipping: $item" -ForegroundColor Gray
    }
}

Write-Host "\nCleanup completed!" -ForegroundColor Cyan
