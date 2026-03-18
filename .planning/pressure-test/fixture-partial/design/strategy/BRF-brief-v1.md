# Design Brief — Tide

**Product:** Tide — Marine Biology Field Research Platform
**Version:** 1.0
**Type:** SaaS Platform
**Target Users:** Coastal ecologists, marine biologists, field researchers at universities and environmental agencies

---

## Product Vision

Tide is a field research data management platform purpose-built for coastal ecologists and marine biologists conducting systematic surveys of intertidal zones, kelp forests, and estuarine ecosystems. Researchers spend hours in the field collecting specimen counts, environmental readings, and photographic documentation — then return to poorly organized spreadsheets and disconnected photo libraries. Tide unifies data collection, species identification, tidal cycle correlation, and reporting into a single platform designed around the rhythms of fieldwork.

The platform's core thesis: field research data has inherent spatial and temporal structure (GPS coordinates, tidal stage, time of year, species distribution) that flat tabular tools ignore. Tide makes that structure visible and analytically useful.

## Primary Users

**Field Ecologist (primary):** Conducts 2-4 field surveys per month at designated research sites. Needs rapid data entry with minimal friction (hands are often wet or gloved), species identification assistance, and automatic tidal cycle correlation. Works across iOS/Android in the field and desktop back at the lab.

**Research Lead (secondary):** Oversees multiple field ecologists across a study region. Reviews aggregated data for pattern detection, produces reports for funding bodies, and monitors data quality across the team. Desktop-first.

**Data Analyst (tertiary):** Queries the dataset for statistical analysis exports, biodiversity indices, and longitudinal trend reports. Primarily uses export features and API access.

## Key Workflows

1. **Site Setup:** Define research sites with GPS boundaries, habitat classification (rocky intertidal, sandy beach, estuary), and monitoring protocol. Assign species target lists per habitat type.

2. **Field Data Entry:** Rapid transect recording — species ID (with AI-assisted photographic ID), count, substrate type, behavioral observations. Auto-populated with current tidal stage from NOAA tide table integration.

3. **Specimen Gallery:** Geotagged photo library organized by species, site, and survey date. Annotate photos with ID confidence, collection notes, and observer initials.

4. **Tidal Correlation View:** Time-series visualization of species occurrence data overlaid on tidal cycle. The signature feature — reveals whether a species distribution shifts with tide stage in ways not visible in flat tables.

5. **Report Generation:** Automated biodiversity index calculations (Shannon-Weaver, Simpson's) with trend comparisons across survey periods.

## Aesthetic Direction

Tide's visual language must derive from its subject matter rather than generic SaaS conventions. The intertidal zone has a specific palette: saturated ocean blues and teals in OKLCH space (not the desaturated corporate "sky blue"), tide pool greens with algae undertones, wet sand warm neutrals, and the specific orange-pink of exposed sea stars. Typography should carry the precision of scientific notation — a condensed technical face for data labels and measurements, paired with a humanist serif for narrative content (field notes, habitat descriptions).

Spatial composition should reflect the irregularity of natural coastlines. Perfect grid symmetry is wrong for this product. Transect diagrams, site maps, and species distribution charts should feel situated in nature, not in a dashboard template.

Motion design should reference tidal rhythms — the slow oscillation of buoyancy, the pulse of wave action — rather than the snappy micro-interactions of fintech dashboards.
