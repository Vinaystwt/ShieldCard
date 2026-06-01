# WAVE5 WORKFLOW REPORT
_Read-only diagnostic. No files modified._

---

## SECTION 1: NAVIGATION AND LAYOUT STRUCTURE

### 1A. Distinct Header/Navbar Components

Two distinct header/navbar components exist:

**1. Inline landing nav** — defined directly in `frontend/app/page.tsx` lines 21–58.
- A plain `<nav>` element, not a reusable component.
- Three links: `#how-it-works` (anchor), `/observer`, `/app` ("Enter App").
- **Used by:** `/` (landing page) only.

**2. `TopBar` component** — `frontend/components/shell/TopBar.tsx`.
- Full sticky header with WordMark, nav links, instance indicator dropdown, "Launch App" CTA, WalletButton, mobile hamburger.
- **Used by:** `/admin`, `/observer`, `/auditor`, `/settlement`, `/verify`, `/app`, `/employee`, `/deploy`, `/how-it-works`, `/about`.

```
grep results for "TopBar":
  frontend/app/admin/page.tsx:10
  frontend/app/observer/page.tsx:7
  frontend/app/auditor/page.tsx:10
  frontend/app/settlement/page.tsx:10
  frontend/app/verify/page.tsx:11
  frontend/app/app/page.tsx:15
  frontend/app/employee/page.tsx (imported)
  frontend/app/deploy/page.tsx:11
  frontend/app/how-it-works/page.tsx:8
  frontend/app/about/page.tsx:8
```

### 1B. Header on Landing Page (/)

`frontend/app/page.tsx` defines its own inline `<nav>` (lines 21–58). It does **not** use `TopBar`.

The inline nav renders:
- Left: `<WordMark size="sm" />`
- Right: "How it works" → `#how-it-works`, "Observer view" → `/observer`, "Enter App" → `/app`

### 1C. Header on /deploy, /admin, /observer

All three use the `<TopBar />` component from `frontend/components/shell/TopBar.tsx`. They are the **same component** with the same nav links: How It Works · Deploy · Observer · About.

### 1D. Landing vs. Inner Page Layout

There is **no route group layout** (no `frontend/app/(app)/layout.tsx` or similar). The single root layout at `frontend/app/layout.tsx` applies to all routes identically. The difference in navigation between `/` and inner pages is handled by the landing page defining its own inline nav rather than using `<TopBar />`.

**Bug:** This means `/` uses the old inline nav with stale links (`#how-it-works`, `/observer`, `/app` → "Enter App"), while every other page uses `TopBar` with updated links (How It Works · Deploy · Observer · About). The two navbars have different visual design and completely different navigation options.

### 1E. Route Inventory (all page.tsx files)

| URL Path | Description |
|---|---|
| `/` | Landing page: HeroSection, LiveStats, ProblemSection, HowItWorks, ThreeActStrip, ArchitectureSection, CtaStrip |
| `/app` | Gateway: wallet connect + role detection → auto-redirect to /admin or /employee, or WelcomeScreen for unknown wallets |
| `/admin` | Admin console: metrics strip, employee mgmt, policy pack manager, vendor panel, request queue with publish/review actions |
| `/observer` | Public observer: pack summary, vendor registry, dept list, request table (sealed amounts) |
| `/auditor` | Auditor workspace: DisclosureGranted-filtered request list, decrypt-to-reveal, side-by-side privacy proof |
| `/settlement` | Settlement vault: pending/approved/settled columns, approve and settle actions |
| `/verify` | Wallet-free verifier: enter request ID → recompute receipt hash → compare on-chain |
| `/employee` | Employee workspace: RequestComposer, own request history, decrypt own results |
| `/deploy` | One-click deploy wizard: prerequisites checklist, 4-step deploy stepper, instance save |
| `/how-it-works` | Static explainer: 3-stage technical walkthrough with Framer Motion |
| `/about` | Static about page: product story, milestones, tech badges, builder bio |

### 1F. TopBar Nav Links

```typescript
const NAV_LINKS = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/deploy",       label: "Deploy" },
  { href: "/observer",     label: "Observer" },
  { href: "/about",        label: "About" },
];
```

Plus a "Launch App" button → `/app`.

---

## SECTION 2: "LAUNCH APP" AND IN-APP NAVIGATION

### 2A. "Launch App" href

`TopBar.tsx` line 157–167:
```tsx
<Link href="/app" ...>Launch App</Link>
```
User is sent to `/app` (the gateway/role-detection page).

### 2B. In-App Navigation from /admin to Settlement/Verify/Auditor

**There are zero links from `/admin` to `/settlement`, `/verify`, or `/auditor`.** The admin page (`frontend/app/admin/page.tsx`) has no navigation links to any sibling route. The only navigation is:
- `TopBar` (links: How It Works, Deploy, Observer, About, Launch App)
- A `Refresh` button (re-fetches data, no navigation)

To reach `/settlement`, `/verify`, or `/auditor`, an admin must:
1. Manually type the URL, OR
2. Use the `DemoGuideOverlay` floating widget (a collapsible step-by-step guide rendered in the root layout via `layout.tsx`), which shows step links including `/auditor`, `/settlement`, `/verify`.

**DemoGuideOverlay** is the only in-app navigation bridge between the inner pages. It is a floating "?" button rendered globally via `layout.tsx` that shows a 6-step guided tour with clickable route links.

### 2C. Role Detection on /app

**Admin detection:**
- `useRoleRouting()` → `useShieldCard()` → `roleQuery`
- `roleQuery.queryFn` calls `publicClient.readContract({ functionName: "admin" })` → gets the `admin` address from the live contract.
- Compares with connected wallet address (case-insensitive).
- **Live contract read. Not hardcoded.**

**Employee detection:**
- Same `roleQuery.queryFn` calls `publicClient.readContract({ functionName: "employeeRegistered", args: [address] })`.
- Returns a boolean from the contract.
- **Live contract read. Not hardcoded.**

**Unknown wallet:**
- `isUnknown = isConnected && !isLoading && !isAdmin && !isEmployee`
- When true: `<WelcomeScreen />` renders (via AnimatePresence)
- Auto-redirect is suppressed for unknown wallets

**WelcomeScreen** (`frontend/components/shell/WelcomeScreen.tsx`) renders:
- Rocket icon + "You are not registered on this instance" heading
- "This is a live demo... You can explore as observer, or deploy your own instance."
- Two buttons: "Explore as Observer" → `/observer`, "Deploy Your Own Instance" → `/deploy`
- Footer text: "Already have an instance? Connect it from the topbar."

### 2D. Sidebar / Secondary Nav for Logged-In Users

**There is no sidebar, secondary nav, or tab bar for any logged-in role** (admin, employee, auditor). Once inside `/admin`, `/employee`, or `/auditor`, the only persistent navigation is `<TopBar />` — which links to How It Works, Deploy, Observer, About, and Launch App. None of these link back to settlement, verify, or the other operational pages.

The **DemoGuideOverlay** (floating BookOpen button, bottom-right) provides the only in-app navigation to `/settlement`, `/verify`, `/auditor`. It is a collapsible step-by-step demo guide with clickable route links, rendered globally in `layout.tsx`.

---

## SECTION 3: DATA LOADING AND "PUBLISHED: 0" ISSUE

### 3A. Contract Address Chain

**deployments/arb-sepolia.json:**
```json
"ShieldCardControlPlane": "0xC2fe512fE0A4D0Aa0C7452aC43e76aB9331f9dD2"
```

**frontend/.env.local:**
```
NEXT_PUBLIC_SHIELDCARD_ADDRESS=SET
```
(Cannot compare exact values per task constraints, but both are SET.)

**How `useShieldCard.ts` determines the address:**
`shieldCardAddress` is imported from `frontend/lib/contracts.ts` which reads:
```typescript
export const shieldCardAddress =
  (process.env.NEXT_PUBLIC_SHIELDCARD_ADDRESS as `0x${string}` | undefined) ?? undefined;
```
This is a **build-time env var read** (`NEXT_PUBLIC_*`). It does NOT use `instance.ts` or `localStorage`. The multi-tenant `instance.ts` (getInstanceAddress) is only used by `TopBar.tsx` for the UI chip display and manual "Connect Existing" flow — but is **not plumbed into `contracts.ts`** or `useShieldCard`.

**Critical gap:** `shieldCardAddress` in `contracts.ts` is hardwired to `NEXT_PUBLIC_SHIELDCARD_ADDRESS` at build time. If a user uses the TopBar dropdown to "Connect Existing Instance" (stores a custom address in `localStorage`), `useShieldCard` continues reading from the env var, not the localStorage value. The instance switching feature in the TopBar is therefore cosmetic only — it does not affect any contract reads.

### 3B. requestsQuery — What It Reads

1. Calls `getRequestCount()` → total count N
2. For each index 0..N-1, in parallel: calls `getRequest(i)`, `evidenceHash(i)`, `evidenceSubmitted(i)`
3. Returns array of `RequestView` objects with fields including `resultPublished` (boolean) and `publicStatus` (number)
4. No filtering by `publicStatus` — all requests returned regardless of status
5. No filtering by `resultPublished` — published and unpublished mixed in same array

### 3C. "PUBLISHED: 0" — Where It Comes From

In `useShieldCard.ts` (lines 384–392):
```typescript
const summary = useMemo(() => {
  const requests = requestsQuery.data ?? [];
  return {
    total:     requests.length,
    published: requests.filter((r) => r.resultPublished).length,
    pending:   requests.filter((r) => !r.resultPublished && !r.inReview).length,
    inReview:  requests.filter((r) => r.inReview).length,
  };
}, [requestsQuery.data]);
```

`summary.published` is shown in the admin metrics strip (line 139 of admin/page.tsx):
```
{ label: "Published", value: summary.published, ... }
```

So "PUBLISHED: 0" means `resultPublished === false` on every request in `requestsQuery.data`.

**Root cause analysis:** `resultPublished` is set to `true` on-chain only when `publishDecryptedResult()` is called. This requires: (1) admin to decrypt the encrypted status handle via CoFHE, and (2) call `publishDecryptedResult(requestId, plainStatus, sig)` with the threshold network's signature. If the `publish-results.ts` script has not been run for existing requests, all show `resultPublished = false`.

### 3D. publish-results.ts Contract Name

`scripts/publish-results.ts` line 68:
```typescript
const address = getDeployment(hre.network.name, "ShieldCardControlPlane");
```

`deployments/arb-sepolia.json` key: `"ShieldCardControlPlane"` ✓ — **names match**.

### 3E. Live Contract State Check

Cannot make a live RPC call without executing code. However, from the code structure:
- `getRequestCount()` is read in `requestsQuery` and in `LiveStats.tsx` directly via `createPublicClient`
- `LiveStats` displays "Outcomes published" as `publishedCount`, counted from iterating `getRequest(i)[8]` (index 8 = `resultPublished`)
- If the live demo shows "Published: 0" in admin metrics and "Outcomes published: 0" in LiveStats, it means `publishDecryptedResult()` has never been called on the deployed contract, OR all requests that had results published were in a prior deployment

---

## SECTION 4: HARDCODED DATA AUDIT

### 4A. Grep Results

**Hardcoded wallet addresses (0x536b, 0xaa4C, etc.):**
```
No matches found.
```

**Alice/Bob/Carol/Dave/Acme/Globex:**
```
No matches found.
```

**hardcoded/TODO/FIXME/placeholder/mock/dummy** (excluding MockUSDC references):
```
frontend/components/admin/PolicyPackManager.tsx:186  — "placeholder" (form input placeholder attr)
frontend/components/admin/PolicyPackManager.tsx:187  — "placeholder" (form input placeholder attr)
frontend/components/admin/PolicyPackManager.tsx:188  — "placeholder" (form input placeholder attr)
frontend/components/shell/TopBar.tsx:138             — placeholder="0x..." (input field)
frontend/components/admin/EmployeeManagement.tsx:23  — placeholder prop
frontend/components/admin/EmployeeManagement.tsx:76  — placeholder attr
frontend/components/admin/EmployeeManagement.tsx:165 — placeholder="0x... employee address"
frontend/components/admin/EmployeeManagement.tsx:176 — placeholder="0x... address to freeze"
frontend/components/admin/EmployeeManagement.tsx:187 — placeholder="0x... address to unfreeze"
frontend/components/employee/RequestComposer.tsx:179 — placeholder="0.00"
frontend/components/employee/RequestComposer.tsx:286 — placeholder="e.g. Figma subscription renewal"
frontend/app/verify/page.tsx:251                     — placeholder="Request ID (e.g. 0)"
```
All are legitimate HTML `placeholder` attributes on input fields. No code-level placeholder/mock data found.

**One hardcoded address present in `frontend/lib/constants.ts` line 13:**
```typescript
"0x1d7f7354eda779d15ebd258ae92f82d9e1b98028": "Sarah Rodriguez",
```
This maps the deployed Employee B wallet address to a display name. Intentional for the demo instance.

### 4B. Admin Page Request Table

- **Reads from `useShieldCard` `requestsQuery`** — live data, not hardcoded.
- No hardcoded request arrays anywhere in `admin/page.tsx` or `RequestStream.tsx`.
- When `requestsQuery.data` is undefined: shows "Loading requests from Arbitrum Sepolia..." spinner (line 337–340).
- When `requestsQuery.isError`: shows "Failed to load requests. Check RPC connection." error banner.
- When data is empty array: `RequestStream` renders with empty `requests` prop — shows empty state (check RequestStream component for empty state handling, not read in this audit).

### 4C. Observer Page

- **Reads from `useShieldCard` `requestsQuery`, `packsQuery`, `deptsQuery`, `vendorsQuery`** — all live data.
- No hardcoded request arrays.
- When loading: "Loading public state from Arbitrum Sepolia..." spinner.
- When error: "Failed to load requests. Check your RPC connection."
- **No wallet connect/disconnect button in the observer page body.** The `TopBar` (rendered at top) has a `WalletButton` that handles connect/disconnect. The observer page body has no wallet-specific UI beyond the "no wallet required" badge.
- `deptsQuery.isLoading` — note: department section only renders when `deptsQuery.data?.length > 0`, so if no departments, the section is hidden entirely (no loading state shown).

### 4D. Auditor Page — DisclosureGranted Implementation

**Implemented in this session:**
```typescript
useEffect(() => {
  if (!shieldCardAddress || !publicClient || !address) return;
  // getLogs for DisclosureGranted event filtered by args.auditor === address
  const logs = await publicClient.getLogs({
    event: { type: "event", name: "DisclosureGranted", ... },
    args: { auditor: address },
    fromBlock: BigInt(0),
    toBlock: "latest",
  });
  const ids = new Set(logs.map((l) => l.args.requestId?.toString() ?? ""));
  setGrantedIds(ids);
}, [publicClient, address]);
```

Then:
```typescript
const requests = grantedIds !== null
  ? allRequests.filter((r) => grantedIds.has(r.id.toString()))
  : allRequests;
```

**Problem:** When `grantedIds` is `null` (the `getLogs` call fails or the wallet is not connected), ALL requests from `requestsQuery` are shown — not an empty list. The fallback is incorrect.

**Second problem:** When `address` is undefined (not connected) and `grantedIds` is still `null` from the initial state, the table shows "Loading requests…" when `requests.length === 0`, but actually the table will show all requests because `grantedIds` is `null` initially and the `getLogs` effect doesn't fire without `address`.

**Third problem:** The event query fires with `fromBlock: BigInt(0)` — on Arbitrum Sepolia this scans the entire chain history, which could be slow or hit RPC limits.

---

## SECTION 5: COMPLETE USER JOURNEY MAP

### Journey 1: First-time visitor, no wallet

| Action | Destination | Notes |
|---|---|---|
| Landing (/) → clicks "Explore Live Demo" | **Does not exist on landing page** | The hero CTA buttons are "Deploy for Your Team" → `/deploy` and "Explore Live Demo" → `/observer`. But the landing page's *inline nav* only has `#how-it-works`, `/observer`, and `/app`. The HeroSection (updated this session) does have "Explore Live Demo" → `/observer`. ✓ Works. |
| Landing (/) → clicks "How It Works" (hero CTA) | `/how-it-works` | HeroSection has this as text link. ✓ Works. |
| Landing (/) → clicks "How it works" (inline nav) | `#how-it-works` anchor (same page) | **Not the `/how-it-works` page** — scrolls to the embedded `HowItWorks` section on the landing page. The new TopBar links to `/how-it-works` but landing's inline nav links to `#how-it-works`. |
| Landing (/) → clicks "Deploy for Your Team" | `/deploy` | HeroSection primary CTA. ✓ Works. |
| Landing (/) → clicks "Observer view" (inline nav) | `/observer` | ✓ Works. |

**Key issue:** The landing page nav is misaligned with TopBar. "How it works" on landing goes to a same-page anchor; "How It Works" on inner pages goes to `/how-it-works`. Users who navigate from `/` see no link to `/about`, no instance chip, no "Deploy" nav item.

### Journey 2: Visitor connects wallet (admin address)

| Step | What happens |
|---|---|
| Landing (/) → connects wallet | No change on landing page — wallet state is not consumed by the landing page's inline nav or any landing section. The `TopBar` (not present on `/`) would show WalletButton state, but landing has no TopBar. |
| Landing (/) → clicks "Enter App" (inline nav) / "Launch App" (TopBar on any inner page) | → `/app` |
| `/app` → role detection | `roleQuery` fires: reads `admin()` and `employeeRegistered(address)` from contract. Shows "Detecting role…" → "Role detected: Admin" → "Redirecting to your workspace…" after 600ms delay. |
| Auto-redirect | → `/admin` |
| `/admin` → navigate to `/settlement` | **No link from admin page to settlement.** Must manually type URL or use DemoGuideOverlay (step 5 in the floating guide). |
| `/admin` → navigate to `/verify` | **No link from admin page to verify.** Must manually type URL or use DemoGuideOverlay (step 6). |

### Journey 3: Visitor connects unknown wallet

| Step | What happens |
|---|---|
| `/app` → unknown wallet connected | `isUnknown = true` → `<WelcomeScreen />` shown via AnimatePresence |
| WelcomeScreen options | "Explore as Observer" → `/observer`; "Deploy Your Own Instance" → `/deploy` |

WelcomeScreen is correctly implemented. ✓

### Journey 4: Visitor goes to /observer directly

- No wallet required. Page renders immediately.
- `useShieldCard` → `requestsQuery` fires because `isConfigured = Boolean(shieldCardAddress && publicClient)`. `publicClient` comes from wagmi's default public client (no wallet needed). ✓
- "Public view · no wallet required" badge visible in header.
- No wallet connect/disconnect button in the page body — only in `TopBar`.
- No wallet prompt or wall. ✓

---

## SECTION 6: SPEED ANALYSIS

### 6A. CoFHE SDK Lazy-Load Behavior

**`CofheProvider.tsx` — NOT lazy on wallet connect. Eagerly initializes on wallet connect.**

```typescript
useEffect(() => {
  async function init() {
    if (!publicClient || !walletClient) { /* clear client */ return; }
    // Dynamically imports @cofhe/sdk/chains and @cofhe/sdk/web
    const [{ getChainById }, { createCofheClient, createCofheConfig }] = await Promise.all([
      import("@cofhe/sdk/chains"),
      import("@cofhe/sdk/web"),
    ]);
    // Calls nextClient.connect(publicClient, walletClient)
    // Races against a 15-second timeout
  }
  void init();
}, [publicClient, walletClient]);
```

The SDK **dynamic imports** (`import("@cofhe/sdk/chains")`, `import("@cofhe/sdk/web")`) happen at module level lazily (JS bundle-split). However, `connect()` is called **immediately when both `publicClient` and `walletClient` are available** — i.e., on wallet connect. It is not deferred until the first encrypt/decrypt action.

This means every wallet connect triggers a CoFHE network round-trip (up to 15 seconds timeout) regardless of whether the user ever needs encryption. An observer connecting their wallet to see their role would still pay the full CoFHE init cost.

### 6B. Landing Page (/) — Queries on Mount

**`LiveStats` component (dynamically imported, SSR false)** fires on mount:
- Creates a standalone `createPublicClient` (not via wagmi)
- Sequential loop (not parallel): iterates up to 30 requests, calling `getRequest(i)` one by one
- Iterates again for settlement state per request
- **This is a sequential waterfall of up to 60 RPC calls on landing page load** (30 getRequest + 30 getSettlementState)
- No React Query cache, no staleTime — runs once on mount

The landing page's `ClientProviders` wraps everything in `Web3Provider` + `CofheProvider`. If no wallet is connected:
- `publicClient` from wagmi is available (default RPC)
- `walletClient` is null → CoFHE does NOT init (guards against null walletClient) ✓
- `useShieldCard` queries have `enabled: isConfigured` — `isConfigured = Boolean(shieldCardAddress && publicClient)` — so if `NEXT_PUBLIC_SHIELDCARD_ADDRESS` is set, **all useShieldCard queries fire on landing page load** even though the landing page doesn't use `useShieldCard` directly

Wait — the landing `page.tsx` does not import `useShieldCard`. But `LiveStats` creates its own raw client and does not use React Query. The React Query queries (from `useShieldCard`) only run if a component that calls `useShieldCard()` mounts. Since landing page doesn't call `useShieldCard`, those queries don't fire on `/`.

**Actual queries on `/` mount:**
1. LiveStats: standalone raw RPC calls (sequential waterfall, ≤60 calls, no cache)
2. No React Query queries from useShieldCard (not called on landing)

### 6C. /admin — Queries on Mount

`AdminPage` calls `useShieldCard()` which fires all of these on mount (all enabled when `isConfigured=true`):

| Query Key | Function Called | Parallelism |
|---|---|---|
| `shieldcard-role` | `admin()`, `employeeRegistered(addr)`, `employeeFrozen(addr)`, `submissionsPaused()` | 4 parallel calls in one queryFn |
| `shieldcard-requests` | `getRequestCount()` → then N×3 parallel per-request reads | Sequential count, then all requests parallel |
| `shieldcard-packs` | `getPackIds()` → then per-pack `getPackInfo()` + `getPackSummary()` | Sequential IDs, then all packs parallel |
| `shieldcard-depts` | `getDeptIds()` → then per-dept `getDeptInfo()` | Sequential IDs, then all depts parallel |
| `shieldcard-vendors` | `vendorCount()` → then per-vendor `vendorExists()` + `getVendorInfo()` | Sequential count, then all vendors parallel |
| `shieldcard-global` | `submissionsPaused()`, `getRegisteredEmployeeCount()` | 2 parallel |

**All 6 queries fire in parallel on mount** (each is independent).

**Waterfall bottleneck within `requestsQuery`:** `getRequestCount()` must complete before the per-request reads start. If N=20 requests, that's 1 serial + 20×3 parallel = 61 RPC calls total for the requests query alone. The per-request calls themselves are parallel (Promise.all), so latency = 1 serial + 1 parallel batch, not N serial.

**Waterfalls in packs/depts/vendors:** Each starts with a count/IDs call, then parallelizes the detail reads. Acceptable pattern.

---

## CRITICAL BLOCKERS

### BLOCKER 1 — Instance Switching is Cosmetic (HIGH SEVERITY)
`frontend/lib/contracts.ts` reads `shieldCardAddress` from `process.env.NEXT_PUBLIC_SHIELDCARD_ADDRESS` at **build time**. The `instance.ts` localStorage values are only consumed by `TopBar.tsx` for the UI chip display. When a judge or user enters a custom instance address via the TopBar dropdown, zero contract reads change — all `useShieldCard` queries continue hitting the build-time env address. The multi-tenant feature is non-functional.

### BLOCKER 2 — Landing Page Has Wrong/Outdated Nav (HIGH SEVERITY)
`frontend/app/page.tsx` defines its own inline `<nav>` that is completely out of sync with `TopBar`:
- Missing: About, Deploy, How It Works (page), instance chip, wallet button
- Has stale: "How it works" → `#how-it-works` anchor (not the `/how-it-works` page)
- "Enter App" label instead of "Launch App"
A first-time visitor on `/` sees a different product from every inner page. The updated TopBar navigation (added this session) is invisible to landing visitors.

### BLOCKER 3 — No Navigation from Admin to Settlement/Verify/Auditor (HIGH SEVERITY)
An admin who logs into `/admin` has no visible path to `/settlement`, `/verify`, or `/auditor`. The only bridge is the `DemoGuideOverlay` floating widget — a demo tool, not a real navigation element. A judge evaluating the product has to manually type URLs to reach 3 of the 6 functional pages.

### BLOCKER 4 — CoFHE Initializes on Every Wallet Connect, Not On First Use (MEDIUM SEVERITY)
`CofheProvider` calls `createCofheClient` and `connect()` immediately when a wallet is connected — even if the user is only viewing the observer page or checking their role. The 15-second timeout means wallet-connected observers wait up to 15 seconds for a network call they will never use. This also causes the "CoFHE client initializing..." status banner to appear on every page for connected wallets.

### BLOCKER 5 — Auditor DisclosureGranted Fallback Shows All Requests (MEDIUM SEVERITY)
In `frontend/app/auditor/page.tsx`, when `grantedIds` is `null` (initial state before the getLogs call resolves, or if getLogs fails), the filter falls back to showing ALL requests:
```typescript
const requests = grantedIds !== null ? allRequests.filter(...) : allRequests;
```
This means: (a) during the brief window while `getLogs` is in-flight, all requests are visible to all wallets; (b) if `getLogs` throws (RPC error, no wallet connected), all requests remain visible. The auditor isolation guarantee is not enforced in the UI. The `fromBlock: BigInt(0)` scan is also likely to be slow or hit rate limits on a public RPC.

---

_Report generated: 2026-06-01. No files were modified during this diagnostic._
