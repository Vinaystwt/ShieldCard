/**
 * seed-control-plane.ts
 * Seeds ShieldCardControlPlane on Arbitrum Sepolia with rich Wave 4 state:
 *   - 4 policy packs (Travel, SaaS, Vendor, Marketing)
 *   - 3 departments (Engineering, Sales, Operations)
 *   - 5 vendors with mixed compliance status
 *   - Recurring intervals on select packs
 *   - 3 employees registered and assigned to departments
 *   - 12 requests spanning all tiers, departments, vendors, and risk scenarios
 */

import { Wallet } from "ethers";
import { Encryptable } from "@cofhe/sdk";
import hre from "hardhat";

// Node v20+ built-in fetch drops TLS connections to the Fhenix CoFHE VRF verifier.
import * as https from "https";
import * as http from "http";

const nativeFetch: typeof fetch = (input, init) => {
  return new Promise((resolve, reject) => {
    const url = new URL(typeof input === "string" ? input : (input as Request).url);
    const options: any = {
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname + url.search,
      method: init?.method ?? "GET",
      headers: { ...(init?.headers as Record<string, string> ?? {}) },
      agent: new https.Agent({ keepAlive: false }),
    };
    const bodyStr = typeof init?.body === "string" ? init.body : undefined;
    if (bodyStr) options.headers["Content-Length"] = Buffer.byteLength(bodyStr).toString();

    const mod = url.protocol === "https:" ? https : http;
    const req = mod.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () =>
        resolve(new Response(Buffer.concat(chunks), {
          status: res.statusCode ?? 200,
          headers: res.headers as Record<string, string>,
        })),
      );
    });
    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
};
(globalThis as any).fetch = nativeFetch;

import { createCofheClient, getDeployment } from "../tasks/utils";

// ── Config ──────────────────────────────────────────────────────────────────

const PACKS = [
  { id: 1, name: "Travel",    hardLimit: 200_000n, autoThreshold: 50_000n,  budgetLimit: 2_000_000n },
  { id: 2, name: "SaaS",      hardLimit: 150_000n, autoThreshold: 30_000n,  budgetLimit: 1_000_000n },
  { id: 3, name: "Vendor",    hardLimit: 300_000n, autoThreshold: 100_000n, budgetLimit: 3_000_000n },
  { id: 4, name: "Marketing", hardLimit: 100_000n, autoThreshold: 25_000n,  budgetLimit: 800_000n  },
];

const DEPTS = [
  { id: 1, name: "Engineering", budgetCap: 5_000_000n },
  { id: 2, name: "Sales",       budgetCap: 3_000_000n },
  { id: 3, name: "Operations",  budgetCap: 2_000_000n },
];

// Vendor status: 0=Unchecked, 1=Compliant, 2=Suspended, 3=Banned
const VENDORS = [
  { id: 1, name: "Acme Travel Co",       status: 1 }, // Compliant
  { id: 2, name: "Globex Solutions",     status: 1 }, // Compliant
  { id: 3, name: "Initech Software",     status: 0 }, // Unchecked (new)
  { id: 4, name: "Umbrella Consulting",  status: 2 }, // Suspended
  { id: 5, name: "Stark Industries",     status: 3 }, // Banned
];

// Recurring interval on Marketing pack: 7 days minimum
const RECURRING_INTERVALS = [
  { packId: 4, intervalSeconds: 7 * 24 * 3600 },
];

async function main() {
  const [admin] = await hre.ethers.getSigners();

  const empAKey = process.env.EMPLOYEE_A_PRIVATE_KEY;
  const empBKey = process.env.EMPLOYEE_B_PRIVATE_KEY;
  const empCKey = process.env.EMPLOYEE_C_PRIVATE_KEY;
  if (!empAKey || !empBKey || !empCKey) {
    throw new Error("Missing EMPLOYEE_A_PRIVATE_KEY, EMPLOYEE_B_PRIVATE_KEY, or EMPLOYEE_C_PRIVATE_KEY");
  }

  const employeeA = new Wallet(empAKey, hre.ethers.provider);
  const employeeB = new Wallet(empBKey, hre.ethers.provider);
  const employeeC = new Wallet(empCKey, hre.ethers.provider);

  const contractAddress = getDeployment(hre.network.name, "ShieldCardControlPlane");
  if (!contractAddress) throw new Error(`No ShieldCardControlPlane deployment found for network: ${hre.network.name}`);
  console.log(`Admin:      ${admin.address}`);
  console.log(`Employee A: ${employeeA.address} (Engineering)`);
  console.log(`Employee B: ${employeeB.address} (Sales)`);
  console.log(`Employee C: ${employeeC.address} (Operations)`);
  console.log(`Contract:   ${contractAddress}\n`);

  const plane = await hre.ethers.getContractAt("ShieldCardControlPlane", contractAddress, admin);

  // ── 1. Create policy packs ─────────────────────────────────────────────────
  console.log("[1] Creating policy packs...");
  for (const pack of PACKS) {
    const exists = await (plane as any).packExists(pack.id);
    if (!exists) {
      const tx = await (plane as any).createPack(pack.id, pack.name);
      await tx.wait();
      console.log(`  ✓ Pack ${pack.id}: ${pack.name}`);
    } else {
      console.log(`  → Pack ${pack.id} already exists`);
    }
  }

  // ── 2. Set encrypted thresholds ────────────────────────────────────────────
  console.log("\n[2] Setting encrypted policy thresholds...");
  const adminClient = await createCofheClient(hre, admin);

  for (const pack of PACKS) {
    const [, , limitsSet] = await (plane as any).getPackInfo(pack.id);
    if (!limitsSet) {
      const [encHard, encAuto, encBudget] = await adminClient
        .encryptInputs([
          Encryptable.uint32(pack.hardLimit),
          Encryptable.uint32(pack.autoThreshold),
          Encryptable.uint32(pack.budgetLimit),
        ])
        .execute();
      const tx = await (plane as any).setPolicyThresholds(pack.id, encHard, encAuto, encBudget);
      await tx.wait();
      console.log(`  ✓ Pack ${pack.id}: hard=$${(Number(pack.hardLimit)/100).toFixed(0)} auto=$${(Number(pack.autoThreshold)/100).toFixed(0)} budget=$${(Number(pack.budgetLimit)/100).toFixed(0)}`);
    } else {
      console.log(`  → Pack ${pack.id} thresholds already set`);
    }
  }

  // ── 3. Set recurring intervals ─────────────────────────────────────────────
  console.log("\n[3] Setting recurring submission intervals...");
  for (const ri of RECURRING_INTERVALS) {
    const current = Number(await (plane as any).packRecurringInterval(ri.packId));
    if (current === 0) {
      const tx = await (plane as any).setPackRecurringInterval(ri.packId, ri.intervalSeconds);
      await tx.wait();
      const days = Math.round(ri.intervalSeconds / 86400);
      console.log(`  ✓ Pack ${ri.packId} interval: ${days} days`);
    } else {
      console.log(`  → Pack ${ri.packId} interval already set`);
    }
  }

  // ── 4. Create departments ──────────────────────────────────────────────────
  console.log("\n[4] Creating departments...");
  for (const dept of DEPTS) {
    const exists = await (plane as any).deptExists(dept.id);
    if (!exists) {
      const tx = await (plane as any).createDept(dept.id, dept.name);
      await tx.wait();
      console.log(`  ✓ Dept ${dept.id}: ${dept.name}`);
    } else {
      console.log(`  → Dept ${dept.id} already exists`);
    }
  }

  // ── 5. Set department encrypted budgets ────────────────────────────────────
  console.log("\n[5] Setting encrypted department budgets...");
  for (const dept of DEPTS) {
    const [, , budgetSet] = await (plane as any).getDeptInfo(dept.id);
    if (!budgetSet) {
      const [encCap] = await adminClient
        .encryptInputs([Encryptable.uint32(dept.budgetCap)])
        .execute();
      const tx = await (plane as any).setDeptBudget(dept.id, encCap);
      await tx.wait();
      console.log(`  ✓ Dept ${dept.id} budget: $${(Number(dept.budgetCap)/100).toFixed(0)}`);
    } else {
      console.log(`  → Dept ${dept.id} budget already set`);
    }
  }

  // ── 6. Register vendors ────────────────────────────────────────────────────
  console.log("\n[6] Registering vendors...");
  const statusLabels = ["Unchecked", "Compliant", "Suspended", "Banned"];
  for (const vendor of VENDORS) {
    const exists = await (plane as any).vendorExists(vendor.id);
    if (!exists) {
      let tx = await (plane as any).registerVendor(vendor.id, vendor.name);
      await tx.wait();
      if (vendor.status !== 0) {
        tx = await (plane as any).setVendorStatus(vendor.id, vendor.status);
        await tx.wait();
      }
      console.log(`  ✓ Vendor ${vendor.id}: ${vendor.name} [${statusLabels[vendor.status]}]`);
    } else {
      console.log(`  → Vendor ${vendor.id} already registered`);
    }
  }

  // ── 7. Register employees ──────────────────────────────────────────────────
  console.log("\n[7] Registering employees...");
  const employees = [
    { wallet: employeeA, label: "A", deptId: 1 },
    { wallet: employeeB, label: "B", deptId: 2 },
    { wallet: employeeC, label: "C", deptId: 3 },
  ];
  for (const emp of employees) {
    const already = await (plane as any).employeeRegistered(emp.wallet.address);
    if (!already) {
      let tx = await (plane as any).registerEmployee(emp.wallet.address);
      await tx.wait();
      tx = await (plane as any).assignEmployeeDept(emp.wallet.address, emp.deptId);
      await tx.wait();
      console.log(`  ✓ Employee ${emp.label}: ${emp.wallet.address} → Dept ${emp.deptId}`);
    } else {
      console.log(`  → Employee ${emp.label} already registered`);
    }
  }

  // ── 8. Submit demo requests ────────────────────────────────────────────────
  console.log("\n[8] Submitting demo requests...");

  const clientA = await createCofheClient(hre, employeeA);
  const clientB = await createCofheClient(hre, employeeB);
  const clientC = await createCofheClient(hre, employeeC);

  const demoRequests = [
    // Travel pack — Eng dept — compliant vendor
    { signer: employeeA, client: clientA, packId: 1, deptId: 1, vendorId: 1, amount: 35_000n,  memo: "SFO→NYC flights — Q3 offsite",           tier: "AUTO_APPROVED"  },
    { signer: employeeA, client: clientA, packId: 1, deptId: 1, vendorId: 1, amount: 120_000n, memo: "International conference + hotel package", tier: "NEEDS_REVIEW"  },
    // SaaS pack — Sales dept — compliant vendor
    { signer: employeeB, client: clientB, packId: 2, deptId: 2, vendorId: 2, amount: 18_000n,  memo: "Figma Pro annual renewal",                 tier: "AUTO_APPROVED"  },
    { signer: employeeB, client: clientB, packId: 2, deptId: 2, vendorId: 2, amount: 220_000n, memo: "Enterprise tooling stack license",          tier: "AUTO_DENIED"    },
    // Vendor pack — Ops dept — unchecked vendor (RISK_VENDOR_UNCHECKED)
    { signer: employeeC, client: clientC, packId: 3, deptId: 3, vendorId: 3, amount: 85_000n,  memo: "Design agency retainer — July",            tier: "AUTO_APPROVED"  },
    { signer: employeeC, client: clientC, packId: 3, deptId: 3, vendorId: 3, amount: 180_000n, memo: "Product design sprint — full engagement",   tier: "NEEDS_REVIEW"  },
    // Marketing pack — Sales dept — suspended vendor (RISK_VENDOR_SUSPENDED)
    { signer: employeeB, client: clientB, packId: 4, deptId: 2, vendorId: 4, amount: 22_000n,  memo: "Sponsored LinkedIn campaign — Q3",          tier: "AUTO_APPROVED"  },
    // Travel pack — no dept, no vendor (RISK_NO_DEPT | RISK_NO_VENDOR)
    { signer: employeeA, client: clientA, packId: 1, deptId: 0, vendorId: 0, amount: 45_000n,  memo: "Last-minute client travel — Chicago",       tier: "AUTO_APPROVED"  },
    // SaaS pack — Eng dept — no vendor (RISK_NO_VENDOR)
    { signer: employeeA, client: clientA, packId: 2, deptId: 1, vendorId: 0, amount: 28_000n,  memo: "GitHub Copilot Business — team seats",      tier: "AUTO_APPROVED"  },
    // Vendor pack — Ops dept — high amount, auto-denied
    { signer: employeeC, client: clientC, packId: 3, deptId: 3, vendorId: 2, amount: 350_000n, memo: "Full rebrand + brand book — over limit",     tier: "AUTO_DENIED"    },
    // Marketing pack — Eng dept — compliant vendor (use employeeA to avoid recurring interval clash with employeeB)
    { signer: employeeA, client: clientA, packId: 4, deptId: 1, vendorId: 2, amount: 20_000n,  memo: "Podcast sponsorship — tech audience",        tier: "AUTO_APPROVED"  },
    // Travel pack — Eng dept — needs review
    { signer: employeeC, client: clientC, packId: 1, deptId: 3, vendorId: 1, amount: 75_000n,  memo: "AWS re:Invent — Las Vegas, travel + hotel",  tier: "NEEDS_REVIEW"  },
  ];

  const requestCount = Number(await (plane as any).getRequestCount());
  if (requestCount >= demoRequests.length) {
    console.log(`  → ${requestCount} requests already exist, skipping`);
  } else {
    for (const req of demoRequests.slice(requestCount)) {
      const [encAmt] = await (req.client as any)
        .encryptInputs([Encryptable.uint32(req.amount)])
        .execute();
      const tx = await ((plane.connect(req.signer)) as any).submitRequest(
        req.packId,
        req.deptId,
        req.vendorId,
        encAmt,
        req.memo,
      );
      await tx.wait();
      const dollars = (Number(req.amount) / 100).toFixed(0);
      console.log(`  ✓ Pack ${req.packId} | Dept ${req.deptId} | Vendor ${req.vendorId} | $${dollars} | ${req.tier} | "${req.memo}"`);
    }
  }

  const total = Number(await (plane as any).getRequestCount());
  const vendorTotal = Number(await (plane as any).vendorCount());
  const deptTotal = (await (plane as any).getDeptIds()).length;

  console.log(`
✅ Wave 4 seed complete.
   ${total} requests on-chain
   ${deptTotal} departments configured
   ${vendorTotal} vendors registered
   Contract: ${contractAddress}
`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
