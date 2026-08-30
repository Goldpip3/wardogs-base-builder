# Moves this project to whichever GitHub account `gh` is currently signed in as.
#
#   1. gh auth login          <- sign in as the new account first
#   2. powershell -File migrate.ps1
#
# It publishes a single clean commit rather than the existing history, so the new
# repo carries no personal email address and no trace of the game-extracted icons
# that were used early on. The old repo and the old history are left untouched.

param(
  [string]$RepoName = "wardogs-base-builder",
  [switch]$AllowSameAccount   # by default it refuses to publish back to Goldpip3
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# --- who are we? ---------------------------------------------------------
try { $user = (gh api user --jq .login 2>$null).Trim() } catch { $user = "" }
if (-not $user) {
  Write-Host "Not signed in. Run:  gh auth login" -ForegroundColor Yellow
  Write-Host "Then run this script again."
  exit 1
}
if ($user -eq "Goldpip3" -and -not $AllowSameAccount) {
  Write-Host "gh is still signed in as Goldpip3." -ForegroundColor Yellow
  Write-Host "Sign in as the new account first:  gh auth login"
  Write-Host "(or re-run with -AllowSameAccount if this is deliberate)"
  exit 1
}
Write-Host "Publishing as: $user" -ForegroundColor Cyan

$pagesUrl = "https://$($user.ToLower()).github.io/$RepoName/"

# --- point the page metadata at the new address --------------------------
$tpl = "src\app-template.html"
$t = [IO.File]::ReadAllText($tpl)
$t = [regex]::Replace($t, 'https://[a-z0-9\-]+\.github\.io/[a-z0-9\-]+/', $pagesUrl)
[IO.File]::WriteAllText($tpl, $t)

$readme = "README.md"
if (Test-Path $readme) {
  $r = [IO.File]::ReadAllText($readme)
  $r = [regex]::Replace($r, 'https://[a-z0-9\-]+\.github\.io/[a-z0-9\-]+/', $pagesUrl)
  [IO.File]::WriteAllText($readme, $r)
}

& ".\build.ps1"

# --- one clean commit on an orphan branch --------------------------------
git config user.email "wardogsbuilder@gmail.com"
git config user.name  $user

$branch = "publish"
git branch -D $branch 2>$null | Out-Null
git checkout --orphan $branch 2>&1 | Out-Null
git add -A
git commit -q -m @'
WARDOGS Base Builder

A free, offline planner for WARDOGS forward operating bases. Lay out walls,
gates, gun pits and drill rigs, and see the Build Supply cost, hammer tier and
supply runs before hauling a pallet.

Single self-contained HTML file - no account, no install, no server.
'@

# --- create the repo and push -------------------------------------------
$desc = "Offline FOB / base planner for WARDOGS - plan walls, gates and gun pits with real Build Supply costs before you haul a pallet."
gh repo create $RepoName --public --description $desc 2>&1 | Out-Null

git remote remove neworigin 2>$null | Out-Null
git remote add neworigin "https://github.com/$user/$RepoName.git"
git push -q neworigin "${branch}:main" --force

# --- turn on Pages -------------------------------------------------------
Start-Sleep -Seconds 3
'{"source":{"branch":"main","path":"/docs"}}' | gh api -X POST "repos/$user/$RepoName/pages" --input - 2>&1 | Out-Null

Write-Host ""
Write-Host "Repo:  https://github.com/$user/$RepoName" -ForegroundColor Green
Write-Host "Site:  $pagesUrl" -ForegroundColor Green
Write-Host ""
Write-Host "Pages takes a minute or two to go live the first time."
Write-Host "Your old repo and the old history are still here, untouched, on branch 'main'."
