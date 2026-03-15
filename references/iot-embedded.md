# IoT & Embedded Hardware Reference Library

> Curated materials, standard parts, DFM rules, and compliance standards for IoT and embedded device hardware design.
> Loaded via `@` reference from `hardware.md` during specification generation.
>
> **Version:** 1.0
> **Scope:** Environmental sensors, smart hubs, gateway modules, industrial monitors, edge compute devices
> **Ownership:** Hardware skill (exclusive)
> **Boundary:** This file owns IoT/embedded material profiles, industrial parts, and outdoor-rated DFM rules. General consumer electronics belong in `consumer-electronics.md`. Enclosure-only designs belong in `enclosures.md`.

**Reference data for specification purposes. Verify all properties, pricing, and availability with suppliers before production use. All prices estimated -- verify before quoting.**

---

<!-- tier:essentials -->

## Materials Quick Reference

### Plastics

#### ABS (Acrylonitrile Butadiene Styrene -- IoT Grade)

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
| UV Resistance | Poor | (requires UV stabilizer for outdoor use) |
| Chemical Resistance | Good (acids, alkalis) | Poor (ketones, esters) |
| Flame Rating | HB (standard), V-0 (FR grades) | UL 94 |
| Cost Class | $ | (low) |
| Common Grades | ABS GP, ABS FR (flame retardant), ABS HI (high impact) | |
| Typical Applications | Indoor sensor housings, hub enclosures, wall-mount devices | |
| RoHS/REACH | Compliant (verify per grade) | |

#### PC (Polycarbonate -- IoT Grade)

| Property | Value | Unit |
|----------|-------|------|
| Density | 1.20-1.22 | g/cm3 |
| Tensile Strength | 55-75 | MPa |
| Impact Strength (Izod) | 600-900 | J/m |
| Heat Deflection Temp | 130-140 | C (at 0.45 MPa) |
| Glass Transition | 147 | C |
| Shrinkage Rate | 0.5-0.7 | % |
| Min Wall Thickness | 1.0 | mm |
| Surface Finish | SPI A-1 to C-3 | (transparent grades available) |
| UV Resistance | Fair | (yellows without stabilizer) |
| Chemical Resistance | Good (dilute acids) | Poor (alkalis, solvents) |
| Flame Rating | V-2 (standard), V-0 (FR grades) | UL 94 |
| Cost Class | $$ | (medium) |
| Common Grades | PC GP, PC FR, PC UV-stabilized | |
| Typical Applications | Transparent sensor windows, LED covers, light pipes | |
| RoHS/REACH | Compliant (verify per grade) | |

#### PA66+GF30 (Glass-Filled Nylon 66)

| Property | Value | Unit |
|----------|-------|------|
| Density | 1.36-1.42 | g/cm3 |
| Tensile Strength | 120-150 | MPa |
| Impact Strength (Izod) | 80-120 | J/m |
| Heat Deflection Temp | 250 | C (at 0.45 MPa) |
| Melting Point | 260 | C |
| Shrinkage Rate | 0.3-0.5 (flow), 0.8-1.2 (cross) | % (anisotropic) |
| Min Wall Thickness | 1.0 | mm |
| Surface Finish | SPI B-3 to D-3 | (glass fibers visible on polished surfaces) |
| UV Resistance | Fair | (add UV stabilizer for outdoor) |
| Chemical Resistance | Good (oils, greases, solvents) | Poor (strong acids) |
| Flame Rating | V-0 (available) | UL 94 |
| Cost Class | $$ | (medium) |
| Common Grades | PA66-GF30, PA66-GF33 (Zytel, Ultramid) | |
| Typical Applications | Structural brackets, DIN rail housings, high-temp near-PSU components | |
| Moisture Absorption | 1.0-1.5% | (lower than unfilled PA due to glass content) |
| RoHS/REACH | Compliant | |

#### PBT (Polybutylene Terephthalate)

| Property | Value | Unit |
|----------|-------|------|
| Density | 1.30-1.38 | g/cm3 |
| Tensile Strength | 50-60 (unfilled), 120-150 (GF30) | MPa |
| Impact Strength (Izod) | 50-55 (unfilled) | J/m |
| Heat Deflection Temp | 155 (GF30) | C (at 0.45 MPa) |
| Melting Point | 225 | C |
| Shrinkage Rate | 1.5-2.0 (unfilled), 0.3-0.7 (GF) | % |
| Min Wall Thickness | 0.8 | mm |
| Surface Finish | SPI B-1 to D-3 | (good gloss without GF) |
| UV Resistance | Fair | |
| Chemical Resistance | Excellent (fuels, oils, solvents) | Poor (hot water >60C) |
| Flame Rating | V-0 (available) | UL 94 |
| Cost Class | $$ | (medium) |
| Common Grades | PBT GP, PBT-GF30 (Valox, Celanex) | |
| Typical Applications | Connectors, terminal blocks, relay housings, sensor bodies | |
| Electrical Properties | Excellent insulator (CTI 600V) | High comparative tracking index |
| RoHS/REACH | Compliant | |

### Metals

#### Aluminum Extrusion (6063-T5)

| Property | Value | Unit |
|----------|-------|------|
| Density | 2.70 | g/cm3 |
| Tensile Strength (Yield) | 145 | MPa |
| Tensile Strength (Ultimate) | 186 | MPa |
| Thermal Conductivity | 209 | W/m-K |
| CTE | 23.4 | um/m-C |
| Melting Range | 616-654 | C |
| Machinability | Good | (excellent extrudability) |
| Surface Finish Options | Anodize Type II, powder coat, bead blast | |
| Corrosion Resistance | Good | (excellent with anodize) |
| Cost Class | $$ | (medium -- low tooling for extrusion) |
| Common Forms | Custom extrusion profiles, standard heatsink profiles | |
| Typical Applications | Heatsink fins, housing rails, edge compute enclosures | |
| Recyclability | Excellent | |
| RoHS/REACH | Compliant | |

#### Galvanized Steel (Hot-Dip / Electro)

| Property | Value | Unit |
|----------|-------|------|
| Density | 7.85 | g/cm3 |
| Tensile Strength (Yield) | 200-350 | MPa (depends on base steel grade) |
| Tensile Strength (Ultimate) | 340-500 | MPa |
| Thermal Conductivity | 50-60 | W/m-K |
| CTE | 11-12 | um/m-C |
| Zinc Coating Thickness | 7-42 um (electro), 45-85 um (hot-dip) | |
| Corrosion Resistance | Good | (zinc sacrificial coating) |
| Cost Class | $ | (low) |
| Common Forms | Sheet, tube, angle, channel | |
| Typical Applications | Outdoor mounting brackets, pole mounts, structural frames | |
| Weldability | Good | (standard MIG/TIG) |
| Recyclability | Excellent | |
| RoHS/REACH | Compliant | |

### Sealing and Potting

#### Silicone Gaskets

| Property | Value | Unit |
|----------|-------|------|
| Density | 1.10-1.20 | g/cm3 |
| Hardness | Shore 40A-70A | (typical for gaskets) |
| Temperature Range | -60 to +200 | C |
| Compression Set | 10-25 | % (at 150C, 22h) |
| Tear Strength | 10-30 | kN/m |
| UV Resistance | Excellent | |
| Chemical Resistance | Good (water, dilute acids) | Fair (petroleum) |
| Cost Class | $$ | (medium) |
| Common Forms | Cut gaskets, O-rings, molded seals | |
| Typical Applications | Enclosure lid seals, cable entry seals, sensor window gaskets | |
| IP Sealing | IP65-IP68 achievable | (with proper groove design) |
| RoHS/REACH | Compliant | |

#### Epoxy Potting Compound

| Property | Value | Unit |
|----------|-------|------|
| Density (Cured) | 1.40-1.80 | g/cm3 |
| Hardness | Shore 70D-90D | (rigid) |
| Temperature Range | -40 to +130 | C (standard), -55 to +200 (high-temp) |
| Thermal Conductivity | 0.5-2.5 | W/m-K (filled grades) |
| Dielectric Strength | 15-20 | kV/mm |
| Cure Time | 4-24h at RT | (1-2h at 80C accelerated) |
| Cost Class | $$ | (medium) |
| Typical Applications | PCB encapsulation, cable terminations, outdoor electronics protection | |
| Rework | Not possible | (permanent encapsulation) |
| RoHS/REACH | Compliant (verify per formulation) | |

#### Polyurethane Potting Compound

| Property | Value | Unit |
|----------|-------|------|
| Density (Cured) | 1.05-1.30 | g/cm3 |
| Hardness | Shore 40A-80D | (semi-rigid to rigid grades) |
| Temperature Range | -40 to +120 | C |
| Thermal Conductivity | 0.2-0.8 | W/m-K |
| Dielectric Strength | 12-18 | kV/mm |
| Cure Time | 2-24h at RT | |
| Cost Class | $$ | (medium) |
| Typical Applications | Flexible PCB potting, vibration-sensitive electronics, sensor modules | |
| Rework | Possible (flexible grades can be cut away) | |
| RoHS/REACH | Compliant (verify per formulation) | |

### PCB Materials

#### FR-4 (Glass-Reinforced Epoxy Laminate)

| Property | Value | Unit |
|----------|-------|------|
| Density | 1.85 | g/cm3 |
| Glass Transition (Tg) | 130-180 | C (standard to high-Tg grades) |
| Dielectric Constant (Er) | 4.2-4.8 | (at 1 MHz) |
| Loss Tangent | 0.015-0.025 | (at 1 MHz) |
| CTE (Z-axis) | 50-70 | ppm/C (below Tg) |
| Flame Rating | V-0 | UL 94 |
| Standard Thicknesses | 0.4, 0.6, 0.8, 1.0, 1.6, 2.0 | mm |
| Copper Weights | 0.5oz (17um), 1oz (35um), 2oz (70um) | |
| Layer Count | 1-16+ | (IoT typically 2-6 layers) |
| Cost Class | $ | (low -- industry standard) |
| Typical Applications | Control boards, sensor PCBs, gateway modules | |
| RoHS/REACH | Compliant (lead-free solder required) | |

#### Aluminum-Core PCB (MCPCB)

| Property | Value | Unit |
|----------|-------|------|
| Substrate | Aluminum (1-3mm) + dielectric + copper | |
| Thermal Conductivity | 1.0-3.0 (dielectric layer) | W/m-K |
| Thermal Resistance | 0.5-2.0 | C-in2/W |
| Dielectric Breakdown | >3 kV | |
| Standard Thicknesses | 1.0, 1.5, 2.0 | mm (aluminum core) |
| Layer Count | 1-2 | (single-sided typical) |
| Cost Class | $$ | (medium) |
| Typical Applications | High-power LED arrays, motor drivers, power converters | |
| RoHS/REACH | Compliant | |

#### Flexible Polyimide (Kapton-based)

| Property | Value | Unit |
|----------|-------|------|
| Density | 1.42 | g/cm3 |
| Dielectric Constant (Er) | 3.2-3.5 | (at 1 MHz) |
| Temperature Range | -269 to +400 | C (short-term) |
| Min Bend Radius | 6x thickness | (for single bend) |
| Standard Thicknesses | 25, 50, 75, 125 | um (base film) |
| Copper Weights | 0.5oz (17um), 1oz (35um) | |
| Cost Class | $$$ | (high) |
| Typical Applications | Flex interconnects, foldable sensor arrays, cable replacements | |
| RoHS/REACH | Compliant | |

## Standard Parts Catalog

### DIN Rail and Mounting

| Part | Standard | Dimensions | Material | Distributor Refs |
|------|----------|-----------|----------|-----------------|
| DIN Rail TS-35 | EN 60715 | 35mm x 7.5mm (std), 35mm x 15mm (deep) | Steel (zinc plated), Aluminum | McMaster-Carr 8961K, Digi-Key |
| DIN Rail End Stop | EN 60715 | Clip-on | Plastic (PA66) | Phoenix Contact 3022218 |
| DIN Rail Adapter | Custom | Per enclosure design | Steel or PA66 | Various (Bopla, OKW) |
| Wall Mount Bracket | N/A | Various | Galvanized steel, Aluminum | McMaster-Carr, custom |
| Pole Mount Clamp | N/A | 25-50mm diameter range | SS 304, galvanized steel | McMaster-Carr 3042T |

### Terminal Blocks

| Part | Type | Pitch | Current Rating | Distributor Refs |
|------|------|-------|---------------|-----------------|
| Screw Terminal | PCB mount | 3.5mm, 3.81mm, 5.0mm, 5.08mm | 6-16A | Phoenix Contact MKDS, Digi-Key |
| Spring Terminal | PCB mount | 3.5mm, 5.0mm | 6-10A | Wago 236, Weidmuller LSF |
| Pluggable Terminal | PCB mount + header | 3.5mm, 3.81mm, 5.08mm | 8-16A | Phoenix Contact MC, Digi-Key |
| DIN Rail Terminal | DIN rail mount | N/A | 10-35A | Phoenix Contact UK, Wago 281 |
| Wire-to-Wire | Splice connector | N/A | 10-30A | Wago 221/222 lever nuts |

### Industrial Connectors

| Part | Type | IP Rating | Current Rating | Distributor Refs |
|------|------|----------|---------------|-----------------|
| M8 Circular | 3-8 pin, A/D coded | IP67 | 2-4A | TE M8, Amphenol, Digi-Key |
| M12 Circular | 4-12 pin, A/B/D/X coded | IP67 | 2-4A | TE M12, Amphenol, Binder |
| RJ45 Industrial | 8P8C with gasket | IP67 (panel mount) | Signal | Amphenol RJF, TE 1-2172068 |
| DB9/DB15 | Industrial D-sub | IP65 (with gasket) | Signal | TE AMPLIMITE |
| Waterproof USB-C | Panel mount | IP67/IP68 | 3-5A | Bulgin, CONEC |

### Antenna and RF

| Part | Type | Frequency | Connector | Distributor Refs |
|------|------|-----------|-----------|-----------------|
| SMA Connector | Panel mount, PCB | DC-18 GHz | 50 ohm | TE 5-1814832, Digi-Key |
| U.FL/IPEX | Board mount (miniature) | DC-6 GHz | 50 ohm | Hirose U.FL, Digi-Key |
| PCB Antenna (2.4 GHz) | Trace/chip | 2.4-2.5 GHz | Integrated | Johanson 2450AT, Fractus |
| PCB Antenna (Sub-GHz) | Chip | 868/915 MHz | Integrated | Johanson 0868AT, Ignion |
| External Antenna | Whip/stub | Various | SMA/RP-SMA | Taoglas, Molex |
| GPS/GNSS Antenna | Patch | 1575.42 MHz | U.FL | Taoglas CGGP, Molex |

### Thermal Management

| Part | Type | Thermal Performance | Mounting | Distributor Refs |
|------|------|-------------------|---------|-----------------|
| Extruded Heatsink | Aluminum fin | 2-20 C/W | Clip, adhesive, screw | Aavid, CUI, Digi-Key |
| Stamped Heatsink | Aluminum/copper | 5-30 C/W | Solder, press-fit | Aavid, Wakefield-Vette |
| Thermal Pad | Silicone | 1-6 W/m-K | Adhesive/compression | Bergquist (Henkel), Laird |
| Thermal Paste | Silicone/metal oxide | 1-12 W/m-K | Dispense | Arctic MX, Dow TC-5022 |
| Fan (Axial) | 20x20, 25x25, 30x30, 40x40mm | 1-10 CFM | Screw mount | Sunon, NMB, Digi-Key |
| Heat Pipe | Copper | 10-50 W capacity | Solder, clamp | AVC, Celsia |

---

<!-- tier:standard -->

## DFM Rules

### PCB Layout Basics

| Rule | Value | Notes |
|------|-------|-------|
| Min Trace Width | 0.15mm (6 mil) standard | 0.1mm (4 mil) for fine-pitch; cost increases |
| Min Trace Spacing | 0.15mm (6 mil) standard | Match trace width for manufacturability |
| Via Diameter | 0.3mm drill / 0.6mm pad (standard) | 0.2mm drill for microvia (HDI, $$$) |
| Via-to-Via Spacing | 0.5mm min | Center-to-center |
| Via-to-Edge Spacing | 0.3mm min | Drill to board edge |
| Annular Ring | 0.125mm min (5 mil) | Pad radius minus drill radius |
| Ground Plane | Continuous on at least one inner layer | Breaks cause EMI and signal integrity issues |
| Copper Pour Spacing | 0.25mm to traces | Prevents solder bridging |
| Component Clearance | 0.5mm between pads (standard) | 0.25mm for fine-pitch QFP/BGA |
| Board Edge Clearance | 2.5mm (0.1") for routing | Rail clearance for panelization |
| Fiducial Marks | 3 per board (min 2) | 1mm dia copper dot, 2mm clearance |

### Potting and Conformal Coating

| Rule | Value | Notes |
|------|-------|-------|
| Conformal Coating Thickness | 25-75 um | Per IPC-CC-830 (acrylic, silicone, polyurethane) |
| Potting Fill Level | 2-5mm above tallest component | Ensure complete encapsulation |
| Pot Life | 15-60 min (epoxy), 30-120 min (PU) | Time from mixing to pour |
| Exothermic Risk | Monitor for pots > 100g | Large masses can overheat during cure |
| Keep-Out Zones | Connectors, buttons, test points | Mask before potting |
| Drainage Holes | None for IP67+ | Sealed enclosure required |
| Rework Access | Plan test points outside potted area | Or use conformal coat instead of potting |
| Cure Temperature | RT to 80C typical | Higher temp = faster cure but risk to components |

### Outdoor Enclosure Sealing

| Feature | Guideline | Notes |
|---------|-----------|-------|
| Gasket Groove | Dovetail or rectangular, 1.5x gasket width | Depth = 50-70% of gasket cross-section |
| Gasket Compression | 20-30% | Over-compression causes permanent set |
| Cable Entry | Cable glands (PG/M series) or cord grips | Pre-drilled holes with gasket |
| Ventilation | Gore-Tex PTFE vent (IP67 rated) | Pressure equalization without moisture ingress |
| Drainage | Weep holes at lowest point (IP54 and below) | Not applicable for IP67+ |
| Mounting Orientation | Cables entering from bottom | Prevents water tracking along cables |
| UV Protection | ASA plastic or UV-stabilized paint | ABS degrades in direct sunlight |
| Screw Boss Sealing | O-ring under screw head or captive gasket | Each fastener is a potential leak path |
| Thermal Cycling | Account for CTE mismatch (plastic vs metal) | Seal must accommodate expansion |

## IoT-Specific Design Considerations

### Antenna Design Constraints

| Rule | Value | Notes |
|------|-------|-------|
| Ground Plane (2.4 GHz) | Min 40x40mm | Larger = better radiation efficiency |
| Keep-Out Zone (2.4 GHz) | 10mm from antenna element | No copper, traces, or components |
| Ground Plane (Sub-GHz) | Min 60x60mm | Larger ground plane for longer wavelength |
| Keep-Out Zone (Sub-GHz) | 15-20mm from antenna element | More clearance needed than 2.4 GHz |
| Antenna Placement | Board edge, away from metal | Metal reflects/absorbs RF energy |
| Enclosure Material | RF-transparent (plastic) near antenna | No metal enclosure near antenna area |
| Coax Cable Length | Minimize (each dB loss reduces range) | Use U.FL for short runs, SMA for external |
| GPS Antenna | Sky-facing, no ground plane above | Needs clear hemisphere view |
| Diversity Antennas | Min lambda/4 separation | ~31mm at 2.4 GHz |

### Wireless Module Selection Guide

| Technology | Frequency | Range (Indoor) | Range (Outdoor LOS) | Power (TX) | Data Rate | Best For |
|------------|-----------|---------------|---------------------|-----------|-----------|----------|
| WiFi (2.4 GHz) | 2.4 GHz | 30-50m | 100-200m | 100-300 mW | 1-150 Mbps | High bandwidth, cloud connected |
| WiFi (5 GHz) | 5 GHz | 15-30m | 50-100m | 100-200 mW | 1-600 Mbps | Video, high throughput |
| BLE 5.0 | 2.4 GHz | 10-30m | 50-100m | 1-10 mW | 1-2 Mbps | Low power, phone pairing |
| Zigbee | 2.4 GHz | 10-20m | 75-100m | 1-20 mW | 250 kbps | Mesh networks, home automation |
| Z-Wave | 908 MHz (US) | 10-30m | 100m | 1-25 mW | 100 kbps | Home automation, low interference |
| LoRa | 868/915 MHz | 100-500m | 2-15 km | 10-100 mW | 0.3-50 kbps | Long range, low power, rural |
| Thread | 2.4 GHz | 10-30m | 50-100m | 1-20 mW | 250 kbps | IP-based mesh, Matter compatible |
| LTE-M | Licensed bands | N/A | Cellular coverage | 200 mW | 1 Mbps | Cellular IoT, mobile assets |
| NB-IoT | Licensed bands | N/A | Cellular coverage | 200 mW | 100 kbps | Deep indoor, low power cellular |

### Power Budget Template

| Component | Active Current | Sleep Current | Duty Cycle | Avg Current |
|-----------|---------------|--------------|-----------|-------------|
| MCU | 5-50 mA | 1-10 uA | Varies | Calculate per use case |
| Radio (TX) | 15-300 mA | 1-5 uA | Per TX interval | Dominant consumer |
| Radio (RX) | 10-50 mA | 1-5 uA | Per RX window | |
| Sensors | 0.1-50 mA | 0.1-10 uA | Per sample rate | |
| LED indicators | 5-20 mA | 0 | Per blink pattern | |
| Voltage regulator | 5-20 uA quiescent | 1-5 uA | Always on | Quiescent = baseline |

**Battery Life Estimation:**
```
Hours = Battery_mAh / Average_Current_mA
Days = Hours / 24
```
**Target: 1+ year on 2x AA (3000 mAh) for most IoT sensors**

## Compliance Standards

### EMC and RF

| Standard | Scope | Key Requirements | Lead Time |
|----------|-------|-----------------|-----------|
| FCC Part 15 Class B | Unintentional radiator (residential) | Conducted (150 kHz-30 MHz), radiated (30 MHz-1 GHz) emissions | 4-8 weeks |
| FCC Part 15.247 | Intentional radiator (WiFi/BLE/Zigbee) | Power limits, spurious emissions, frequency stability | 6-12 weeks |
| FCC Part 15.249 | Low-power transmitters (Sub-GHz) | Field strength limits, bandwidth requirements | 4-8 weeks |
| CE RED (2014/53/EU) | EU radio equipment directive | Safety, EMC, spectrum efficiency | Part of CE package |
| IC RSS-247 | Canadian wireless | Similar to FCC Part 15.247 | 4-8 weeks |

### Safety and Flammability

| Standard | Scope | Key Requirements | Lead Time |
|----------|-------|-----------------|-----------|
| UL 94 | Plastic flammability | V-0 (self-extinguish <10s), V-1 (<30s), V-2 (<30s, drips), HB (slow burn) | Material certification |
| UL 60950-1 / 62368-1 | IT equipment safety | Energy hazard classification, insulation, grounding | 8-16 weeks |
| IEC 61010-1 | Measurement/control equipment | Safety for industrial/lab devices | 8-16 weeks |
| EN 60079 (ATEX) | Explosive atmospheres | Intrinsic safety, flameproof enclosure (if applicable) | 16-24 weeks |

### Ingress Protection

| Rating | Dust | Water | IoT Use Case |
|--------|------|-------|-------------|
| IP20 | Protected against >12.5mm objects | None | Indoor sensors, DIN rail modules |
| IP40 | Protected against >1mm objects | None | Indoor hubs, gateways |
| IP54 | Dust protected | Splash proof | Sheltered outdoor, garage |
| IP65 | Dust tight | Low-pressure water jets | Outdoor sensors, signage |
| IP67 | Dust tight | 1m immersion, 30 min | Ground-level outdoor, agricultural |
| IP68 | Dust tight | Continuous immersion (per spec) | Submerged sensors, water quality |

### Environmental Ratings (NEMA)

| Rating | Description | Equivalent IP | Typical Use |
|--------|-------------|--------------|-------------|
| NEMA 1 | Indoor, general purpose | ~IP20 | Office/indoor hubs |
| NEMA 3R | Outdoor, rain/sleet protected | ~IP14 | Utility meters, outdoor boxes |
| NEMA 4 | Outdoor, watertight | ~IP65 | Outdoor industrial sensors |
| NEMA 4X | NEMA 4 + corrosion resistant (SS/fiberglass) | ~IP66 | Chemical/marine environments |
| NEMA 12 | Indoor, drip/dust tight | ~IP52 | Industrial control panels |

---

<!-- tier:comprehensive -->

## Advanced Materials

### Specialty Substrates

#### Rogers RO4003C (High-Frequency PCB)

| Property | Value | Unit |
|----------|-------|------|
| Dielectric Constant (Er) | 3.38 +/- 0.05 | (at 10 GHz) |
| Loss Tangent | 0.0027 | (at 10 GHz) |
| Thermal Conductivity | 0.71 | W/m-K |
| CTE (Z-axis) | 46 | ppm/C |
| Standard Thicknesses | 0.203, 0.305, 0.508, 0.813 | mm |
| Cost Class | $$$$ | (5-10x FR-4) |
| Typical Applications | mmWave radar, GPS front-end, RF filters | |
| Processability | Standard FR-4 compatible | (same fabrication process) |

#### Ceramic Substrate (LTCC / HTCC)

| Property | Value | Unit |
|----------|-------|------|
| Dielectric Constant | 5.0-9.0 | (LTCC), 9-10 (HTCC/alumina) |
| Thermal Conductivity | 2-3 (LTCC), 20-25 (alumina) | W/m-K |
| Max Operating Temp | 350 (LTCC), 1000+ (alumina) | C |
| Typical Applications | Millimeter-wave modules, harsh-environment electronics | |
| Cost Class | $$$$ | (very high -- specialized fab) |

### Conformal Coating Types

| Type | Chemistry | Thickness | Temperature Range | Rework | Best For |
|------|-----------|-----------|-------------------|--------|----------|
| Acrylic (AR) | Acrylic resin | 25-75 um | -65 to +125 C | Easy (solvent) | General purpose, easy rework |
| Silicone (SR) | Silicone rubber | 50-200 um | -65 to +200 C | Moderate | Wide temp range, vibration damping |
| Polyurethane (UR) | Polyurethane | 25-75 um | -65 to +125 C | Difficult | Chemical resistance, humidity |
| Epoxy (ER) | Epoxy resin | 25-50 um | -65 to +150 C | Very difficult | Abrasion resistance, hard surface |
| Parylene (XY) | Poly-para-xylylene | 5-50 um | -65 to +150 C | Not practical | Ultra-thin, pinhole-free, medical |

## EMI/EMC Design Guidelines

### PCB-Level EMI Mitigation

| Technique | Implementation | Effectiveness |
|-----------|---------------|---------------|
| Ground plane | Continuous copper on layer 2 (4-layer) or layers 2+3 (6-layer) | High -- foundational |
| Decoupling capacitors | 100nF + 10uF per power pin, close to IC | High -- reduces conducted emissions |
| Ferrite beads | On power lines, data lines at board edge | Medium -- suppresses high-freq noise |
| Guard traces | Grounded traces flanking sensitive signals | Medium -- reduces crosstalk |
| Via stitching | Ground vias along board edge at lambda/20 spacing | Medium -- prevents edge radiation |
| Component placement | Noisy (switching) away from sensitive (analog) | High -- prevent coupling |
| Clock routing | Short traces, avoid layer changes, series termination | High -- clocks are primary EMI source |

### Enclosure-Level Shielding

| Method | Shielding Effectiveness | Cost | Notes |
|--------|------------------------|------|-------|
| Metal enclosure (aluminum) | 40-80 dB | $$$ | Best overall shielding |
| Conductive paint (copper/nickel) | 30-60 dB | $$ | Applied to plastic enclosure interior |
| Conductive gasket (EMI) | 40-70 dB (at seams) | $$ | Beryllium copper, conductive elastomer |
| Board-level shield (can) | 30-50 dB | $ | Stamped metal over noisy sections |
| Ferrite sleeve (cable) | 10-25 dB | $ | Snap-on or integral |
| Filtered connectors | 40-60 dB | $$-$$$ | Pi-filter or C-filter integrated |

## Protocol-Specific Hardware Considerations

### LoRa/LoRaWAN

| Parameter | Guideline | Notes |
|-----------|-----------|-------|
| Antenna Impedance | 50 ohm matched | Use impedance matching network (LC pi) |
| Crystal Accuracy | +/- 10 ppm | Temperature-compensated (TCXO) preferred |
| TX Power | +14 dBm (EU), +20-30 dBm (US) | Check regional regulations |
| Sensitivity | -137 dBm (SF12, 125 kHz BW) | Best-case, degrades with SF |
| Module Options | Semtech SX1276/SX1262, Murata CMWX1ZZABZ | Pre-certified modules simplify compliance |

### Matter/Thread

| Parameter | Guideline | Notes |
|-----------|-----------|-------|
| Radio | 802.15.4 (Thread) on 2.4 GHz | BLE for commissioning |
| MCU + Radio | Nordic nRF52840, Silicon Labs EFR32MG | OpenThread SDK support |
| Memory | 512KB+ Flash, 256KB+ RAM | Matter stack is large |
| Certification | CSA Matter certification required | Alliance membership needed |

## Power Supply Design

### Common Topologies

| Topology | Input Range | Output | Efficiency | Use Case |
|----------|-----------|--------|------------|----------|
| Linear (LDO) | Vin > Vout + 0.3V | Fixed | 50-80% (Vout/Vin) | Low noise, small load |
| Buck (Step-Down) | Vin > Vout | 1.2-24V | 85-95% | Main power rail |
| Boost (Step-Up) | Vin < Vout | 3.3-48V | 80-92% | Battery to rail |
| Buck-Boost | Vin <> Vout | Various | 80-90% | Battery spanning target V |
| Flyback | AC mains | Isolated DC | 75-85% | AC-DC conversion |
| USB PD | 5-20V input | Per negotiation | 90%+ | USB-C powered devices |
