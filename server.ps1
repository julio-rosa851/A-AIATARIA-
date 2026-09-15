# Simple HTTP Server in PowerShell
$port = 8000
$path = "C:\Users\RCASTRO\Desktop\sistema acai prime"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8000/")

try {
    $listener.Start()
    Write-Host "Servidor rodando em http://localhost:8000/"
    Write-Host "Pressione Ctrl+C para parar"

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $localPath = $request.Url.LocalPath
        if ($localPath -eq "/") { $localPath = "/index.html" }

        $filePath = Join-Path $path $localPath.TrimStart("/")

        if (Test-Path $filePath -PathType Leaf) {
            $content = Get-Content $filePath -Raw -Encoding UTF8
            $response.ContentType = if ($filePath.EndsWith(".html")) { "text/html; charset=utf-8" }
                                   elseif ($filePath.EndsWith(".css")) { "text/css" }
                                   elseif ($filePath.EndsWith(".js")) { "application/javascript" }
                                   else { "application/octet-stream" }
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($content)
        } else {
            $response.StatusCode = 404
            $buffer = [System.Text.Encoding]::UTF8.GetBytes("404 - File not found")
        }

        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.OutputStream.Close()
    }
} catch {
    Write-Host "Erro: $_"
} finally {
    $listener.Stop()
}