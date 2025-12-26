
# TMX Full-Pack cURL Cheatsheet (Windows PowerShell friendly)

# Login e obter token
$login = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post -ContentType 'application/json' -Body '{"username":"demo","password":"demo"}'
$token = $login.token
Write-Host "Token: $token"

# Upload TMX (use o sample.tmx deste pacote)
$filePath = Join-Path $PSScriptRoot 'sample.tmx'
$form = @{ tmx = Get-Item $filePath }
$upload = Invoke-WebRequest -Uri "http://localhost:3000/api/tmx/upload" -Method Post -Headers @{ Authorization = "Bearer $token" } -Form $form
$uploadJson = $upload.Content | ConvertFrom-Json
$id = $uploadJson.id
Write-Host "TMX ID: $id"

# Buscar TMX
Invoke-RestMethod -Uri "http://localhost:3000/api/tmx/$id" -Headers @{ Authorization = "Bearer $token" }

# Atualizar TU 0 pt-BR
Invoke-RestMethod -Uri "http://localhost:3000/api/tmx/$id/update" -Method Post -Headers @{ Authorization = "Bearer $token" } -ContentType 'application/json' -Body '{"tuIndex":0,"lang":"pt-BR","text":"Olá, universo!"}'

# Exportar TMX atualizado
Invoke-WebRequest -Uri "http://localhost:3000/api/tmx/$id/export" -Headers @{ Authorization = "Bearer $token" } -OutFile (Join-Path $PSScriptRoot 'export.tmx')
