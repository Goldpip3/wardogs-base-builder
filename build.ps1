# Rebuilds WardogsBaseBuilder.html from src/app-template.html + data/buildables.json + assets/icons
$proj = $PSScriptRoot

# Get-Content -Raw follows the host's default encoding: pwsh 7 assumes UTF-8, Windows
# PowerShell 5.1 assumes the ANSI codepage, which turns every arrow, dash and × in these
# UTF-8 sources into mojibake. Read and write UTF-8 explicitly so the build comes out the
# same whichever host runs it.
$utf8 = [Text.UTF8Encoding]::new($false)
$tpl = [IO.File]::ReadAllText("$proj\src\app-template.html", $utf8)
$catalog = [IO.File]::ReadAllText("$proj\data\buildables.json", $utf8).Trim()

# One decoder and one palette for the whole project. The share format has two encoders that
# drifted apart once, so a second decoder was not going to be written for the community list.
# This file is inlined here and again by tools/site/context.js; neither side keeps a copy.
$shared = [IO.File]::ReadAllText("$proj\src\shared\design-view.js", $utf8)

$iconMap = @{}
Get-ChildItem "$proj\assets\icons\*" -Include *.webp, *.svg, *.png | ForEach-Object {
  $mime = switch ($_.Extension) { ".webp" {"image/webp"} ".svg" {"image/svg+xml"} ".png" {"image/png"} }
  $iconMap[$_.Name] = "data:$mime;base64," + [Convert]::ToBase64String([IO.File]::ReadAllBytes($_.FullName))
}
$iconsJson = ($iconMap.GetEnumerator() | Sort-Object Name | ForEach-Object { '"{0}":"{1}"' -f $_.Key, $_.Value }) -join ","

# The site loads these fonts as files, but the planner has to work with no network at
# all, so they are baked in as data URIs. Latin subsets, ~25 KB for all three.
$faces = @(
  @{ file = "chakrapetch-700.woff2"; family = "Chakra Petch"; weight = 700 },
  @{ file = "barlow-400.woff2";      family = "Barlow";       weight = 400 },
  @{ file = "barlow-600.woff2";      family = "Barlow";       weight = 600 }
)
$fontCss = ($faces | ForEach-Object {
  $p = "$proj\assets\fonts\$($_.file)"
  if (Test-Path $p) {
    $b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($p))
    # The family name is quoted: "Chakra Petch" has a space in it, and an unquoted
    # multi-word family is invalid CSS that browsers drop silently.
    "@font-face{font-family:`"$($_.family)`";src:url(data:font/woff2;base64,$b64)format('woff2');font-weight:$($_.weight);font-display:swap}"
  }
}) -join "`n  "

$out = $tpl.Replace('/*__SHARED__*/', $shared).Replace('/*__CATALOG__*/', $catalog).Replace('/*__ICONS__*/', "{$iconsJson}").Replace('/*__FONTS__*/', $fontCss)

# Two builds of the same app, differing only in whether saving online exists.
#
#   WardogsBaseBuilder.html  the file you can download and keep. No API, so the cloud
#                            code is unreachable and it makes no network call at all.
#   docs/planner/index.html  the hosted copy, which can save against a Discord account.
#
# The offline promise only means anything if the downloadable copy really is offline, so
# the API is injected here rather than compiled in, and check-build.js verifies it.
$community = Get-Content "$proj\data\community.json" -Raw | ConvertFrom-Json
$apiBase = $community.voteApi

# The hosted copy also carries one ad, at the foot of the right panel. The downloadable one
# carries none and must not: an offline file has nothing to ask an ad server for, and a
# publisher id inside a file people keep is an advertising identity travelling on a disk.
# Both placeholders become empty string for the offline build, so there is nothing to strip
# and no trace that an ad was ever considered. check-build.js asserts exactly that.
$ads = Get-Content "$proj\data\ads.json" -Raw | ConvertFrom-Json
$adPub = "$($ads.publisherId)".Trim()
$adSlot = "$($ads.slots.planner)".Trim()
$adHead = ""
$adPanel = ""
if ($adPub -and $adSlot) {
  $adHead = @"
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=$adPub" crossorigin="anonymous"></script>
"@
  $adPanel = @"
    <div class="rp-section rp-ad">
      <h3>Advertisement</h3>
      <ins class="adsbygoogle" style="display:block" data-ad-client="$adPub"
           data-ad-slot="$adSlot" data-ad-format="auto" data-full-width-responsive="true"></ins>
      <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
    </div>
"@
}

# A stamp the hosted page can compare itself against, so a tab left open can notice that
# a newer build exists instead of quietly showing yesterday's.
$stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")

$offline = $out.Replace('/*__API__*/', '').Replace('/*__BUILD__*/', '').Replace('<!--__AD_HEAD__-->', '').Replace('<!--__AD_PANEL__-->', '')
[IO.File]::WriteAllText("$proj\WardogsBaseBuilder.html", $offline, $utf8)
# Artifact variant (no HTML skeleton, the Artifact wrapper provides it)
$art = $offline -replace '(?s)^.*?<title>', '<title>' -replace '</head>\s*<body>', '' -replace '</body>\s*</html>\s*$', ''
[IO.File]::WriteAllText("$proj\src\artifact.html", $art, $utf8)

# The planner lives at docs/planner/; the surrounding site pages are generated
# afterwards by tools/build-site.js. GitHub Pages serves the whole docs/ folder.
New-Item -ItemType Directory -Force "$proj\docs\planner" | Out-Null
[IO.File]::WriteAllText("$proj\docs\planner\index.html",
  $out.Replace('/*__API__*/', $apiBase).Replace('/*__BUILD__*/', $stamp).Replace('<!--__AD_HEAD__-->', $adHead).Replace('<!--__AD_PANEL__-->', $adPanel), $utf8)
[IO.File]::WriteAllText("$proj\docs\build.txt", $stamp, $utf8)
if (Test-Path "$proj\release\og-1200x630.png") { Copy-Item "$proj\release\og-1200x630.png" "$proj\docs\preview.png" -Force }
# Custom domain. Leave EMPTY until the domain's DNS actually resolves — claiming a
# domain with no records makes Pages redirect the working github.io URL into a dead
# end, which takes the site offline. Fill it in once the DNS records are live.
$customDomain = "www.wardogsbuilder.com"
if ($customDomain) { [IO.File]::WriteAllText("$proj\docs\CNAME", $customDomain, $utf8) }
elseif (Test-Path "$proj\docs\CNAME") { Remove-Item "$proj\docs\CNAME" -Force }

# The site pages load these as files; the planner inlines them so it still works offline.
New-Item -ItemType Directory -Force "$proj\docs\fonts" | Out-Null
Copy-Item "$proj\assets\fonts\*.woff2" "$proj\docs\fonts\" -Force

# The front page hero loop. The site only, never the planner: the downloadable planner has
# to work with no network at all, so it gets no video and no poster.
New-Item -ItemType Directory -Force "$proj\docs\video" | Out-Null
Copy-Item "$proj\assets\video\*" "$proj\docs\video\" -Force

node (Join-Path $proj "tools/build-site.js")
# Without this the site generator can throw, leave yesterday's pages on disk, and the
# checks below still pass because they are inspecting stale output.
if ($LASTEXITCODE -ne 0) { throw "build-site.js failed - the site was not regenerated." }

# The map's entry file has two generated twins, so tools that look for AGENTS.md or
# routing.md get the same catalog. Written, never hand-edited.
node (Join-Path $proj "tools/sync-map-twins.js")

# The ballistics figures are derived rather than transcribed, so they get re-derived on
# every build and checked against the published tables they came from. If a value drifts,
# or somebody edits data/ballistics.json by hand, this fails before the page ships.
node (Join-Path $proj "tools/solve-ballistics.js") | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Ballistics data no longer reproduces its published source - run tools/solve-ballistics.js." }

node (Join-Path $proj "tools/check-build.js")
if ($LASTEXITCODE -ne 0) { throw "Build produced a broken page - see the failures above." }

# The behavioural suites take about half a second for two hundred odd checks, which is
# cheap enough that there is no reason to run them separately and forget to.
node (Join-Path $proj "test/run.js")
if ($LASTEXITCODE -ne 0) { throw "Behaviour changed - see the failing suite above." }

Write-Host "Built app + docs/planner/ + surrounding site"
