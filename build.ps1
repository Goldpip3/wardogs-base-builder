# Rebuilds WardogsBaseBuilder.html from src/app-template.html + data/buildables.json + assets/icons
$proj = $PSScriptRoot

# Get-Content -Raw follows the host's default encoding: pwsh 7 assumes UTF-8, Windows
# PowerShell 5.1 assumes the ANSI codepage, which turns every arrow, dash and × in these
# UTF-8 sources into mojibake. Read and write UTF-8 explicitly so the build comes out the
# same whichever host runs it.
$utf8 = [Text.UTF8Encoding]::new($false)
$tpl = [IO.File]::ReadAllText("$proj\src\app-template.html", $utf8)
$catalog = [IO.File]::ReadAllText("$proj\data\buildables.json", $utf8).Trim()

$iconMap = @{}
Get-ChildItem "$proj\assets\icons\*" -Include *.webp, *.svg, *.png | ForEach-Object {
  $mime = switch ($_.Extension) { ".webp" {"image/webp"} ".svg" {"image/svg+xml"} ".png" {"image/png"} }
  $iconMap[$_.Name] = "data:$mime;base64," + [Convert]::ToBase64String([IO.File]::ReadAllBytes($_.FullName))
}
$iconsJson = ($iconMap.GetEnumerator() | Sort-Object Name | ForEach-Object { '"{0}":"{1}"' -f $_.Key, $_.Value }) -join ","
$out = $tpl.Replace('/*__CATALOG__*/', $catalog).Replace('/*__ICONS__*/', "{$iconsJson}")
[IO.File]::WriteAllText("$proj\WardogsBaseBuilder.html", $out, $utf8)
# Artifact variant (no HTML skeleton — the Artifact wrapper provides it)
$art = $out -replace '(?s)^.*?<title>', '<title>' -replace '</head>\s*<body>', '' -replace '</body>\s*</html>\s*$', ''
[IO.File]::WriteAllText("$proj\src\artifact.html", $art, $utf8)

# The planner lives at docs/planner/; the surrounding site pages are generated
# afterwards by tools/build-site.js. GitHub Pages serves the whole docs/ folder.
New-Item -ItemType Directory -Force "$proj\docs\planner" | Out-Null
[IO.File]::WriteAllText("$proj\docs\planner\index.html", $out, $utf8)
if (Test-Path "$proj\release\og-1200x630.png") { Copy-Item "$proj\release\og-1200x630.png" "$proj\docs\preview.png" -Force }
# Custom domain. Leave EMPTY until the domain's DNS actually resolves — claiming a
# domain with no records makes Pages redirect the working github.io URL into a dead
# end, which takes the site offline. Fill it in once the DNS records are live.
$customDomain = "www.wardogsbuilder.com"
if ($customDomain) { [IO.File]::WriteAllText("$proj\docs\CNAME", $customDomain, $utf8) }
elseif (Test-Path "$proj\docs\CNAME") { Remove-Item "$proj\docs\CNAME" -Force }

node (Join-Path $proj "tools/build-site.js")
node (Join-Path $proj "tools/check-build.js")
if ($LASTEXITCODE -ne 0) { throw "Build produced a broken page - see the failures above." }
Write-Host "Built app + docs/planner/ + surrounding site"
