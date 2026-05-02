param(
  [switch]$NoProgress
)

$argsList = @("--watch=false")
if ($NoProgress) { $argsList += "--progress=false" }

npm test -- $argsList
if ($LASTEXITCODE -eq 0) {
  Write-Host "TEST_SUCCESS"
  exit 0
}

Write-Host "TEST_FAILED"
exit 1
