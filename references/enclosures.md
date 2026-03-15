# Enclosures Hardware Reference Library

> Curated materials, standard parts, DFM rules, and compliance standards for enclosure and housing design.
> Loaded via `@` reference from `hardware.md` during specification generation.
>
> **Version:** 1.0
> **Scope:** Project boxes, rack-mount housings, desktop enclosures, outdoor cabinets, wall-mount cases, handheld housings
> **Ownership:** Hardware skill (exclusive)
> **Boundary:** This file owns enclosure-specific material profiles, structural parts, and housing DFM rules. Product-specific electronics belong in `iot-embedded.md` or `consumer-electronics.md`.

**Reference data for specification purposes. Verify all properties, pricing, and availability with suppliers before production use. All prices estimated -- verify before quoting.**

---

<!-- tier:essentials -->

## Materials Quick Reference

### Plastics

#### ABS (Acrylonitrile Butadiene Styrene -- Enclosure Grade)

| Property | Value | Unit |
|----------|-------|------|
| Density | 1.04-1.07 | g/cm3 |
| Tensile Strength | 40-50 | MPa |
| Impact Strength (Izod) | 200-400 | J/m |
| Heat Deflection Temp | 88-100 | C (at 0.45 MPa) |
| Glass Transition | 105 | C |
| Shrinkage Rate | 0.4-0.7 | % |
| Min Wall Thickness | 1.5 | mm (enclosure walls -- structural) |
| Surface Finish | SPI A-1 to D-3 | (all achievable) |
| UV Resistance | Poor | (indoor use only without UV stabilizer) |
| Flame Rating | HB (standard), V-0 (FR grades) | UL 94 |
| Cost Class | $ | (low) |
| Common Grades | ABS GP, ABS FR, ABS HI | |
| Typical Applications | Desktop project boxes, indoor housings, instrument cases | |
| RoHS/REACH | Compliant (verify per grade) | |

#### PC (Polycarbonate -- Enclosure Grade)

| Property | Value | Unit |
|----------|-------|------|
| Density | 1.20-1.22 | g/cm3 |
| Tensile Strength | 55-75 | MPa |
| Impact Strength (Izod) | 600-900 | J/m |
| Heat Deflection Temp | 130-140 | C (at 0.45 MPa) |
| Glass Transition | 147 | C |
| Shrinkage Rate | 0.5-0.7 | % |
| Min Wall Thickness | 1.5 | mm (structural walls) |
| Surface Finish | SPI A-1 to C-3 | (transparent enclosures possible) |
| UV Resistance | Fair | (yellows without stabilizer) |
| Flame Rating | V-2 (standard), V-0 (FR grades) | UL 94 |
| Cost Class | $$ | (medium) |
| Common Grades | PC GP, PC FR, Makrolon | |
| Typical Applications | Clear-lid enclosures, display windows, vandal-resistant covers | |
| RoHS/REACH | Compliant (verify per grade) | |

#### HDPE (High-Density Polyethylene)

| Property | Value | Unit |
|----------|-------|------|
| Density | 0.94-0.97 | g/cm3 |
| Tensile Strength | 25-45 | MPa |
| Impact Strength (Izod) | 40-200 | J/m |
| Heat Deflection Temp | 70-80 | C (at 0.45 MPa) |
| Melting Point | 130 | C |
| Shrinkage Rate | 1.5-3.0 | % (high -- design for it) |
| Min Wall Thickness | 2.0 | mm |
| Surface Finish | SPI C-3 to D-3 | (waxy feel, difficult to paint) |
| UV Resistance | Good | (with UV stabilizer -- outdoor rated) |
| Chemical Resistance | Excellent | (most chemicals, solvents, acids) |
| Flame Rating | HB | UL 94 (add FR agents for higher rating) |
| Cost Class | $ | (very low) |
| Common Grades | HDPE pipe grade, HDPE blow-mold grade | |
| Typical Applications | Outdoor utility enclosures, chemical-resistant housings, junction boxes | |
| Recyclability | Code 2 | Widely recycled |
| RoHS/REACH | Compliant | |

#### ASA (Acrylonitrile Styrene Acrylate)

| Property | Value | Unit |
|----------|-------|------|
| Density | 1.06-1.08 | g/cm3 |
| Tensile Strength | 40-55 | MPa |
| Impact Strength (Izod) | 200-350 | J/m |
| Heat Deflection Temp | 90-100 | C (at 0.45 MPa) |
| Shrinkage Rate | 0.4-0.7 | % |
| Min Wall Thickness | 1.5 | mm |
| Surface Finish | SPI B-1 to D-3 | (maintains appearance outdoors) |
| UV Resistance | Excellent | (inherently UV stable -- no coating needed) |
| Chemical Resistance | Good (acids, alkalis) | Fair (some solvents) |
| Flame Rating | HB (standard), V-0 (available) | UL 94 |
| Cost Class | $$ | (medium -- 1.5x ABS) |
| Common Grades | Luran S, Centrex | |
| Typical Applications | Outdoor enclosures, building automation housings, signage boxes | |
| Color Retention | Excellent | (10+ year outdoor color stability) |
| RoHS/REACH | Compliant | |

### Metals

#### Cold-Rolled Steel (CRS / SPCC)

| Property | Value | Unit |
|----------|-------|------|
| Density | 7.85 | g/cm3 |
| Tensile Strength (Yield) | 180-280 | MPa |
| Tensile Strength (Ultimate) | 300-400 | MPa |
| Hardness | 55-75 | HRB |
| Thermal Conductivity | 50-60 | W/m-K |
| CTE | 11.7 | um/m-C |
| Standard Gauges | 20 ga (0.91mm), 18 ga (1.22mm), 16 ga (1.52mm), 14 ga (1.90mm) | |
| Surface Finish Options | Powder coat, paint, zinc plate, nickel plate | |
| Corrosion Resistance | Poor without coating | (must be coated for any application) |
| Cost Class | $ | (low) |
| Common Forms | Sheet, formed/bent, welded assemblies | |
| Typical Applications | Server racks, industrial housings, control panel enclosures | |
| Weldability | Excellent | (MIG, TIG, spot weld) |
| Recyclability | Excellent | |
| RoHS/REACH | Compliant | |

#### Aluminum Sheet (5052-H32)

| Property | Value | Unit |
|----------|-------|------|
| Density | 2.68 | g/cm3 |
| Tensile Strength (Yield) | 193 | MPa |
| Tensile Strength (Ultimate) | 228 | MPa |
| Hardness | 60 | Brinell |
| Thermal Conductivity | 138 | W/m-K |
| CTE | 23.8 | um/m-C |
| Standard Gauges | 20 ga (0.81mm), 18 ga (1.02mm), 16 ga (1.29mm), 14 ga (1.63mm) | |
| Formability | Good | (excellent bending characteristics) |
| Surface Finish Options | Anodize Type II, powder coat, brushed, bead blast | |
| Corrosion Resistance | Good | (excellent with anodize) |
| Cost Class | $$ | (medium) |
| Common Forms | Sheet, bent, formed | |
| Typical Applications | Desktop enclosures, instrument cases, rack panels | |
| Weldability | Good | (TIG with 4043/5356 filler) |
| Recyclability | Excellent | |
| RoHS/REACH | Compliant | |

#### Die-Cast Aluminum (A380)

| Property | Value | Unit |
|----------|-------|------|
| Density | 2.71 | g/cm3 |
| Tensile Strength (Ultimate) | 324 | MPa |
| Yield Strength | 159 | MPa |
| Hardness | 80 | Brinell |
| Thermal Conductivity | 96 | W/m-K |
| CTE | 21.1 | um/m-C |
| Melting Range | 566-599 | C |
| Min Wall Thickness | 1.0 | mm |
| Draft Angle | 2-3 deg min | Per die casting standards |
| Surface Finish Options | Powder coat, paint, chromate conversion, anodize (limited) | |
| Corrosion Resistance | Fair | (requires coating for outdoor) |
| Cost Class | $ (at volume) | (tooling $5K-50K, low per-piece) |
| Common Forms | Custom die-cast shapes | |
| Typical Applications | IP67 outdoor enclosures, ruggedized housings, junction boxes | |
| EMI Shielding | Excellent | (inherent metal shielding) |
| Recyclability | Excellent | |
| RoHS/REACH | Compliant | |

#### Die-Cast Zinc Alloy (Zamak 5)

| Property | Value | Unit |
|----------|-------|------|
| Density | 6.60 | g/cm3 |
| Tensile Strength (Ultimate) | 331 | MPa |
| Yield Strength | 228 | MPa |
| Hardness | 91 | Brinell |
| Thermal Conductivity | 109 | W/m-K |
| CTE | 27.4 | um/m-C |
| Melting Range | 380-386 | C |
| Min Wall Thickness | 0.6 | mm (thinner than aluminum die-cast) |
| Draft Angle | 1-2 deg | (lower draft than aluminum) |
| Surface Finish Options | Chrome plate, nickel plate, powder coat, paint | |
| Corrosion Resistance | Fair | (requires plating or coating) |
| Cost Class | $ | (low per-piece, lower mold temp = longer die life) |
| Common Forms | Die-cast | |
| Typical Applications | Small junction boxes, connector housings, handles, latches | |
| Detail Resolution | Excellent | (finer detail than aluminum die-cast) |
| Recyclability | Good | |
| RoHS/REACH | Compliant (verify plating) | |

### Finishes

#### Powder Coat

| Property | Value | Unit |
|----------|-------|------|
| Coating Thickness | 50-150 | um (typical 60-80 um) |
| Temperature Rating | Up to 200 | C (standard polyester) |
| Adhesion | Excellent | (cross-hatch test per ASTM D3359) |
| Hardness | 2H-4H | (pencil hardness) |
| Salt Spray Resistance | 500-1000+ hours | (ASTM B117) |
| UV Resistance | Good (polyester), Excellent (TGIC polyester) | |
| Color Matching | RAL, Pantone (custom), textured finishes | |
| Cost Class | $ | (low -- highly automated) |
| Min Quantity | 1 piece | (batch processing typical) |
| Substrate Requirements | Conductive (metal only) | Plastic requires conductive primer |
| Application | Electrostatic spray + oven cure (180-200C) | |
| RoHS/REACH | Compliant | |

## Standard Parts Catalog

### Rack Mount Hardware

| Part | Standard | Dimensions | Material | Distributor Refs |
|------|----------|-----------|----------|-----------------|
| 19" Rack Rail | EIA-310-D | 19" (482.6mm) wide | Steel (zinc plated) | Hammond, Middle Atlantic |
| Rack Ears | EIA-310-D | 1U-4U heights | Steel, Aluminum | Hammond, Penn Elcom |
| Cage Nuts | M5, M6, 10-32 | Square hole compatible | Spring steel (zinc) | McMaster-Carr 97591A, Startech |
| Rack Screws | M5, M6, 10-32 | Pan head, combo drive | Steel (zinc/black) | McMaster-Carr 97764A |
| Blank Panel | EIA-310-D | 1U, 2U, 3U, 4U | Steel (powder coated) | Hammond, Middle Atlantic |
| Ventilation Panel | EIA-310-D | 1U, 2U with hex perf | Steel (powder coated) | Middle Atlantic, Lowell |
| Sliding Rail | EIA-310-D | 350-800mm depth | Steel ball bearing | Penn Elcom, King Slide |

### Panel Mount Connectors

| Part | Cutout Shape | Mounting | IP Rating | Distributor Refs |
|------|-------------|---------|----------|-----------------|
| IEC C14 Inlet | Rectangular 27.8x20mm | Snap-in or screw | IP20 | Schurter, Qualtek, Digi-Key |
| Fuse Holder | Cylindrical 5x20mm | Panel mount | IP40 | Schurter, Littelfuse |
| Circular Connector | D-hole (keyed) | Panel nut | IP67 | Amphenol, TE, Digi-Key |
| Ethernet (RJ45) | Rectangular | Panel mount | IP67 (sealed) | Amphenol RJF, TE |
| USB-A/USB-C | Per USB-IF | Panel mount | IP67 (sealed) | Bulgin, CONEC |
| DB9/DB15 | D-shape | Screw mount | IP40 (IP67 with gasket) | TE AMPLIMITE |
| BNC | Circular 9.5mm hole | Panel nut | IP40 | Amphenol 31-221 |
| N-Type | Circular 15.9mm hole | Panel nut | IP67 | Amphenol 172100 |

### Cable Glands

| Part | Thread | Cable Range | Material | IP Rating | Distributor Refs |
|------|--------|------------|----------|----------|-----------------|
| PG7 | PG 7 | 3-6.5mm | PA66 (nylon) | IP68 | Lapp SKINTOP, McMaster |
| PG9 | PG 9 | 4-8mm | PA66 (nylon) | IP68 | Lapp SKINTOP, McMaster |
| PG11 | PG 11 | 5-10mm | PA66 (nylon) | IP68 | Lapp SKINTOP, McMaster |
| PG13.5 | PG 13.5 | 6-12mm | PA66 (nylon) | IP68 | Lapp SKINTOP, McMaster |
| PG16 | PG 16 | 10-14mm | PA66 (nylon) | IP68 | Lapp SKINTOP, McMaster |
| M12x1.5 | Metric M12 | 3-6.5mm | PA66 or Brass (nickel) | IP68 | Lapp, Hummel, McMaster |
| M16x1.5 | Metric M16 | 4-8mm | PA66 or Brass (nickel) | IP68 | Lapp, Hummel, McMaster |
| M20x1.5 | Metric M20 | 6-12mm | PA66 or Brass (nickel) | IP68 | Lapp, Hummel, McMaster |
| M25x1.5 | Metric M25 | 9-17mm | PA66 or Brass (nickel) | IP68 | Lapp, Hummel, McMaster |

### Gaskets and Seals

| Part | Material | Cross-Section | Temperature Range | Distributor Refs |
|------|----------|-------------|-------------------|-----------------|
| O-Ring (AS568) | Silicone (VMQ) | 1.0-5.0mm | -60 to +200 C | McMaster-Carr, Apple Rubber |
| O-Ring (AS568) | Nitrile (NBR) | 1.0-5.0mm | -40 to +100 C | McMaster-Carr |
| O-Ring (AS568) | EPDM | 1.0-5.0mm | -50 to +130 C | McMaster-Carr |
| Flat Gasket (die-cut) | Silicone foam | 1.5-6.0mm | -50 to +200 C | Custom die-cut, McMaster |
| Flat Gasket (die-cut) | Neoprene (CR) | 1.5-6.0mm | -40 to +100 C | Custom die-cut, McMaster |
| EMI Gasket | Conductive silicone | 1-3mm | -55 to +200 C | Parker Chomerics, Laird |
| EMI Gasket | Beryllium copper | Spring finger | -55 to +150 C | Tech-Etch, Instrument Specialties |

### Hardware (Hinges, Latches, Feet)

| Part | Type | Material | Load Rating | Distributor Refs |
|------|------|----------|------------|-----------------|
| Piano Hinge | Continuous | SS 304, Steel (zinc) | Per length/gauge | McMaster-Carr 1585A |
| Butt Hinge | 2-leaf | SS 304, Zinc die-cast | Light-medium | McMaster-Carr 1598A |
| Draw Latch | Toggle | Steel (zinc), SS 304 | 50-500 lbs | Southco, McMaster-Carr 1864A |
| Compression Latch | Quarter-turn | Zinc die-cast, SS | Light-medium | Southco E5, McMaster-Carr |
| Cam Lock | Keyed cylinder | Zinc die-cast | Security closure | CompX, Southco, McMaster |
| Rubber Feet | Self-adhesive | Rubber (SBR/silicone) | 1-50 lbs each | McMaster-Carr 9540K |
| Leveling Feet | Threaded (M6/M8) | Nylon + SS | 50-200 lbs each | McMaster-Carr 6148K |
| Handle | Fold-down / fixed | SS, Aluminum, Nylon | Pull: 10-100 lbs | McMaster-Carr 1082A |

---

<!-- tier:standard -->

## DFM Rules

### Sheet Metal Design

| Rule | Value | Notes |
|------|-------|-------|
| Min Bend Radius | 1x material thickness (steel) | 1.5x for aluminum (to prevent cracking) |
| K-Factor | 0.33 (soft), 0.40 (medium), 0.50 (hard) | Used for bend deduction calculation |
| Min Flange Length | 4x material thickness | Shorter flanges slip from V-die |
| Hole-to-Edge Distance | Min 2x material thickness | Prevents deformation during bending |
| Hole-to-Bend Distance | Min 2.5x thickness + bend radius | Prevents hole distortion |
| Hole-to-Hole Spacing | Min 2x material thickness | Edge-to-edge distance |
| Min Hole Diameter | Equal to material thickness | Smaller requires special tooling |
| Tab and Slot Width | Min 2x material thickness | For self-fixturing welded assemblies |
| Bend-to-Bend Distance | Min 6x material thickness | For V-die clearance |
| Max Sheet Size | 1220x2440mm (4'x8') standard | Larger requires special ordering |
| Tolerance (Bend Position) | +/- 0.25mm per bend | Accumulates with multiple bends |
| Tolerance (Hole Position) | +/- 0.1mm | CNC punched/laser cut |
| Corner Relief | Min 1x thickness radius at bend intersections | Prevents tearing |

### Die Casting Design

| Rule | Value | Notes |
|------|-------|-------|
| Min Draft Angle | 2 deg (external), 3 deg (internal) | More draft = easier ejection, longer die life |
| Wall Thickness (Aluminum) | 1.0-3.0mm | Uniform preferred; max 5mm |
| Wall Thickness (Zinc) | 0.6-2.0mm | Thinner than aluminum possible |
| Fillet Radius | Min 1mm internal | Sharp corners cause hot spots and die erosion |
| Parting Line | Plan for cosmetic and functional requirements | Affects flash location and appearance |
| Core Pulls | Add $3K-10K per slide | Side actions for undercuts |
| Ejector Pins | Mark on inside/non-cosmetic face | Pin marks visible on casting |
| Porosity | Specify acceptable zone map | Structural areas may need X-ray inspection |
| Post-Machining | Plan for critical dimensions | As-cast tolerances are +/- 0.1-0.3mm |
| Flash | 0.1-0.5mm at parting line | Removed by tumble, trim die, or manual |
| Sink Marks | Rib thickness <= 60% of wall | Same rule as injection molding |
| Tooling Cost | $5K-15K (zinc), $10K-50K (aluminum) | Amortize across production volume |

### Extrusion Design (Aluminum)

| Rule | Value | Notes |
|------|-------|-------|
| Min Wall Thickness | 1.0mm (standard), 0.5mm (micro) | Depends on alloy and profile complexity |
| Max Profile Width | 250mm (standard press) | Larger requires bigger press (higher cost) |
| Hollow Profiles | Porthole die or mandrel | Porthole die = lower cost, visible weld lines |
| Tolerances | +/- 0.25mm (standard) | +/- 0.1mm with secondary machining |
| Corner Radius | Min 0.5mm external, 0.25mm internal | Sharp corners increase die stress |
| Tongue Ratio | Max 3:1 | Tongue length / gap width at root |
| Die Cost | $500-5000 | Much lower than injection mold or die-cast die |
| Min Order | 100-500 kg typical | Extrusion houses have minimum run lengths |
| Surface Finish | Mill finish, anodize, powder coat | As-extruded finish is production-ready with anodize |
| Assembly | Slide-in rails, snap-fit profiles | Design for modular assembly |

## Enclosure-Specific Design

### Thermal Management

| Scenario | Solution | Sizing Guideline |
|----------|----------|-----------------|
| < 5W, sealed | Passive conduction through walls | Maximize wall area, add internal fins |
| 5-15W, sealed | Heatsink bonded to wall + external fins | Thermal resistance < 3 C/W target |
| 5-20W, ventilated | Perforated panels + natural convection | 25% open area on two opposing faces |
| 20-50W, ventilated | Forced air (fans) | 30-50 CFM per 10W typical |
| 50-200W, ventilated | Fan tray + filtered inlet/outlet | Positive pressure (inlet filtered, outlet unfiltered) |
| > 200W | Liquid cooling, heat exchangers, or AC | Engineering analysis required |

**Ventilation Patterns:**

| Pattern | Open Area % | Strength Loss | Aesthetics | Use Case |
|---------|------------|---------------|-----------|----------|
| Round holes (hex pattern) | 20-45% | Low | Industrial | Standard ventilation |
| Rectangular slots | 15-35% | Low-medium | Clean | Desktop enclosures |
| Hex perforated | 35-50% | Medium | Moderate | High airflow needs |
| Louvers (stamped) | 20-40% | Low | Professional | Rack mount, outdoor |
| Mesh screen | 40-60% | High | Fine | EMI + ventilation |

### EMI Shielding Design

| Technique | Shielding Effectiveness | Notes |
|-----------|------------------------|-------|
| Continuous metal enclosure | 60-100 dB | Best case -- no seams |
| Seam bonding (welded) | 60-80 dB | No gasket needed |
| Overlapping seam + EMI gasket | 40-70 dB | Spring finger or conductive elastomer |
| Conductive coating (interior) | 30-50 dB | Copper or nickel spray on plastic |
| Honey-comb vent | 40-80 dB | Maintains airflow + shielding |
| Filtered power entry | 40-60 dB | IEC inlet with integral filter |
| Bond strap across hinged joints | 20-40 dB | Flexible braid or spring contact |

**Seam Spacing Rule:** Max fastener spacing for EMI: lambda/20 at highest frequency of concern.
- At 1 GHz: lambda = 300mm, spacing = 15mm
- At 3 GHz: lambda = 100mm, spacing = 5mm

### IP Sealing Strategies

| IP Level | Sealing Approach | Notes |
|----------|-----------------|-------|
| IP20-IP40 | No gaskets; labyrinth baffles or close-fit | Prevent finger/object entry only |
| IP54 | Foam gasket + sealed cable glands | Dust-protected, splash-proof |
| IP65 | Compression gasket (silicone) + sealed cable glands | Dust-tight, jet-proof |
| IP67 | O-ring groove + sealed glands + sealed buttons | Dust-tight, immersion-rated |
| IP68 | O-ring + potted cables + membrane switches | Continuous submersion |

## Compliance Standards

### NEMA Ratings (Enclosures)

| Rating | Environment | Protection | Construction Requirements |
|--------|------------|------------|--------------------------|
| NEMA 1 | Indoor | Falling dirt | Sheet metal, ventilated OK |
| NEMA 2 | Indoor | Dripping water, dirt | Sheet metal, drip shield |
| NEMA 3 | Outdoor | Rain, sleet, windblown dust | Gasketed, weather-resistant |
| NEMA 3R | Outdoor | Rain, sleet (no dust seal) | Rain-tight, no gasket required |
| NEMA 4 | Indoor/Outdoor | Hosedown, rain, dust | Gasketed, corrosion-resistant |
| NEMA 4X | Indoor/Outdoor | NEMA 4 + corrosion (SS/fiberglass) | Stainless steel or fiberglass |
| NEMA 12 | Indoor | Dripping, dust, oil | Gasketed, no knockouts |
| NEMA 13 | Indoor | NEMA 12 + sprayed water/oil | Gasketed, oil-tight |

### UL 508A (Industrial Control Panels)

| Requirement | Description | Notes |
|-------------|-------------|-------|
| Short-Circuit Current Rating (SCCR) | Must be labeled | Series-rated or individually rated |
| Wire Bending Space | Per NEC Table 312.6 | Based on conductor size |
| Spacing (Line-to-Line) | Per UL 508A Table 36.1 | Based on voltage |
| Spacing (Line-to-Ground) | Per UL 508A Table 36.1 | Reduced with barriers |
| Enclosure Type | Must match environment | NEMA type labeling |
| Grounding | Equipment grounding bar required | Bonded to enclosure |
| Wiring | Per NEC Article 409 | Color coding, labeling |

### EMC for Enclosures

| Standard | Scope | Key Requirements |
|----------|-------|-----------------|
| EN 55032 | Emissions | Conducted + radiated limits for enclosure system |
| EN 55035 | Immunity | ESD, surge, radiated/conducted immunity |
| FCC Part 15 | US emissions | Class A (commercial) or Class B (residential) |
| CISPR 32 | International emissions | Harmonized with EN 55032 |

---

<!-- tier:comprehensive -->

## Advanced Materials

### Specialty Plastics

#### Fiberglass-Reinforced Polyester (FRP/GRP)

| Property | Value | Unit |
|----------|-------|------|
| Density | 1.4-2.0 | g/cm3 |
| Tensile Strength | 70-200 | MPa (depends on glass content) |
| Impact Strength | High | (fiber reinforcement prevents shattering) |
| Temperature Range | -40 to +130 | C |
| UV Resistance | Excellent | (with gel coat) |
| Corrosion Resistance | Excellent | (no rust, no galvanic corrosion) |
| Flame Rating | V-0 (available) | UL 94 |
| Cost Class | $$-$$$ | (depends on process) |
| Processing | Hand layup, RTM, SMC, BMC | |
| Typical Applications | NEMA 4X enclosures, chemical environments, underground | |
| Electrical Insulation | Excellent | (non-conductive -- no grounding path) |
| RoHS/REACH | Compliant | |

#### Polypropylene (PP)

| Property | Value | Unit |
|----------|-------|------|
| Density | 0.90-0.91 | g/cm3 |
| Tensile Strength | 30-40 | MPa |
| Impact Strength (Izod) | 20-100 | J/m |
| Heat Deflection Temp | 55-65 | C (at 0.45 MPa) |
| Melting Point | 165 | C |
| Chemical Resistance | Excellent | (similar to HDPE) |
| UV Resistance | Fair | (requires UV stabilizer) |
| Cost Class | $ | (very low) |
| Typical Applications | Battery boxes, chemical-resistant enclosures, low-cost housings | |
| Recyclability | Code 5 | Widely recycled |
| RoHS/REACH | Compliant | |

### Specialty Metals

#### Stainless Steel 304 (Enclosure Grade)

| Property | Value | Unit |
|----------|-------|------|
| Density | 8.00 | g/cm3 |
| Tensile Strength (Ultimate) | 505 | MPa |
| Standard Gauges | 18 ga (1.22mm), 16 ga (1.52mm), 14 ga (1.90mm), 12 ga (2.66mm) | |
| Surface Finish | #4 (brushed), #2B (mill), bead blast, mirror | |
| Corrosion Resistance | Excellent | |
| Cost Class | $$$ | (3-5x CRS) |
| Typical Applications | Food/pharma enclosures, outdoor NEMA 4X, cleanroom | |
| Weldability | Good | (TIG preferred for cosmetic) |
| Magnetic | Slightly (after cold working) | Austenitic grade |
| RoHS/REACH | Compliant | |

#### Stainless Steel 316L (Marine Grade)

| Property | Value | Unit |
|----------|-------|------|
| Density | 8.00 | g/cm3 |
| Tensile Strength (Ultimate) | 485 | MPa |
| Corrosion Resistance | Excellent | (marine/chemical environments) |
| Cost Class | $$$$ | (5-7x CRS) |
| Typical Applications | Marine enclosures, chemical processing, offshore | |
| RoHS/REACH | Compliant | |

## Advanced Fabrication

### Weldment Design

| Joint Type | Process | Strength | Appearance | Cost |
|------------|---------|----------|-----------|------|
| Butt weld | TIG/MIG | High | Good (with grinding) | $$ |
| Fillet weld | MIG | High | Fair | $ |
| Spot weld | Resistance | Medium | Good (interior) | $ |
| Projection weld | Resistance | Medium-High | Good (fastener welding) | $ |
| Laser weld | Fiber laser | High | Excellent (minimal distortion) | $$$ |

### Insert and Fastening Methods

| Method | Install Cost | Strength | Rework | Best For |
|--------|------------|----------|--------|----------|
| PEM Press-Fit | $ | High | Difficult | Sheet metal nuts, standoffs, studs |
| Weld Nut | $ | Very high | N/A (permanent) | Structural, high-torque |
| Rivet Nut | $ | Medium | Difficult | Thin sheet, blind access |
| Self-Clinch | $ | Medium-High | Difficult | Automated assembly |
| Machine Screw + Cage Nut | $$ | High | Easy | Rack mount, field service |
| Quarter-Turn Fastener | $$$ | Medium | Easy (designed for it) | Quick-access panels |

## Modular Enclosure Design

### Standard Off-the-Shelf Enclosure Families

| Vendor | Series | Material | Sizes | IP Range | Type |
|--------|--------|----------|-------|---------|------|
| Hammond | 1590 series | Die-cast aluminum | 50x50 to 222x146mm | IP54-IP65 | Project box |
| Hammond | 1554/1555 | ABS/PC | 65x65 to 200x120mm | IP66-IP68 | Watertight |
| Bud | AN/CN series | Die-cast aluminum | Various | IP65 | Utility |
| OKW | EVOTEC | ABS/PC | 65x65 to 200x100mm | IP65 | Desktop/wall |
| Bopla | BOCUBE | ABS/PC | 130x75 to 284x164mm | IP66-IP68 | Outdoor |
| Rittal | AE/AX | Steel/SS | 200x200 to 1200x800mm | IP55-IP66 | Industrial |
| Rittal | SE | Steel | 19" rack | IP55 | Network/server |
| Fibox | ARCA | Polycarbonate | 300x200 to 600x400mm | IP66 | Outdoor/industrial |

**When to customize vs off-the-shelf:**

| Factor | Off-the-Shelf | Custom |
|--------|---------------|--------|
| Volume | < 500 units | > 500-1000 units |
| Tooling cost | $0 (machining only) | $5K-50K+ |
| Lead time | 1-4 weeks | 8-16 weeks (tooling) |
| Per-unit cost | Higher | Lower at volume |
| Branding | Limited (labels, machined) | Full custom appearance |
| IP flexibility | Fixed rating | Designed to requirement |

## Accessibility Design for Enclosures

### ADA and Universal Design

| Feature | Guideline | Standard |
|---------|-----------|----------|
| Operable Force | Max 22N (5 lbf) for latches/handles | ADA 309.4 |
| Reach Range | 380-1220mm (15-48") from floor | ADA 308 |
| Protruding Objects | Max 100mm (4") protrusion below 2030mm | ADA 307 |
| Labels | Braille + raised lettering for permanent labels | ADA 703 |
| Color Coding | Supplement with shape/text (colorblind safe) | WCAG 1.4.1 concept |
| Tool-Free Access | Preferred for user-serviceable compartments | Best practice |
