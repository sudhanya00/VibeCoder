# Fixed application-owned helper. No repository input or execution-policy bypass.
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName System.Windows.Forms
$folderDialog = New-Object System.Windows.Forms.FolderBrowserDialog
$folderDialog.Description = 'Choose a local project folder for VibeCoder'
$folderDialog.ShowNewFolderButton = $false
try {
    if ($folderDialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        [Console]::Write($folderDialog.SelectedPath)
    }
} finally {
    $folderDialog.Dispose()
}
