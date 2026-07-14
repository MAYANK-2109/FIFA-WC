$proc = Start-Process python -ArgumentList "-m", "uvicorn", "pitchops.main:app", "--port", "8000" -PassThru -RedirectStandardOutput server_out.log -RedirectStandardError server_err.log
Start-Sleep -Seconds 8
$env:REACT_APP_BACKEND_URL="http://localhost:8000"
$env:PYTHONPATH="."
pytest tests/backend_test.py -v
$testExitCode = $LASTEXITCODE
Stop-Process -Id $proc.Id
exit $testExitCode
