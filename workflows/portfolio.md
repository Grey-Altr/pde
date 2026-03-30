<purpose>
Synthesize a cross-project portfolio presentation from multiple project .planning/ directories. Reads structured IR from pde-tools for each project (never raw .planning/ files), aggregates into a portfolioIR, and renders dual HTML+Markdown output to the invoking project's .planning/presentations/.
</purpose>

<skill_code>PFL</skill_code>

<skill_domain>tooling</skill_domain>

<process>

## /pde:portfolio — Cross-Project Portfolio Synthesis Pipeline

---

### Step 1/7: Parse arguments

Display banner:

```
PDE > PORTFOLIO
```

Parse $ARGUMENTS:
- Extract all non-flag arguments as PATH_ARGS array (e.g., `/path/to/projectA /path/to/projectB`)
- Detect flags: `--pdf`, `--dry-run`

---

### Step 2/7: Validate paths

If no paths were provided, halt with error:

```
Error: No project paths provided.
  Usage: /pde:portfolio /path/to/project1 /path/to/project2
  At least one absolute path to a project root must be provided.
  Each path must contain a .planning/ directory.
```

For each path in PATH_ARGS:
- Validate it is an absolute path (starts with `/`)
- Validate that `.planning/` directory exists at that path: `test -d "${PATH}/.planning"`
- If invalid or .planning/ missing: print warning and skip — do NOT halt
  ```
  Warning: Skipping invalid path: ${PATH}
    Reason: [not absolute | .planning/ directory not found]
  ```
- Add valid paths to VALID_PATHS array

If VALID_PATHS is empty after validation:

```
Error: No valid project paths remain after validation.
  All provided paths were invalid or missing .planning/ directories.
  Provide absolute paths to projects initialized with PDE (/pde:new-project).
```

HALT on this error.

If `--dry-run` flag is set, display planned output and halt:

```
Dry run mode. No files will be written.

Valid paths (${#VALID_PATHS[@]}):
  [list each VALID_PATH]

Planned output:
  HTML: .planning/presentations/portfolio-synthesis-${DATE}.html
  Markdown: .planning/presentations/portfolio-synthesis-${DATE}.md
  IF --pdf:
    PDF: .planning/presentations/portfolio-synthesis-${DATE}.pdf
```

---

### Step 3/7: Build portfolioIR

Run the portfolio build command with all valid paths:

```bash
IR_TEMP=$(mktemp /tmp/pde-portfolio-XXXXXX.json)
IR_RAW=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" portfolio build ${VALID_PATHS[@]})
if [[ "$IR_RAW" == @file:* ]]; then
  cp "${IR_RAW#@file:}" "$IR_TEMP"
else
  echo "$IR_RAW" > "$IR_TEMP"
fi
```

If the command fails or the file is empty:

```
Error: Failed to build portfolioIR.
  The pde-tools portfolio build command did not return valid output.
  Ensure each project path is initialized with PDE (/pde:new-project).
```

HALT on error.

Parse the JSON and extract:
- AVAILABLE_COUNT: `portfolioIR.available_count`
- PROJECT_COUNT: `portfolioIR.project_count`

---

### Step 4/7: Compute output paths

```bash
DATE=$(date +%Y-%m-%d)
HTML_PATH=".planning/presentations/portfolio-synthesis-${DATE}.html"
MD_PATH=".planning/presentations/portfolio-synthesis-${DATE}.md"
mkdir -p .planning/presentations/
```

If `--pdf` flag is set:
```bash
PDF_PATH=".planning/presentations/portfolio-synthesis-${DATE}.pdf"
```

---

### Step 5/7: Render portfolio

Run the portfolio render command:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" portfolio render "${IR_TEMP}" "${HTML_PATH}" "${MD_PATH}"
```

If the command fails (non-zero exit), display error:

```
Error: Portfolio rendering failed.
  Check that portfolioIR was built correctly (Step 3).
  Re-run /pde:portfolio after resolving any errors.
```

HALT on error.

Log output:

```
Portfolio rendered:
  HTML: ${HTML_PATH}
  Markdown: ${MD_PATH}
  Projects: ${AVAILABLE_COUNT} of ${PROJECT_COUNT} available
```

---

### Step 6/7: Optional PDF export

IF `--pdf` flag is set, run PDF export after render (HTML and MD are already written):

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" presentation pdf "${HTML_PATH}" "${PDF_PATH}"
```

If this command fails (non-zero exit), display error but do NOT halt:

```
Error: PDF export failed for "${HTML_PATH}".
  Ensure Playwright browsers are installed: npx playwright install chromium
  HTML and Markdown output are available at the paths above.
```

If successful, log:

```
PDF: ${PDF_PATH}
```

---

### Step 7/7: Complete

Display completion banner:

```
PDE > PORTFOLIO > DONE

Projects:  ${AVAILABLE_COUNT} of ${PROJECT_COUNT} available
HTML:      ${HTML_PATH}
Markdown:  ${MD_PATH}
IF --pdf:
  PDF:       ${PDF_PATH}

Output written to: .planning/presentations/ (invoking project's directory)
```

Clean up temp file:
```bash
rm -f "$IR_TEMP"
```

</process>
