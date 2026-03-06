# KC Streets Pothole Lookup — Design Document

**Date**: 2026-03-06
**Status**: Approved

## Problem

Kansas City residents who experience vehicle damage from potholes need an easy way to find historical 311 reports for a given location. Currently, searching the city's open data portal requires technical knowledge and doesn't support intuitive location-based searching with radius filtering.

## Solution

A free, static web app that lets users search for pothole 311 tickets near a specific address or map location, with adjustable radius filtering and a summary of pothole reporting history.

## Architecture

**Pure client-side static site** — no backend server required.

| Component | Technology | Cost |
|-----------|-----------|------|
| Frontend | Single HTML file, vanilla JS + CSS | Free |
| Map | Leaflet.js + OpenStreetMap tiles | Free |
| Geocoding | Nominatim (OpenStreetMap) | Free |
| Data Source | SODA API — OpenDataKC | Free |
| Hosting | AWS S3 + CloudFront (kcstreets.com) | ~pennies/month |

### Data Source

- **Dataset**: 311 Call Center Reported Issues
- **Dataset ID**: `d4px-6rwg`
- **Base URL**: `https://data.kcmo.org/resource/d4px-6rwg.json`
- **Key fields**: `issue_type`, `issue_sub_type`, `latitude`, `longitude`, `lat_long` (GeoJSON), `incident_address`, `open_date_time`, `resolved_date`, `current_status`, `days_to_close`, `report_source`
- **Pothole filter**: `issue_type = 'A Pothole'`
- **Geospatial**: SODA API supports `within_circle(lat_long, lat, lng, radius_meters)`
- **CORS**: Supported — direct browser queries work
- **Rate limits**: Unauthenticated uses shared pool; free app token gives 1,000 req/hour

### Data Flow

1. User types address or clicks map location
2. If address: geocode via Nominatim → lat/lng
3. Query SODA API with `within_circle()` and pothole filter
4. Display results on map and in table
5. Compute summary stats client-side

### Primary Query

```
GET https://data.kcmo.org/resource/d4px-6rwg.json
  ?$where=issue_type='A Pothole'
    AND within_circle(lat_long, {lat}, {lng}, {radius_meters})
  &$order=open_date_time DESC
  &$limit=1000
```

### Geocoding

```
GET https://nominatim.openstreetmap.org/search
  ?q={address},Kansas City,MO
  &format=json
  &limit=1
```

## UI Design

### Layout

Single-page app with three areas:

1. **Search Panel** (left/top on mobile)
   - Address text input with search button
   - Radius slider: 10ft to 100ft
   - Results summary: total reports, first/last reported dates, open vs resolved count, avg days to close

2. **Map** (main area)
   - Leaflet + OpenStreetMap
   - Click anywhere to search that location
   - Markers for each pothole report (red = open, green = resolved)
   - Translucent circle showing search radius
   - Popup on marker click with ticket details

3. **Results Table** (below map)
   - Sortable columns: date, status, address, days to close, source
   - Link to original 311 ticket if available

### Responsive

Stacks vertically on mobile: search → map → table.

## Error Handling

- No results → "No pothole reports found within {radius}ft of this location"
- Geocoding fails → "Address not found. Try clicking the map instead."
- API error/rate limit → "Unable to fetch data. Please try again in a moment."

## Approach Rationale

| Approach | Pros | Cons |
|----------|------|------|
| **Static SPA (chosen)** | Zero cost, no backend, simple | No caching, shared rate limits |
| Static + Serverless proxy | Can cache, hide app token | Added complexity, minor cost |
| Full backend + DB | Pre-indexed data, fastest queries | Overkill, hosting cost, maintenance |

Static SPA is the right choice for v1. If rate limits become an issue, a serverless proxy can be added without redesigning.

## Scope

### v1 (this design)

- Single HTML/CSS/JS static site
- Leaflet + OpenStreetMap interactive map
- Address search via Nominatim geocoding
- Click-to-search on map
- Adjustable radius: 10ft–100ft
- SODA API query for pothole 311 tickets within radius
- Map markers color-coded by status + sortable results table
- Summary stats (total reports, date range, resolution times)
- Responsive layout
- Hosted on AWS (S3 + CloudFront) at kcstreets.com

### Future (not in v1)

- Demand letter generation (pre-populated with pothole history)
- Data caching / serverless proxy
- User accounts
