# Individual Contribution Report

**Project:** Temporal Network Explorer
**Contributor:** Ukashah
**Role (Listed):** Backend Developer
**Actual Role:** Frontend Developer (entire frontend)
**Date:** May 2026

---

## Project Overview

Temporal Network Explorer is a full-stack web application for uploading, analysing, and visualising temporal network data. Users can upload CSV-based network datasets, trigger analysis jobs, and explore how network structures evolve over time through interactive graphs, metric dashboards, and community detection views.

---

## Summary of Individual Contribution

Although listed as a Backend Developer in the project team section, **Ukashah was solely responsible for designing and implementing the entire frontend** of the application. This includes all pages, UI components, visualisation layers, state management, and client-side API integration.

---

## Detailed Contributions

### 1. Application Pages

| Page               | File                                             | Description                                                                             |
| ------------------ | ------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Landing / Home     | `app/page.tsx`                                   | Feature showcase with animated CTAs, technology highlights, and team section            |
| File Upload        | `app/upload/page.tsx`                            | Full upload workflow with drag-and-drop, upload progress tracking, and metadata preview |
| Analysis Dashboard | `app/dashboard/page.tsx` + `DashboardClient.tsx` | Main analysis view with Suspense boundary and loading fallback                          |
| Communities        | `app/communities/page.tsx`                       | Community overview page                                                                 |
| Login / Register   | `app/login/page.tsx`, `app/register/page.tsx`    | Authentication pages                                                                    |

---

### 2. Data Visualisation Components

All visualisations were built from scratch using **D3.js v7**:

- **`NetworkGraph.tsx`** — Force-directed graph using D3 simulation with:
  - Configurable charge, link distance, center, and collision forces
  - Node colouring by group (4 colour scale)
  - Interactive node selection on click

- **`TemporalNetworkGraph.tsx`** — Wrapper over `NetworkGraph` that maps temporal data to D3 nodes:
  - Computes node size from degree and centrality scores
  - Groups nodes by role (hub, connector, peripheral)
  - Plays back network evolution frame by frame

- **`TimeSeriesChart.tsx`** — Area/line chart for plotting metrics over time:
  - SVG gradient fill
  - Hover tooltip interactions

- **`BarChart.tsx`** — Category bar chart:
  - D3 band scale layout
  - Hover colour transitions

- **`HeatmapView.tsx`** — Node-to-node interaction matrix:
  - Blue intensity colour scale
  - Hover interactions for value display

---

### 3. Metrics & Analysis UI

- **`MetricsDashboard.tsx`** — Multi-tab metrics panel displaying:
  - Network density, node/edge counts, clustering coefficient
  - Centrality metrics, temporal trends, structural properties
  - **Excel export** (multi-sheet: summary, time windows, nodes, edges, communities, metrics) via `xlsx`

- **`NodeDetails.tsx`** — Per-node detail panel (selected node info, centrality scores)
- **`StatisticsPanel.tsx`** — Summary statistics panel
- **`CommunityOverview.tsx`** — Community list with bar chart by size and CSV export

---

### 4. Interactive Controls

- **`FileUpload.tsx`** — Drag-and-drop file uploader:
  - 2 GB file size validation
  - Column mapping dialog integration
  - Auto-mapping suggestions from upload response

- **`FilterPanel.tsx`** — Live graph filtering:
  - Min/max degree and edge weight sliders
  - Node ID search
  - Toggle isolated nodes and labels
  - Community filter checkboxes

- **`TimeControls.tsx`** — Temporal playback bar:
  - Play / pause / skip forward / skip backward
  - Speed selector (0.5× – 4×)
  - Time position slider with percentage indicator

- **`ColumnMappingDialog.tsx`** — UI for mapping CSV columns to source/target/timestamp/weight roles
- **`AnimationControl.tsx`** — Additional animation configuration controls

---

### 5. Layout & Navigation

- **`components/header.tsx`** — Responsive top navigation with mobile menu, theme toggle
- **`components/logo.tsx`** — Logo component
- **`components/user-menu.tsx`** — User account dropdown (avatar, logout)
- **`components/dashboard/Header.tsx`** — Dashboard-specific header with live status indicators and metrics pills
- **`components/dashboard/Sidebar.tsx`** — Sidebar with playback controls

---

### 6. Landing Page Sections

- **`hero-section.tsx`** — Animated hero banner
- **`features-3.tsx`** — Feature cards with icon highlights
- **`team.tsx`** — Team member grid with GitHub avatars and roles
- **`UploadAndAnalyze.jsx`** — Inline upload/analyse demo widget

---

### 7. State Management (Frontend)

Designed and implemented the Zustand store architecture:

- **`lib/stores/network-store.ts`** — Core analysis state:
  - Tracks file ID, task ID, analysis status, time windows, playback state, and filters
  - Actions: `setFile`, `setFileId`, `setTaskId`, `setStatus`, `setTimeWindows`, `setCurrentTimeIndex`, `setIsPlaying`, `setPlaybackSpeed`, `setFilters`, `setSelectedNode`, `reset`
  - Derived getters: `getCurrentTimeWindow()`, `getActiveNodes()`, `getActiveEdges()`, `getNodeMetrics()`

- **`lib/stores/auth-store.ts`** — Authentication state (login/logout/token management)
- **`lib/stores/ui-stores.ts`** — Reserved UI state store

---

### 8. Client-Side API Integration

- **`lib/api/client.ts`** — Typed API client:
  - TypeScript interfaces for `NetworkNode`, `NetworkEdge`, `UploadResponse`, `AnalysisStatus`, `VisualizationData`, `TimeWindow`, and community types
  - Functions for upload, trigger analysis, and polling analysis status

- **`lib/api/auth.ts`** — Auth API client:
  - Axios instance with auth header injection via interceptors
  - Auto-logout on 401 responses
  - `localStorage`-based token storage

- **`lib/api/websocket.ts`** — WebSocket client for real-time analysis status updates

---

### 9. Utility Libraries

- **`lib/utils/data-processor.ts`** — Data transformation:
  - `smartSample()`: Retains first 30% + last 30% + random 40% of large datasets
  - `aggregateByTimeWindow()`: Groups edges by hour / day / week
  - `optimizeNetworkData()`: Trims nodes and edges to stay within render limits

- **`lib/utils/network.ts`** — Network metrics:
  - Degree centrality (normalised)
  - Betweenness centrality (sampled approximation)
  - Closeness, eigenvector, PageRank

- **`lib/utils/export.ts`** — Data export utilities:
  - Multi-sheet Excel export
  - CSV blob download

- **`lib/utils/date.ts`**, **`formatter.ts`**, **`formatters.ts`** — Date and number formatting helpers
- **`lib/utils.ts`** — Tailwind class merging (`cn()` with `clsx` + `tailwind-merge`)

---

### 10. TypeScript Type System

Defined the full type system in **`lib/types/index.ts`**:

- Core graph types: `Node`, `Edge`, `Community`, `CommunityEdge`, `TimeWindow`
- Higher-level types: `TemporalNetwork`, `CommunityVisualizationData`
- Application state types: `Metrics`, `AnalysisState`

---

### 11. Web Worker

- **`lib/workers/network-metrics.worker.ts`** — Offloads expensive network metric calculations to a background thread to prevent UI blocking during large dataset processing.

---

### 12. UI Component Library (shadcn/ui customisation)

Configured and customised the shadcn/ui component set (`components/ui/`):
`alert`, `animated-group`, `badge`, `button`, `card`, `dialog`, `dropdown-menu`, `input`, `label`, `progress`, `select`, `slider`, `switch`, `tabs`, `text-effect`

---

### 13. Application Providers & Theme

- **`auth-provider.tsx`** — React context for authentication state
- **`query-provider.tsx`** — TanStack React Query global provider
- **`theme-provider.tsx`** — next-themes dark/light mode provider
- **`ThemeToggleButton.tsx`** — Toggle button wired to theme provider

---

### 14. Project Configuration

- **`next.config.ts`** — Next.js configuration (image remote patterns, runtime settings)
- **`tsconfig.json`** — TypeScript config with `@/` path alias
- **`components.json`** — shadcn/ui component registry config
- **`postcss.config.mjs`** — PostCSS + Tailwind CSS v4 pipeline
- **`Dockerfile`** — Container configuration for deployment

---

## Technologies Used

| Category         | Technologies                            |
| ---------------- | --------------------------------------- |
| Framework        | Next.js 16, React 19                    |
| Language         | TypeScript                              |
| Visualisation    | D3.js v7, deck.gl                       |
| Styling          | Tailwind CSS v4, Framer Motion / Motion |
| UI Components    | Radix UI, shadcn/ui, Lucide React       |
| State Management | Zustand, Immer                          |
| Data Fetching    | TanStack React Query, Axios             |
| Export           | xlsx (Excel), CSV                       |
| Date/Time        | date-fns, moment                        |
| Other            | pako (compression), Lodash              |

---

## Key Technical Achievements

1. **Custom D3 force-directed graph** with real-time temporal playback and smooth node/edge transitions as the network evolves over time.
2. **Smart data sampling algorithm** that preserves network trends at scale (handles up to 2,000 time windows and 250,000 total edges).
3. **Off-main-thread metric computation** via Web Workers, ensuring the UI remains responsive during computationally expensive centrality calculations.
4. **Multi-sheet Excel export** covering summary statistics, time-window snapshots, node/edge lists, community data, and metric timelines in a single file.
5. **Fully typed frontend** — comprehensive TypeScript interfaces covering all graph, analysis, and state types, enabling safe integration with the backend API.
