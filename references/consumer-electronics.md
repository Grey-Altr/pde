# Consumer Electronics Hardware Reference Library

> Curated materials, standard parts, DFM rules, and compliance standards for consumer electronics hardware design.
> Loaded via `@` reference from `hardware.md` during specification generation.
>
> **Version:** 1.0
> **Scope:** Phones, tablets, speakers, smart home devices, media players, routers
> **Ownership:** Hardware skill (exclusive)
> **Boundary:** This file owns consumer electronics material profiles, standard parts, and DFM rules. Wearable-specific materials belong in `wearables.md`. Industrial/IoT materials belong in `iot-embedded.md`.

**Reference data for specification purposes. Verify all properties, pricing, and availability with suppliers before production use. All prices estimated -- verify before quoting.**

---

<!-- tier:essentials -->

## Materials Quick Reference

### Plastics

#### ABS (Acrylonitrile Butadiene Styrene)

| Property | Value | Unit |
|----------|-------|------|
| Density | 1.04-1.07 | g/cm3 |
| Tensile Strength | 40-50 | MPa |
| Impact Strength (Izod) | 200-400 | J/m |
| Heat Deflection Temp | 88-100 | C (at 0.45 MPa) |
| Glass Transition | 105 | C |
| Shrinkage Rate | 0.4-0.7 | % |
| Min Wall Thickness | 1.0 | mm (injection molded) |
| Surface Finish | SPI A-1 to D-3 | (all achievable) |
| UV Resistance | Poor | (requires UV stabilizer or coating) |
| Chemical Resistance | Good (acids, alkalis) | Poor (ketones, esters) |
| Cost Class | $ | (low) |
| Common Grades | ABS GP, ABS HI, ABS FR | |
| Typical Applications | Speaker housings, remote controls, router enclosures | |
| Pantone Moldability | Excellent (custom color matching available) | |
| Recyclability | Code 7 (Other) | Limited curbside recycling |
| RoHS/REACH | Compliant (verify per grade) | |

#### PC (Polycarbonate)

| Property | Value | Unit |
|----------|-------|------|
| Density | 1.20-1.22 | g/cm3 |
| Tensile Strength | 55-75 | MPa |
| Impact Strength (Izod) | 600-900 | J/m |
| Heat Deflection Temp | 130-140 | C (at 0.45 MPa) |
| Glass Transition | 147 | C |
| Shrinkage Rate | 0.5-0.7 | % |
| Min Wall Thickness | 1.0 | mm (injection molded) |
| Surface Finish | SPI A-1 to C-3 | (excellent clarity possible) |
| UV Resistance | Fair | (yellows without UV stabilizer) |
| Chemical Resistance | Good (dilute acids) | Poor (alkalis, solvents) |
| Cost Class | $$ | (medium) |
| Common Grades | PC GP, PC HF (high flow), PC FR | |
| Typical Applications | Transparent covers, LED lenses, phone cases | |
| Pantone Moldability | Good (transparent and opaque) | |
| Recyclability | Code 7 (Other) | Specialty recycling |
| RoHS/REACH | Compliant (verify per grade) | |

#### PC/ABS Blend

| Property | Value | Unit |
|----------|-------|------|
| Density | 1.10-1.15 | g/cm3 |
| Tensile Strength | 45-65 | MPa |
| Impact Strength (Izod) | 400-600 | J/m |
| Heat Deflection Temp | 100-115 | C (at 0.45 MPa) |
| Glass Transition | 120-135 | C |
| Shrinkage Rate | 0.5-0.7 | % |
| Min Wall Thickness | 1.0 | mm (injection molded) |
| Surface Finish | SPI A-1 to D-3 | (all achievable) |
| UV Resistance | Fair | (better than ABS alone) |
| Chemical Resistance | Good (acids) | Fair (solvents) |
| Cost Class | $$ | (medium) |
| Common Grades | Bayblend T, Cycoloy | |
| Typical Applications | Laptop housings, phone frames, tablet bezels | |
| Pantone Moldability | Good | |
| Recyclability | Code 7 (Other) | Specialty recycling |
| RoHS/REACH | Compliant (verify per grade) | |

#### PMMA (Polymethyl Methacrylate / Acrylic)

| Property | Value | Unit |
|----------|-------|------|
| Density | 1.17-1.20 | g/cm3 |
| Tensile Strength | 55-75 | MPa |
| Impact Strength (Izod) | 15-25 | J/m |
| Heat Deflection Temp | 85-100 | C (at 0.45 MPa) |
| Glass Transition | 105 | C |
| Shrinkage Rate | 0.2-0.8 | % |
| Min Wall Thickness | 1.5 | mm (injection molded) |
| Surface Finish | SPI A-1 | (optical-grade clarity) |
| UV Resistance | Excellent | (inherently UV stable) |
| Chemical Resistance | Good (dilute acids/alkalis) | Poor (alcohols, ketones) |
| Cost Class | $$ | (medium) |
| Common Grades | Plexiglas, Lucite, Acrylite | |
| Typical Applications | Display covers, light guides, speaker grilles (transparent) | |
| Pantone Moldability | Excellent (transparent, translucent, opaque) | |
| Recyclability | Code 7 (Other) | Specialty recycling |
| RoHS/REACH | Compliant | |

#### TPU (Thermoplastic Polyurethane)

| Property | Value | Unit |
|----------|-------|------|
| Density | 1.10-1.25 | g/cm3 |
| Tensile Strength | 25-60 | MPa |
| Impact Strength (Izod) | No break | (flexible) |
| Heat Deflection Temp | 60-100 | C (varies by hardness) |
| Glass Transition | -40 to -20 | C |
| Shrinkage Rate | 0.8-2.0 | % |
| Min Wall Thickness | 0.8 | mm (injection molded) |
| Surface Finish | SPI B-1 to D-3 | (matte typical) |
| UV Resistance | Good | (most grades) |
| Chemical Resistance | Good (oils, greases) | Fair (acids) |
| Cost Class | $$ | (medium) |
| Common Grades | Shore 60A-95A (soft), Shore 55D-75D (hard) | |
| Typical Applications | Bumpers, protective cases, button pads, grip surfaces | |
| Pantone Moldability | Good (translucent possible) | |
| Recyclability | Limited | Thermoset-like behavior at high use |
| RoHS/REACH | Compliant (verify per grade) | |

### Metals

#### Aluminum 6061-T6

| Property | Value | Unit |
|----------|-------|------|
| Density | 2.70 | g/cm3 |
| Tensile Strength (Yield) | 276 | MPa |
| Tensile Strength (Ultimate) | 310 | MPa |
| Hardness | 95 | Brinell |
| Thermal Conductivity | 167 | W/m-K |
| CTE | 23.6 | um/m-C |
| Melting Range | 582-652 | C |
| Machinability | Excellent | (CNC, extrusion) |
| Surface Finish Options | Anodize Type II/III, powder coat, paint, bead blast | |
| Corrosion Resistance | Good | (excellent with anodize) |
| Cost Class | $$ | (medium) |
| Common Forms | Sheet, plate, extrusion, billet | |
| Typical Applications | Structural frames, heatsinks, brackets | |
| Recyclability | Excellent | Widely recycled |
| RoHS/REACH | Compliant | |

#### Aluminum 6063-T5

| Property | Value | Unit |
|----------|-------|------|
| Density | 2.70 | g/cm3 |
| Tensile Strength (Yield) | 145 | MPa |
| Tensile Strength (Ultimate) | 186 | MPa |
| Hardness | 60 | Brinell |
| Thermal Conductivity | 209 | W/m-K |
| CTE | 23.4 | um/m-C |
| Melting Range | 616-654 | C |
| Machinability | Good | (excellent extrudability) |
| Surface Finish Options | Anodize Type II (cosmetic), powder coat, brushed, polished | |
| Corrosion Resistance | Good | (excellent with anodize) |
| Cost Class | $$ | (medium) |
| Common Forms | Extrusion profiles (custom and standard) | |
| Typical Applications | External housings, bezels, cosmetic trim, heatsink fins | |
| Recyclability | Excellent | Widely recycled |
| RoHS/REACH | Compliant | |

#### Stainless Steel 304

| Property | Value | Unit |
|----------|-------|------|
| Density | 8.00 | g/cm3 |
| Tensile Strength (Yield) | 215 | MPa |
| Tensile Strength (Ultimate) | 505 | MPa |
| Hardness | 123 | Brinell |
| Thermal Conductivity | 16.2 | W/m-K |
| CTE | 17.3 | um/m-C |
| Melting Range | 1400-1455 | C |
| Machinability | Fair | (work-hardens, use sharp tools) |
| Surface Finish Options | Mirror polish, brushed (#4), bead blast, PVD coating | |
| Corrosion Resistance | Excellent | (general purpose) |
| Cost Class | $$$ | (medium-high) |
| Common Forms | Sheet, tube, bar, casting | |
| Typical Applications | Speaker grilles, decorative trim, hinges | |
| Recyclability | Excellent | Widely recycled |
| RoHS/REACH | Compliant | |

#### Stainless Steel 316

| Property | Value | Unit |
|----------|-------|------|
| Density | 8.00 | g/cm3 |
| Tensile Strength (Yield) | 205 | MPa |
| Tensile Strength (Ultimate) | 515 | MPa |
| Hardness | 123 | Brinell |
| Thermal Conductivity | 16.3 | W/m-K |
| CTE | 15.9 | um/m-C |
| Melting Range | 1375-1400 | C |
| Machinability | Fair | (similar to 304, slightly harder) |
| Surface Finish Options | Mirror polish, brushed, bead blast, PVD coating, electropolish | |
| Corrosion Resistance | Excellent | (superior to 304, marine-grade) |
| Cost Class | $$$ | (high) |
| Common Forms | Sheet, bar, tube | |
| Typical Applications | Premium housings, outdoor hardware, moisture-exposed parts | |
| Recyclability | Excellent | Widely recycled |
| RoHS/REACH | Compliant | |

#### Zinc Alloy (Zamak 3 / ZA-8)

| Property | Value | Unit |
|----------|-------|------|
| Density | 6.60 (Zamak 3) | g/cm3 |
| Tensile Strength (Ultimate) | 283 (Zamak 3) | MPa |
| Hardness | 82 (Zamak 3) | Brinell |
| Thermal Conductivity | 113 | W/m-K |
| CTE | 27.4 | um/m-C |
| Melting Range | 381-387 | C |
| Machinability | Good | (secondary machining post-casting) |
| Surface Finish Options | Chrome plating, nickel plating, powder coat, paint | |
| Corrosion Resistance | Fair | (requires plating or coating) |
| Cost Class | $ | (low -- excellent die-cast economics) |
| Common Forms | Die-cast | |
| Typical Applications | Connectors, hinges, small structural parts, buttons | |
| Recyclability | Good | Recyclable |
| RoHS/REACH | Compliant (verify plating chemistry) | |

### Glass

#### Gorilla Glass (Alkali-Aluminosilicate)

| Property | Value | Unit |
|----------|-------|------|
| Density | 2.43 | g/cm3 |
| Vickers Hardness | 596-622 | kgf/mm2 |
| Flexural Strength | 900+ | MPa |
| Young's Modulus | 71-76 | GPa |
| Thermal Conductivity | 0.8-1.0 | W/m-K |
| CTE | 7.5-8.0 | ppm/C |
| Available Thicknesses | 0.4-2.0 | mm |
| Surface Finish | Polished, anti-glare (AG), anti-reflective (AR) | |
| Scratch Resistance | Excellent | (ion-exchange strengthened) |
| Cost Class | $$$ | (high) |
| Common Variants | Gorilla Glass 5/6/Victus/Victus 2 | |
| Typical Applications | Phone/tablet displays, camera covers, smart home touch panels | |
| Recyclability | Glass | Standard glass recycling |
| RoHS/REACH | Compliant | |

#### Borosilicate Glass

| Property | Value | Unit |
|----------|-------|------|
| Density | 2.23 | g/cm3 |
| Vickers Hardness | 418 | kgf/mm2 |
| Flexural Strength | 69 | MPa |
| Young's Modulus | 63 | GPa |
| Thermal Conductivity | 1.14 | W/m-K |
| CTE | 3.3 | ppm/C |
| Available Thicknesses | 0.5-5.0 | mm |
| Surface Finish | Polished, frosted | |
| Thermal Shock Resistance | Excellent | (low CTE) |
| Cost Class | $$ | (medium) |
| Common Variants | Borofloat 33, Pyrex | |
| Typical Applications | Lens covers, light pipes, sensor windows | |
| Recyclability | Specialty glass recycling | |
| RoHS/REACH | Compliant | |

### Elastomers

#### Silicone Rubber (LSR / HCR)

| Property | Value | Unit |
|----------|-------|------|
| Density | 1.05-1.20 | g/cm3 |
| Tensile Strength | 5-12 | MPa |
| Hardness | Shore 20A-80A | (typical) |
| Temperature Range | -60 to +200 | C |
| Tear Strength | 10-40 | kN/m |
| Compression Set | 10-30 | % (at 150C, 22h) |
| Min Wall Thickness | 0.5 (LSR) | mm |
| Surface Finish | Per mold surface | (transfers mold finish) |
| UV Resistance | Excellent | |
| Chemical Resistance | Excellent (water, dilute acids) | Fair (petroleum-based oils) |
| Cost Class | $$ | (medium) |
| Common Grades | LSR (liquid injection), HCR (compression/transfer) | |
| Typical Applications | Buttons, seals, gaskets, overmold grips | |
| Biocompatibility | FDA/ISO 10993 available | (verify per grade) |
| Recyclability | Limited | Thermoset -- not easily recycled |
| RoHS/REACH | Compliant | |

#### EPDM (Ethylene Propylene Diene Monomer)

| Property | Value | Unit |
|----------|-------|------|
| Density | 0.86-1.0 | g/cm3 |
| Tensile Strength | 7-20 | MPa |
| Hardness | Shore 40A-90A | (typical) |
| Temperature Range | -50 to +130 | C |
| Tear Strength | 20-50 | kN/m |
| Compression Set | 15-35 | % (at 100C, 22h) |
| Min Wall Thickness | 1.0 | mm (extrusion/molding) |
| UV Resistance | Excellent | (outdoor rated) |
| Chemical Resistance | Excellent (water, steam, acids) | Poor (petroleum oils) |
| Cost Class | $ | (low) |
| Common Grades | EPDM 60A, EPDM 70A | |
| Typical Applications | Weatherseals, gaskets, cable insulation | |
| Recyclability | Limited | Thermoset |
| RoHS/REACH | Compliant | |

## Standard Parts Catalog

### Fasteners

| Part | Sizes | Head Types | Material | Distributor Refs |
|------|-------|-----------|----------|-----------------|
| Machine Screws | M2, M2.5, M3, M4, M5, M6, M8 | Pan, Flat (countersunk), Button | Steel (zinc/black oxide), SS 304 | McMaster-Carr 91292A, Digi-Key |
| Self-Tapping Screws | M2, M2.5, M3, M4 | Pan, Flat | Steel (zinc plated) | McMaster-Carr 90380A, Digi-Key |
| Standoffs | M2, M2.5, M3 | Hex (M-F, F-F) | Brass (nickel plated), Nylon | McMaster-Carr 93505A, Mouser |
| Heat-Set Inserts | M2, M2.5, M3, M4 | Knurled brass | Brass | McMaster-Carr 94180A, Mouser |
| Thread-Forming Screws | M2, M2.5, M3 | Pan | Steel (zinc plated) | McMaster-Carr 96817A | For plastic bosses |

### Connectors

| Part | Type | Pitch | Current Rating | Distributor Refs |
|------|------|-------|---------------|-----------------|
| USB-C Receptacle | Mid-mount, SMT | Per USB-IF | 3A (USB 2.0), 5A (USB PD) | Molex 105450, GCT USB4105 |
| Micro-USB Receptacle | SMT | Per USB-IF | 1.8A | Molex 105017 |
| USB-A Receptacle | Through-hole / SMT | Per USB-IF | 1.5A (USB 2.0), 3A (3.x) | TE 292303, Molex 67643 |
| JST PH | Wire-to-board | 2.0mm | 2A | JST PHR series, Digi-Key |
| JST SH | Wire-to-board | 1.0mm | 1A | JST SHR series, Digi-Key |
| JST XH | Wire-to-board | 2.5mm | 3A | JST XHP series, Digi-Key |
| Molex Pico-Clasp | Board-to-board | 1.0mm | 1A | Molex 501331, Digi-Key |
| FPC/FFC | Ribbon cable | 0.5mm, 1.0mm | 0.5A | Molex 52271, Digi-Key |
| DC Barrel Jack | Through-hole | 5.5x2.1mm, 5.5x2.5mm | 2-5A | CUI PJ-002A, Digi-Key |
| 3.5mm Audio | Through-hole / SMT | 3.5mm TRS/TRRS | Signal level | CUI SJ-3524, Digi-Key |

### Standoffs and Spacers

| Part | Thread | Heights | Material | Distributor Refs |
|------|--------|---------|----------|-----------------|
| Hex Standoff M-F | M2 | 3, 4, 5, 6, 8, 10mm | Brass (nickel), Nylon | McMaster-Carr 93505A |
| Hex Standoff M-F | M2.5 | 4, 5, 6, 8, 10, 12mm | Brass (nickel), Nylon | McMaster-Carr 93505A |
| Hex Standoff M-F | M3 | 5, 6, 8, 10, 12, 15, 20mm | Brass (nickel), Steel, Nylon | McMaster-Carr 93505A |
| Nylon Spacer | M3 | 1, 2, 3, 5, 8mm | Nylon 66 | McMaster-Carr 94639A |
| Shoulder Screw | M3, M4 | Various | Alloy Steel | McMaster-Carr 91259A |

---

<!-- tier:standard -->

## DFM Rules

### Injection Molding

| Rule | Value | Notes |
|------|-------|-------|
| Min Draft Angle | 1-2 deg | 0.5 deg possible with texture compensation |
| Wall Thickness | 1.5-3.0mm | Uniform preferred; gradual transitions only |
| Rib Thickness | 50-70% of wall | Prevents sink marks on cosmetic surface |
| Rib Height | Max 3x wall thickness | Deeper ribs need 1-2 deg additional draft |
| Boss OD | 2x screw diameter | For self-tapping: ID = screw minor dia |
| Boss Height | Max 2.5x OD | Taller bosses need gussets |
| Radius (Internal) | Min 0.5mm | 50-75% of wall thickness preferred |
| Radius (External) | Internal radius + wall thickness | Maintains uniform wall |
| Gate Location | Away from cosmetic surfaces | Submarine gate for auto-degating |
| Undercuts | Avoid if possible | Side actions add $3K-15K per set to mold cost |
| Texture | SPI A-1 (mirror) to D-3 (rough) | VDI 12-45 for EDM textures |
| Ejector Marks | Opposite cosmetic side | Flat ejectors minimize witness marks |
| Weld Lines | Position away from stress/cosmetic areas | Gate placement controls weld line location |
| Shrinkage Compensation | Per material (0.4-2.0%) | Mold is cut oversize by shrinkage factor |

### CNC Machining

| Rule | Value | Notes |
|------|-------|-------|
| Internal Corner Radius | >= end mill radius | 1.5mm min for standard tooling |
| External Corners | Sharp possible | (no tool radius constraint) |
| Pocket Depth | Max 4x width | Deeper requires specialty tooling |
| Min Wall Thickness | 0.5mm (metal), 1.0mm (plastic) | Thinner walls vibrate during machining |
| Hole Diameter | Standard drill sizes preferred | 0.5mm min, ream for tight tolerance |
| Thread Depth | Min 1.5x diameter (metal), 2x (plastic) | Deeper threads = stronger hold |
| Tolerances (Standard) | +/- 0.05mm | +/- 0.025mm achievable at higher cost |
| Surface Finish (As-Machined) | Ra 0.8-3.2 um | Ra 0.4 um with finishing pass |
| Setup Faces | Minimize (ideally 1-2 setups) | Each setup adds cost and tolerance stack |

### Surface Finishes

| Finish | Process | Typical Ra (um) | Cost | Applications |
|--------|---------|----------------|------|-------------|
| Anodize Type II | Electrochemical (5-25 um coating) | Per substrate | $$ | Cosmetic aluminum parts, color options |
| Anodize Type III (Hard) | Electrochemical (25-75 um coating) | Per substrate | $$$ | Wear surfaces, structural parts |
| Powder Coat | Electrostatic spray + cure | 1.0-5.0 | $$ | Steel/aluminum housings, color matching |
| Wet Paint | Spray application | 0.5-2.0 | $$-$$$ | Premium finishes, metallic effects |
| Bead Blast | Media blasting | 1.5-6.0 | $ | Uniform matte texture, pre-anodize prep |
| Brushed | Abrasive belt/pad | 0.5-1.5 | $ | Stainless steel, aluminum cosmetic |
| Mirror Polish | Progressive polishing | 0.025-0.1 | $$$$ | High-end bezels, decorative accents |
| PVD Coating | Physical vapor deposition | Per substrate | $$$$ | Premium metallic colors, wear resistance |
| Silk Screen | Ink printing | N/A | $ | Logos, labels, regulatory marks |
| Pad Print | Ink transfer | N/A | $ | Curved surfaces, small logos |
| Laser Etch | Laser ablation | N/A | $-$$ | Permanent marking, fine detail, serial numbers |

### SPI Surface Finish Grades

| Grade | Category | Description | Ra (um) |
|-------|----------|-------------|---------|
| A-1 | Mirror | Diamond buff (Grade #3 diamond) | 0.012 |
| A-2 | Mirror | Grade #6 diamond buff | 0.025 |
| A-3 | Mirror | Grade #15 diamond buff | 0.050 |
| B-1 | Semi-Gloss | 600 grit paper | 0.050 |
| B-2 | Semi-Gloss | 400 grit paper | 0.100 |
| B-3 | Semi-Gloss | 320 grit paper | 0.200 |
| C-1 | Matte | 600 stone | 0.350 |
| C-2 | Matte | 400 stone | 0.450 |
| C-3 | Matte | 320 stone | 0.550 |
| D-1 | Textured | Dry blast #11 glass bead | 0.800 |
| D-2 | Textured | Dry blast #240 oxide | 1.600 |
| D-3 | Textured | Dry blast #24 oxide | 3.200 |

## Compliance Standards

### Safety and Electrical

| Standard | Scope | Key Requirements | Lead Time |
|----------|-------|-----------------|-----------|
| UL/CSA (UL 62368-1) | Audio/video/ICT equipment safety | Insulation, grounding, flammability (UL 94 V-0/V-1), overcurrent protection, energy hazard classification | 8-16 weeks |
| CE Marking (LVD) | EU low voltage directive | Risk assessment, insulation, protective earth, label requirements | Part of CE package |
| IEC 62368-1 | International safety standard | Hazard-based safety engineering (HBSE), energy source classification, safeguard requirements | 8-16 weeks |

### EMC and RF

| Standard | Scope | Key Requirements | Lead Time |
|----------|-------|-----------------|-----------|
| FCC Part 15 Class B | Unintentional radiator (residential) | Conducted emissions (150 kHz-30 MHz), radiated emissions (30 MHz-1 GHz), 6 dB margin recommended | 4-8 weeks |
| CE EMC (EN 55032/35) | EU EMC requirements | Emissions + immunity testing | Part of CE package |
| FCC Part 15.247 | Intentional radiator (WiFi, BLE) | Power limits, spurious emissions, frequency stability | 6-12 weeks |

### Environmental and Chemical

| Standard | Scope | Key Requirements | Lead Time |
|----------|-------|-----------------|-----------|
| RoHS (2011/65/EU) | Restricted substances | Lead, mercury, cadmium, Cr6+, PBB, PBDE, 4 phthalates (DEHP, BBP, DBP, DIBP) | Material declarations |
| REACH | Chemical substances (EU) | SVHC reporting, candidate list monitoring | Material declarations |
| WEEE | Waste electrical equipment | Producer registration, recycling infrastructure, product labeling | Registration |
| Prop 65 (California) | Chemical exposure warnings | Warning labels if product contains listed chemicals above safe harbor levels | Label compliance |

### Ingress Protection

| Rating | Dust | Water | Typical Use |
|--------|------|-------|------------|
| IP44 | Protected against >1mm objects | Splash proof | Indoor electronics |
| IP54 | Dust protected | Splash proof | Kitchen/bathroom devices |
| IP55 | Dust protected | Low-pressure water jets | Outdoor speakers |
| IP65 | Dust tight | Low-pressure water jets | Outdoor devices |
| IP67 | Dust tight | Temporary immersion (1m, 30 min) | Premium outdoor |
| IP68 | Dust tight | Continuous submersion (per manufacturer spec) | Waterproof products |

---

<!-- tier:comprehensive -->

## Advanced Materials

### High-Performance Plastics

#### PEI (Ultem / Polyetherimide)

| Property | Value | Unit |
|----------|-------|------|
| Density | 1.27 | g/cm3 |
| Tensile Strength | 85 | MPa |
| Heat Deflection Temp | 200 | C (at 1.82 MPa) |
| Glass Transition | 217 | C |
| Flame Rating | UL 94 V-0 | (inherent, no additives) |
| Cost Class | $$$$ | (very high) |
| Typical Applications | High-temp connectors, structural brackets near heat sources | |
| RoHS/REACH | Compliant | |

#### LCP (Liquid Crystal Polymer)

| Property | Value | Unit |
|----------|-------|------|
| Density | 1.40-1.70 | g/cm3 |
| Tensile Strength | 150-190 | MPa |
| Heat Deflection Temp | 260-310 | C |
| Shrinkage Rate | 0.1-0.5 | % (anisotropic) |
| Flame Rating | UL 94 V-0 | (inherent) |
| Cost Class | $$$$ | (very high) |
| Typical Applications | Fine-pitch connectors, RF-transparent antenna housings | |
| RoHS/REACH | Compliant | |

#### ASA (Acrylonitrile Styrene Acrylate)

| Property | Value | Unit |
|----------|-------|------|
| Density | 1.06-1.08 | g/cm3 |
| Tensile Strength | 40-55 | MPa |
| Impact Strength (Izod) | 200-350 | J/m |
| Heat Deflection Temp | 90-100 | C (at 0.45 MPa) |
| UV Resistance | Excellent | (inherently UV stable -- outdoor rated) |
| Cost Class | $$ | (medium) |
| Typical Applications | Outdoor speaker housings, patio devices, garden sensors | |
| RoHS/REACH | Compliant | |

### Advanced Surface Treatments

| Treatment | Description | Thickness | Applications |
|-----------|-------------|-----------|-------------|
| Ceramic Coating | Plasma-sprayed alumina/zirconia | 50-500 um | Extreme wear, high temperature |
| DLC (Diamond-Like Carbon) | Vacuum deposited carbon film | 1-5 um | Premium button surfaces, wear parts |
| Passivation (SS) | Nitric/citric acid treatment | N/A (surface chemistry) | Post-machining corrosion protection |
| Chromate Conversion | Chemical treatment (aluminum) | <1 um | Corrosion protection, paint adhesion |
| E-coat | Electrocoat immersion | 15-35 um | Primer for steel parts, uniform coverage |
| Nano-coating | Hydrophobic/oleophobic | <1 um | Display glass, touch surfaces |

## Thermal Management

### Heat Dissipation Rules of Thumb

| Scenario | Solution | Sizing Rule |
|----------|----------|-------------|
| < 3W total | Passive (PCB copper, thermal vias) | 1 sq-inch copper per watt |
| 3-10W | Heatsink (extruded aluminum) | 5-15 C/W thermal resistance target |
| 10-25W | Heatsink + forced air | 30-50 CFM per 10W typical |
| > 25W | Active cooling (fan + heatsink + TIM) | Detailed thermal simulation needed |

### Thermal Interface Materials (TIM)

| Type | Thermal Conductivity | Gap Filling | Cost | Use Case |
|------|---------------------|-------------|------|----------|
| Thermal Pad (silicone) | 1-6 W/m-K | 0.5-5mm | $ | IC to heatsink, non-flat surfaces |
| Thermal Paste | 1-12 W/m-K | <0.1mm | $ | CPU/GPU to heatsink (thin bond line) |
| Phase Change Material | 3-8 W/m-K | <0.1mm | $$ | Reflow-compatible, consistent pressure |
| Thermal Tape | 1-3 W/m-K | Adhesive | $ | LED strips, low-power attachment |
| Graphite Sheet | 400-1500 W/m-K (in-plane) | N/A | $$ | Heat spreading (phones, tablets) |

## Assembly Design

### Snap-Fit Guidelines

| Parameter | Value | Notes |
|-----------|-------|-------|
| Max Strain (ABS) | 4-6% | Beyond this, brittle failure risk |
| Max Strain (PC) | 2-3% | Lower than ABS; more brittle |
| Max Strain (PP) | 8-10% | Most forgiving for snap-fits |
| Cantilever Beam L/t | 5:1 min | Length-to-thickness ratio |
| Deflection | Max 50% of beam length | For repeated assembly/disassembly |
| Lead-In Angle | 25-35 deg | For easy insertion |
| Retention Angle | 70-90 deg | For permanent assembly |

### Adhesive Bonding

| Adhesive Type | Cure Time | Shear Strength | Temperature Range | Applications |
|---------------|-----------|----------------|-------------------|-------------|
| Cyanoacrylate (CA) | Seconds | 15-25 MPa | -54 to +82 C | Small parts, clear bonding |
| Epoxy (2-part) | Minutes-hours | 20-40 MPa | -55 to +150 C | Structural, gap filling |
| UV Cure Acrylic | Seconds (UV) | 15-30 MPa | -55 to +120 C | Glass bonding, display assembly |
| PSA (Double-sided tape) | Immediate | 1-5 MPa | -40 to +90 C | Temporary/semi-permanent, labels |
| Hot Melt | Seconds | 3-10 MPa | -40 to +80 C | High-speed assembly, sealing |

## Battery Considerations

### Common Cell Formats

| Format | Nominal V | Capacity Range | Dimensions | Applications |
|--------|-----------|---------------|------------|-------------|
| 18650 | 3.6-3.7V | 2000-3500 mAh | 18x65mm | Speakers, portable devices |
| 21700 | 3.6-3.7V | 3000-5000 mAh | 21x70mm | High-capacity portable |
| Pouch (custom) | 3.7V | 100-10000+ mAh | Custom | Phones, tablets, slim devices |
| LIR2032 | 3.6V | 40-70 mAh | 20x3.2mm | Backup/RTC |
| AAA (NiMH) | 1.2V | 600-1100 mAh | 10.5x44.5mm | Remote controls |

### Battery Compliance (UN 38.3)

| Test | Description | Requirement |
|------|-------------|------------|
| T.1 | Altitude simulation | 11.6 kPa for 6 hours |
| T.2 | Thermal test | 75C and -40C cycling |
| T.3 | Vibration | 7 Hz-200 Hz, 3 hours |
| T.4 | Shock | 150g, 6ms pulse |
| T.5 | External short circuit | 80 +/- 20 mOhm, 1 hour |
| T.6 | Impact/crush | 9.1 kg from 61 cm |
| T.7 | Overcharge | 2x rated current, min 24h |
| T.8 | Forced discharge | Forced discharge at max current |
