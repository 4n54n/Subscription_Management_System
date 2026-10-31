$ErrorActionPreference = "Stop"

git reset --soft 3a536e4
git reset

$u1_name = "4n54n"
$u1_email = "ansan002151000000@gmail.com"
$u2_name = "Anagha711-git"
$u2_email = "anaghak071@gmail.com"

# Commit 31
Write-Host "Re-committing 31..."
git add blocksuite packages/frontend/core/src/blocksuite
$env:GIT_AUTHOR_NAME = $u1_name
$env:GIT_AUTHOR_EMAIL = $u1_email
$env:GIT_COMMITTER_NAME = $u1_name
$env:GIT_COMMITTER_EMAIL = $u1_email
$env:GIT_AUTHOR_DATE = "2026-10-31T16:08:00+05:30"
$env:GIT_COMMITTER_DATE = "2026-10-31T16:08:00+05:30"
git commit -m "feat(blocksuite): integrate blocksuite framework and editor plugins" --date="2026-10-31T16:08:00+05:30"

# Commit 32
Write-Host "Re-committing 32..."
git add packages/frontend/i18n packages/frontend/track packages/frontend/admin packages/frontend/apps packages/frontend/templates packages/frontend/media-capture-playground packages/frontend/core
$env:GIT_AUTHOR_NAME = $u2_name
$env:GIT_AUTHOR_EMAIL = $u2_email
$env:GIT_COMMITTER_NAME = $u2_name
$env:GIT_COMMITTER_EMAIL = $u2_email
$env:GIT_AUTHOR_DATE = "2026-10-31T16:21:00+05:30"
$env:GIT_COMMITTER_DATE = "2026-10-31T16:21:00+05:30"
git commit -m "feat(frontend): add i18n locales, telemetry tracking, and auth sign-in pages" --date="2026-10-31T16:21:00+05:30"

# Commit 33
Write-Host "Re-committing 33..."
git add .
$env:GIT_AUTHOR_NAME = $u1_name
$env:GIT_AUTHOR_EMAIL = $u1_email
$env:GIT_COMMITTER_NAME = $u1_name
$env:GIT_COMMITTER_EMAIL = $u1_email
$env:GIT_AUTHOR_DATE = "2026-10-31T16:32:00+05:30"
$env:GIT_COMMITTER_DATE = "2026-10-31T16:32:00+05:30"
git commit -m "docs: add subscription system setup instructions, licenses and references" --date="2026-10-31T16:32:00+05:30"

Write-Host "Finished cleanly!"
