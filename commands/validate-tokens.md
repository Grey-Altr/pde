---
name: pde:validate-tokens
description: Validate DTCG design tokens against schema completeness, naming conventions, OKLCH gamut ranges, and APCA contrast ratios
argument-hint: "--tokens-file <tokens.json>"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
---
<objective>
Execute the /pde:validate-tokens command. Validate a DTCG design token JSON file for schema compliance, naming issues, color gamut violations, and contrast accessibility failures.
</objective>

# /pde:validate-tokens

Validate DTCG (Design Token Community Group) design tokens for schema completeness, naming convention compliance, OKLCH P3 gamut correctness, and APCA contrast accessibility. Produces a markdown violation report and JSON stats.

## Usage

`/pde:validate-tokens --tokens-file <tokens.json>`

Or via CLI: `node bin/pde-tools.cjs utils validate-tokens --tokens-file <tokens.json>`

## Parameters

- `--tokens-file` — Path to the DTCG-format design token JSON file (required)

## Output

Markdown summary table of violations printed to stdout, followed by JSON stats:

```json
{
  "total": 42,
  "passed": 38,
  "failed": 4
}
```

Violation report columns: Token | Type | Issue | Value

## Validation Checks

| Check | Rule |
|-------|------|
| Schema completeness | Every token must have a `$type` field |
| Naming convention | Token keys must follow `{group}.{token}` pattern (e.g., `color.primary`) |
| OKLCH gamut | `color` tokens with OKLCH values must be within P3 display gamut (C <= 0.4, L in [0,1]) |
| APCA contrast | Foreground/background color pairs must meet APCA contrast: >= 60 Lc for body text, >= 45 Lc for large text |

## Examples

```
/pde:validate-tokens --tokens-file .planning/design/tokens/tokens.json
/pde:validate-tokens --tokens-file src/design-system/tokens.json
node bin/pde-tools.cjs utils validate-tokens --tokens-file tokens.json
```

## DTCG Token Format

Expected input structure:

```json
{
  "color": {
    "primary": { "$type": "color", "$value": "oklch(0.7 0.15 220)" },
    "background": { "$type": "color", "$value": "#ffffff" }
  },
  "spacing": {
    "sm": { "$type": "dimension", "$value": "8px" }
  }
}
```

## Notes

- OKLCH gamut check uses chroma (C) <= 0.4 and lightness (L) in [0, 1] as P3-safe thresholds
- APCA contrast uses the Silver/Bronze standard: 60 Lc for body text, 45 Lc for large (18px+) or bold text
- Non-OKLCH color values (hex, rgb, hsl) pass the gamut check automatically
- Token pairs for APCA contrast require both a foreground and background token in the same group with names matching `foreground`/`background` or `text`/`bg` patterns
