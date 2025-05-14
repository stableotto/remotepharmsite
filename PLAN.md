# Job Board Project Plan

This document outlines the plan of action for building a job board using Astro, with data sourced from Google Sheets and hosted on Cloudflare Pages. The goal is to have job listings update daily without requiring a manual redeploy.

## 1. Project Setup

*   **Initialize Astro Project**:
    *   Use `npm create astro@latest` (or `yarn create astro`, `pnpm create astro`).
    *   Choose a starting template (e.g., "Empty" or a basic blog template if it helps).
    *   Set up basic project structure (directories for `src/components`, `src/pages`, `src/layouts`).
*   **Version Control**:
    *   Initialize a Git repository.
    *   Create an initial commit.
*   **Cloudflare Pages Setup (Initial)**:
    *   Create a Cloudflare account if you don't have one.
    *   Connect your Git repository (e.g., GitHub, GitLab) to Cloudflare Pages.
    *   Configure build settings for Astro (usually auto-detected, but good to verify).

## 2. Core UI Components

We'll need components to display job information consistently.

*   **`JobListItem.astro`**:
    *   **Props**: `title`, `location`, `salary`, `datePosted`, `companyName`, `jobId` (or link to detail page).
    *   **Display**: Shows a summary of the job on the main listing page.
    *   Clickable, leading to the job detail page.
*   **`JobDetailView.astro`** (or a dynamic page `[jobId].astro`):
    *   **Props/Data Source**: Fetches full job details based on an ID.
    *   **Display**:
        *   `title`
        *   `location`
        *   `salary`
        *   `datePosted`
        *   `companyName`
        *   `description` (rich text or Markdown if possible)
        *   `applyButton` (links to an external application URL)

## 3. Data Source - Google Sheets

The job data will reside in a Google Sheet.

*   **Sheet Structure**:
    *   Define columns: `jobId` (unique), `title`, `location`, `salary`, `datePosted`, `companyName`, `description`, `applyLink`.
    *   Ensure `datePosted` is in a consistent format.
*   **Accessing Data**:
    *   **Option 1: Google Sheets API + Cloudflare Worker**:
        *   Enable the Google Sheets API in your Google Cloud Project.
        *   Create service account credentials (JSON key) to access the sheet programmatically.
        *   Store credentials securely (e.g., Cloudflare Worker secrets).
        *   The Worker will fetch data from the sheet.
    *   **Option 2: Google Apps Script + Web App (JSON Endpoint)**:
        *   Write a Google Apps Script attached to your sheet.
        *   The script will have a `doGet()` function that reads the sheet data and returns it as JSON.
        *   Deploy the script as a web app, making it accessible via a URL. This URL will be our data endpoint.
        *   Secure the endpoint if necessary (e.g., with a secret key passed as a query parameter, checked by the script).

    *Chosen approach will be determined based on complexity and security preferences. Option 2 might be simpler for read-only public data.*

## 4. Dynamic Data Fetching & Serving

The key is to fetch data at runtime or at regular intervals without a full site rebuild/redeploy.

*   **Cloudflare Worker for Data Fetching**:
    *   Create a Cloudflare Worker.
    *   This worker will:
        1.  Fetch data from Google Sheets (using the chosen method from Section 3).
        2.  Cache the data (e.g., using Cloudflare KV store or Worker cache API) to reduce calls to Google Sheets and improve performance. The cache duration should be around 24 hours or configurable.
        3.  Expose an API endpoint (e.g., `/api/jobs`) that Astro pages can call to get the job listings.
*   **Astro Pages Fetching Data**:
    *   Astro pages (e.g., `src/pages/index.astro` for listings, `src/pages/jobs/[id].astro` for details) will use `fetch()` in their frontmatter script to call the Cloudflare Worker's API endpoint (`/api/jobs`).
    *   This allows data to be fresh without rebuilding the Astro site itself.
    *   For job detail pages, the Worker might need to return a single job by ID, or the Astro page can filter the full list.

## 5. Page Structure & Routing (Astro)

*   **`src/pages/index.astro`**:
    *   Fetches all jobs from the `/api/jobs` endpoint.
    *   Uses the `JobListItem.astro` component to render each job.
    *   Implements pagination if job list is long.
*   **`src/pages/jobs/[jobId].astro`** (Dynamic Route):
    *   This page will be responsible for displaying the `JobDetailView`.
    *   It will fetch the specific job's data, either by:
        *   Fetching all jobs from `/api/jobs` and filtering by `jobId`.
        *   Querying the `/api/jobs/:jobId` endpoint on the Worker (if implemented).
    *   Renders the job details.

## 6. Styling

*   Choose a styling approach for Astro (e.g., Tailwind CSS, global CSS files, scoped styles).
*   Ensure responsive design for different screen sizes.
*   Focus on readability and ease of use for the job board.

## 7. Deployment to Cloudflare Pages

*   **Astro Build**:
    *   Ensure `astro build` command is correctly configured in `package.json`.
    *   The output directory (usually `dist/`) is what Cloudflare Pages will deploy.
*   **Cloudflare Worker Deployment**:
    *   Deploy the worker separately using Wrangler or the Cloudflare dashboard.
    *   Ensure the worker's route (e.g., `yourdomain.com/api/*`) is correctly configured to handle requests from the Astro site.
*   **Environment Variables/Secrets**:
    *   Configure Google Sheets API keys or Apps Script URL as secrets in the Cloudflare Worker.
    *   If the Astro site needs any build-time environment variables, configure them in Cloudflare Pages settings.

## 8. Automation: Daily Job Sync

*   **Cloudflare Worker Cron Trigger**:
    *   Configure a Cron Trigger for your Cloudflare Worker.
    *   Set it to run once a day (e.g., at midnight).
    *   The cron job will trigger the worker function responsible for:
        1.  Fetching the latest data from Google Sheets.
        2.  Updating the cache (e.g., KV store) with the new data.
    *   This ensures the `/api/jobs` endpoint served by the worker always has relatively fresh data (max 24 hours old).

## 9. Next Steps & Considerations

*   **Error Handling**: Implement robust error handling for API calls, data fetching, etc.
*   **Search & Filtering**: Consider adding search and filtering capabilities to the job board.
*   **SEO**: Optimize Astro pages for search engines (meta tags, sitemap).
*   **Analytics**: Integrate web analytics (e.g., Cloudflare Web Analytics, Google Analytics).
*   **Security**: Review security of the Apps Script endpoint or service account permissions.
*   **Testing**: Write tests for components and data fetching logic.

---

This plan provides a roadmap. We can adjust and elaborate on each section as we proceed.
Let's start with Section 1: Project Setup. 