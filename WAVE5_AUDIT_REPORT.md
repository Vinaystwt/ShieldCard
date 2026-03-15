# ShieldCard Wave 5 — Read-Only Audit Report

**Repository:** `shieldcard-clean-rebuild`
**Active branch:** `master`
**Deployed contract:** `ShieldCardControlPlane @ 0x268F3506639a570Fe388464D915188F484A89109` (Arbitrum Sepolia, chainId 421614)
**Report scope:** Read-only audit of contracts, frontend, scripts, tests, configuration, and git state. No files modified, no state-changing operations executed.
**Confidence note:** Where claims cannot be directly verified from source, they are explicitly marked "uncertain" or "not verified."

---

## 1. REPOSITORY MAP

### 1.1 Directory tree (excluding node_modules, build artifacts, .git)

```
.
├── .env                                                  (gitignored secrets)
├── .env.example                                          (env var template)
├── .gitignore
├── .netlify/
│   ├── netlify.toml                                      (linked Netlify site config)
│   └── state.json                                        (Netlify CLI state)
├── README.md                                             (product readme, Wave 4 hero)
├── brand-assets/
│   ├── readme-architecture.svg                           (system architecture diagram)
│   ├── readme-lifecycle.svg                              (request lifecycle diagram)
│   ├── readme-privacy.svg                                (privacy boundary diagram)
│   ├── shieldcard-logo.{png,svg}                         (logo asset)
│   └── shieldcard-wordmark.{png,svg}                     (wordmark asset)
├── contracts/
│   ├── ShieldCardControlPlane.sol                        (Wave 4 active production contract, 789 lines)
│   ├── ShieldCardPolicyEngine.sol                        (Wave 3 legacy contract, 483 lines — STALE, still tracked)
│   └── mocks/
│       ├── ShieldCardControlPlaneHarness.sol             (test-only harness exposing internal FHE handles)
│       └── ShieldCardPolicyEngineHarness.sol             (Wave 3 test-only harness — STALE)
├── deployments/
│   ├── arb-sepolia.json                                  (production address map: 2 entries — see §7)
│   └── hardhat.json                                      (local ephemeral deployments)
├── frontend/
│   ├── .DS_Store                                         (macOS metadata)
│   ├── .env.local                                        (gitignored frontend env)
│   ├── .eslintrc.json
│   ├── .gitignore
│   ├── .netlify/
│   │   ├── netlify.toml                                  (CLI-managed override — contains absolute paths)
│   │   └── plugins/                                      (Netlify Next.js plugin metadata)
│   ├── AGENTS.md                                         (agent notes)
│   ├── CLAUDE.md                                         (Claude assistant notes)
│   ├── app/
│   │   ├── admin/page.tsx                                (admin cockpit route)
│   │   ├── app/page.tsx                                  (role gateway router)
│   │   ├── employee/page.tsx                             (employee workspace route)
│   │   ├── observer/page.tsx                             (observer audit route)
│   │   ├── page.tsx                                      (landing route)
│   │   ├── layout.tsx                                    (root layout, providers wrapper)
│   │   ├── globals.css                                   (Tailwind 4 entry + design tokens)
│   │   └── favicon.ico
│   ├── components/
│   │   ├── admin/
│   │   │   ├── EmployeeManagement.tsx                    (register/freeze/unfreeze controls)
│   │   │   ├── PolicyPackManager.tsx                     (pack threshold + active toggle)
│   │   │   └── RequestStream.tsx                         (admin request table + publish/review actions)
│   │   ├── brand/WordMark.tsx                            (wordmark component)
│   │   ├── employee/
│   │   │   ├── RequestComposer.tsx                       (employee submit form — encrypts in-browser)
│   │   │   ├── RequestHistory.tsx                        (employee own-request list)
│   │   │   └── RevealCard.tsx                            (private permit decrypt UI)
│   │   ├── landing/
│   │   │   ├── ArchitectureSection.tsx                   (FHE ops + system diagram on landing)
│   │   │   ├── CtaStrip.tsx                              (bottom CTA strip)
│   │   │   ├── HeroGraphic.tsx                           (right-side animated hero graphic)
│   │   │   ├── HeroSection.tsx                           (headline + CTAs)
│   │   │   ├── HowItWorks.tsx                            (3-step explainer)
│   │   │   ├── ProblemSection.tsx                        (problem framing)
│   │   │   └── Wave4Strip.tsx                            (Wave 4 capability cards)
│   │   ├── observer/
│   │   │   ├── PackSummary.tsx                           (per-pack metrics)
│   │   │   ├── PrivacyExplainer.tsx                      (visible vs sealed columns)
│   │   │   ├── RequestTable.tsx                          (observer request table)
│   │   │   └── VendorPanel.tsx                           (vendor compliance status panel — reused in admin)
│   │   ├── shared/EmptyState.tsx                         (empty-state primitive)
│   │   ├── shell/TopBar.tsx                              (nav bar)
│   │   ├── ui/
│   │   │   ├── RiskBadge.tsx                             (risk bitmap chip)
│   │   │   ├── RoleBadge.tsx                             (admin/employee/observer chip)
│   │   │   ├── SealedValue.tsx                           (encrypted handle display)
│   │   │   ├── StatusBadge.tsx                           (status chip per request)
│   │   │   └── SwitchNetworkButton.tsx                   (wrong-network prompt)
│   │   └── wallet/WalletButton.tsx                       (RainbowKit connect button wrapper)
│   ├── hooks/
│   │   ├── useCofhe.ts                                   (CoFHE SDK lazy-load + encrypt/decrypt helpers)
│   │   ├── useRoleRouting.ts                             (admin vs employee resolution)
│   │   └── useShieldCard.ts                              (all contract reads + writes, react-query backed)
│   ├── lib/
│   │   ├── constants.ts                                  (STATUS_* numeric constants, app copy)
│   │   ├── contracts.ts                                  (contract address + ABI + type aliases)
│   │   ├── copy.ts                                       (role label helper)
│   │   └── format.ts                                     (cn, address/handle/timestamp formatters)
│   ├── providers/
│   │   ├── ClientProviders.tsx                           (top-level provider wrapper)
│   │   ├── CofheProvider.tsx                             (CoFHE client context)
│   │   └── Web3Provider.tsx                              (wagmi + RainbowKit + QueryClient)
│   ├── next.config.mjs                                   (Next.js: `output: "export"`)
│   ├── next-env.d.ts
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── pnpm-workspace.yaml
│   ├── postcss.config.mjs
│   └── tsconfig.json
├── hardhat.config.ts                                     (Hardhat + CoFHE plugin config)
├── netlify.toml                                          (root Netlify config — base=frontend)
├── package.json
├── pnpm-lock.yaml
├── scripts/
│   ├── deploy-control-plane.ts                           (Wave 4 deploy script, ACTIVE)
│   ├── deploy-engine.ts                                  (Wave 3 deploy — STALE)
│   ├── deploy.ts                                         (Wave 1 deploy — STALE)
│   ├── publish-results.ts                                (publish FHE outcomes — BROKEN, see §5)
│   ├── seed-control-plane.ts                             (Wave 4 seed script, ACTIVE)
│   ├── seed-demo.ts                                      (Wave 1 seed — STALE)
│   ├── seed-engine.ts                                    (Wave 3 seed — STALE)
│   └── verify-seed.ts                                    (on-chain state verifier — BROKEN, see §5)
├── tasks/
│   ├── index.ts                                          (`export {}` — no custom tasks defined)
│   └── utils.ts                                          (saveDeployment, getDeployment, createCofheClient helpers)
├── test/
│   ├── ShieldCardControlPlane.test.ts                    (Wave 4 tests — 89 it() blocks)
│   └── ShieldCardPolicyEngine.test.ts                    (Wave 3 tests — 47 it() blocks)
└── tsconfig.json
```

### 1.2 Languages, tooling, versions

| Layer | Tool/Version |
|---|---|
| Smart contracts | Solidity `0.8.28`, `evmVersion: cancun`, `viaIR: true`, `optimizer.runs: 200` (hardhat.config.ts:9-19) |
| Solidity pragma in contracts | `pragma solidity ^0.8.25;` (ShieldCardControlPlane.sol:2) |
| Hardhat | `^2.22.19` (package.json devDeps) |
| Hardhat plugins | `@nomicfoundation/hardhat-toolbox ^5.0.0`, `@nomicfoundation/hardhat-ethers ^3.0.0`, `@nomicfoundation/hardhat-verify ^2.0.0`, `@nomicfoundation/hardhat-ignition ^0.15.0` |
| Package manager (root) | pnpm (pnpm-lock.yaml present) |
| Package manager (frontend) | pnpm (frontend/pnpm-lock.yaml present, `pnpm-workspace.yaml` defines workspace) |
| Node version (Netlify) | 20 (netlify.toml:7, frontend/.netlify/netlify.toml) |
| Frontend framework | Next.js `14.2.35` with `output: "export"` (frontend/next.config.mjs:3) |
| React | `18.3.1` |
| TypeScript | `>=4.5.0` root, `^5` frontend |
| CSS | Tailwind CSS `^4` via `@tailwindcss/postcss ^4` |
| Wallet stack | `wagmi ^2.19.5`, `viem ^2.48.1`, `@rainbow-me/rainbowkit ^2.2.10`, `@wagmi/core ^2.22.1` |
| State | `@tanstack/react-query ^5.99.2` |
| Animation | `framer-motion ^12.38.0` |
| Icons | `lucide-react ^1.8.0` |

### 1.3 CoFHE / Fhenix package versions

| Package | Declared range | Resolved version (lockfile) |
|---|---|---|
| `@fhenixprotocol/cofhe-contracts` | `^0.1.3` (root devDeps) | `0.1.3` (pnpm-lock.yaml:241, 2693) |
| `@cofhe/hardhat-plugin` | `^0.5.2` (root devDeps) | `0.5.2` (pnpm-lock.yaml:101, 2349) |
| `@cofhe/sdk` | `^0.5.2` (root devDeps and frontend deps) | `0.5.2` (pnpm-lock.yaml:113) |
| `@cofhe/mock-contracts` | `^0.5.2` (root devDeps) | `0.5.2` (pnpm-lock.yaml:110, 2372) |

Frontend pins the same `@cofhe/sdk ^0.5.2` (frontend/package.json deps). Versions match between hardhat-side and frontend-side.

---

## 2. CONTRACTS

### 2.1 `ShieldCardControlPlane` (Wave 4, ACTIVE)

**File:** `contracts/ShieldCardControlPlane.sol` (789 lines)
**Inheritance:** `is Ownable` (OpenZeppelin v5)
**Imports:**
- `{ FHE, euint32, euint8, ebool, InEuint32 }` from `@fhenixprotocol/cofhe-contracts/FHE.sol` (line 4)
- `{ Ownable }` from `@openzeppelin/contracts/access/Ownable.sol` (line 5)

**Constructor:** `constructor() Ownable(msg.sender) { admin = msg.sender; }` (lines 220-222)

#### 2.1.1 Status, vendor, and risk constants (lines 38-61)

| Constant | Value | Type |
|---|---|---|
| `STATUS_SUBMITTED` | 0 | uint8 PLAINTEXT |
| `STATUS_AUTO_APPROVED` | 1 | uint8 PLAINTEXT |
| `STATUS_NEEDS_REVIEW` | 2 | uint8 PLAINTEXT |
| `STATUS_AUTO_DENIED` | 3 | uint8 PLAINTEXT |
| `STATUS_ADMIN_APPROVED` | 4 | uint8 PLAINTEXT |
| `STATUS_ADMIN_DENIED` | 5 | uint8 PLAINTEXT |
| `VENDOR_UNCHECKED` | 0 | uint8 PLAINTEXT |
| `VENDOR_COMPLIANT` | 1 | uint8 PLAINTEXT |
| `VENDOR_SUSPENDED` | 2 | uint8 PLAINTEXT |
| `VENDOR_BANNED` | 3 | uint8 PLAINTEXT |
| `RISK_VENDOR_SUSPENDED` | 0x0001 | uint16 PLAINTEXT |
| `RISK_VENDOR_UNCHECKED` | 0x0002 | uint16 PLAINTEXT |
| `RISK_NO_DEPT` | 0x0004 | uint16 PLAINTEXT |
| `RISK_NO_VENDOR` | 0x0008 | uint16 PLAINTEXT |

#### 2.1.2 Errors (lines 67-91)

```
EmployeeAlreadyRegistered(address employee)
EmployeeNotRegistered(address employee)
EmployeeIsFrozen(address employee)
InvalidEncryptedInput()
ResultAlreadyPublished(uint256 requestId)
PackAlreadyExists(uint8 packId)
PackNotFound(uint8 packId)
PackInactive(uint8 packId)
PackLimitsNotSet(uint8 packId)
SubmissionsPaused()
RequestNotInReview(uint256 requestId)
RequestNotFound(uint256 requestId)
NotRequestOwner(uint256 requestId)
DeptAlreadyExists(uint8 deptId)
DeptNotFound(uint8 deptId)
DeptInactive(uint8 deptId)
VendorAlreadyRegistered(uint16 vendorId)
VendorNotFound(uint16 vendorId)
VendorBanned(uint16 vendorId)
RecurringIntervalNotElapsed(uint256 nextAllowedTimestamp)
EvidenceAlreadySubmitted(uint256 requestId)
```

#### 2.1.3 Events (lines 98-122)

```
EmployeeRegistered(address indexed employee)
EmployeeFrozen(address indexed employee)
EmployeeUnfrozen(address indexed employee)
EmployeeDeptAssigned(address indexed employee, uint8 deptId)
SubmissionsPausedEvent()
SubmissionsUnpausedEvent()
PackCreated(uint8 indexed packId, string name)
PackLimitsSet(uint8 indexed packId)
PackActiveChanged(uint8 indexed packId, bool active)
BudgetEpochReset(uint8 indexed packId, uint256 timestamp)
PackIntervalSet(uint8 indexed packId, uint256 intervalSeconds)
RequestSubmitted(uint256 indexed requestId, address indexed employee, uint8 packId, uint256 timestamp)
ResultPublished(uint256 indexed requestId, uint8 status)
RequestNeedsReview(uint256 indexed requestId, address indexed employee, uint8 packId)
AdminResolved(uint256 indexed requestId, bool approved)
DeptCreated(uint8 indexed deptId, string name)
DeptActiveChanged(uint8 indexed deptId, bool active)
DeptBudgetSet(uint8 indexed deptId)
DeptEpochReset(uint8 indexed deptId, uint256 timestamp)
VendorRegistered(uint16 indexed vendorId, string name)
VendorStatusUpdated(uint16 indexed vendorId, uint8 status)
EvidenceSubmitted(uint256 indexed requestId, bytes32 hash)
```

**Emission per lifecycle stage:**

| Stage | Event(s) emitted |
|---|---|
| Submit | `RequestSubmitted` (line 509) — emitted PER submission |
| FHE evaluation | NONE — `_evaluatePolicy` (lines 732-761) emits no event |
| Publish (NeedsReview path) | `RequestNeedsReview` (line 549) |
| Publish (auto-final path) | `ResultPublished` (line 787, via `_finaliseRequest`) |
| Admin review resolution | `AdminResolved` (line 567) PLUS `ResultPublished` (line 787) |
| Evidence attached | `EvidenceSubmitted` (line 528) |

Lifecycle has per-transition events for submit, review-flag, admin-resolution, evidence, and result-publish. No event for FHE evaluation itself (correctly — FHE ops run synchronously inside the submit transaction).

#### 2.1.4 State variables — encrypted vs plaintext

```solidity
address public admin;                                            // PLAINTEXT (line 173)
bool public submissionsPaused;                                   // PLAINTEXT (line 174)

mapping(address => bool) public employeeRegistered;              // PLAINTEXT (line 177)
mapping(address => bool) public employeeFrozen;                  // PLAINTEXT (line 178)
mapping(address => uint8) public employeeDept;                   // PLAINTEXT (line 179)
address[] public registeredEmployees;                            // PLAINTEXT (line 180)
mapping(address => uint256[]) public employeeRequestIds;         // PLAINTEXT (line 181)

mapping(uint8 => PolicyPack) internal _packs;                    // contains ENCRYPTED fields (line 184)
mapping(uint8 => bool) public packExists;                        // PLAINTEXT (line 185)
uint8 public packCount;                                          // PLAINTEXT (line 186)
uint8[] internal _packIds;                                       // PLAINTEXT (line 187)

mapping(uint8 => uint256) public packTotalRequests;              // PLAINTEXT (line 190)
mapping(uint8 => uint256) public packApprovedCount;              // PLAINTEXT (line 191)
mapping(uint8 => uint256) public packDeniedCount;                // PLAINTEXT (line 192)
mapping(uint8 => uint256) public packReviewPendingCount;         // PLAINTEXT (line 193)

mapping(uint8 => uint256) public packRecurringInterval;          // PLAINTEXT (line 196)
mapping(address => mapping(uint8 => uint256)) public lastSubmitTimestamp;  // PLAINTEXT (line 197)

mapping(uint8 => Department) internal _departments;              // contains ENCRYPTED fields (line 200)
mapping(uint8 => bool) public deptExists;                        // PLAINTEXT (line 201)
uint8[] public deptIds;                                          // PLAINTEXT (line 202)

mapping(uint16 => Vendor) public vendors;                        // PLAINTEXT struct (line 205)
mapping(uint16 => bool) public vendorExists;                     // PLAINTEXT (line 206)
uint16 public vendorCount;                                       // PLAINTEXT (line 207)

PaymentRequest[] internal _requests;                             // contains ENCRYPTED fields (line 210)

mapping(uint256 => bytes32) public evidenceHash;                 // PLAINTEXT (line 213)
mapping(uint256 => bool) public evidenceSubmitted;               // PLAINTEXT (line 214)
```

#### 2.1.5 Structs

**`PolicyPack`** (lines 128-137):
```solidity
struct PolicyPack {
    string name;                  // PLAINTEXT
    bool   active;                // PLAINTEXT
    bool   limitsSet;             // PLAINTEXT
    euint32 encHardLimit;         // ENCRYPTED
    euint32 encAutoThreshold;     // ENCRYPTED
    euint32 encBudgetLimit;       // ENCRYPTED
    euint32 encUsedBudget;        // ENCRYPTED
    uint256 epochStart;           // PLAINTEXT
}
```

**`Department`** (lines 139-146):
```solidity
struct Department {
    string name;                  // PLAINTEXT
    bool   active;                // PLAINTEXT
    bool   budgetSet;             // PLAINTEXT
    euint32 encBudgetCap;         // ENCRYPTED
    euint32 encUsedBudget;        // ENCRYPTED
    uint256 epochStart;           // PLAINTEXT
}
```

**`Vendor`** (lines 148-151):
```solidity
struct Vendor {
    string name;                  // PLAINTEXT
    uint8  status;                // PLAINTEXT — VENDOR_* constant
}
```

**`PaymentRequest` (the request struct)** (lines 153-167):
```solidity
struct PaymentRequest {
    address employee;             // PLAINTEXT
    uint8   packId;               // PLAINTEXT
    uint8   deptId;               // PLAINTEXT — 0 = no dept
    uint16  vendorId;             // PLAINTEXT — 0 = no vendor
    euint32 encAmount;            // ENCRYPTED
    euint8  encStatus;            // ENCRYPTED — FHE-computed value 1..3 prior to publish
    string  memo;                 // PLAINTEXT
    uint256 timestamp;            // PLAINTEXT
    bool    resultPublished;      // PLAINTEXT
    uint8   publicStatus;         // PLAINTEXT — final status 1..5 after publish
    bool    inReview;             // PLAINTEXT
    bytes32 receiptHash;          // PLAINTEXT — settlement receipt (keccak)
    uint16  riskBitmap;           // PLAINTEXT — public risk flags
}
```

**Evidence/receipt fields:** No dedicated struct. `receiptHash` lives inside `PaymentRequest`; `evidenceHash` and `evidenceSubmitted` are top-level public mappings keyed by `requestId`.

#### 2.1.6 Functions (complete list)

All functions are `external` unless noted. `onlyOwner` is the only access modifier in use (inherited from `Ownable`). The contract has no `onlyEmployee` or `onlyAuditor` modifier — function-level checks use storage reads + `revert`.

##### Global admin controls
- `pauseSubmissions()` `external onlyOwner` (line 228) — sets `submissionsPaused = true`; emits `SubmissionsPausedEvent`.
- `unpauseSubmissions()` `external onlyOwner` (line 233) — sets `submissionsPaused = false`; emits `SubmissionsUnpausedEvent`.

##### Employee management (admin)
- `registerEmployee(address employee)` `external onlyOwner` (line 242) — adds to `employeeRegistered`, pushes to `registeredEmployees`; emits `EmployeeRegistered`.
- `freezeEmployee(address employee)` `external onlyOwner` (line 249) — flips `employeeFrozen[employee] = true`; emits `EmployeeFrozen`.
- `unfreezeEmployee(address employee)` `external onlyOwner` (line 255) — flips false; emits `EmployeeUnfrozen`.
- `assignEmployeeDept(address employee, uint8 deptId)` `external onlyOwner` (line 265) — sets `employeeDept[employee]`. `deptId == 0` clears assignment; emits `EmployeeDeptAssigned`.
- `getRegisteredEmployeeCount()` `external view returns (uint256)` (line 272).

##### Pack management (admin)
- `createPack(uint8 packId, string calldata name)` `external onlyOwner` (line 280) — creates pack, sets active=true, pushes to `_packIds`; emits `PackCreated`.
- `setPolicyThresholds(uint8 packId, InEuint32 encHardLimit, InEuint32 encAutoThreshold, InEuint32 encBudgetLimit)` `external onlyOwner` (line 291) — **PERFORMS FHE OPS:** `FHE.asEuint32(...)` on each input, stores into pack, calls `FHE.allowThis(...)` and `FHE.allow(..., admin)` on each handle plus `zeroUsed`; emits `PackLimitsSet`. (lines 302-319)
- `setPackActive(uint8 packId, bool active)` `external onlyOwner` (line 322) — flips `_packs[packId].active`; emits `PackActiveChanged`.
- `resetBudgetEpoch(uint8 packId)` `external onlyOwner` (line 328) — **PERFORMS FHE OPS:** allocates `FHE.asEuint32(0)`, calls `FHE.allowThis` + `FHE.allow(..., admin)`, replaces `encUsedBudget`; emits `BudgetEpochReset`.
- `setPackRecurringInterval(uint8 packId, uint256 intervalSeconds)` `external onlyOwner` (line 342) — sets `packRecurringInterval[packId]`; emits `PackIntervalSet`.

##### Department management (admin)
- `createDept(uint8 deptId, string calldata name)` `external onlyOwner` (line 352) — creates dept; emits `DeptCreated`.
- `setDeptActive(uint8 deptId, bool active)` `external onlyOwner` (line 362) — emits `DeptActiveChanged`.
- `setDeptBudget(uint8 deptId, InEuint32 encBudgetCap)` `external onlyOwner` (line 371) — **PERFORMS FHE OPS:** `FHE.asEuint32`, `FHE.allowThis`/`FHE.allow(..., admin)` on cap and zeroUsed; resets epoch; emits `DeptBudgetSet`.
- `resetDeptEpoch(uint8 deptId)` `external onlyOwner` (line 389) — **PERFORMS FHE OPS:** new `FHE.asEuint32(0)`, `allowThis`/`allow(admin)`; emits `DeptEpochReset`.

##### Vendor management (admin)
- `registerVendor(uint16 vendorId, string calldata name)` `external onlyOwner` (line 403) — creates vendor with `VENDOR_UNCHECKED` default; emits `VendorRegistered`.
- `setVendorStatus(uint16 vendorId, uint8 status)` `external onlyOwner` (line 411) — emits `VendorStatusUpdated`.

##### Employee request submission
- `submitRequest(uint8 packId, uint8 deptId, uint16 vendorId, InEuint32 encAmount, string memo)` `external` (line 430) — checks: not paused, employee registered + unfrozen, pack exists + active + limitsSet, encAmount non-zero, dept exists + active (if specified), vendor exists + not banned (if specified), recurring interval elapsed. Computes plaintext risk bitmap. **PERFORMS FHE OPS:** `FHE.asEuint32(encAmount)`, `FHE.allowThis(amount)`, `FHE.allowSender(amount)`, then calls internal `_evaluatePolicy(requestId)`, then accumulates dept budget via `FHE.add` + `FHE.allowThis`/`FHE.allow(..., admin)` (if dept set). Emits `RequestSubmitted`. Access control: implicit via `employeeRegistered` storage check (line 438).
- `submitEvidence(uint256 requestId, bytes32 hash)` `external` (line 521) — caller must equal `req.employee`; sets `evidenceHash[requestId]` and `evidenceSubmitted[requestId]`; emits `EvidenceSubmitted`. Access control: ownership check at line 524 — `NotRequestOwner` revert.

##### Admin: publish + review
- `publishDecryptedResult(uint256 requestId, uint8 plainStatus, bytes calldata sig)` `external onlyOwner` (line 535) — **PERFORMS DECRYPT-PUBLISH OP:** calls `FHE.publishDecryptResult(req.encStatus, plainStatus, sig)` (line 544). If `plainStatus == STATUS_NEEDS_REVIEW`: sets `inReview = true`, increments `packReviewPendingCount`, emits `RequestNeedsReview`. Else calls internal `_finaliseRequest(requestId, plainStatus)` which emits `ResultPublished`.
- `adminReviewRequest(uint256 requestId, bool approved)` `external onlyOwner` (line 555) — clears `inReview`, decrements `packReviewPendingCount`, calls `_finaliseRequest(requestId, approved ? STATUS_ADMIN_APPROVED : STATUS_ADMIN_DENIED)`; emits `AdminResolved` plus the inner `ResultPublished`.

##### View functions
- `getPackIds()` `external view returns (uint8[])` (line 577) — returns all pack IDs in creation order.
- `getActivePackIds()` `external view returns (uint8[])` (line 584) — filters to active packs only.
- `getPackInfo(uint8 packId)` `external view returns (string name, bool active, bool limitsSet, uint256 epochStart)` (line 597).
- `getPackSummary(uint8 packId)` `external view returns (uint256 total, uint256 approved, uint256 denied, uint256 pending, uint256 inReview)` (line 607).
- `getDeptIds()` `external view returns (uint8[])` (line 625).
- `getDeptInfo(uint8 deptId)` `external view returns (string name, bool active, bool budgetSet, uint256 epochStart)` (line 629).
- `getDeptEncBudgetCap(uint8 deptId)` `external view returns (euint32)` (line 639) — returns encrypted handle; no decryption.
- `getDeptEncUsedBudget(uint8 deptId)` `external view returns (euint32)` (line 643).
- `getVendorInfo(uint16 vendorId)` `external view returns (string name, uint8 status)` (line 651).
- `getEncryptedStatus(uint256 requestId)` `external view returns (euint8)` (line 664) — returns the encrypted status handle (needed for admin decrypt-publish).
- `getEncryptedAmount(uint256 requestId)` `external view returns (euint32)` (line 668).
- `getRequest(uint256 requestId)` `external view returns (address, uint8, uint8, uint16, euint32, euint8, string, uint256, bool, uint8, bool, bytes32, uint16)` (line 672) — returns 13 fields:
  `employee, packId, deptId, vendorId, encAmount, encStatus, memo, timestamp, resultPublished, publicStatus, inReview, receiptHash, riskBitmap`. **Note:** does NOT include `evidenceHash` or `evidenceSubmitted` — those must be read separately from public mappings.
- `getRequestCount()` `external view returns (uint256)` (line 710).
- `getEmployeeRequestIds(address employee)` `external view returns (uint256[])` (line 714).

##### Internal
- `_evaluatePolicy(uint256 requestId) internal` (line 732) — see §2.1.7 verbatim.
- `_finaliseRequest(uint256 requestId, uint8 finalStatus) internal` (line 763) — sets `publicStatus`, `resultPublished = true`, computes `receiptHash` (see §2.1.8), increments approved/denied counters, emits `ResultPublished`.

#### 2.1.7 FHE three-tier routing — verbatim (`_evaluatePolicy`, lines 732-761)

```solidity
function _evaluatePolicy(uint256 requestId) internal {
    PaymentRequest storage req  = _requests[requestId];
    PolicyPack storage pack     = _packs[req.packId];

    euint32 newUsed = FHE.add(pack.encUsedBudget, req.encAmount);
    FHE.allowThis(newUsed);

    ebool withinAutoThresh = FHE.lte(req.encAmount, pack.encAutoThreshold);
    ebool withinHardLimit  = FHE.lte(req.encAmount, pack.encHardLimit);
    ebool withinBudget     = FHE.lte(newUsed, pack.encBudgetLimit);

    ebool autoOk   = FHE.and(withinAutoThresh, withinBudget);
    ebool reviewOk = FHE.and(withinHardLimit,  withinBudget);

    euint8 statusAuto   = FHE.asEuint8(STATUS_AUTO_APPROVED);
    euint8 statusReview = FHE.asEuint8(STATUS_NEEDS_REVIEW);
    euint8 statusDenied = FHE.asEuint8(STATUS_AUTO_DENIED);

    euint8 result = FHE.select(autoOk, statusAuto, FHE.select(reviewOk, statusReview, statusDenied));

    req.encStatus = result;

    pack.encUsedBudget = newUsed;
    FHE.allowThis(pack.encUsedBudget);
    FHE.allow(pack.encUsedBudget, admin);

    FHE.allowThis(result);
    FHE.allow(result, admin);
    FHE.allowSender(result);
}
```

**FHE primitives used:** `FHE.add`, `FHE.lte`, `FHE.and`, `FHE.select`, `FHE.asEuint8`, `FHE.asEuint32`, `FHE.allowThis`, `FHE.allow`, `FHE.allowSender`. (`FHE.publishDecryptResult` used in `publishDecryptedResult`.)

**Access grants on the encrypted status handle:** `FHE.allowThis(result)` (contract itself), `FHE.allow(result, admin)` (admin address), `FHE.allowSender(result)` (the submitting employee). No third-party / auditor grant currently.

#### 2.1.8 Receipt hash computation — verbatim (`_finaliseRequest`, lines 769-779)

```solidity
req.receiptHash = keccak256(
    abi.encodePacked(
        requestId,
        req.employee,
        req.packId,
        finalStatus,
        req.timestamp,
        address(this),
        block.chainid
    )
);
```

**Recomputable from public on-chain data.** Anyone reading `getRequest(i)` can recompute and verify.

#### 2.1.9 Evidence hash — `submitEvidence` (lines 521-529)

```solidity
function submitEvidence(uint256 requestId, bytes32 hash) external {
    if (requestId >= _requests.length) revert RequestNotFound(requestId);
    PaymentRequest storage req = _requests[requestId];
    if (req.employee != msg.sender) revert NotRequestOwner(requestId);
    if (evidenceSubmitted[requestId]) revert EvidenceAlreadySubmitted(requestId);
    evidenceHash[requestId]      = hash;
    evidenceSubmitted[requestId] = true;
    emit EvidenceSubmitted(requestId, hash);
}
```

The hash is arbitrary `bytes32` supplied by the caller. The contract does not enforce a particular hash function — by convention it should be `keccak256` of the receipt bytes, computed client-side.

#### 2.1.10 Decryption + publish flow

1. Employee calls `submitRequest(...)`. Inside `submitRequest`, `_evaluatePolicy` computes `result = euint8` and stores it in `req.encStatus`. The handle is granted to: contract (`allowThis`), admin (`allow(result, admin)`), employee (`allowSender(result)`).
2. The Fhenix Threshold Network processes the FHE state asynchronously.
3. Admin (off-chain) calls `getEncryptedStatus(requestId)` to read the ciphertext handle.
4. Admin uses `@cofhe/sdk` to call `decryptForTx(handle).withPermit(permit).execute()` — the threshold network returns `{ decryptedValue: bigint, signature: Uint8Array }`. The signature is the threshold network's attestation that `decryptedValue == decrypt(handle)`.
5. Admin calls `publishDecryptedResult(requestId, plainStatus, sig)`. The contract verifies the attestation via `FHE.publishDecryptResult(req.encStatus, plainStatus, sig)` (line 544). On success: branch on `plainStatus` (NeedsReview → flag for review; else finalise).
6. Employee can independently call `decryptForView(encStatus, FheTypes.Uint8).withPermit(permit).execute()` for private reveal (see frontend `useCofhe.decryptStatus`, hooks/useCofhe.ts:41-46).

**`FHE.allow` usage today:** every encrypted handle the contract stores is granted access to (a) `this`, (b) `admin`, and where appropriate (c) the submitting employee via `allowSender`. No support today for arbitrary auditor address grants — grants are hardcoded to admin.

#### 2.1.11 Roles

- **Owner / admin:** OpenZeppelin `Ownable`. `admin = msg.sender` set at construction (line 221). Used for all `onlyOwner` writes. `admin` is also passed to `FHE.allow(..., admin)` for every encrypted handle. Note: `admin` is a separate storage variable (line 173) — `transferOwnership` would update the Ownable owner but would NOT update the `admin` storage variable. **Potential bug:** if ownership is ever transferred, the FHE grants stay with the old admin. Not exercised today.
- **Employee:** identity defined by `employeeRegistered[address]` storage. No modifier; enforced inline.
- **Observer / auditor:** **NO dedicated on-chain role.** Observer is purely a frontend concept — anyone reading public mappings.

### 2.2 `ShieldCardPolicyEngine` (Wave 3, STALE)

**File:** `contracts/ShieldCardPolicyEngine.sol` (483 lines)
**Status:** Wave 3 contract. Deployed at `0xaa4CDf8ad483445eD77e2a3F772e96A2E10ACC5a` (deployments/arb-sepolia.json). Not the production contract — but still referenced by some scripts (see §5).
**Inheritance:** `is Ownable`.
**Imports:** identical FHE imports.

**Surface summary (from `grep`):**
- 16 errors, 13 events, 1 PolicyPack struct, 1 PaymentRequest struct
- Public functions: same set as Wave 4 minus department/vendor/risk/evidence/recurring functionality
- Same FHE three-tier routing pattern in `_evaluatePolicy` (line 415)
- Same `_finaliseRequest` (line 455) with same receipt hash formula (uncertain — not verified verbatim)

Wave 3 contract has NO: department state, vendor state, risk bitmap, recurring intervals, evidence registry, dept-related events, vendor-related events.

### 2.3 Test harnesses (mocks/)

**`ShieldCardControlPlaneHarness.sol`** (52 lines, contracts/mocks/) — inherits `ShieldCardControlPlane`. Adds view functions to expose internal storage for test assertions:
- `getPackEncHardLimit(uint8)`, `getPackEncAutoThreshold(uint8)`, `getPackEncBudgetLimit(uint8)`, `getPackEncUsedBudget(uint8)`
- `getDeptEncBudgetCapInternal(uint8)`, `getDeptEncUsedBudgetInternal(uint8)`
- `getRequestRiskBitmap(uint256)`, `getRequestDeptId(uint256)`, `getRequestVendorId(uint256)`

**`ShieldCardPolicyEngineHarness.sol`** — Wave 3 equivalent. STALE.

**Both harnesses are test-only and never deployed to production.**

---

## 3. PRIVACY MODEL AS IMPLEMENTED

### 3.1 Encrypted on-chain vs plaintext on-chain

| ENCRYPTED on-chain (`euint*` / `ebool`) | PLAINTEXT / PUBLIC on-chain |
|---|---|
| `PolicyPack.encHardLimit` (euint32) | `admin` address |
| `PolicyPack.encAutoThreshold` (euint32) | `submissionsPaused` |
| `PolicyPack.encBudgetLimit` (euint32) | All employee addresses, frozen flags, dept assignments |
| `PolicyPack.encUsedBudget` (euint32) | All pack metadata (name, active, limitsSet, epochStart, packCount) |
| `Department.encBudgetCap` (euint32) | All pack counters (total, approved, denied, reviewPending) |
| `Department.encUsedBudget` (euint32) | `packRecurringInterval`, `lastSubmitTimestamp` |
| `PaymentRequest.encAmount` (euint32) | All dept metadata (name, active, budgetSet, epochStart) |
| `PaymentRequest.encStatus` (euint8) — pre-publish | All vendor data (name, status) — fully public |
| Intermediate `ebool` operands (`withinAutoThresh`, `withinHardLimit`, `withinBudget`, `autoOk`, `reviewOk`) — never stored | Every `PaymentRequest.employee` (address) |
| Intermediate `euint8` operands (`statusAuto`, `statusReview`, `statusDenied`) — never stored | Every `PaymentRequest.packId` (uint8) |
| Ciphertext handles (`bytes32`) appear on-chain but are opaque identifiers | Every `PaymentRequest.deptId` (uint8) and `vendorId` (uint16) |
| | `PaymentRequest.memo` (string) |
| | `PaymentRequest.timestamp` (uint256) |
| | `PaymentRequest.resultPublished` (bool) |
| | `PaymentRequest.publicStatus` (uint8) — visible AFTER admin publishes |
| | `PaymentRequest.inReview` (bool) |
| | `PaymentRequest.receiptHash` (bytes32) — keccak commitment |
| | `PaymentRequest.riskBitmap` (uint16) — fully public |
| | `evidenceHash[requestId]` (bytes32) — fully public |
| | `evidenceSubmitted[requestId]` (bool) |
| | All event logs |

### 3.2 Observer inference from published status

**"Needs Review" published (publicStatus = 2):**
- Inference: `encAmount > encAutoThreshold` AND `encAmount ≤ encHardLimit` AND `encUsedBudget + encAmount ≤ encBudgetLimit`.
- Observer learns: the request fell into the middle tier of FHE evaluation. The amount is bounded between the pack's auto-threshold and hard-limit. The pack budget was NOT exhausted by this request.
- Observer does NOT learn: the actual amount, the auto-threshold value, the hard-limit value, the budget-limit value, the current used-budget value. All four numeric bounds remain sealed.

**"Auto Denied" published (publicStatus = 3):**
- Inference: `encAmount > encHardLimit` OR `encUsedBudget + encAmount > encBudgetLimit`.
- Observer learns: the request was denied by FHE policy without admin intervention. Either it exceeded the absolute ceiling, or it pushed cumulative spend past the budget cap. The observer cannot distinguish which condition (or both) was true.
- Observer does NOT learn: the amount, the hard limit, the budget limit, or how close other requests are to violating either.

**"Admin Approved" (4) / "Admin Denied" (5):**
- Inference: the request was originally `Needs Review`, was published, then resolved by admin discretion.
- Observer learns: amount was between auto-threshold and hard-limit (carried over from review-pending inference) plus the admin's binary discretion.

---

## 4. TESTS

### 4.1 Total count and breakdown

| File | `it()` blocks |
|---|---|
| `test/ShieldCardControlPlane.test.ts` | 89 |
| `test/ShieldCardPolicyEngine.test.ts` | 47 |
| **Total** | **136** |

(Counted via `grep -c '    it(' test/*.test.ts` — counts only top-level `it()` blocks at 4-space indent, matching the file structure.)

README claims "136 tests passing". I started `pnpm test` in background but did not wait for completion in this report to avoid blocking. Test count claim is consistent with grep.

### 4.2 Test setup — mock vs real network — VERBATIM proof

From `test/ShieldCardControlPlane.test.ts` lines 1-8, 39-53:

```typescript
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { Encryptable, FheTypes } from "@cofhe/sdk";
import hre from "hardhat";

const TASK_COFHE_MOCKS_DEPLOY = "task:cofhe-mocks:deploy";
...
describe("ShieldCardControlPlane", function () {
  async function deployFixture() {
    await hre.run(TASK_COFHE_MOCKS_DEPLOY);

    const [admin, employee, employeeTwo, stranger] = await hre.ethers.getSigners();
    const Factory = await hre.ethers.getContractFactory("ShieldCardControlPlaneHarness");
    const plane = await Factory.connect(admin).deploy();

    const adminClient        = await hre.cofhe.createClientWithBatteries(admin);
    const employeeClient     = await hre.cofhe.createClientWithBatteries(employee);
    const employeeTwoClient  = await hre.cofhe.createClientWithBatteries(employeeTwo);
    const strangerClient     = await hre.cofhe.createClientWithBatteries(stranger);
```

**Direct conclusions from this setup:**
1. `await hre.run(TASK_COFHE_MOCKS_DEPLOY)` — explicitly runs the CoFHE mock contract deployment task from `@cofhe/hardhat-plugin`. Tests run against `@cofhe/mock-contracts`, not the real Fhenix Threshold Network.
2. `hre.ethers.getContractFactory("ShieldCardControlPlaneHarness")` — deploys the test-only harness, NOT the production `ShieldCardControlPlane`. Harness inherits all production logic but exposes internal getters.
3. `hre.cofhe.createClientWithBatteries(signer)` — the "batteries-included" client provided by the plugin for mock environments (per `tasks/utils.ts:60` comment: *"On hardhat network, use the batteries-included client (handles mock ZK verifier)"*).
4. `loadFixture` runs against the in-memory hardhat network. No RPC traffic to Arbitrum Sepolia. No CoFHE coprocessor interaction.

### 4.3 Live network test coverage

**Zero tests exercise the live Arbitrum Sepolia deployment end-to-end.** No test imports from a live RPC, no test connects to the production contract address `0x268F...9109`, no test calls the real Fhenix Threshold Network for decryption.

The only live-network interaction is via the `scripts/` directory (deploy, seed, publish-results, verify-seed) — and these are scripts, not tests.

### 4.4 What tests DO cover (89 ControlPlane tests, 47 Engine tests)

ControlPlane describe blocks (from grep of `test/ShieldCardControlPlane.test.ts`):
- `pauseSubmissions / unpauseSubmissions`, `registerEmployee`, `freezeEmployee / unfreezeEmployee`
- `createPack`, `setPolicyThresholds`, `setPackActive / resetBudgetEpoch`, `getPackIds / getActivePackIds`
- `createDept`, `setDeptBudget / resetDeptEpoch`, `assignEmployeeDept`
- `registerVendor`, `setVendorStatus`
- `submitRequest — basic`, `risk bitmap`, `setPackRecurringInterval / recurring enforcement`
- `department budget accumulation`, `FHE policy evaluation`
- `publishDecryptedResult`, `adminReviewRequest`, `submitEvidence`, `ACL`

### 4.5 What tests do NOT cover

- Live Fhenix Threshold Network behaviour (latency, failure modes, coprocessor backlog)
- Live RPC quirks (Arbitrum Sepolia reorgs, gas estimation against viaIR-compiled bytecode)
- Frontend integration tests (no Playwright, Cypress, or Vitest tests in `frontend/`)
- End-to-end employee submit → admin publish → employee reveal flow against the real contract
- Receipt hash external verification (no test recomputes `keccak256(...)` independently and asserts equality with on-chain `receiptHash`)
- Evidence flow combined with publish flow (uncertain — would need to read test bodies to confirm; describe block exists at line 1004)
- Gas regression bounds against production deployment

---

## 5. SCRIPTS

All scripts live under `scripts/` and `tasks/`. None are idempotent unless explicitly noted.

### 5.1 Script-by-script

| Script | Status | Target contract (per grep) | Description | Idempotent? |
|---|---|---|---|---|
| `scripts/deploy-control-plane.ts` | ACTIVE | `ShieldCardControlPlane` | Deploys a new instance, writes address to `deployments/<network>.json` under key `ShieldCardControlPlane`. | No — every run deploys a NEW contract. |
| `scripts/seed-control-plane.ts` | ACTIVE | `ShieldCardControlPlane` (line 105) — uses `getDeployment(network, "ShieldCardControlPlane")` (line 97) | Seeds: 4 packs (Travel, SaaS, Vendor, Marketing) with encrypted thresholds, 3 depts (Eng, Sales, Ops) with encrypted budget caps, 5 vendors (mixed compliance), 1 recurring interval on Marketing pack (7 days), 3 employees registered + dept-assigned, then 12 demo requests across employees/packs/vendors. | **Partially idempotent** — each step checks `packExists`/`deptExists`/`vendorExists`/`limitsSet` before acting and skips if already set. Submitted requests are NOT idempotent — re-running adds more requests. |
| `scripts/publish-results.ts` | **BROKEN** | **Wrong: `ShieldCardPolicyEngine`** | Lines 68, 70, 74 all reference `ShieldCardPolicyEngine`. `getDeployment(network, "ShieldCardPolicyEngine")` resolves to `0xaa4CDf...` (Wave 3 address per deployments/arb-sepolia.json). `getContractAt("ShieldCardPolicyEngine", address)` uses Wave 3 ABI. **Running `pnpm arb-sepolia:publish-results` does NOT publish results against the Wave 4 production contract.** | Idempotent in intent (checks `req.resultPublished`), but currently broken target. |
| `scripts/verify-seed.ts` | **BROKEN** | **Wrong: `ShieldCardPolicy`** (Wave 1 name) | Line 7: `getDeployment(network, "ShieldCardPolicy")`. Line 10: `getContractAt("ShieldCardPolicy", address)`. Resolves to `null` (no `ShieldCardPolicy` key in deployments/arb-sepolia.json) and throws `"No deployment found for network: arb-sepolia"`. Pure read-only intent but cannot execute. | Read-only intent. Doesn't run at all. |
| `scripts/deploy.ts` | STALE (Wave 1) | `ShieldCardPolicy` | Wave 1 deploy. Not in active package.json scripts. | n/a |
| `scripts/deploy-engine.ts` | STALE (Wave 3) | `ShieldCardPolicyEngine` | Wave 3 deploy. Not in active package.json scripts. | n/a |
| `scripts/seed-demo.ts` | STALE (Wave 1) | `ShieldCardPolicy` (uses hardcoded `SHIELDCARD_ADDRESS` env fallback at line 123-148) | Wave 1 seed. Not in active package.json scripts. | n/a |
| `scripts/seed-engine.ts` | STALE (Wave 3) | `ShieldCardPolicyEngine` (hardcoded `ENGINE_ADDRESS`, line 75) | Wave 3 seed. Not in active package.json scripts. | n/a |

### 5.2 `tasks/`

| File | Contents |
|---|---|
| `tasks/index.ts` | `export {}` — empty. No custom hardhat tasks registered. |
| `tasks/utils.ts` | Exports `saveDeployment(network, contractName, address)`, `getDeployment(network, contractName)`, `createCofheClient(hre, signer)` — handles MOCK vs node environments. On MOCK chain: uses `hre.cofhe.createClientWithBatteries`. On real chain: builds a `viem` `walletClient` from raw private key extracted from ethers Wallet, then creates the SDK client and a self-permit. |

### 5.3 Active flows per package.json scripts

```
pnpm test                        → REPORT_GAS=true hardhat test            (runs mock-based tests)
pnpm compile                     → hardhat compile
pnpm arb-sepolia:deploy          → hardhat run scripts/deploy-control-plane.ts --network arb-sepolia
pnpm arb-sepolia:seed-demo       → hardhat run scripts/seed-control-plane.ts --network arb-sepolia
pnpm arb-sepolia:publish-results → hardhat run scripts/publish-results.ts --network arb-sepolia   ← BROKEN target
pnpm arb-sepolia:verify-seed     → hardhat run scripts/verify-seed.ts --network arb-sepolia      ← BROKEN target
pnpm arbitrumSepolia:deploy / :seed-demo                                                          ← alias network name
pnpm base-sepolia:deploy                                                                          ← Base alternative
```

### 5.4 Critical script defect — confirmed

**`publish-results.ts` and `verify-seed.ts` both reference the wrong contract.** The deployment file has BOTH `ShieldCardPolicyEngine` (Wave 3, `0xaa4CDf...`) and `ShieldCardControlPlane` (Wave 4, `0x268F...`) entries. Scripts must be corrected to reference `ShieldCardControlPlane` (and `ShieldCardControlPlane` ABI) before publish-results can produce any effect on the live product. This is the single largest production blocker — every downstream UX feature (admin review, employee reveal of decided outcomes, settlement receipts populated, observer status changes) is gated on this fix.

---

## 6. FRONTEND

### 6.1 Routes

| Route | File | Purpose |
|---|---|---|
| `/` | `frontend/app/page.tsx` | Landing — HeroSection, Wave4Strip, ArchitectureSection, HowItWorks, ProblemSection, CtaStrip |
| `/app` | `frontend/app/app/page.tsx` | Role gateway — uses `useRoleRouting` to redirect to `/admin` or `/employee` based on wallet |
| `/admin` | `frontend/app/admin/page.tsx` | Admin cockpit — RequestStream, EmployeeManagement, PolicyPackManager, VendorPanel; pause/unpause controls |
| `/employee` | `frontend/app/employee/page.tsx` | Employee workspace — RequestComposer (submit), RequestHistory (own requests), RevealCard (private permit decrypt) |
| `/observer` | `frontend/app/observer/page.tsx` | Public audit — RequestTable, PackSummary, VendorPanel, PrivacyExplainer |

Static export — `output: "export"` (frontend/next.config.mjs:3). No SSR.

### 6.2 Key components — see §1.1 tree for full inventory.

### 6.3 State management

- **Server-state / on-chain data:** `@tanstack/react-query` (provider wired in `Web3Provider.tsx`). All contract reads flow through `useShieldCard.ts` which exposes named `useQuery` hooks: `roleQuery`, `requestsQuery` (15s refetchInterval), `packsQuery`, `deptsQuery`, `vendorsQuery`, `globalStateQuery`.
- **Local UI state:** `useState`/`useReducer` only. No Redux, Zustand, or Recoil.
- **CoFHE client:** lives in `CofheProvider.tsx` context; consumed via `useCofhe()` hook.
- **Wallet state:** via `wagmi` hooks (`useAccount`, `useChainId`, `useWriteContract`, `usePublicClient`).

### 6.4 Wallet + CoFHE integration

**Wallet:** RainbowKit + wagmi v2 + viem v2 in `frontend/providers/Web3Provider.tsx`. Chain pinned to `arbitrumSepolia` (`frontend/lib/contracts.ts:8`).

**CoFHE SDK loading:** `frontend/hooks/useCofhe.ts:7-12` — lazy dynamic import:
```typescript
let sdkPromise: Promise<typeof import("@cofhe/sdk")> | null = null;
function getCofheSdk() {
  sdkPromise ??= import("@cofhe/sdk");
  return sdkPromise;
}
```

**Encryption (in-browser, client-side):** `useCofhe.encryptAmount(amountInCents)` (lines 22-39) — calls `client.encryptInputs([Encryptable.uint32(BigInt(amountInCents))]).execute()`. The plaintext amount is in browser memory at submission time. After `encryptInputs`, only the ciphertext handle is passed to the contract.

**Decryption — TWO paths:**

1. **`decryptStatus(ctHash)`** (lines 41-46) — for VIEW only. Used by `RevealCard` for employee private reveal:
   ```typescript
   const permit = await client.permits.getOrCreateSelfPermit();
   return client.decryptForView(ctHash, FheTypes.Uint8).withPermit(permit).execute();
   ```
   Client-side via permit. No admin involvement. Decrypted value never leaves the employee's browser.

2. **`decryptForPublish(ctHash)`** (lines 48-52) — used by admin to obtain the threshold-network signature needed to call `publishDecryptedResult` on-chain:
   ```typescript
   const permit = await client.permits.getOrCreateSelfPermit();
   return client.decryptForTx(ctHash).withPermit(permit).execute();
   ```
   Returns `{ decryptedValue, signature }`. Admin's wallet signs the permit; the threshold network returns the signature that the contract uses to verify the result.

**No backend key is involved in either path.** All cryptographic operations happen in the user's browser, mediated by their connected wallet and the CoFHE SDK.

### 6.5 Employee private reveal — step-by-step UI

`frontend/components/employee/RevealCard.tsx`:
1. Initial render: phase = `"sealed"`. UI shows `Lock` icon, "Outcome sealed on-chain — permit to reveal" text, and a `Reveal` button. Button disabled unless `canReveal` prop is true.
2. Employee clicks Reveal → `handleReveal()` runs (line 52). Phase → `"unlocking"`. Three concentric pulsing circles animate via Framer Motion (lines 105-118).
3. `onDecrypt(requestId, encStatus)` is called — this is wired to `useCofhe.decryptStatus(encStatus)` (frontend/app/employee/page.tsx). The wallet prompts the user to sign a permit (EIP-712 typed-data signature).
4. CoFHE SDK sends signed permit to threshold network; network returns the decrypted `uint8` status value.
5. Phase → `"revealed"`. Animated `CheckCircle` / `ClipboardCheck` / `XCircle` icon based on status code; label rendered ("Auto Approved", "Needs Review", "Auto Denied", "Approved", "Denied").
6. If `receiptHash` is set and non-zero AND status is published, a "Receipt" toggle appears. Clicking shows receipt detail card: Request ID, Pack (currently bound to `memo` — see §9 bug list), Outcome, Network, Receipt hash. An "Export JSON" button writes a small JSON blob and triggers download.

### 6.6 Where amounts are handled in plaintext on the client

- **`RequestComposer.tsx`** — employee types amount in a text input, parsed to cents (number). The number lives in React state until `encryptAmount` is called. After encryption, only the ciphertext handle goes to the contract.
- **`useCofhe.encryptAmount(amountInCents: number)`** — accepts `number`, converts to `BigInt`, encrypts immediately and returns the ciphertext handle.
- **`PolicyPackManager.tsx`** (admin) — admin types pack thresholds in plaintext; encrypted before being passed to `setPolicyThresholds`.
- **`SealedValue.tsx`** — displays only the truncated ciphertext handle (never decrypts).
- **`RevealCard`** — after successful permit decrypt, the plaintext status integer is held in `result` state (uint 1-5). The plaintext amount itself is NEVER decrypted by `RevealCard` — only the status code is.

---

## 7. DEPLOYMENT & CONFIG

### 7.1 Netlify

**`netlify.toml` (root, the live config):**
```
[build]
  base = "frontend"
  command = "pnpm build"
  publish = "out"

[build.environment]
  NODE_VERSION = "20"
```
With cache headers for `*.html` (no-store) and `/_next/static/*` (immutable, max-age=31536000).

**`frontend/.netlify/netlify.toml`** — Netlify CLI-managed local override containing absolute paths (`/Users/vinaysharma/shieldcard-clean-rebuild/frontend/...`). This file is local to the developer's machine and not committed (note: actually it appears in tree but is plugin-generated; not the source of truth in production).

### 7.2 Environment variables (names only)

**Root `.env.example`** (committed):
```
PRIVATE_KEY
EMPLOYEE_A_PRIVATE_KEY
EMPLOYEE_B_PRIVATE_KEY
EMPLOYEE_C_PRIVATE_KEY
ARB_SEPOLIA_RPC_URL
ARBISCAN_API_KEY
ETHERSCAN_API_KEY
BASE_SEPOLIA_RPC_URL (defaulted)
BASESCAN_API_KEY
```

**Frontend `.env.local`** (gitignored, names verified):
```
NEXT_PUBLIC_SHIELDCARD_ADDRESS
NEXT_PUBLIC_ARB_SEPOLIA_RPC_URL
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
```

`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set as a key but with empty value in `.env.local` (verified earlier in session). Mobile wallet support likely degraded.

### 7.3 Networks, RPCs, chain IDs

| Network | Source | chainId | RPC URL source |
|---|---|---|---|
| `hardhat` (default) | hardhat.config.ts:21 | local | in-process |
| `localcofhe` | auto-injected by `@cofhe/hardhat-plugin` | local | plugin-managed |
| `eth-sepolia` | auto-injected by plugin | 11155111 | plugin-managed |
| `arb-sepolia` | auto-injected by plugin | 421614 | plugin-managed |
| `arbitrumSepolia` | hardhat.config.ts:25-32 | 421614 | `process.env.ARB_SEPOLIA_RPC_URL` |
| `base-sepolia` | hardhat.config.ts:35-42 | 84532 | `process.env.BASE_SEPOLIA_RPC_URL` or default `https://sepolia.base.org` |

### 7.4 Contract addresses

- **`deployments/arb-sepolia.json`:**
  - `ShieldCardPolicyEngine: 0xaa4CDf8ad483445eD77e2a3F772e96A2E10ACC5a` (Wave 3, stale, still referenced by `publish-results.ts`)
  - `ShieldCardControlPlane: 0x268F3506639a570Fe388464D915188F484A89109` (Wave 4, production)
- **Frontend (`frontend/lib/contracts.ts:4-6`):** reads from `process.env.NEXT_PUBLIC_SHIELDCARD_ADDRESS` — **not hardcoded.** Falls back to `undefined` if env not set.
- **`targetChain`:** hardcoded to `arbitrumSepolia` from `wagmi/chains` (frontend/lib/contracts.ts:8).
- **README** displays `0x268F3506639a570Fe388464D915188F484A89109` in the contract badge and several tables.

---

## 8. FEASIBILITY ANSWERS

### 8.1 Per-ciphertext-handle access grants via `FHE.allow(handle, address)` — auditor decryption?

**Yes, the deployed CoFHE version supports per-handle access grants to arbitrary addresses.**

Evidence:
- `@fhenixprotocol/cofhe-contracts ^0.1.3` (resolved 0.1.3) exposes `FHE.allow(euint*, address)` — used 8 times in production code at lines 307-310 (`setPolicyThresholds`), 332 (`resetBudgetEpoch`), 378-379 (`setDeptBudget`), 393 (`resetDeptEpoch`), 505 (dept budget accumulation), 756 (`_evaluatePolicy` for `pack.encUsedBudget`), 759 (`_evaluatePolicy` for `result`). The current contract always grants to `admin`.
- `FHE.allowThis(handle)` grants to `address(this)` — used alongside every `allow(admin)`.
- `FHE.allowSender(handle)` grants to `msg.sender` — used at lines 480, 760 (employee gets access to their own amount and result).
- `@cofhe/sdk ^0.5.2` (verified in lockfile and in `useCofhe.ts:48-52`) supports `decryptForView(handle, type).withPermit(permit).execute()` and `decryptForTx(handle).withPermit(permit).execute()` from any address that holds a valid permit AND has been granted access to the handle.

**Therefore:** an `Auditor` role could be added by:
1. Storing an auditor address (e.g., `address public auditor;`).
2. Adding a setter (`setAuditor(address)` `onlyOwner`).
3. Modifying every `FHE.allow(..., admin)` site to also call `FHE.allow(..., auditor)` for the request-relevant handles.
4. Adding a function like `grantAuditorAccess(uint256 requestId)` that re-grants `encAmount` and `encStatus` to the auditor address per request (necessary for handles created in `submitRequest` where the auditor wasn't known yet).

Granting at creation time vs after-the-fact: the FHE.allow grant must occur in a transaction that the contract controls. Post-hoc grants ARE supported via dedicated functions (the contract reads the stored handle and calls `FHE.allow(handle, newAddress)` itself).

**Caveat — not verified:** whether `FHE.allow` can be called by the contract on a handle stored from a prior tx without re-asserting `allowThis` first. Source-level evidence suggests yes (the contract already calls `FHE.allow(pack.encUsedBudget, admin)` at line 756 after the handle is already in storage). But this should be confirmed against the `@fhenixprotocol/cofhe-contracts` source or a small integration test before relying on it for Wave 5 auditor design.

### 8.2 Companion contract reading request status / receipt hash from `ShieldCardControlPlane`?

**Yes — clean external reads available, no contract changes required.**

The needed view functions are all `external view`:

| Function | Signature | Returns |
|---|---|---|
| `getRequest(uint256 requestId)` | line 672 | 13-tuple including `employee`, `packId`, `deptId`, `vendorId`, `encAmount`, `encStatus`, `memo`, `timestamp`, `resultPublished`, `publicStatus`, `inReview`, `receiptHash`, `riskBitmap` |
| `getRequestCount()` | line 710 | `uint256` |
| `getEmployeeRequestIds(address)` | line 714 | `uint256[]` |
| `evidenceHash(uint256)` | auto-generated from `mapping` line 213 | `bytes32` |
| `evidenceSubmitted(uint256)` | auto-generated from `mapping` line 214 | `bool` |

**Recipient address:** there is NO `recipient` field on `PaymentRequest`. The only address stored is `employee`. A settlement vault would need to either (a) take recipient as a parameter to its `settle()` call, OR (b) maintain its own `requestRecipient` mapping.

**Status field of interest:** `publicStatus` (uint8, 1-5). Only meaningful when `resultPublished == true`. The vault must guard against `publicStatus == 0` (Submitted, unpublished).

**Recommended interface for a companion contract:**
```solidity
interface IShieldCardControlPlane {
    function getRequest(uint256 requestId) external view returns (
        address employee,
        uint8 packId,
        uint8 deptId,
        uint16 vendorId,
        /* euint32 */ uint256 encAmount,    // cannot be expressed in standard ABI
        /* euint8 */  uint256 encStatus,
        string memory memo,
        uint256 timestamp,
        bool resultPublished,
        uint8 publicStatus,
        bool inReview,
        bytes32 receiptHash,
        uint16 riskBitmap
    );
    function getRequestCount() external view returns (uint256);
    function evidenceHash(uint256) external view returns (bytes32);
    function evidenceSubmitted(uint256) external view returns (bool);
    function admin() external view returns (address);
}
```

**Caveat — uncertain:** how Solidity exposes `euint32` / `euint8` to an external `interface`. The types are user-defined value types from the cofhe-contracts package. An interface defined in a separate file may need to import the same types, or cast to `uint256`. Not verified.

### 8.3 Per-transition events for indexers / companion consumption?

**Yes — comprehensive per-transition events exist.** Companion contracts or off-chain indexers can subscribe to:

| Lifecycle stage | Event | Indexed args |
|---|---|---|
| Pack created | `PackCreated(uint8 indexed, string)` | packId |
| Pack thresholds set | `PackLimitsSet(uint8 indexed)` | packId |
| Pack active toggled | `PackActiveChanged(uint8 indexed, bool)` | packId |
| Pack budget reset | `BudgetEpochReset(uint8 indexed, uint256)` | packId |
| Pack interval set | `PackIntervalSet(uint8 indexed, uint256)` | packId |
| Dept created | `DeptCreated(uint8 indexed, string)` | deptId |
| Dept active toggled | `DeptActiveChanged(uint8 indexed, bool)` | deptId |
| Dept budget set | `DeptBudgetSet(uint8 indexed)` | deptId |
| Dept budget reset | `DeptEpochReset(uint8 indexed, uint256)` | deptId |
| Vendor registered | `VendorRegistered(uint16 indexed, string)` | vendorId |
| Vendor status changed | `VendorStatusUpdated(uint16 indexed, uint8)` | vendorId |
| Employee registered | `EmployeeRegistered(address indexed)` | employee |
| Employee frozen/unfrozen | `EmployeeFrozen(address indexed)` / `EmployeeUnfrozen(address indexed)` | employee |
| Employee dept assigned | `EmployeeDeptAssigned(address indexed, uint8)` | employee |
| Request submitted | `RequestSubmitted(uint256 indexed, address indexed, uint8, uint256)` | requestId, employee |
| Request flagged for review | `RequestNeedsReview(uint256 indexed, address indexed, uint8)` | requestId, employee |
| Admin resolved review | `AdminResolved(uint256 indexed, bool)` | requestId |
| Result published / finalised | `ResultPublished(uint256 indexed, uint8)` | requestId |
| Evidence submitted | `EvidenceSubmitted(uint256 indexed, bytes32)` | requestId |
| Submissions paused/unpaused | `SubmissionsPausedEvent()` / `SubmissionsUnpausedEvent()` | none |

**Gap:** no `SettlementExecuted` event today. Wave 5 settlement vault would emit its own event in its own contract — not in `ShieldCardControlPlane`.

### 8.4 ERC-20 test token / canonical USDC on Arbitrum Sepolia

**No code in this repo references any ERC-20.** Cannot verify from the repository itself.

External knowledge (uncertain, not verified from authoritative source today):
- Circle deploys a canonical USDC.e on Arbitrum Sepolia at `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` — uncertain version of address. There is a Circle faucet for testnet USDC. Verify against Circle's official documentation before relying on this.
- Bridged USDC from Ethereum Sepolia is also commonly seen on Arbitrum Sepolia testnet.

**Recommendation:** for Wave 5 settlement, **deploy your own `MockERC20` (or use event-only settlement with no token transfer at all).** Deploying a tiny `MockUSDC` is ~20 lines, eliminates faucet dependencies, and removes the risk that a public faucet rate-limits the demo. Event-only settlement (no actual transfer) is the cleanest path and removes the ERC-20 question entirely.

### 8.5 Existing settlement, payout, or value-transfer code in the repo?

**No.** Confirmed: zero references to `ERC20`, `IERC20`, `transfer(`, `payout`, `settle`, or `vault` in `contracts/`, `scripts/`, or `frontend/`. The repo has no value-transfer code. Settlement is a greenfield Wave 5 area.

### 8.6 Field for `prevPacketHash` / hash-chain / decision-trace string?

**No.** No fields exist today that could carry a previous-packet pointer or a decision-trace string.

The closest existing public commitments:
- `receiptHash` (bytes32 per request) — but it's purely a per-request fingerprint, not chained.
- `evidenceHash` (bytes32 per request) — caller-supplied, no chaining.

To add hash-chaining (e.g., "each packet references the previous packet's receipt hash so an external auditor can detect any retroactive insertion") would require either:
1. A new contract storage variable (`bytes32 public lastReceiptHash;`) updated each `_finaliseRequest`, with chain-link incorporated into the next receipt hash.
2. A companion `ShieldCardAuditChain` contract that listens (or is called) and maintains its own chained log.

Decision-trace strings (e.g., `"FHE.lte(amount, autoThresh)=true; FHE.lte(newUsed, budget)=true → AUTO"`) cannot honestly be reconstructed from ciphertext on-chain. The contract doesn't even know plaintext at evaluation time — only `req.encStatus` (encrypted) is computed. The plaintext trace would have to be reconstructed off-chain after the admin's decrypt-publish, and would essentially be inferred from `publicStatus` — adding no new information beyond what `publicStatus` already conveys.

---

## 9. RISKS, DEAD CODE, AND BRITTLENESS

### 9.1 Confirmed bugs

1. **`scripts/publish-results.ts` lines 68, 70, 74** — references `ShieldCardPolicyEngine` instead of `ShieldCardControlPlane`. Running `pnpm arb-sepolia:publish-results` operates on the Wave 3 contract (0 requests) instead of the Wave 4 production contract (12 unpublished requests). The 12 seeded production requests have never had their FHE-computed outcomes published.
2. **`scripts/verify-seed.ts` lines 7, 10** — references `ShieldCardPolicy` (Wave 1 name). `getDeployment` returns null. Script throws on every invocation: `"No deployment found for network: <name>"`. `pnpm arb-sepolia:verify-seed` cannot run.
3. **`frontend/components/employee/RevealCard.tsx` line 229** — receipt JSON export labels `memo` as "Pack":  
   `{ label: "Pack", value: memo }`. Should resolve `req.packId` to a pack name via `PACK_NAME[req.packId]`.
4. **Observer `RequestTable.tsx` line 78** — department column shows `Dept #${req.deptId}` literal, not the dept name. `getDeptInfo` returns the name but is not joined per-row. Same issue likely in other tables.
5. **`getRequest` does not return `evidenceHash` / `evidenceSubmitted`** — these are stored in separate public mappings (lines 213-214) but the request struct does not include them. Frontend cannot display evidence status alongside request data without an additional per-request RPC call.
6. **`admin` storage variable vs OZ `Ownable` owner divergence** — `admin = msg.sender` is set in constructor (line 221) but NEVER updated. If `transferOwnership(newOwner)` is ever called (Ownable supports this), the `admin` variable becomes stale and all `FHE.allow(..., admin)` grants continue going to the old admin. No tests exercise `transferOwnership`. Not currently triggered, but a latent footgun.

### 9.2 Dead code / stale artifacts

- `contracts/ShieldCardPolicyEngine.sol` — Wave 3 contract, still tracked.
- `contracts/mocks/ShieldCardPolicyEngineHarness.sol` — Wave 3 harness, still tracked.
- `test/ShieldCardPolicyEngine.test.ts` — 47 Wave 3 tests still passing, contributing to "136 passing" total.
- `scripts/deploy.ts` — Wave 1 stub, not in active package.json scripts.
- `scripts/deploy-engine.ts` — Wave 3 deploy, not in active scripts.
- `scripts/seed-demo.ts` — Wave 1 seed.
- `scripts/seed-engine.ts` — Wave 3 seed.
- `deployments/arb-sepolia.json` still contains the `ShieldCardPolicyEngine` key (Wave 3 address). Removing this entry would prevent the broken `publish-results.ts` and `verify-seed.ts` from resolving to it — but the scripts are also wrong.
- `frontend/components/landing/Wave4Strip.tsx` — hardcoded "Wave 4" eyebrow language. Wave 5 narrative work needs to revisit this and potentially remove version-numbered language entirely.
- `frontend/lib/constants.ts` contains a copy of `STATUS_*` constants that duplicates `frontend/lib/contracts.ts`. Both are imported in different places. Renaming one without the other would break imports.

### 9.3 Brittle / fragile areas

1. **`viaIR: true` in hardhat config** — required for `ShieldCardControlPlane` stack depth. Removing it would break compilation of `_evaluatePolicy`. Do not change.
2. **`@cofhe/sdk` version pinning** — both root (hardhat) and frontend must stay at `0.5.2`. Mismatched versions broke testnet prover format previously (git log: "fix: upgrade @cofhe/sdk to 0.5.2 in frontend to match testnet prover format").
3. **`createCofheClient` in `tasks/utils.ts:50-110`** — manually extracts raw private key from ethers Wallet to bypass HTTP-provider signer limitations. If hardhat ethers signer internals change, this breaks. Comment in source: *"Use viem privateKeyToAccount instead of hardhatSignerAdapter so that eth_signTypedData_v4 (needed for permits) is handled locally rather than forwarded to the Hardhat HTTP provider which does not support it."*
4. **`scripts/publish-results.ts:5-47` and `scripts/seed-control-plane.ts:18-50`** — hand-rolled `nativeFetch` override using Node `https` module, replacing global `fetch`. Comment: *"Node v20+ built-in fetch drops TLS connections to the Fhenix CoFHE VRF verifier."* This is fragile against Node runtime changes.
5. **`getRequest` returns 13 fields and the frontend parses by positional index** (`useShieldCard.ts:108-120`). Any reorder or addition to the contract's `getRequest` return tuple silently breaks the frontend without compilation error. Coupled.
6. **`frontend/lib/contracts.ts` ABI is hand-maintained** — drift between Solidity ABI and frontend ABI is silent.
7. **No CI** — no `.github/workflows`. Lint/test/build are not enforced before merge.

### 9.4 What MUST NOT be touched to keep 136 tests green

1. `contracts/ShieldCardControlPlane.sol` — every public function signature, every error name, every event signature, every storage variable. The harness inherits and exposes internals; tests rely on the exact layout.
2. `contracts/ShieldCardPolicyEngine.sol` — entire file. 47 tests still depend on it.
3. `contracts/mocks/ShieldCardControlPlaneHarness.sol` — harness function names.
4. `contracts/mocks/ShieldCardPolicyEngineHarness.sol` — same.
5. `tasks/utils.ts` — `createCofheClient` MOCK branch path (line 60-62).
6. `hardhat.config.ts` — Solidity version, `viaIR: true`, optimizer settings, CoFHE plugin import.
7. Package.json devDeps — `@cofhe/hardhat-plugin`, `@cofhe/sdk`, `@cofhe/mock-contracts`, `@fhenixprotocol/cofhe-contracts` versions.

Safe to change without breaking tests: README, brand-assets, frontend (no frontend tests exist), the 4 stale scripts, the `arb-sepolia.json` deployment file (no test reads it), `package.json` scripts section.

---

## 10. GIT & WORKFLOW

### 10.1 Branch and history

- **Current branch:** `master`
- **Last 20 commit subjects (newest first):**

```
eb64759 docs: finalize Wave 4 presentation — README, architecture SVG, privacy model, env example
ecfbc70 feat(frontend): Wave 4 landing polish — hero stats, Wave4Strip, architecture FHE ops, admin risk metric
bef3996 fix(seed): use employeeA for Marketing pack request #11 to avoid recurring interval block
685e016 feat: Wave 4 — ShieldCardControlPlane with departments, vendors, risk bitmap, and FHE policy engine
ae4488d docs: elevate README and product documentation
bd4ea07 fix employee page: CoFHE timeout and resilient request loading
6fa62cf docs: update README to ShieldCardPolicyEngine and fix contract address
e620421 fix: cache-control headers and chunk reload recovery for production
6d5d569 chore: update publish-results script for ShieldCardPolicyEngine
04455ae fix: netlify.toml publish path relative to base
2d14d63 feat: expand ShieldCard confidential policy operations
53a9e82 fix: upgrade @cofhe/sdk to 0.5.2 in frontend to match testnet prover format
2078296 fix: stabilize production demo — favicon, error states, RPC timeout
ea855f2 docs: correct public privacy model copy
affb1bc feat: add confidential policy pack system
377cd04 fix: improve employee submit gas estimation and wallet status
80c4921 perf: reduce employee submit latency before wallet prompt
41db7f4 feat: harden demo reliability and improve repository presentation
a0b1438 chore: prepare ShieldCard release and Netlify deployment
(... 1 older commit)
```

**Note:** commit `6d5d569 chore: update publish-results script for ShieldCardPolicyEngine` is the commit that introduced the still-present bug in `publish-results.ts`. The script was correctly updated to target Wave 3 at the time, but was never re-pointed at the Wave 4 contract after `685e016` shipped `ShieldCardControlPlane`.

### 10.2 Commit authorship

Per session history (verified earlier): all reachable commits authored as `Vinay <vinay11123sharma@gmail.com>`. No `Co-Authored-By` lines, no Claude/Anthropic/bot attribution. Pattern is enforced manually via `git commit-tree` flow (per project convention).

### 10.3 CI

**None.** No `.github/workflows/` directory. No CircleCI, GitLab CI, Travis, or Buildkite config in the repo. Netlify auto-deploys on push to `master` but does not run tests — only `pnpm build` in the `frontend/` workspace.

---

## OPEN QUESTIONS FOR THE REVIEWER

Items I could not determine from source and that should be answered before Wave 5 planning concludes:

1. **`FHE.allow` re-grants for new addresses on existing stored handles** — is `FHE.allow(handle, newAddress)` callable by the contract after the handle has been stored from a prior tx, without re-asserting `allowThis`? Verbal/source evidence suggests yes (line 756 grants `pack.encUsedBudget` to admin after it's already stored), but auditor-role design depends on confirming this for `encAmount` and `encStatus` handles on `_requests[]`.

2. **Interface declaration for `euint32` / `euint8` in a companion contract** — can a separate `IShieldCardControlPlane` interface in a different file import the same user-defined value types from `@fhenixprotocol/cofhe-contracts/FHE.sol`? Or do the encrypted slots in `getRequest`'s return tuple need to be expressed as `uint256` placeholders? Not verified.

3. **`FHE.publishDecryptResult` signature verification semantics** — the contract trusts the `sig` arg supplied by admin. Is there an on-chain check that the signature actually corresponds to the threshold network's public key? If so, where does the contract know the threshold network's public key from? (Likely embedded in `@fhenixprotocol/cofhe-contracts` precompile, but not verified.)

4. **CoFHE coprocessor backlog / SLA on Arbitrum Sepolia** — if `decryptForTx` is called immediately after `submitRequest` lands on chain, is the encrypted result guaranteed to be available, or is there a deferred settlement window? The `publish-results.ts` script's `try/catch` around `decryptForTx` and its early break on failure suggest the script author has seen the network not be ready yet. What is the typical wait time? Not verified.

5. **`@cofhe/sdk` permit lifecycle** — does `getOrCreateSelfPermit()` produce a permit that remains valid across sessions, or does it require fresh signing per browser session? Affects employee reveal UX.

6. **OpenZeppelin `Ownable.transferOwnership` vs custom `admin` variable divergence** — if Wave 5 introduces multi-admin or admin rotation, does the contract need a public `setAdmin` function that ALSO updates every existing handle's grants? Or is a fresh deploy preferred?

7. **Netlify build env** — confirmed `NEXT_PUBLIC_SHIELDCARD_ADDRESS` and `NEXT_PUBLIC_ARB_SEPOLIA_RPC_URL` are set in Netlify env (per earlier session). Is `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` intentionally empty, or forgotten? Affects WalletConnect mobile flows.

8. **Whether the 12 seeded production requests can be safely published in the current threshold-network state** — the requests were seeded 7+ days ago. Is there a publication deadline / TTL on encrypted handles in CoFHE? Not verified. Failing to publish stale handles would force a re-seed.

9. **Whether `submitEvidence` can be called BEFORE `publishDecryptedResult`** — reading the contract code (line 521-529): the function only checks `requestId < _requests.length` and `req.employee == msg.sender`, NOT whether the request is finalised. So evidence can be attached at any time after submit. This may be desirable (employee can attach receipt upfront) or undesirable (audit packets generated pre-finalisation contain only partial data). Product decision needed.

10. **Wave 3 contract retention strategy** — keeping `ShieldCardPolicyEngine.sol` and its 47 tests bloats the surface area and creates the `publish-results.ts` mis-targeting risk. Is there a reason to retain the Wave 3 contract source and tests, or can both files plus the related scripts/harness be removed in Wave 5 cleanup?

---

**End of report.**
