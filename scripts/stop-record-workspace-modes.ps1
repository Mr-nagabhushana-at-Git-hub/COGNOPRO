$targets = Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -like "*record-workspace-modes.cjs*" -or
  $_.CommandLine -like "*merge-workspace-modes.cjs*"
}

foreach ($proc in $targets) {
  Stop-Process -Id $proc.ProcessId -Force
}

Write-Output ("killed=" + ($targets | Measure-Object | Select-Object -ExpandProperty Count))
