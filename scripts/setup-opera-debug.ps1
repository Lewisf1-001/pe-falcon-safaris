Write-Host "Setting up Opera for tab refresh support..."
Write-Host ""

$debugFlag = "--remote-debugging-port=9224"
$searchPaths = @(
    "$env:APPDATA\Microsoft\Windows\Start Menu\Programs",
    "$env:ProgramData\Microsoft\Windows\Start Menu\Programs",
    "$env:USERPROFILE\Desktop"
)

$shell = New-Object -ComObject WScript.Shell
$updated = $false

foreach ($root in $searchPaths) {
    if (-not (Test-Path $root)) { continue }

    Get-ChildItem -Path $root -Filter "*.lnk" -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
        try {
            $shortcut = $shell.CreateShortcut($_.FullName)
            $target = $shortcut.TargetPath

            if ($target -notmatch "opera\.exe$") { return }

            if ($shortcut.Arguments -match "remote-debugging-port") {
                Write-Host "Already configured: $($_.FullName)"
                $updated = $true
                return
            }

            $shortcut.Arguments = "$debugFlag $($shortcut.Arguments)".Trim()
            $shortcut.Save()
            Write-Host "Updated shortcut: $($_.FullName)"
            $updated = $true
        } catch {
            # Skip shortcuts that cannot be modified.
        }
    }
}

Write-Host ""
if ($updated) {
    Write-Host "Done. Close Opera completely, then reopen it from the Start menu."
    Write-Host "After that, start-dev.cmd will refresh your existing localhost:3000 tab."
} else {
    Write-Host "Could not find an Opera shortcut automatically."
    Write-Host "Add this to your Opera shortcut target manually:"
    Write-Host "  $debugFlag"
}
