# Ideation Techniques Index

Compact reference for agent prompt loading. Full technique details available via companion files.

## Techniques

| Slug | Name | Tier | Steps | Description | When to Use |
|------|------|------|-------|-------------|-------------|
| scamper | SCAMPER | standard | 7 | Systematic idea transformation using 7 action verbs | Exploring variations of existing concepts |
| how-might-we | How Might We | quick | 5 | Reframes problems as opportunity questions | Finding the right problem framing before solutions |
| constraint-removal | Constraint Removal | standard | 5 | Removes assumed constraints to unlock solutions | Breaking "that is how it works" thinking |
| reverse-brainstorming | Reverse Brainstorming | quick | 5 | Brainstorm how to cause the problem, then reverse | When direct brainstorming produces only obvious ideas |
| six-thinking-hats | Six Thinking Hats | deep | 6 | Structured parallel thinking from 6 perspectives | Thorough concept evaluation from multiple angles |
| worst-possible-idea | Worst Possible Idea | quick | 5 | Generate deliberately terrible ideas to find insights | Breaking creative blocks and perfectionism |
| analogical-thinking | Analogical Thinking | standard | 5 | Find solutions by drawing parallels from other domains | When solutions feel domain-locked |
| jobs-to-be-done | Jobs-to-be-Done | deep | 6 | Focus on functional, emotional, and social user jobs | Grounding concepts in real human needs |

## Tier Guide

- **quick** (10-20 min): how-might-we, reverse-brainstorming, worst-possible-idea
- **standard** (20-40 min): scamper, constraint-removal, analogical-thinking
- **deep** (30-45 min): six-thinking-hats, jobs-to-be-done

## Recipes

| Slug | Name | Techniques | When to Suggest |
|------|------|------------|-----------------|
| stuck-to-unstuck | Stuck to Unstuck | worst-possible-idea -> reverse-brainstorming -> scamper | User is stuck or generating only incremental ideas |
| problem-reframe | Problem Reframe | jobs-to-be-done -> how-might-we -> constraint-removal | Problem definition feels unclear or wrong |

## Suggested Chaining

- **Problem unclear?** jobs-to-be-done -> how-might-we -> constraint-removal
- **Need variations?** how-might-we -> scamper -> six-thinking-hats
- **Feeling stuck?** worst-possible-idea -> reverse-brainstorming -> scamper
- **Cross-domain inspiration?** constraint-removal -> analogical-thinking -> six-thinking-hats

## Extensibility

Custom techniques use `"origin": "custom"` and display a [custom] badge. All techniques follow the same JSON+MD format at `${CLAUDE_PLUGIN_ROOT}/techniques/`.

Full technique details: `@${CLAUDE_PLUGIN_ROOT}/techniques/{slug}.md`
