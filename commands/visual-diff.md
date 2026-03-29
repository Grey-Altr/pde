# /pde:visual-diff

Compare image assets between two git branches using perceptual hashing.

## Usage

`/pde:visual-diff <branch-a> <branch-b>`

Or via CLI: `node bin/pde-tools.cjs image diff <branch-a> <branch-b>`

## Parameters

- `branch-a` — Base branch (e.g., `main`)
- `branch-b` — Compare branch (e.g., `feature/redesign`)

## Output

- Markdown report at `.planning/design/assets/visual-diff-{timestamp}.md`
- JSON sidecar at `.planning/design/assets/visual-diff-{timestamp}.json`
- Console summary with asset counts by status

## Asset Classification

| Status | Meaning |
|--------|---------|
| unchanged | Perceptual hash identical (distance 0) |
| minor | Small change, distance 1-5 (0-8%) |
| significant | Noticeable change, distance 6-15 (9-23%) |
| major | Large change, distance 16+ (25%+) |
| new | Only exists in branch B |
| deleted | Only exists in branch A |

## Notes

- Compares committed files only (untracked files are not included)
- Uses perceptual hashing (pHash) — resilient to JPEG recompression and minor metadata changes
- Does not modify the working tree (reads via `git show`)
- Supports PNG, JPG, JPEG, GIF, WebP
