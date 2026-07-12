# Servidor local para visualizar o site (nao e necessario para publicar).
# Uso: powershell -ExecutionPolicy Bypass -File serve.ps1
param([int]$Port = 8321)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Output "Servindo '$root' em http://localhost:$Port/ (Ctrl+C para parar)"

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".md"   = "text/markdown; charset=utf-8"
  ".png"  = "image/png"; ".jpg" = "image/jpeg"; ".jpeg" = "image/jpeg"
  ".svg"  = "image/svg+xml"; ".ico" = "image/x-icon"; ".webp" = "image/webp"
  ".woff" = "font/woff"; ".woff2" = "font/woff2"
}

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  try {
    $path = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
    if ($path.EndsWith("/")) { $path = $path + "index.html" }
    $file = Join-Path $root ($path.TrimStart("/") -replace "/", "\")
    $rootFull = (Resolve-Path $root).Path
    $valido = (Test-Path $file -PathType Leaf) -and ((Resolve-Path $file).Path.StartsWith($rootFull))
    if ($valido) {
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $ext = [System.IO.Path]::GetExtension($file).ToLower()
      if ($mime.ContainsKey($ext)) { $ctx.Response.ContentType = $mime[$ext] }
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
      $msg = [System.Text.Encoding]::UTF8.GetBytes("404 - nao encontrado")
      $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
    }
  } catch {
    try { $ctx.Response.StatusCode = 500 } catch {}
  } finally {
    try { $ctx.Response.Close() } catch {}
  }
}
