# Fixing "Large files detected" push errors (GitHub GH001)

This repository recently hit GitHub's 100 MB file limit due to some Excel files committed under:

- `OLD-REPO/backend/data/training_data_*.xlsx`

The backend already has `.gitignore` rules to prevent committing `.xlsx` anywhere. However, once large files exist in Git history, GitHub will still reject pushes even if the files are deleted in later commits. You must remove those blobs from history and force-push.

This guide provides two safe ways to do that on Windows:

- Option A (Recommended): `git filter-repo` (modern, fast)
- Option B: BFG Repo-Cleaner (easy GUI-like tool)

Important notes
- Work on a fresh branch and a fresh clone if possible.
- Coordinate with collaborators: history will be rewritten; they must re-clone or reset.
- Ensure you have a backup of any needed files in your working directory before running cleanup.

Pre-check
1) Ensure `.gitignore` already blocks Excel and uploads (it does):
   - `OLD-REPO/backend/.gitignore` includes `*.xlsx`, `*.xls`, and `uploads/`.
2) Delete any tracked large files from the working tree if still present:
   - `git rm --cached -r -- OLD-REPO/backend/data`
   - Keep the directory (there is a `.gitkeep` file) but untrack any `.xlsx` files.

Option A — git filter-repo (recommended)
1) Install git-filter-repo (one-time):
   - Using Python: `pip install git-filter-repo`
   - Or download from: https://github.com/newren/git-filter-repo
2) From the repository root, run:
```
# Remove all Excel files from the entire history
git filter-repo --force --invert-paths --path-glob "**/*.xlsx" --path-glob "**/*.xls"

# Optionally also remove the specific training files by exact path (redundant if using globs above):
# git filter-repo --force --invert-paths --path OLD-REPO/backend/data/training_data_1757693142556.xlsx --path OLD-REPO/backend/data/training_data_1757693222056.xlsx --path OLD-REPO/backend/data/training_data_1757693278190.xlsx
```
3) Review changes: `git log --stat` and `git verify-pack -v .git/objects/pack/*.idx | sort -k3 -n | tail -20`
4) Force-push the cleaned history:
```
# Replace origin/main with your remote/branch if different
git push origin main --force-with-lease
```
5) Tell teammates to re-clone or run:
```
git fetch --all --prune
# Then reset their local main to the new history
git checkout main
git reset --hard origin/main
```

Option B — BFG Repo-Cleaner
1) Download BFG jar: https://rtyley.github.io/bfg-repo-cleaner/
2) Create a text file listing patterns to delete, e.g. `patterns.txt` with:
```
*.xlsx
*.xls
```
3) From a fresh bare clone of the repo (recommended by BFG):
```
# In PowerShell
mkdir ..\fazi-ai-bare
cd ..\fazi-ai-bare
git clone --mirror <REPO_URL> .
java -jar ..\path\to\bfg.jar --delete-files patterns.txt
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

Add guardrails (optional but recommended)
- Pre-commit hook: Use the provided template under `.githooks/` to block files >50 MB and `.xlsx` files. Enable with:
```
# From repo root
git config core.hooksPath .githooks
```

Troubleshooting
- "fatal: git-filter-repo: command not found": Install via `pip install git-filter-repo` and ensure Scripts directory is on PATH (e.g., `%USERPROFILE%\AppData\Local\Programs\Python\Python311\Scripts`).
- "nothing to rewrite": The files may already be gone from history or your current clone doesn’t include the offending commits.
- After force-push, GitHub still complains: Ensure the branch you push (e.g., `main`) is the one with the rewritten history; also check other branches/tags that might still reference large blobs.

After cleanup, future pushes should succeed. If you want help running these commands, ping a maintainer.
