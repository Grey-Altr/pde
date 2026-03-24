<purpose>
Run 3-tier divergence detection between handoff specs and the codebase, then output DIVERGENCE.md to the project root. Implements DIV-05: on-demand divergence check available via /pde:check-divergence command.
</purpose>

<process>

## 0. Parse Arguments

Parse $ARGUMENTS:
- `--verbose`: boolean flag, default false. If present, display per-component details in addition to the summary.

## 1. Run Divergence Detection

Run the following command to invoke divergence.cjs and capture the JSON result:

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
import { writeFileSync } from 'fs';
const req = createRequire(import.meta.url);
const d = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/divergence.cjs`);
const r = d.runDivergenceCheck(process.cwd());
if (!r.noSpecs) {
  const md = d.buildDivergenceReport(r);
  writeFileSync('DIVERGENCE.md', md);
}
process.stdout.write(JSON.stringify(r) + '\n');
EOF
```

Parse the JSON output into a `result` object.

If the command fails to run (non-zero exit, parse error), display:
```
Error: Could not run divergence check. Ensure bin/lib/divergence.cjs exists and is loadable.
```
Then stop.

## 2. Handle noSpecs Case

If `result.noSpecs` is `true`:

Display:
```
No handoff specs found -- run /pde:handoff first to generate component specs.
```

Do NOT write DIVERGENCE.md. Stop.

## 3. Display Summary

Count components by status from `result.components`:
- ALIGNED: component file exists, props match (if specified), tokens used (if specified)
- DRIFTED: component file exists but interface or tokens have diverged from spec
- MISSING: component file not found in project tree
- EXTRA: component file found in conventional directory but not declared in any handoff spec

Display header:
```
Divergence Report
```

Followed by a blank line, then a summary table:

```
  Component        Status     Notes
  ─────────────────────────────────────────────────────────
  Button           ALIGNED
  Card             DRIFTED    missing tokens: --color-surface-100
  Header           MISSING    component file not found
  LegacyWidget     EXTRA      not in handoff specs
```

Pad component name to 16 characters, status to 10 characters, then notes (if any).

Then display the count line:
```
{ALIGNED} aligned / {DRIFTED} drifted / {MISSING} missing / {EXTRA} extra
DIVERGENCE.md written to project root.
```

If `result.suppressedCount` is greater than 0:
```
{N} divergences suppressed via .pde-divergence-ignore
```

## 4. Display Verbose Details (--verbose only)

If `--verbose` flag was passed, display a detailed section for each non-ALIGNED component:

For each DRIFTED component:
```
DRIFTED: {name}
  File: {t1.filePath}
  T2 Content: {t2 details — interface missing OR missing props list}
  T3 Behavioral: {t3 details — missing tokens list OR "tokens used"}
  Notes: {notes}
```

For each MISSING component:
```
MISSING: {name}
  No file found in project tree for any of: .tsx .ts .jsx .js .vue .svelte
```

For each EXTRA component:
```
EXTRA: {name}
  File: {t1.filePath}
  Not declared in any handoff spec. Add to .pde-divergence-ignore to suppress.
```

## 5. Interpret Status Values

Guide for understanding each status:

**ALIGNED** — Component file found, interface matches spec (if @props annotation present), and all design tokens referenced (if @tokens annotation present). No action needed.

**DRIFTED** — Component file found but content has diverged from the handoff spec. T2 or T3 divergence detected. Action: review the component and update either the spec or the implementation.

**MISSING** — No file with the component name found anywhere in the project tree. Action: implement the component or check if it was renamed.

**EXTRA** — A PascalCase component file was found in a conventional directory (components/, ui/, widgets/, elements/) but is not listed in any handoff spec. Action: add a @component annotation to the relevant handoff spec, or add the component name to `.pde-divergence-ignore` if the divergence is intentional.

## 6. Suppression Reference

To suppress known-acceptable divergences, add component names to `.pde-divergence-ignore` at the project root:

```
# .pde-divergence-ignore
# One component name per line. Lines starting with # are comments.
LegacyWidget
ThirdPartyCard
```

Suppressed components are excluded from the DIVERGENCE.md report and the status display.

</process>
