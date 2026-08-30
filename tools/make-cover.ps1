# Generates the store cover and link-preview images.
#
#   powershell -File tools/make-cover.ps1
#
# Original artwork only - no game logo or extracted assets. The motif is a top-down
# base plan drawn in the app's own role colours, so the image shows what the tool
# actually does rather than dressing itself in someone else's branding.

Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = "Stop"
$outDir = Join-Path $PSScriptRoot "..\release"
New-Item -ItemType Directory -Force $outDir | Out-Null

$C = @{
  bg      = "#12140d"; grid = "#1e2314"; gridLit = "#2a3119"
  amber   = "#dcaa26"; amberDark = "#8a6a15"
  green   = "#86ad55"; greenDark = "#4d6631"
  blue    = "#4d8fc4"; blueDark  = "#2c5876"
  violet  = "#9c5ec4"; violetDark= "#5d3775"
  cyan    = "#3f9fb5"; cyanDark  = "#255e6c"
  rust    = "#a55536"
  text    = "#dedbc6"; dim = "#8d8d74"; ink = "#12140d"
}
function Br([string]$hex) { New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($hex)) }
function Pn([string]$hex, [single]$w) { New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml($hex)), $w }

# draws text with manual letter spacing, since GDI+ has no tracking control
function DrawTracked($g, [string]$s, $font, $brush, [single]$x, [single]$y, [single]$track) {
  $fmt = [System.Drawing.StringFormat]::GenericTypographic
  foreach ($ch in $s.ToCharArray()) {
    $c = [string]$ch
    $g.DrawString($c, $font, $brush, $x, $y, $fmt)
    $w = $g.MeasureString($c, $font, [System.Drawing.PointF]::Empty, $fmt).Width
    $x += $w + $track
  }
}
function TrackedWidth($g, [string]$s, $font, [single]$track) {
  $fmt = [System.Drawing.StringFormat]::GenericTypographic
  $t = 0
  foreach ($ch in $s.ToCharArray()) {
    $t += $g.MeasureString([string]$ch, $font, [System.Drawing.PointF]::Empty, $fmt).Width + $track
  }
  return $t - $track
}
# a piece on the plan: shaded extrusion behind, flat face on top
function Piece($g, [single]$x, [single]$y, [single]$w, [single]$h, [string]$face, [string]$side, [single]$lift) {
  $g.FillRectangle((Br $side), ($x + $lift), ($y + $lift), $w, $h)
  $g.FillRectangle((Br $face), $x, $y, $w, $h)
  $g.DrawRectangle((Pn $C.ink 1.5), $x, $y, $w, $h)
}

function Render([int]$W, [int]$H, [string]$path, [single]$planScale, [single]$planCX, [single]$planCY) {
  $bmp = New-Object System.Drawing.Bitmap $W, $H
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.FillRectangle((Br $C.bg), 0, 0, $W, $H)

  # planning grid
  $step = 26 * $planScale
  for ($x = 0; $x -lt $W; $x += $step) {
    $lit = ([int]($x / $step) % 5) -eq 0
    $g.DrawLine((Pn $(if ($lit) { $C.gridLit } else { $C.grid }) 1), $x, 0, $x, $H)
  }
  for ($y = 0; $y -lt $H; $y += $step) {
    $lit = ([int]($y / $step) % 5) -eq 0
    $g.DrawLine((Pn $(if ($lit) { $C.gridLit } else { $C.grid }) 1), 0, $y, $W, $y)
  }

  # ---- the base plan: a walled compound with a gate and two emplacements ----
  $u = 26 * $planScale          # one hesco block
  $lift = 3.2 * $planScale
  $ox = $planCX; $oy = $planCY

  # perimeter, leaving a gap on the south face for the gate
  for ($i = -4; $i -le 4; $i++) {
    Piece $g ($ox + $i*$u) ($oy - 3*$u) $u $u $C.amber $C.amberDark $lift      # north
    if ($i -lt -1 -or $i -gt 1) {
      Piece $g ($ox + $i*$u) ($oy + 3*$u) $u $u $C.amber $C.amberDark $lift    # south
    }
  }
  for ($j = -2; $j -le 2; $j++) {
    Piece $g ($ox - 4*$u) ($oy + $j*$u) $u $u $C.amber $C.amberDark $lift      # west
    Piece $g ($ox + 4*$u) ($oy + $j*$u) $u $u $C.amber $C.amberDark $lift      # east
  }
  # gate in the southern gap
  Piece $g ($ox - 1.5*$u) ($oy + 3*$u) (3*$u) $u $C.green $C.greenDark $lift
  # FOB at the centre
  Piece $g ($ox - 1.5*$u) ($oy - 1.5*$u) (3*$u) (3*$u) $C.blue $C.blueDark ($lift*1.4)
  # emplacements in opposite corners
  Piece $g ($ox - 3.6*$u) ($oy - 2.2*$u) (2*$u) (2*$u) $C.violet $C.violetDark ($lift*1.4)
  Piece $g ($ox + 1.6*$u) ($oy + 0.4*$u) (2*$u) (2*$u) $C.cyan $C.cyanDark ($lift*1.4)

  # ---- the builder's hammer, laid across the corner of the plan ----
  $s = $planScale
  $state = $g.Save()
  $g.TranslateTransform(($ox + 4.4*$u), ($oy - 2.9*$u))
  $g.RotateTransform(38)
  $ink = Pn $C.ink (2.2*$s)
  # haft, with a grip wrap at the end
  $g.FillRectangle((Br "#7a6134"), (-5*$s), (-6*$s), (10*$s), (86*$s))
  $g.DrawRectangle($ink, (-5*$s), (-6*$s), (10*$s), (86*$s))
  $g.FillRectangle((Br "#4a3d22"), (-5*$s), (56*$s), (10*$s), (24*$s))
  $g.DrawRectangle($ink, (-5*$s), (56*$s), (10*$s), (24*$s))
  # head: striking face one side, claw the other
  $g.FillRectangle((Br "#c3c7cf"), (-13*$s), (-30*$s), (26*$s), (26*$s))
  $g.FillRectangle((Br "#9aa0a9"), (-13*$s), (-12*$s), (26*$s), (8*$s))
  $g.DrawRectangle($ink, (-13*$s), (-30*$s), (26*$s), (26*$s))
  $g.FillRectangle((Br "#c3c7cf"), (13*$s), (-27*$s), (20*$s), (17*$s))
  $g.DrawRectangle($ink, (13*$s), (-27*$s), (20*$s), (17*$s))
  $claw = New-Object System.Drawing.Drawing2D.GraphicsPath
  $pts = [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new((-13*$s), (-27*$s)),
    [System.Drawing.PointF]::new((-34*$s), (-27*$s)),
    [System.Drawing.PointF]::new((-40*$s), (-15*$s)),
    [System.Drawing.PointF]::new((-30*$s), (-13*$s)),
    [System.Drawing.PointF]::new((-27*$s), (-21*$s)),
    [System.Drawing.PointF]::new((-13*$s), (-21*$s)))
  $claw.AddPolygon($pts)
  $g.FillPath((Br "#adb2bb"), $claw)
  $g.DrawPath($ink, $claw)
  $g.Restore($state)

  # ---- type ----
  $eyebrowF = New-Object System.Drawing.Font("Segoe UI", (11 * $planScale), ([System.Drawing.FontStyle]::Bold)
  )
  $titleF   = New-Object System.Drawing.Font("Segoe UI", (34 * $planScale), ([System.Drawing.FontStyle]::Bold))
  $subF     = New-Object System.Drawing.Font("Segoe UI", (12.5 * $planScale), ([System.Drawing.FontStyle]::Regular))
  $tagF     = New-Object System.Drawing.Font("Segoe UI", (10 * $planScale), ([System.Drawing.FontStyle]::Bold))

  $pad = 34 * $planScale
  $baseY = $H - (118 * $planScale)

  # a band behind the type so it stays readable over the plan
  $band = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point 0, ([int]($baseY - 40*$planScale))),
    (New-Object System.Drawing.Point 0, $H),
    [System.Drawing.ColorTranslator]::FromHtml("#0012140d"),
    [System.Drawing.ColorTranslator]::FromHtml("#12140d"))
  $g.FillRectangle($band, 0, ($baseY - 40*$planScale), $W, ($H - $baseY + 40*$planScale))

  DrawTracked $g "A PLANNER FOR WARDOGS" $eyebrowF (Br $C.amber) $pad $baseY (3.4 * $planScale)
  $g.DrawString("BASE BUILDER", $titleF, (Br $C.text), ($pad - 4*$planScale), ($baseY + 22*$planScale))
  $g.DrawString("Lay out your FOB and cost it before the match.", $subF, (Br $C.dim),
                ($pad - 1*$planScale), ($baseY + 74*$planScale))

  # free / browser tag, right aligned
  $tag = "FREE  /  IN YOUR BROWSER"
  $tw = TrackedWidth $g $tag $tagF (2.2 * $planScale)
  DrawTracked $g $tag $tagF (Br $C.dim) ($W - $pad - $tw) $baseY (2.2 * $planScale)

  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  Write-Host ("wrote {0}  ({1}x{2})" -f (Split-Path $path -Leaf), $W, $H)
}

Render 630 500  (Join-Path $outDir "cover-630x500.png")   1.0  315 175
Render 1200 630 (Join-Path $outDir "og-1200x630.png")     1.3  600 232
