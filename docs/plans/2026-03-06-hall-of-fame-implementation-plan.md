# Hall of Fame + GitHub Deployment — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Hall of Fame page showing KC's most neglected potholes, add site navigation, set up GitHub repo with Actions deploying to S3/CloudFront at kcstreets.com.

**Architecture:** New static HTML page with its own JS file that fetches two SODA API queries on load. Shared CSS and nav header across both pages. GitHub Actions workflow deploys to S3 on push to main, with CloudFront invalidation.

**Tech Stack:** Same vanilla HTML/CSS/JS stack. GitHub Actions + AWS CLI for deployment.

**Design doc:** `docs/plans/2026-03-06-hall-of-fame-design.md`

---

### Task 1: Add Navigation Header to Both Pages

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`

**Step 1: Add a nav element at the top of `<body>` in `index.html`, before `<div id="app">`**

```html
<nav id="site-nav">
  <a href="index.html" class="nav-link active">Pothole Lookup</a>
  <a href="hall-of-fame.html" class="nav-link">Hall of Fame</a>
</nav>
```

**Step 2: Add nav CSS to `css/style.css`**

```css
/* Site navigation */
#site-nav {
  display: flex;
  gap: 4px;
  padding: 8px 16px;
  background: #212529;
}
.nav-link {
  color: #adb5bd;
  text-decoration: none;
  padding: 6px 14px;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
}
.nav-link:hover { color: #fff; background: #343a40; }
.nav-link.active { color: #fff; background: #0d6efd; }
```

**Step 3: Adjust `#app` height to account for nav**

The current CSS has `#app { height: 100vh; }`. Change to:

```css
#site-nav + #app { height: calc(100vh - 42px); }
```

(42px = nav height with padding. Adjust if needed after visual check.)

**Step 4: Verify**

Open index.html — nav bar at top with "Pothole Lookup" active and "Hall of Fame" link. Map and search still work correctly below it.

**Step 5: Commit**

```bash
git add index.html css/style.css
git commit -m "feat: add site navigation header

Dark nav bar with links between Pothole Lookup and Hall of Fame pages."
```

---

### Task 2: Create Hall of Fame Page

**Files:**
- Create: `hall-of-fame.html`
- Create: `js/hall-of-fame.js`
- Modify: `css/style.css` (add hall-of-fame-specific styles)

**Step 1: Create `hall-of-fame.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Kansas City's most neglected potholes — longest open and slowest to resolve 311 reports.">
  <title>KC Streets — Hall of Fame</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <nav id="site-nav">
    <a href="index.html" class="nav-link">Pothole Lookup</a>
    <a href="hall-of-fame.html" class="nav-link active">Hall of Fame</a>
  </nav>

  <div id="hof-page">
    <header class="hof-header">
      <h1>Pothole Hall of Fame</h1>
      <p class="subtitle">Kansas City's most neglected potholes, ranked by the data.</p>
    </header>

    <section class="hof-section">
      <h2>Still Waiting — Longest Currently Open</h2>
      <p class="section-desc">Open pothole reports that haven't been resolved yet, ranked by how long they've been waiting.</p>
      <div id="open-loading" class="loading">Loading...</div>
      <div id="open-error" class="error-message hidden"></div>
      <div class="table-wrapper">
        <table id="open-table" class="hof-table hidden">
          <thead>
            <tr>
              <th>#</th>
              <th>Address</th>
              <th>Days Open</th>
              <th>Date Reported</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </section>

    <section class="hof-section">
      <h2>Hall of Shame — Slowest Ever Resolved</h2>
      <p class="section-desc">Resolved pothole reports that took the longest to close.</p>
      <div id="resolved-loading" class="loading">Loading...</div>
      <div id="resolved-error" class="error-message hidden"></div>
      <div class="table-wrapper">
        <table id="resolved-table" class="hof-table hidden">
          <thead>
            <tr>
              <th>#</th>
              <th>Address</th>
              <th>Days to Close</th>
              <th>Date Reported</th>
              <th>Date Resolved</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </section>
  </div>

  <script src="js/hall-of-fame.js"></script>
</body>
</html>
```

**Step 2: Create `js/hall-of-fame.js`**

```javascript
'use strict';

const SODA_BASE = 'https://data.kcmo.org/resource/d4px-6rwg.json';

function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function parseAdditionalQuestions(raw) {
  if (!raw) return '';
  try {
    const obj = JSON.parse(raw);
    return Object.entries(obj)
      .map(([k, v]) => `${escapeHtml(k)}: ${escapeHtml(v)}`)
      .join('; ');
  } catch {
    return escapeHtml(raw);
  }
}

function daysBetween(dateStr) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

async function fetchAndRender(query, tableId, loadingId, errorId, renderRow) {
  const loading = document.getElementById(loadingId);
  const error = document.getElementById(errorId);
  const table = document.getElementById(tableId);

  try {
    const response = await fetch(`${SODA_BASE}?${query}`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();

    loading.classList.add('hidden');

    if (data.length === 0) {
      error.textContent = 'No records found.';
      error.classList.remove('hidden');
      return;
    }

    table.classList.remove('hidden');
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = data.map((r, i) => renderRow(r, i + 1)).join('');
  } catch (err) {
    loading.classList.add('hidden');
    error.textContent = 'Unable to fetch data. Please try again later.';
    error.classList.remove('hidden');
  }
}

// --- Still Waiting: longest currently open ---
const openParams = new URLSearchParams({
  '$where': "issue_type='A Pothole' AND current_status='received'",
  '$order': 'open_date_time ASC',
  '$limit': '50',
  '$select': 'reported_issue,open_date_time,incident_address,issue_sub_type,additional_questions'
});

fetchAndRender(openParams.toString(), 'open-table', 'open-loading', 'open-error', (r, rank) => {
  const daysOpen = r.open_date_time ? daysBetween(r.open_date_time) : 'N/A';
  const date = r.open_date_time ? new Date(r.open_date_time).toLocaleDateString() : 'N/A';
  const details = [
    r.issue_sub_type || '',
    parseAdditionalQuestions(r.additional_questions)
  ].filter(Boolean).join(' — ');

  return `<tr>
    <td>${rank}</td>
    <td>${escapeHtml(r.incident_address || 'N/A')}</td>
    <td class="days-cell">${daysOpen}</td>
    <td>${date}</td>
    <td>${escapeHtml(details)}</td>
  </tr>`;
});

// --- Hall of Shame: slowest ever resolved ---
const resolvedParams = new URLSearchParams({
  '$where': "issue_type='A Pothole' AND current_status='resolved'",
  '$order': 'days_to_close DESC',
  '$limit': '50',
  '$select': 'reported_issue,open_date_time,resolved_date,days_to_close,incident_address,issue_sub_type,additional_questions'
});

fetchAndRender(resolvedParams.toString(), 'resolved-table', 'resolved-loading', 'resolved-error', (r, rank) => {
  const openDate = r.open_date_time ? new Date(r.open_date_time).toLocaleDateString() : 'N/A';
  const resolvedDate = r.resolved_date ? new Date(r.resolved_date).toLocaleDateString() : 'N/A';
  const details = [
    r.issue_sub_type || '',
    parseAdditionalQuestions(r.additional_questions)
  ].filter(Boolean).join(' — ');

  return `<tr>
    <td>${rank}</td>
    <td>${escapeHtml(r.incident_address || 'N/A')}</td>
    <td class="days-cell">${r.days_to_close || 'N/A'}</td>
    <td>${openDate}</td>
    <td>${resolvedDate}</td>
    <td>${escapeHtml(details)}</td>
  </tr>`;
});
```

**Step 3: Add hall-of-fame CSS to `css/style.css`**

```css
/* Hall of Fame page */
#hof-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 24px;
}
.hof-header { margin-bottom: 32px; }
.hof-header h1 { font-size: 1.8rem; margin-bottom: 4px; }
.hof-section { margin-bottom: 40px; }
.hof-section h2 { font-size: 1.2rem; margin-bottom: 4px; }
.section-desc { color: #666; font-size: 0.85rem; margin-bottom: 16px; }
.hof-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.hof-table th {
  text-align: left;
  padding: 8px;
  border-bottom: 2px solid #dee2e6;
  white-space: nowrap;
}
.hof-table td { padding: 8px; border-bottom: 1px solid #f0f0f0; }
.hof-table tr:hover { background: #f8f9fa; }
.days-cell { font-weight: 700; }
.loading { color: #666; font-style: italic; padding: 16px 0; }
```

**Step 4: Verify**

Open hall-of-fame.html in browser. Both tables should populate with data. "Still Waiting" shows open potholes with computed days open. "Hall of Shame" shows resolved potholes with highest days_to_close.

**Step 5: Commit**

```bash
git add hall-of-fame.html js/hall-of-fame.js css/style.css
git commit -m "feat: add Hall of Fame page

Two ranked tables: longest currently open potholes and
slowest ever resolved. Data fetched from SODA API on page load."
```

---

### Task 3: GitHub Repository + Actions Deployment

**Files:**
- Create: `.github/workflows/deploy.yml`

**Step 1: Initialize GitHub repo**

```bash
gh repo create kcstreets --public --source=. --remote=origin
git push -u origin master
```

(If user already has a repo or prefers private, adjust accordingly.)

**Step 2: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy to S3

on:
  push:
    branches: [master]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Sync to S3
        run: |
          aws s3 sync . s3://${{ secrets.S3_BUCKET }} \
            --delete \
            --exclude ".git/*" \
            --exclude ".github/*" \
            --exclude "docs/*" \
            --exclude "prompt-initial-*" \
            --exclude ".gitignore" \
            --exclude ".claude/*"

      - name: Invalidate CloudFront cache
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*"
```

**Step 3: Document required GitHub secrets**

The user needs to configure these in GitHub repo Settings > Secrets:

- `AWS_ROLE_ARN` — IAM role ARN for OIDC (or use `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` instead)
- `S3_BUCKET` — the S3 bucket name for kcstreets.com
- `CLOUDFRONT_DISTRIBUTION_ID` — the CloudFront distribution ID

**Step 4: Commit and push**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add GitHub Actions workflow for S3 deployment

Syncs static files to S3 and invalidates CloudFront on push to master.
Requires AWS_ROLE_ARN, S3_BUCKET, and CLOUDFRONT_DISTRIBUTION_ID secrets."
git push
```

**Step 5: Verify**

Check GitHub Actions tab — workflow should trigger. If AWS secrets aren't set yet, it will fail (expected). Once secrets are configured, re-run.

---

## AWS Setup Notes (for the user)

Before the GitHub Actions workflow will succeed, the user needs:

1. **S3 bucket** configured for static website hosting
2. **CloudFront distribution** pointing to the S3 bucket, with kcstreets.com as alternate domain
3. **ACM SSL certificate** for kcstreets.com (in us-east-1)
4. **Route 53** A record aliased to CloudFront distribution
5. **IAM role** with OIDC trust for GitHub Actions, with permissions to:
   - `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket` on the bucket
   - `cloudfront:CreateInvalidation` on the distribution

---

## Summary

| Task | Description | Dependencies |
|------|-------------|-------------|
| 1 | Navigation header on both pages | None |
| 2 | Hall of Fame page (HTML + JS + CSS) | Task 1 |
| 3 | GitHub repo + Actions deployment | Task 2 |
