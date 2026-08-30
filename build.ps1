# Rebuilds WardogsBaseBuilder.html from src/app-template.html + data/buildables.json + assets/icons
$proj = $PSScriptRoot
$tpl = Get-Content "$proj\src\app-template.html" -Raw
$catalog = (Get-Content "$proj\data\buildables.json" -Raw).Trim()
$iconMap = @{}
Get-ChildItem "$proj\assets\icons\*" -Include *.webp, *.svg, *.png | ForEach-Object {
  $mime = switch ($_.Extension) { ".webp" {"image/webp"} ".svg" {"image/svg+xml"} ".png" {"image/png"} }
  $iconMap[$_.Name] = "data:$mime;base64," + [Convert]::ToBase64String([IO.File]::ReadAllBytes($_.FullName))
}
$iconsJson = ($iconMap.GetEnumerator() | Sort-Object Name | ForEach-Object { '"{0}":"{1}"' -f $_.Key, $_.Value }) -join ","
$out = $tpl.Replace('/*__CATALOG__*/', $catalog).Replace('/*__ICONS__*/', "{$iconsJson}")
[IO.File]::WriteAllText("$proj\WardogsBaseBuilder.html", $out)
# Artifact variant (no HTML skeleton — the Artifact wrapper provides it)
$art = $out -replace '(?s)^.*?<title>', '<title>' -replace '</head>\s*<body>', '' -replace '</body>\s*</html>\s*$', ''
[IO.File]::WriteAllText("$proj\src\artifact.html", $art)

# docs/index.html — what GitHub Pages serves (Pages only allows / or /docs).
# Also works as-is on Netlify, itch.io or any other static host.
New-Item -ItemType Directory -Force "$proj\docs" | Out-Null
[IO.File]::WriteAllText("$proj\docs\index.html", $out)
if (Test-Path "$proj\release\og-1200x630.png") { Copy-Item "$proj\release\og-1200x630.png" "$proj\docs\preview.png" -Force }
# Custom domain. Leave EMPTY until the domain's DNS actually resolves — claiming a
# domain with no records makes Pages redirect the working github.io URL into a dead
# end, which takes the site offline. Fill it in once the DNS records are live.
$customDomain = ""
if ($customDomain) { [IO.File]::WriteAllText("$proj\docs\CNAME", $customDomain) }
elseif (Test-Path "$proj\docs\CNAME") { Remove-Item "$proj\docs\CNAME" -Force }

Write-Host "Built WardogsBaseBuilder.html + src/artifact.html + docs/index.html"
