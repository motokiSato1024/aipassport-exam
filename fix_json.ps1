$filePath = "questions\questions_round3.json"
$content = Get-Content $filePath -Raw

# Replace keys with quoted versions
$content = $content -replace '\{q:', '{"q":'
$content = $content -replace ',choices:', ',"choices":'
$content = $content -replace ',a:', ',"a":'

# Save file
Set-Content $filePath $content

Write-Host "Complete"
