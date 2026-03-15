# Wearables Hardware Reference Library

> Curated materials, standard parts, DFM rules, and compliance standards for wearable device hardware design.
> Loaded via `@` reference from `hardware.md` during specification generation.
>
> **Version:** 1.0
> **Scope:** Watches, fitness bands, earbuds, smart rings, body-worn sensors, head-mounted displays
> **Ownership:** Hardware skill (exclusive)
> **Boundary:** This file owns wearable-specific material profiles, miniature parts, and body-contact DFM rules. General consumer electronics materials belong in `consumer-electronics.md`.

**Reference data for specification purposes. Verify all properties, pricing, and availability with suppliers before production use. All prices estimated -- verify before quoting.**

---

<!-- tier:essentials -->

## Materials Quick Reference

### Plastics

#### PC (Polycarbonate -- Wearable Grade)

| Property | Value | Unit |
|----------|-------|------|
| Density | 1.20-1.22 | g/cm3 |
| Tensile Strength | 55-75 | MPa |
| Impact Strength (Izod) | 600-900 | J/m |
| Heat Deflection Temp | 130-140 | C (at 0.45 MPa) |
| Glass Transition | 147 | C |
| Shrinkage Rate | 0.5-0.7 | % |
| Min Wall Thickness | 0.8 | mm (micro-injection) |
| Surface Finish | SPI A-1 to C-3 | (optical clarity possible) |
| UV Resistance | Fair | (yellows without stabilizer) |
| Chemical Resistance | Good (dilute acids) | Poor (alkalis, solvents) |
| Cost Class | $$ | (medium) |
| Common Grades | PC HF (high flow for thin walls), Makrolon | |
| Typical Applications | Watch cases, earbud shells, display covers | |
| Skin Contact | Generally safe | (verify per ISO 10993 if prolonged contact) |
| Recyclability | Code 7 (Other) | Specialty recycling |
| RoHS/REACH | Compliant (verify per grade) | |

#### PA (Nylon / Polyamide)

| Property | Value | Unit |
|----------|-------|------|
| Density | 1.13-1.15 (PA6), 1.14 (PA66) | g/cm3 |
| Tensile Strength | 70-85 | MPa |
| Impact Strength (Izod) | 50-120 | J/m |
| Heat Deflection Temp | 65-75 (PA6), 75-100 (PA66) | C (at 0.45 MPa) |
| Melting Point | 220 (PA6), 260 (PA66) | C |
| Shrinkage Rate | 0.8-1.5 | % (higher than ABS/PC) |
| Min Wall Thickness | 0.8 | mm |
| Surface Finish | SPI B-1 to D-3 | (matte natural) |
| UV Resistance | Poor | (requires stabilizer) |
| Chemical Resistance | Good (oils, greases, fuels) | Poor (strong acids) |
| Cost Class | $$ | (medium) |
| Common Grades | PA6, PA66, PA12 (flexible), PA6-GF30 (structural) | |
| Typical Applications | Band buckles, clasp mechanisms, structural inserts | |
| Moisture Absorption | 2.5% (PA6), 1.5% (PA66) | At saturation -- affects dimensions |
| RoHS/REACH | Compliant | |

#### PEEK (Polyether Ether Ketone)

| Property | Value | Unit |
|----------|-------|------|
| Density | 1.30-1.32 | g/cm3 |
| Tensile Strength | 90-100 | MPa |
| Impact Strength (Izod) | 55-85 | J/m |
| Heat Deflection Temp | 160 | C (at 1.82 MPa) |
| Glass Transition | 143 | C |
| Melting Point | 343 | C |
| Shrinkage Rate | 1.0-1.5 | % |
| Min Wall Thickness | 0.5 | mm (high flow grades) |
| Surface Finish | SPI A-2 to C-3 | (natural tan color) |
| UV Resistance | Good | |
| Chemical Resistance | Excellent (most chemicals) | Poor (concentrated sulfuric acid) |
| Cost Class | $$$$ | (very high -- $80-120/kg) |
| Common Grades | PEEK 450G, PEEK CF30 (carbon-filled) | |
| Typical Applications | Premium watch cases, medical wearables, high-stress clasps | |
| Biocompatibility | ISO 10993 compliant | (medical grade available) |
| Recyclability | Limited | Can be reprocessed |
| RoHS/REACH | Compliant | |

#### TPU/TPE (Thermoplastic Polyurethane / Elastomer)

| Property | Value | Unit |
|----------|-------|------|
| Density | 1.10-1.25 (TPU), 0.90-1.20 (TPE) | g/cm3 |
| Tensile Strength | 25-60 (TPU), 5-20 (TPE) | MPa |
| Impact Strength (Izod) | No break | (flexible) |
| Hardness | Shore 60A-75D (TPU), Shore 30A-70A (TPE) | |
| Temperature Range | -40 to +80 (TPE), -40 to +100 (TPU) | C |
| Shrinkage Rate | 0.8-2.0 | % |
| Min Wall Thickness | 0.8 | mm |
| Surface Finish | SPI B-3 to D-3 | (matte/soft-touch typical) |
| UV Resistance | Good (TPU), Fair (TPE) | |
| Chemical Resistance | Good (oils -- TPU) | Fair (solvents) |
| Cost Class | $$ | (medium) |
| Common Grades | TPU Shore 85A (bands), TPE Santoprene | |
| Typical Applications | Watch bands, earbud tips, sensor straps, overmold grips | |
| Skin Contact | Generally safe | (verify biocompatibility per grade) |
| Recyclability | TPE recyclable, TPU limited | |
| RoHS/REACH | Compliant (verify per grade) | |

### Metals

#### Titanium Grade 2 (CP -- Commercially Pure)

| Property | Value | Unit |
|----------|-------|------|
| Density | 4.51 | g/cm3 |
| Tensile Strength (Yield) | 275 | MPa |
| Tensile Strength (Ultimate) | 345 | MPa |
| Hardness | 160 | Brinell |
| Thermal Conductivity | 16.4 | W/m-K |
| CTE | 8.6 | um/m-C |
| Melting Point | 1668 | C |
| Machinability | Poor | (requires carbide tooling, slow speeds) |
| Surface Finish Options | Bead blast, brushed, PVD coating, DLC | |
| Corrosion Resistance | Excellent | (inherent oxide layer) |
| Cost Class | $$$$ | (very high) |
| Common Forms | Bar, sheet, forging | |
| Typical Applications | Watch cases (mid-range), medical wearable housings | |
| Biocompatibility | Excellent | (ISO 10993 compliant) |
| Recyclability | Good | Specialty recycling |
| RoHS/REACH | Compliant | |

#### Titanium Grade 5 (Ti-6Al-4V)

| Property | Value | Unit |
|----------|-------|------|
| Density | 4.43 | g/cm3 |
| Tensile Strength (Yield) | 830 | MPa |
| Tensile Strength (Ultimate) | 900 | MPa |
| Hardness | 334 | Brinell |
| Thermal Conductivity | 6.7 | W/m-K |
| CTE | 8.6 | um/m-C |
| Melting Range | 1604-1660 | C |
| Machinability | Difficult | (requires specialized tooling and coolant) |
| Surface Finish Options | Bead blast, brushed, PVD coating, DLC, anodize (decorative colors) | |
| Corrosion Resistance | Excellent | |
| Cost Class | $$$$ | (very high) |
| Common Forms | Bar, forging, MIM (metal injection molding) | |
| Typical Applications | Premium watch cases, high-end ring bands, structural clasps | |
| Biocompatibility | Excellent | (most common surgical titanium) |
| Recyclability | Good | Specialty recycling |
| RoHS/REACH | Compliant | |

#### Stainless Steel 316L

| Property | Value | Unit |
|----------|-------|------|
| Density | 8.00 | g/cm3 |
| Tensile Strength (Yield) | 170 | MPa |
| Tensile Strength (Ultimate) | 485 | MPa |
| Hardness | 95 | Brinell |
| Thermal Conductivity | 16.3 | W/m-K |
| CTE | 15.9 | um/m-C |
| Melting Range | 1375-1400 | C |
| Machinability | Fair | (work-hardens; sharp carbide tooling) |
| Surface Finish Options | Mirror polish, brushed, bead blast, PVD (gold/rose/black), electropolish | |
| Corrosion Resistance | Excellent | (marine-grade, sweat-resistant) |
| Cost Class | $$$ | (medium-high) |
| Common Forms | Sheet, bar, MIM, casting | |
| Typical Applications | Watch cases, bezels, clasps, earbud charge cases | |
| Biocompatibility | Good | (surgical-grade 316L is ISO 10993 compliant) |
| Nickel Content | 10-14% | Potential allergen -- consider PVD barrier coating |
| Recyclability | Excellent | Widely recycled |
| RoHS/REACH | Compliant | |

#### Aluminum 7000-Series (7075-T6)

| Property | Value | Unit |
|----------|-------|------|
| Density | 2.81 | g/cm3 |
| Tensile Strength (Yield) | 503 | MPa |
| Tensile Strength (Ultimate) | 572 | MPa |
| Hardness | 150 | Brinell |
| Thermal Conductivity | 130 | W/m-K |
| CTE | 23.6 | um/m-C |
| Melting Range | 477-635 | C |
| Machinability | Good | (CNC-friendly) |
| Surface Finish Options | Anodize Type II (color), brushed, bead blast | |
| Corrosion Resistance | Fair | (less than 6000 series; anodize required) |
| Cost Class | $$$ | (medium-high) |
| Common Forms | Sheet, plate, billet | |
| Typical Applications | Watch cases (sport), earbud charging cases, structural frames | |
| Recyclability | Excellent | Widely recycled |
| RoHS/REACH | Compliant | |

### Ceramics

#### Zirconia (ZrO2 -- Yttria-Stabilized)

| Property | Value | Unit |
|----------|-------|------|
| Density | 5.68-6.08 | g/cm3 |
| Flexural Strength | 900-1200 | MPa |
| Hardness | 1200-1300 | HV (Vickers) |
| Fracture Toughness | 6-10 | MPa-m^1/2 |
| Thermal Conductivity | 2-3 | W/m-K |
| CTE | 10.5 | ppm/C |
| Max Service Temp | 900 | C |
| Surface Finish | Mirror polish achievable | Ra < 0.01 um |
| Scratch Resistance | Excellent | (7-8 Mohs) |
| Cost Class | $$$$ | (very high -- CIM + sintering + machining) |
| Processing | CIM (Ceramic Injection Molding) + sintering + grinding/polishing | |
| Typical Applications | Watch bezels, ring bands, premium button caps | |
| Biocompatibility | Excellent | (ISO 10993 compliant) |
| Color Options | Black (standard), white, custom pigments | |
| RoHS/REACH | Compliant | |

#### Sapphire Crystal (Al2O3 -- Single Crystal)

| Property | Value | Unit |
|----------|-------|------|
| Density | 3.98 | g/cm3 |
| Flexural Strength | 400-700 | MPa |
| Hardness | 1800-2200 | HV (Vickers) / 9 Mohs |
| Thermal Conductivity | 35-40 | W/m-K |
| CTE | 6.0 | ppm/C |
| Light Transmission | 85-90% | (250-5000 nm range) |
| Available Thicknesses | 0.3-2.0 | mm (wearable applications) |
| Surface Treatment | AR coating (multi-layer), oleophobic | |
| Scratch Resistance | Excellent | (second only to diamond) |
| Cost Class | $$$$ | (very high) |
| Processing | Crystal growth + slicing + polishing + coating | |
| Typical Applications | Watch faces, premium display covers | |
| RoHS/REACH | Compliant | |

### Textiles and Soft Materials

#### Woven Nylon

| Property | Value | Unit |
|----------|-------|------|
| Density | 1.13-1.15 | g/cm3 (fiber) |
| Tensile Strength | 600-900 | MPa (fiber) |
| Temperature Range | -40 to +100 | C |
| Moisture Absorption | 4-8% | (affects feel and weight) |
| UV Resistance | Fair | (degrades with prolonged exposure) |
| Colorfastness | Good | (solution-dyed preferred) |
| Cost Class | $ | (low) |
| Typical Weaves | Plain, twill, ripstop | |
| Typical Applications | Watch bands, head straps, fitness tracker bands | |
| Skin Contact | Generally safe | (avoid dyes with known allergens) |
| Recyclability | Limited | Textile recycling programs |

#### Fluoroelastomer (FKM/Viton)

| Property | Value | Unit |
|----------|-------|------|
| Density | 1.80-1.90 | g/cm3 |
| Tensile Strength | 10-17 | MPa |
| Hardness | Shore 60A-80A | (typical) |
| Temperature Range | -20 to +200 | C |
| Compression Set | 15-30 | % (at 200C, 70h) |
| Chemical Resistance | Excellent | (oils, fuels, solvents, acids) |
| UV Resistance | Excellent | |
| Cost Class | $$$ | (high) |
| Typical Applications | Premium sport watch bands, seals for swim-rated devices | |
| Skin Contact | Excellent | (hypoallergenic, no known sensitizers) |
| Sweat Resistance | Excellent | (non-porous, easy to clean) |
| RoHS/REACH | Compliant | |

## Standard Parts Catalog

### Miniature Fasteners

| Part | Sizes | Head Types | Material | Distributor Refs |
|------|-------|-----------|----------|-----------------|
| Miniature Screws | M1, M1.2, M1.4, M1.6, M2, M2.5 | Pan, Flat, Cheese | SS 304, Titanium | McMaster-Carr 91292A, Micro Fasteners |
| Tri-Wing Screws | M1.2, M1.4 | Flat | SS 304 | Specialty fastener suppliers |
| Pentalobe Screws | P2, P5 | Flat | SS 304 | iFixit, specialty suppliers |
| Heat-Set Inserts | M1, M1.2, M1.4, M2 | Knurled | Brass | McMaster-Carr 94180A |
| Micro Nuts | M1, M1.2, M1.4, M1.6, M2 | Hex, Flanged | SS 304 | McMaster-Carr 90592A |

### Connectors and Contacts

| Part | Type | Pitch / Size | Current Rating | Distributor Refs |
|------|------|-------------|---------------|-----------------|
| Pogo Pins | Spring-loaded | 0.5mm, 0.7mm, 1.0mm dia | 1-3A | Mill-Max 0906, Digi-Key |
| Magnetic Connectors | Pogo + magnet | 2-6 pin | 1-3A | Custom / Rosenberger |
| FPC/FFC Connector | ZIF | 0.3mm, 0.5mm pitch | 0.5A | Molex 503480, Hirose FH12 |
| Board-to-Board | Mezzanine | 0.35mm, 0.4mm pitch | 0.3A | Hirose BM28, Molex SlimStack |
| Spring Contacts | Leaf spring | Custom | 0.5-2A | Custom / Ironwood |
| Charge Contacts | Pad / ring | 2-4mm dia pads | 1-5A | Custom design typical |

### Spring Bars and Attachments

| Part | Type | Sizes | Material | Distributor Refs |
|------|------|-------|----------|-----------------|
| Quick-Release Spring Bar | Push pin | 18mm, 20mm, 22mm | SS 316L | Watch parts suppliers |
| Standard Spring Bar | Friction fit | 16-24mm (1mm increments) | SS 304 | Watch parts suppliers |
| Lug Adapter | Band-to-case | Custom per design | SS 316L, Titanium | Custom |
| Band Keeper | Retaining loop | Per band width | Same as band material | Part of band assembly |

### Miniature Bearings

| Part | Bore | OD | Width | Material | Distributor Refs |
|------|------|-----|-------|----------|-----------------|
| MR52ZZ | 2mm | 5mm | 2.5mm | Chrome steel, SS | McMaster-Carr, NMB |
| MR63ZZ | 3mm | 6mm | 2.5mm | Chrome steel, SS | McMaster-Carr, NMB |
| MR74ZZ | 4mm | 7mm | 2.5mm | Chrome steel, SS | McMaster-Carr, NMB |
| MR85ZZ | 5mm | 8mm | 2.5mm | Chrome steel, SS | McMaster-Carr, NMB |
| MR106ZZ | 6mm | 10mm | 3mm | Chrome steel, SS | McMaster-Carr, NMB |

---

<!-- tier:standard -->

## DFM Rules

### Micro-Injection Molding

| Rule | Value | Notes |
|------|-------|-------|
| Min Wall Thickness | 0.3-0.5mm | Material-dependent; PC allows thinner than ABS |
| Draft Angle | 0.5-1 deg | Tighter draft possible with polished core/cavity |
| Gate Type | Submarine or pin gate | Minimize gate vestige on cosmetic parts |
| Shot Weight | < 5g typical | Dedicated micro-molding machines |
| Tolerances | +/- 0.02-0.05mm | Tighter than standard molding |
| Mold Material | Hardened steel (P20, H13) | Higher hardness for longer life at micro scale |
| Ejection | Air-assisted or stripper plate | Pin ejection can damage micro parts |
| Cavity Count | 2-8 typical | Balance cycle time vs part consistency |
| Cycle Time | 10-30 sec | Faster than standard due to small parts |

### CNC Micro-Machining

| Rule | Value | Notes |
|------|-------|-------|
| Min Feature Size | 0.1mm | Requires micro end mills |
| Internal Corner Radius | 0.25mm min | Limited by smallest available end mill |
| Surface Finish | Ra 0.2-0.8 um | Finishing pass at low feed rates |
| Tolerances | +/- 0.01-0.025mm | 5-axis preferred for complex wearable geometry |
| Tool Breakage Risk | High below 0.5mm tools | Conservative feeds and speeds required |
| Workholding | Custom fixtures | Soft jaws or vacuum fixtures for small parts |
| Deburring | Chemical or tumble | Manual deburring difficult at micro scale |

### Ceramic Processing (CIM)

| Rule | Value | Notes |
|------|-------|-------|
| Min Wall Thickness | 0.5mm (post-sintering) | Account for 15-20% sintering shrinkage |
| Draft Angle | 1-2 deg | Higher than plastic due to rigidity |
| Shrinkage | 15-20% | Linear; must be compensated in mold design |
| Tolerances (As-Sintered) | +/- 0.5% of dimension | Grinding/polishing for tighter tolerance |
| Tolerances (Ground) | +/- 0.01mm | Diamond grinding required |
| Surface Finish | Ra 0.01-0.1 um (polished) | Diamond polishing for mirror finish |
| Batch Variability | 1-3% dimensional | Between sintering batches |
| Color Consistency | Good within batch | Cross-batch color matching requires pigment control |
| Mold Cost | $15K-50K | Similar to injection mold tooling |

### MIM (Metal Injection Molding)

| Rule | Value | Notes |
|------|-------|-------|
| Min Wall Thickness | 0.3mm | Thinner than cast but thicker than stamped |
| Max Wall Thickness | 10mm | Thick sections risk voids during debinding |
| Weight Range | 0.1-200g | Sweet spot 1-50g for wearables |
| Tolerances | +/- 0.3-0.5% of dimension | Better than casting, worse than CNC |
| Shrinkage | 15-20% | Linear; compensated in mold |
| Surface Finish | Ra 0.8-3.2 um (as-sintered) | Polishing to Ra < 0.1 um possible |
| Materials | 316L SS, 17-4PH SS, Ti-6Al-4V | Most wearable metals available |
| Cost vs CNC | Lower at 1000+ units | MIM mold $10K-40K, CNC has no tooling cost |

## Wearable-Specific Design Considerations

### Biocompatibility (ISO 10993 Basics)

| Test | Description | Required For | Standard |
|------|-------------|-------------|----------|
| Cytotoxicity | Cell damage from leached chemicals | All skin-contact devices | ISO 10993-5 |
| Sensitization | Allergic reaction potential | Prolonged skin contact (>24h) | ISO 10993-10 |
| Irritation | Skin redness/swelling | Skin-contact devices | ISO 10993-10 |
| Extractables | Chemical substances released | All body-contact materials | ISO 10993-18 |

**Common allergens to avoid/minimize:**
- Nickel: Most common metal allergen. 316L contains 10-14% Ni. Consider PVD barrier or titanium.
- Chromium (Cr6+): Avoided in RoHS-compliant materials. Trivalent Cr OK.
- Latex: Natural rubber avoided in all wearable bands. Use silicone or fluoroelastomer.
- Acrylates: Some adhesives; verify UV-cure formulations.
- BPA: Some PC grades; use BPA-free grades for prolonged skin contact.

### Sweat and Moisture Resistance

| Component | Approach | Standard |
|-----------|----------|----------|
| Case sealing | O-ring or gasket (silicone) | IP67/IP68 per IEC 60529 |
| Button sealing | Membrane switch or sealed rocker | IP67 requires sealed actuators |
| Microphone | PTFE vent membrane (Gore-Tex) | Acoustic + waterproof |
| Speaker | PTFE vent + acoustic mesh | Acoustic + waterproof |
| Charge port | Open (with drainage) or magnetic pogo | IP68 devices typically use pogo/wireless |
| Band attachment | Sealed lug or integral band | Minimize water ingress paths |
| Corrosion protection | PVD coating, anodize, or inherent (titanium) | Salt spray test (ASTM B117) |

### Band Attachment Mechanisms

| Type | Pros | Cons | Typical Use |
|------|------|------|-------------|
| Quick-release spring bar | User-swappable, standard tooling | Adds 1-2mm lug thickness | Watches (20-22mm) |
| Proprietary lug | Optimized size, brand lock-in | Custom tooling required | Premium watches |
| Integral band | Thinnest profile, best sealing | Not user-replaceable | Fitness bands, some earbuds |
| Slide-lock | Tool-free swap, thin | Wear over time | Mid-range watches |
| Magnetic attachment | Easy swap, flat profile | Accidental detachment risk | Fashion wearables |

## Compliance Standards

### Wireless and RF

| Standard | Scope | Key Requirements | Lead Time |
|----------|-------|-----------------|-----------|
| FCC Part 15.247 | WiFi/BLE (2.4 GHz ISM) | Max EIRP, spurious emissions, frequency stability | 6-12 weeks |
| CE RED (2014/53/EU) | EU radio equipment | Essential requirements: safety, EMC, spectrum | Part of CE package |
| Bluetooth SIG Qualification | Bluetooth/BLE products | Profile listing, compliance testing, declaration ID | 4-8 weeks |
| IC (Innovation, Science Canada) | Canadian wireless | Similar to FCC, RSS-247 | 4-8 weeks |

### Safety and Biocompatibility

| Standard | Scope | Key Requirements | Lead Time |
|----------|-------|-----------------|-----------|
| IEC 62368-1 | AV/ICT device safety | Energy hazard classification, safeguards | 8-16 weeks |
| SAR Limits | RF energy absorption | FCC: 1.6 W/kg (1g), EU: 2.0 W/kg (10g) | Part of RF certification |
| ISO 10993 (selected) | Biocompatibility | Cytotoxicity, sensitization, irritation per device contact | 4-12 weeks |
| IEC 62471 | Photobiological safety | LED/laser emission limits for skin-worn devices | Included in safety testing |

### Ingress Protection (Wearable Focus)

| Rating | Dust | Water | Wearable Use Case |
|--------|------|-------|------------------|
| IP54 | Dust protected | Splash proof | Basic fitness trackers |
| IP67 | Dust tight | 1m immersion, 30 min | Rain/shower-rated watches |
| IP68 | Dust tight | Per mfg spec (typically 5m+) | Swim-rated watches |
| ISO 22810 (5 ATM) | N/A | 50m water resistance | Swim/shallow dive rated |
| ISO 22810 (10 ATM) | N/A | 100m water resistance | Water sports rated |
| ISO 6425 | N/A | Dive watch standard | Dive computer/watch |

---

<!-- tier:comprehensive -->

## Advanced Materials

### High-Performance Polymers

#### PPSU (Polyphenylsulfone)

| Property | Value | Unit |
|----------|-------|------|
| Density | 1.29 | g/cm3 |
| Tensile Strength | 55-75 | MPa |
| Heat Deflection Temp | 207 | C (at 1.82 MPa) |
| Impact Strength (Izod) | 690 | J/m |
| Flame Rating | UL 94 V-0 | (inherent) |
| Cost Class | $$$$ | (very high) |
| Typical Applications | Autoclavable medical wearable housings | |
| Biocompatibility | FDA/ISO 10993 available | |
| RoHS/REACH | Compliant | |

#### Silicone (Medical Grade LSR)

| Property | Value | Unit |
|----------|-------|------|
| Density | 1.05-1.20 | g/cm3 |
| Hardness | Shore 20A-80A | |
| Temperature Range | -60 to +200 | C |
| Tensile Strength | 5-12 | MPa |
| Tear Strength | 10-40 | kN/m |
| Biocompatibility | USP Class VI, ISO 10993 | (medical grade) |
| Skin Contact | Excellent | (hypoallergenic, non-porous) |
| Cost Class | $$ | (medium) |
| Typical Applications | Sensor pads, skin-contact interfaces, band overmold, earbud tips | |
| Processing | LSR injection (platinum cure) | 2-part mixing, vulcanization |
| RoHS/REACH | Compliant | |

### Specialty Metals

#### Tungsten Carbide (WC)

| Property | Value | Unit |
|----------|-------|------|
| Density | 14.5-15.6 | g/cm3 |
| Hardness | 1400-1800 | HV (Vickers) / 8.5-9 Mohs |
| Flexural Strength | 1500-2500 | MPa |
| Thermal Conductivity | 80-120 | W/m-K |
| Scratch Resistance | Excellent | (near-diamond hardness) |
| Cost Class | $$$ | (high) |
| Typical Applications | Ring bands, premium watch bezels | |
| Processing | Powder pressing + sintering | |
| Biocompatibility | Good | (cobalt binder can be allergenic; verify grade) |

#### Cobalt-Chrome (CoCr)

| Property | Value | Unit |
|----------|-------|------|
| Density | 8.3-8.5 | g/cm3 |
| Tensile Strength | 655-900 | MPa |
| Hardness | 280-380 | HV |
| Corrosion Resistance | Excellent | (superior to SS in body fluids) |
| Cost Class | $$$$ | (very high) |
| Typical Applications | Medical wearable structural parts, premium rings | |
| Biocompatibility | ISO 10993 compliant | (surgical-grade available) |
| Processing | CNC, casting, or 3D printing (SLM) | |

## Ergonomics for Wearables

### Anthropometric Ranges

| Measurement | 5th Percentile Female | 50th Percentile | 95th Percentile Male | Source |
|-------------|----------------------|-----------------|---------------------|--------|
| Wrist circumference | 135mm | 165mm | 195mm | NASA-STD-3000 |
| Finger circumference (ring) | 48mm (size 5) | 58mm (size 8) | 72mm (size 13) | Jeweler standards |
| Ear canal diameter | 5mm | 7mm | 9mm | Audiological data |
| Ear concha depth | 12mm | 15mm | 20mm | Ergonomic studies |
| Head circumference | 520mm | 560mm | 600mm | ISO 8559 |

### Comfort Guidelines

| Parameter | Guideline | Notes |
|-----------|-----------|-------|
| Watch weight | < 70g (with band) | > 100g perceived as heavy |
| Watch thickness | < 12mm preferred | > 14mm considered bulky |
| Band width | 18-22mm typical | Proportional to case size |
| Earbud weight | < 8g (per ear) | > 10g causes fatigue |
| Ring width | 4-8mm | > 10mm impedes dexterity |
| Skin contact area | Minimize continuous contact | Ventilation channels reduce irritation |
| Band tension | 100-300g force | Enough for sensor contact, comfortable for hours |
| Edge radius | Min 0.5mm on skin-contact edges | Sharp edges cause pressure points |

## Miniature Battery Considerations

### Common Wearable Cells

| Format | Nominal V | Capacity Range | Typical Dimensions | Applications |
|--------|-----------|---------------|-------------------|-------------|
| Custom Pouch | 3.7V | 50-500 mAh | Custom (0.5-4mm thick) | Watches, rings, earbuds |
| LIR1254 | 3.6V | 60-85 mAh | 12.5x5.4mm | Earbuds |
| LIR2032 | 3.6V | 40-70 mAh | 20x3.2mm | Thin watches, beacons |
| LIR2450 | 3.6V | 100-120 mAh | 24.5x5.0mm | Fitness bands |
| Zinc-Air (PR48) | 1.4V | 620 mAh | 7.9x5.4mm | Hearing aids (disposable) |
| Silver Oxide (SR626) | 1.55V | 28 mAh | 6.8x2.6mm | Traditional watches |

### Wireless Charging for Wearables

| Standard | Power Range | Frequency | Coil Size | Applications |
|----------|-------------|-----------|-----------|-------------|
| Qi (BPP) | 5W | 100-205 kHz | 20-50mm dia | Watch charging pucks |
| Proprietary magnetic | 1-5W | 100-500 kHz | 10-30mm dia | Earbuds, rings |
| NFC-based | 0.5-1W | 13.56 MHz | 10-20mm dia | Ultra-low power devices |

## Acoustic Design (Earbuds/Speakers)

### Driver Types

| Type | Size Range | Frequency Response | Impedance | Applications |
|------|-----------|-------------------|-----------|-------------|
| Dynamic (moving coil) | 6-14mm | 20 Hz - 20 kHz | 16-32 ohm | Standard earbuds |
| Balanced Armature (BA) | 2-8mm | 200 Hz - 18 kHz | 20-60 ohm | IEMs, hearing aids |
| Planar Magnetic | 10-14mm | 10 Hz - 50 kHz | 16-32 ohm | Premium earbuds |
| MEMS | 1-3mm | 100 Hz - 20 kHz | N/A | Ultra-miniature |

### Acoustic Sealing

| Element | Material | Purpose | Notes |
|---------|----------|---------|-------|
| Ear tip | Silicone / Memory foam | Seal ear canal, isolate sound | 3 sizes minimum (S/M/L) |
| Acoustic mesh | Woven stainless steel | Protect driver from debris | 100-200 mesh count |
| Bass port | Tuned vent hole + damping | Tune low-frequency response | Diameter and length set resonance |
| MEMS microphone port | PTFE membrane | Waterproof acoustic path | Gore acoustic vent |
| ANC reference mic | PTFE + mesh | Environmental noise pickup | Placement critical for ANC performance |
