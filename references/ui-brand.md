<ui_patterns>

Neo-tokyo visual system for all PDE terminal output. Skills and workflows call the shared rendering module instead of using inline formatting.

## Rendering Module

All visual output uses the shared CJS rendering module:

```bash
node "${CLAUDE_PLUGIN_ROOT}/lib/ui/render.cjs" <command> [args] [--flags]
```

**Location:** `${CLAUDE_PLUGIN_ROOT}/lib/ui/render.cjs`
**Dependencies:** None (raw ANSI escape codes, zero npm packages)
**Color mode:** 256-color (not truecolor) for Claude Code compatibility

---

## Color Palette

| Role | Color | ANSI 256 Code | Usage |
|------|-------|---------------|-------|
| Primary | Amber | 214 | Headers, banners, progress bars, borders |
| Secondary | Red | 196 | Errors, accents, warnings |
| Metadata | Grey | 242 | Dim info, dividers, timestamps |
| Gold | Gold/Amber | 214 (bold) | Checkpoints, celebrations |
| Background | Terminal default | - | No background override |

**Semantic mapping:**
- Success = bold amber
- Warning = dim amber
- Error = bold red
- Info = dim grey
- Body text = terminal default

**Safety:** All colors become empty strings when `NO_COLOR` is set or stdout is not a TTY.

---

## Component Catalog

### Banner

Neo-tokyo glyph-framed banner using full-block characters. Terminal-width adaptive.

```bash
node "${CLAUDE_PLUGIN_ROOT}/lib/ui/render.cjs" banner "STAGE NAME"
node "${CLAUDE_PLUGIN_ROOT}/lib/ui/render.cjs" banner "MILESTONE COMPLETE" --major
```

**Visual:** `████████ STAGE NAME ████████` (amber, full terminal width)
**With `--major`:** Wrapped in double-line box (amber border)

**Use for:** Major workflow transitions, stage changes, completion markers.

### Panel

Bordered content box with title. Color-coded by type.

```bash
node "${CLAUDE_PLUGIN_ROOT}/lib/ui/render.cjs" panel "Title" --content "Body text" --type default
node "${CLAUDE_PLUGIN_ROOT}/lib/ui/render.cjs" panel "Title" --type checkpoint --content "Message"
node "${CLAUDE_PLUGIN_ROOT}/lib/ui/render.cjs" panel "Title" --type error --content "Error details"
node "${CLAUDE_PLUGIN_ROOT}/lib/ui/render.cjs" panel "Title" --type info --content "Info text"
```

**Types and borders:**
- `default` / `info` = single-line box (`┌─┐`)
- `checkpoint` / `major` = double-line box (`╔═╗`)
- `error` = single-line box, red border

### Progress

Progress bar with filled blocks and percentage.

```bash
node "${CLAUDE_PLUGIN_ROOT}/lib/ui/render.cjs" progress "Label" --percent 75
```

**Visual:** `Label ████████░░░░ 75%` (amber fill, grey empty)

### Checkpoint

Double-line gold box with centered message. For verification/decision gates.

```bash
node "${CLAUDE_PLUGIN_ROOT}/lib/ui/render.cjs" checkpoint "CHECKPOINT: Verification Required"
```

**Visual:** Double-line border (`╔═╗`), gold/amber color, centered text.

### Error

Red-bordered panel for error messages.

```bash
node "${CLAUDE_PLUGIN_ROOT}/lib/ui/render.cjs" error "Error description here"
```

**Visual:** Single-line box with red border, "ERROR" title.

### Header

Text headers with visual hierarchy levels.

```bash
node "${CLAUDE_PLUGIN_ROOT}/lib/ui/render.cjs" header "Title" --level 1
node "${CLAUDE_PLUGIN_ROOT}/lib/ui/render.cjs" header "Title" --level 2
node "${CLAUDE_PLUGIN_ROOT}/lib/ui/render.cjs" header "Title"
```

**Level 1:** Bold amber text + grey underline divider
**Level 2:** Amber text (no decoration)
**Default:** Bold amber text

### Divider

Horizontal line spanning terminal width.

```bash
node "${CLAUDE_PLUGIN_ROOT}/lib/ui/render.cjs" divider
node "${CLAUDE_PLUGIN_ROOT}/lib/ui/render.cjs" divider --style double
```

**Single (default):** `─────────` (grey, full width)
**Double:** `═════════` (grey, full width)

---

## Visual Hierarchy

| Level | Style | Usage |
|-------|-------|-------|
| H1 | Bold amber + underline | Major section headers |
| H2 | Amber | Sub-section headers |
| Body | Terminal default | Instructions, content |
| Metadata | Dim grey | Timestamps, file paths, counts |
| Accent | Red | Errors, critical markers |

---

## Box Weight Rules

| Context | Border | Example |
|---------|--------|---------|
| Major banner / checkpoint | Double-line (`╔═╗`) | Stage transitions, verification gates |
| Info panel / content box | Single-line (`┌─┐`) | Status displays, help text |
| Error panel | Single-line, red | Error messages |
| Divider | Single-line (`───`) | Section breaks |
| Major divider | Double-line (`═══`) | Phase boundaries |

---

## Status Symbols

```
✓  Complete / Passed / Verified
✗  Failed / Missing / Blocked
◆  In Progress
○  Pending
⚡ Auto-approved
```

These are plain text (not rendered through the module).

---

## Calling Convention

Skills and workflows call the module via Bash tool:

```bash
node "${CLAUDE_PLUGIN_ROOT}/lib/ui/render.cjs" <command> <args> [--flags]
```

**Commands:** banner, panel, progress, checkpoint, error, header, divider

**Flag format:** `--key value` (all flags are optional)

**Rules:**
1. Skills NEVER write raw ANSI escape codes
2. Skills NEVER construct inline banner/box/divider patterns
3. All visual output goes through render.cjs
4. Status symbols (✓, ✗, ◆, ○) are plain text, not rendered through the module
5. Tables are plain markdown, not rendered through the module

---

## Anti-Patterns

- Writing raw ANSI escape codes in skill files
- Constructing inline banner patterns (`=== Title ===`, `━━━ PDE ► ━━━`)
- Using box-drawing characters directly in skills (`╔═╗`, `┌─┐`)
- Mixing render.cjs calls with inline formatting
- Hardcoding terminal widths (render.cjs auto-detects)

</ui_patterns>
