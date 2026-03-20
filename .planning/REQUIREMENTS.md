# Requirements: Platform Development Engine

**Defined:** 2026-03-19
**Core Value:** Any user can go from idea to shipped product through a single platform that handles the full development lifecycle.

## v0.8 Requirements

Requirements for v0.8 Observability & Event Infrastructure. Each maps to roadmap phases.

### Event Infrastructure

- [x] **EVNT-01**: Event bus emits structured NDJSON events with schema_version, timestamp, event_type, session_id, and extensions fields
- [x] **EVNT-02**: Events are appended to session-scoped NDJSON files in /tmp via async dispatch (setImmediate) to avoid blocking workflows
- [x] **EVNT-03**: Claude Code hooks (SubagentStart, SubagentStop, PostToolUse, SessionStart, SessionEnd) automatically capture tool-level events
- [ ] **EVNT-04**: Semantic workflow events emitted for phase start/complete, wave start/complete, plan start/complete, and commit events
- [x] **EVNT-05**: Event schema includes extensions field for future consumers (presentations, idle-time productivity)
- [x] **EVNT-06**: Concurrent PDE sessions write to separate session-scoped event files without interleaving

### tmux Dashboard

- [x] **TMUX-01**: `/pde:monitor` command launches a persistent tmux session with 6-pane layout
- [ ] **TMUX-02**: Agent activity pane shows real-time agent spawn/complete events with agent type and status
- [ ] **TMUX-03**: Pipeline progress pane shows phase/plan/task completion with wave-aware progress indicators
- [ ] **TMUX-04**: File changes pane shows files created/modified in real-time from event stream
- [ ] **TMUX-05**: Log stream pane shows structured event log with severity filtering
- [ ] **TMUX-06**: Token/cost meter pane shows running token estimate (~est.) and approximate cost per model
- [ ] **TMUX-07**: Context window pane shows orchestrator context utilization indicator labeled as estimate
- [x] **TMUX-08**: Dashboard persists after PDE operation completes (user closes manually)
- [x] **TMUX-09**: Adaptive layout degrades gracefully for terminals below 120x30 (fewer panes, priority ordering)
- [x] **TMUX-10**: Nested tmux detection checks $TMUX and uses switch-client fallback for users already in tmux

### Dependency Management

- [x] **DEPS-01**: tmux availability detected via `which tmux` before dashboard launch
- [x] **DEPS-02**: Platform-aware install instructions offered when tmux is missing (homebrew for macOS, apt/yum for Linux)
- [x] **DEPS-03**: Auto-install offer with explicit user consent before running package manager commands

### Session History

- [ ] **HIST-01**: SessionEnd triggers generation of structured markdown summary in `.planning/logs/`
- [ ] **HIST-02**: Session summaries include duration, event count, agents spawned, commits made, and phase/plan progress
- [ ] **HIST-03**: Raw NDJSON event streams stored in /tmp for live debugging with automatic cleanup of files older than 7 days at SessionStart
- [ ] **HIST-04**: Session log files are named with ISO timestamp and session ID for uniqueness

### Token & Context Metering

- [ ] **TOKN-01**: Token estimation uses chars/4 heuristic for all text content, clearly labeled as "~est."
- [ ] **TOKN-02**: Cost estimation uses per-model pricing from existing model-profiles configuration
- [ ] **TOKN-03**: Context window utilization displayed as percentage with orchestrator scope label

## Future Requirements

### Enhanced Metering

- **TOKN-04**: Exact token counting via vendored tokenizer (tokenx 1.3.0) or Anthropic count_tokens API
- **TOKN-05**: Per-agent token breakdown in dashboard and session summary

### Dashboard Extensions

- **TMUX-11**: Dashboard auto-launch option via config toggle on /pde:execute-phase
- **TMUX-12**: Custom pane layout profiles (compact 4-pane, full 6-pane, minimal 2-pane)

### Event Consumers

- **EVNT-07**: Stakeholder presentation generator consuming event stream for automated progress reports
- **EVNT-08**: Idle-time productivity system consuming event stream for context-aware task suggestions

## Out of Scope

| Feature | Reason |
|---------|--------|
| Web-based dashboard / browser UI | PDE is terminal-native; tmux is the right tool for the medium |
| Real-time WebSocket server for events | Over-engineered for file-based state model; NDJSON + tail -F is simpler and sufficient |
| Exact token counting | Anthropic provides no local tokenizer for Claude 3+ models; estimation is honest |
| npm dependencies at plugin root | Zero-npm constraint is a project-level invariant |
| Named pipes / Unix domain sockets for IPC | Block when no reader attached; NDJSON files are self-healing |
| blessed/ink terminal UI frameworks | Architectural mismatch — both want to own the terminal; PDE injects into tmux panes |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| EVNT-01 | Phase 58 | Complete |
| EVNT-02 | Phase 58 | Complete |
| EVNT-03 | Phase 58 | Complete |
| EVNT-04 | Phase 62 | Pending |
| EVNT-05 | Phase 58 | Complete |
| EVNT-06 | Phase 58 | Complete |
| TMUX-01 | Phase 59 | Complete |
| TMUX-02 | Phase 59 | Pending |
| TMUX-03 | Phase 59 | Pending |
| TMUX-04 | Phase 59 | Pending |
| TMUX-05 | Phase 59 | Pending |
| TMUX-06 | Phase 59 | Pending |
| TMUX-07 | Phase 59 | Pending |
| TMUX-08 | Phase 59 | Complete |
| TMUX-09 | Phase 59 | Complete |
| TMUX-10 | Phase 59 | Complete |
| DEPS-01 | Phase 59 | Complete |
| DEPS-02 | Phase 59 | Complete |
| DEPS-03 | Phase 59 | Complete |
| HIST-01 | Phase 60 | Pending |
| HIST-02 | Phase 60 | Pending |
| HIST-03 | Phase 60 | Pending |
| HIST-04 | Phase 60 | Pending |
| TOKN-01 | Phase 61 | Pending |
| TOKN-02 | Phase 61 | Pending |
| TOKN-03 | Phase 61 | Pending |

**Coverage:**
- v0.8 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-19*
*Last updated: 2026-03-19 after roadmap creation — all 26 requirements mapped to phases 58-62*
