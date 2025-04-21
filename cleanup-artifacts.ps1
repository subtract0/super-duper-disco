# cleanup-artifacts.ps1
# Removes all build, cache, and coverage folders recursively from the project
$folders = @("dist", "build", "out", ".next", ".cache", "coverage")
foreach ($folder in $folders) {
    Get-ChildItem -Path . -Include $folder -Recurse -Directory -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
}
Write-Host "Cleanup complete: Removed build, cache, and coverage folders."
