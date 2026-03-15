---
Generated: "{date}"
Skill: /pde:hardware (HWR)
Version: v{N}
Status: draft
Scope: "{full|mechanical-only|electronics-only|bom-only}"
ECO History: "{revision count}"
Enhanced By: "{MCP list or none}"
---

# Hardware Specification: {product_name}

---

## Product Overview

**Description:** {1-2 paragraph product description}
**Product Type:** {consumer electronics|wearable|IoT/embedded|enclosure|hybrid}
**Target Market:** {primary audience and use context}

---

## Form Factor & Dimensions

### Overall Dimensions

| Dimension | Value | Tolerance |
|-----------|-------|-----------|
| Length | {X} mm | +/- {Y} mm |
| Width | {X} mm | +/- {Y} mm |
| Height | {X} mm | +/- {Y} mm |
| Weight | {X} g | +/- {Y} g |

### Orthographic Views

#### Front View

```svg
<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
  <!-- Front view outline -->
  <rect x="50" y="30" width="300" height="240" fill="none" stroke="#333" stroke-width="2"/>
  <!-- Dimension lines -->
  <line x1="50" y1="285" x2="350" y2="285" stroke="#666" stroke-width="0.5"/>
  <text x="200" y="298" text-anchor="middle" font-size="10">{width} mm</text>
  <!-- Feature callouts -->
  <!-- Add feature geometry and callout labels -->
</svg>
```

#### Side View

```svg
<!-- Side view SVG -->
```

#### Top View

```svg
<!-- Top view SVG -->
```

---

## Materials Specification

| Part | Material | Grade | Finish | Tolerance | Notes |
|------|----------|-------|--------|-----------|-------|
| {part name} | {material} | {grade/alloy} | {surface finish, Ra value} | {tolerance class} | {special requirements} |
| {part name} | {material} | {grade/alloy} | {surface finish, Ra value} | {tolerance class} | {special requirements} |

### Material Properties Reference

| Material | Density (g/cm3) | Tensile (MPa) | Thermal Cond (W/mK) | Max Temp (C) | Cost Class |
|----------|----------------|---------------|---------------------|-------------|------------|
| {material} | {value} | {value} | {value} | {value} | {$/$$/$$$} |

---

## Mechanisms

| Mechanism | Travel | Actuation Force | Cycle Life | Type |
|-----------|--------|----------------|------------|------|
| {mechanism name} | {X} mm | {X} N | {X} cycles | {linear/rotary/snap} |

### Motion Diagrams

```svg
<svg viewBox="0 0 500 200" xmlns="http://www.w3.org/2000/svg">
  <!-- Closed state (solid) -->
  <g transform="translate(50,20)">
    <text x="75" y="-5" text-anchor="middle" font-size="11" font-weight="bold">Closed</text>
    <!-- Mechanism geometry in closed position -->
  </g>

  <!-- Intermediate state (dashed) -->
  <g transform="translate(200,20)">
    <text x="75" y="-5" text-anchor="middle" font-size="11">Intermediate</text>
    <!-- Mechanism geometry in intermediate position -->
  </g>

  <!-- Open state (solid) -->
  <g transform="translate(350,20)">
    <text x="75" y="-5" text-anchor="middle" font-size="11" font-weight="bold">Open</text>
    <!-- Mechanism geometry in open position -->
  </g>

  <!-- Travel arrow -->
  <line x1="125" y1="180" x2="425" y2="180" stroke="#2563eb" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="275" y="195" text-anchor="middle" font-size="10" fill="#2563eb">{travel} mm travel</text>
</svg>
```

---

## Electronics System

### Block Diagram

```svg
<svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg">
  <!-- Power path -->
  <rect x="20" y="170" width="100" height="60" fill="#e8f4fd" stroke="#2563eb" stroke-width="1.5" rx="4"/>
  <text x="70" y="205" text-anchor="middle" font-size="11">Battery</text>

  <!-- MCU -->
  <rect x="250" y="150" width="120" height="100" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.5" rx="4"/>
  <text x="310" y="205" text-anchor="middle" font-size="11">MCU</text>

  <!-- Sensors -->
  <rect x="450" y="170" width="100" height="60" fill="#fef3c7" stroke="#d97706" stroke-width="1.5" rx="4"/>
  <text x="500" y="205" text-anchor="middle" font-size="11">Sensors</text>

  <!-- Connections -->
  <line x1="120" y1="200" x2="250" y2="200" stroke="#333" stroke-width="1"/>
  <line x1="370" y1="200" x2="450" y2="200" stroke="#333" stroke-width="1"/>

  <!-- Connection labels -->
  <text x="185" y="195" text-anchor="middle" font-size="9" fill="#666">{voltage}</text>
  <text x="410" y="195" text-anchor="middle" font-size="9" fill="#666">{protocol}</text>
</svg>
```

### Component List

| Component | Description | Package | Part Number | Quantity | Notes |
|-----------|-------------|---------|-------------|----------|-------|
| {component} | {description} | {package} | {part number} | {qty} | {notes} |

### Multi-Board Support

*(If applicable -- separate block diagram + component list per board)*

**Board Interconnects:**

| Connection | From Board | To Board | Protocol | Voltage | Connector |
|------------|-----------|----------|----------|---------|-----------|
| {name} | {board} | {board} | {I2C/SPI/UART/USB} | {V} | {connector type} |

---

## Assembly Sequence

### Exploded View

```svg
<svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
  <!-- Exploded view with numbered callouts -->
  <!-- Parts separated vertically with dashed alignment lines -->
  <!-- Fastener callouts with type and torque spec -->
</svg>
```

### Assembly Steps

| Step | Action | Parts | Fasteners | Torque | Notes |
|------|--------|-------|-----------|--------|-------|
| 1 | {action description} | {parts involved} | {fastener type, qty} | {Nm} | {alignment notes} |
| 2 | {action description} | {parts involved} | {fastener type, qty} | {Nm} | {notes} |

---

## Bill of Materials (BOM)

| Item | Description | Material | Qty | Unit Cost (100) | Unit Cost (1K) | Unit Cost (10K) | Supplier | Lead Time | MOQ |
|------|-------------|----------|-----|----------------|----------------|-----------------|----------|-----------|-----|
| {item} | {desc} | {material} | {qty} | ${X} | ${X} | ${X} | {supplier} | {weeks} | {qty} |

*Note: Pricing is estimated based on available data. Verify with suppliers before quoting.*

---

## Cost Breakdown

| Category | Cost (100 units) | Cost (1K units) | Cost (10K units) |
|----------|-----------------|-----------------|------------------|
| BOM | ${X} | ${X} | ${X} |
| Tooling (amortized) | ${X} | ${X} | ${X} |
| Assembly Labor | ${X} | ${X} | ${X} |
| Packaging | ${X} | ${X} | ${X} |
| **Total Per Unit** | **${X}** | **${X}** | **${X}** |

---

## DFM Notes

### {Manufacturing Process 1} (e.g., Injection Molding)

- **Min wall thickness:** {X} mm
- **Draft angles:** {X} degrees minimum
- **Undercuts:** {avoid/acceptable with side actions}
- **Gate location:** {recommendation}
- **Sink marks:** {risk areas and mitigation}

### {Manufacturing Process 2} (e.g., CNC Machining)

- **Minimum feature size:** {X} mm
- **Tool accessibility:** {concerns}
- **Surface finish:** {achievable Ra}
- **Material waste:** {estimate}

---

## Thermal & Environmental

### Heat Sources

| Source | Power (W) | Location | Dissipation Path |
|-------|-----------|----------|-----------------|
| {component} | {W} | {location} | {conduction/convection/radiation path} |

### Environmental Specs

| Parameter | Target | Notes |
|-----------|--------|-------|
| Max Operating Temp | {X} C | {constraint} |
| Min Operating Temp | {X} C | {constraint} |
| IP Rating | IP{XX} | {ingress protection target} |
| Humidity Range | {X-Y}% RH | {non-condensing} |
| Vibration | {spec} | {if applicable} |
| UV Exposure | {spec} | {if applicable} |

---

## Ergonomics

### Hand-Overlay Diagram

```svg
<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
  <!-- Product outline -->
  <!-- Hand overlay (50th percentile) with grip zones -->
  <!-- Reach zones marked: comfortable (green), stretch (yellow), difficult (red) -->
  <!-- Button/control locations with accessibility sizing indicators -->
</svg>
```

### Grip Analysis

| Grip Type | Percentile Range | Comfort Rating | Notes |
|-----------|-----------------|----------------|-------|
| {grip type} | {5th-95th} | {good/acceptable/poor} | {sizing considerations} |

### Reach Zones

| Control | Location | 5th %ile | 50th %ile | 95th %ile |
|---------|----------|----------|-----------|-----------|
| {control} | {position} | {reachable?} | {reachable?} | {reachable?} |

---

## Surface Finishes

| Surface | Process | Color | Gloss Level | Texture | Thickness | Notes |
|---------|---------|-------|-------------|---------|-----------|-------|
| {surface} | {anodize/powder coat/paint/texture} | {Pantone/RAL code} (hex: {#XXXXXX}) | {matte/satin/gloss, GU} | {SPI/VDI class} | {um} | {special requirements} |

---

## Safety & Compliance

### Applicable Standards

| Standard | Region | Scope | Status |
|----------|--------|-------|--------|
| {UL/CE/FCC/etc.} | {region} | {what it covers} | {target/in-progress/certified} |

### Hazard Analysis

| Hazard | Location | Severity | Mitigation |
|--------|----------|----------|------------|
| {sharp edges/pinch points/battery/thermal} | {where} | {low/medium/high} | {design mitigation} |

### Per-Market Regulatory Checklist

| Market | Certifications Required | Testing Lab | Est. Timeline | Documentation |
|--------|----------------------|-------------|---------------|---------------|
| {US/EU/China/etc.} | {list} | {lab name} | {weeks} | {required docs} |

---

## Sustainability

| Aspect | Detail |
|--------|--------|
| Material Recyclability | {% recyclable by weight, materials breakdown} |
| Disassembly Plan | {steps to separate materials, tools needed} |
| RoHS Compliance | {compliant/exemptions needed} |
| REACH Compliance | {compliant/SVHCs identified} |
| Carbon Footprint | {kg CO2e estimate, if data available} |
| End-of-Life | {recycling program, take-back, disposal guidance} |

---

## Packaging

| Property | Value |
|----------|-------|
| Box Dimensions | {L x W x H} mm |
| Insert/Foam Layout | {description of protective inserts} |
| Materials | {cardboard type, foam type, print} |
| Unboxing Sequence | {step 1: open box, step 2: remove X, ...} |
| Shipping Weight | {X} g (product + packaging) |
| Pallet Quantity | {units per pallet} |

---

## Tolerancing

### GD&T Callouts

| Feature | GD&T Symbol | Tolerance | Datum | Rationale |
|---------|-------------|-----------|-------|-----------|
| {mating surface} | {flatness/parallelism/etc.} | {value} mm | {datum ref} | {why this tolerance} |

**General Tolerance Class:** {ISO 2768-mK / ISO 2768-fH / custom}

---

## Testing & Validation

| Test | Subsystem | Standard | Pass Criteria | Method |
|------|-----------|----------|--------------|--------|
| Drop Test | Enclosure | {IEC 60068-2-31} | {no functional damage from 1m} | {test protocol} |
| Thermal Cycling | Electronics | {IEC 60068-2-14} | {operates -10 to 50 C} | {test protocol} |
| Button Life | Mechanisms | {custom} | {100K cycles min} | {test protocol} |
| IP Ingress | Enclosure | {IEC 60529} | {IP{XX}} | {test protocol} |

---

## Sourcing

| Component | Primary Supplier | Alternative | Lead Time | MOQ | Catalog URL |
|-----------|-----------------|-------------|-----------|-----|-------------|
| {component} | {Digi-Key/Mouser/McMaster} | {alternative} | {weeks} | {qty} | {URL} |

*Note: Prices and availability are estimates. Verify with suppliers before placing orders.*

---

## Prototyping Plan

### Stage 1: Form Factor (3D Print)

- **Purpose:** Validate dimensions, grip, button placement
- **Process:** FDM/SLA 3D printing
- **Material:** {PLA/resin}
- **What to validate:** {fit, feel, ergonomics}

### Stage 2: Electronics (Breadboard)

- **Purpose:** Validate circuit design, sensor integration
- **Components:** {dev board, breakout modules}
- **What to validate:** {functionality, power consumption, signal integrity}

### Stage 3: Functional Prototype

- **Purpose:** Integrated form + function testing
- **Process:** {CNC + PCB + assembly}
- **What to validate:** {full system integration, user testing}

---

## Weight & Center of Gravity

| Component | Weight (g) | X (mm) | Y (mm) | Z (mm) |
|-----------|-----------|--------|--------|--------|
| {component} | {weight} | {x} | {y} | {z} |
| **Total** | **{total}** | **{CoG x}** | **{CoG y}** | **{CoG z}** |

**Weight Budget:**

| Subsystem | Target (g) | Estimate (g) | Status |
|-----------|-----------|-------------|--------|
| {subsystem} | {target} | {estimate} | {under/over/at target} |

---

## Connectors

| Connector | Type | Pin Assignments | Mating Cycles | IP Rating | Retention Force |
|-----------|------|----------------|---------------|-----------|-----------------|
| {name} | {USB-C/JST/pogo/etc.} | {pin table or reference} | {cycles} | {IP rating} | {N} |

---

## Power System

### Battery Specification

| Property | Value |
|----------|-------|
| Chemistry | {Li-Ion/LiPo/NiMH/etc.} |
| Capacity | {mAh} |
| Voltage | {nominal V} |
| Form Factor | {dimensions, pouch/cylindrical} |
| Protection | {BMS features} |

### Charging Circuit

| Property | Value |
|----------|-------|
| Protocol | {USB PD/QC/proprietary} |
| Charge Rate | {C-rate, max current} |
| Connector | {USB-C/barrel/wireless} |
| Charge Time | {0-100% estimate} |

### Power Budget

| Subsystem | Active (mA) | Sleep (uA) | Duty Cycle | Avg (mA) |
|-----------|------------|------------|------------|----------|
| {subsystem} | {mA} | {uA} | {%} | {mA} |
| **Total** | | | | **{total}** |

**Estimated Battery Life:** {hours/days at usage profile}

---

## Wireless / Connectivity

| Property | Value |
|----------|-------|
| Module | {chip/module part number} |
| Protocol | {WiFi/BLE/Zigbee/LoRa/Thread} |
| Antenna | {type, keep-out zones} |
| Range | {estimated meters, conditions} |
| OTA Updates | {supported/not supported} |
| Power (active) | {mA} |
| Power (sleep) | {uA} |

---

## Firmware Interface

### Pin Mappings

| GPIO | Function | Direction | Pull | Notes |
|------|----------|-----------|------|-------|
| {pin} | {function} | {in/out} | {up/down/none} | {notes} |

### Peripheral Configuration

| Peripheral | Type | Address/Channel | Speed | Notes |
|------------|------|----------------|-------|-------|
| {device} | {I2C/SPI/UART} | {address} | {baud/MHz} | {notes} |

### Boot Sequence

1. {Power on / reset}
2. {Hardware init}
3. {Peripheral init}
4. {Application start}

---

## EMC/EMI

| Aspect | Requirement | Design Measure |
|--------|-------------|----------------|
| Shielding | {requirement} | {shield cans, gaskets} |
| Grounding | {strategy} | {ground plane, star ground} |
| Filters | {placement} | {ferrite beads, caps} |
| Emission Class | {Class A/B} | {target} |

### Pre-Compliance Checklist

- [ ] Ground plane continuous under high-speed traces
- [ ] Bypass caps within 3mm of IC power pins
- [ ] No traces crossing split planes
- [ ] Shield can over wireless module
- [ ] Ferrite beads on cable connections
- [ ] ESD protection on all external connectors

---

## Acoustics

*(When applicable: motors, fans, speakers, vibration)*

| Parameter | Target | Notes |
|-----------|--------|-------|
| Noise Level | {X} dBA at {distance} | {measurement conditions} |
| Frequency Range | {Hz range} | {dominant frequencies} |
| Vibration Isolation | {method} | {materials, mounting} |

---

## Serviceability

| Aspect | Detail |
|--------|--------|
| User-Replaceable Parts | {list: battery, filter, etc.} |
| Tools Required | {screwdriver type, size} |
| Access Points | {where to open, how to access internals} |
| Modular Boundaries | {which subsystems are independently replaceable} |

---

## User Interaction Specs

| Control | Type | Feedback | Placement | ADA Sizing | Force |
|---------|------|----------|-----------|------------|-------|
| {button/switch/dial} | {tactile/capacitive/rotary} | {click feel/LED/haptic} | {location rationale} | {min size mm} | {actuation force N} |

---

## Development Timeline

| Phase | Duration | Deliverables | Exit Criteria |
|-------|----------|-------------|---------------|
| Concept Review | {weeks} | {design brief, initial specs} | {stakeholder approval} |
| EVT (Engineering Validation) | {weeks} | {functional prototypes, test results} | {all subsystems validated} |
| DVT (Design Validation) | {weeks} | {production-intent prototypes, compliance testing} | {all tests pass} |
| PVT (Production Validation) | {weeks} | {pilot production run, yield analysis} | {yield > {X}%} |
| MP (Mass Production) | {ongoing} | {production units} | {ramp to target volume} |

---

## Variants

*(Separate section per variant with own BOM)*

### Variant: {variant_name}

**Differences from base:**
- {difference 1}
- {difference 2}

**Variant-specific BOM changes:**

| Item | Change | Cost Impact |
|------|--------|-------------|
| {item} | {added/removed/changed} | {+/- $X} |

---

## Interface Points

*(For hybrid products: links to software wireframe/flow artifacts)*

| Interface | Hardware Element | Software Artifact | Notes |
|-----------|-----------------|-------------------|-------|
| {display} | {screen spec} | {WFR-xxx wireframe ref} | {resolution, touch} |
| {button} | {button spec} | {FLW-xxx flow ref} | {action mapping} |

---

## Revision History

| Rev | Date | What Changed | Why | Affected Parts |
|-----|------|-------------|-----|----------------|
| {A} | {date} | {description of change} | {rationale} | {list of affected parts/sections} |

---

*Generated by PDE-OS /pde:hardware | {date} | Scope: {full|mechanical-only|electronics-only|bom-only}*
