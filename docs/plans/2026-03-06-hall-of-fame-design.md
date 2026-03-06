# Hall of Fame — Design Document

**Date**: 2026-03-06
**Status**: Approved

## Purpose

A standalone page showcasing KC's most neglected potholes in two ranked sections: currently open longest, and historically slowest to resolve.

## Sections

### Section 1: "Still Waiting" — Longest Currently Open

- Potholes with `current_status='received'` (currently ~185 tickets)
- Ordered by `open_date_time ASC` (oldest first)
- "Days Open" computed client-side: `Math.floor((now - open_date_time) / 86400000)`
- Top 50 entries
- Columns: Rank, Address, Days Open, Date Reported, Details

### Section 2: "Hall of Shame" — Slowest Ever Resolved

- Potholes with `current_status='resolved'`
- Ordered by `days_to_close DESC` (slowest first)
- Top 50 entries
- Columns: Rank, Address, Days to Close, Date Reported, Date Resolved, Details

## Architecture

- New `hall-of-fame.html` — same static approach, shared CSS
- New `js/hall-of-fame.js` — two SODA API fetches on page load
- Navigation header links between index.html and hall-of-fame.html
- No map — just ranked tables

## Queries

```
# Still Waiting
GET https://data.kcmo.org/resource/d4px-6rwg.json
  ?$where=issue_type='A Pothole' AND current_status='received'
  &$order=open_date_time ASC
  &$limit=50
  &$select=reported_issue,open_date_time,incident_address,latitude,longitude,issue_sub_type,additional_questions

# Hall of Shame
GET https://data.kcmo.org/resource/d4px-6rwg.json
  ?$where=issue_type='A Pothole' AND current_status='resolved'
  &$order=days_to_close DESC
  &$limit=50
  &$select=reported_issue,open_date_time,resolved_date,days_to_close,incident_address,latitude,longitude,issue_sub_type,additional_questions
```

## UI

- Shared header/nav with main page
- Two sections, each with a heading and a sortable table
- Loading spinner while data fetches
- Error state if API fails
- Responsive (same breakpoint as main page)
