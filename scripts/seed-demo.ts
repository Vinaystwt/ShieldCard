import { Wallet } from "ethers";
import { Encryptable } from "@cofhe/sdk";
import hre from "hardhat";

// Node v20+ built-in fetch drops TLS connections to the Fhenix CoFHE VRF verifier.
// Override global fetch with a native https-based implementation.
import * as https from "https";
import * as http from "http";

const nativeFetch: typeof fetch = (input, init) => {
  return new Promise((resolve, reject) => {
    const url = new URL(typeof input === "string" ? input : (input as Request).url);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname + url.search,
      method: (init?.method ?? (typeof input !== "string" && (input as Request).method) ?? "GET"),
      headers: {
        ...(init?.headers as Record<string, string> ?? {}),
      },
      agent: new https.Agent({ keepAlive: false }),
    };

    const bodyStr = typeof init?.body === "string" ? init.body :
      init?.body instanceof Uint8Array ? Buffer.from(init.body).toString() : undefined;

    if (bodyStr && !options.headers["Content-Length"]) {
      (options.headers as Record<string, string>)["Content-Length"] = Buffer.byteLength(bodyStr).toString();
    }

    const mod = url.protocol === "https:" ? https : http;
    const req = mod.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => {
        const body = Buffer.concat(chunks);
        resolve(new Response(body, {
          status: res.statusCode ?? 200,
          headers: res.headers as Record<string, string>,
        }));
      });
    });
    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
};

(globalThis as any).fetch = nativeFetch;

import { createCofheClient, getDeployment } from "../tasks/utils";

const TASK_COFHE_MOCKS_DEPLOY = "task:cofhe-mocks:deploy";

// Policy pack IDs — must match contract createPack calls below
const PACK_TRAVEL = 1;
const PACK_SAAS = 2;
const PACK_VENDOR = 3;
const PACK_MARKETING = 4;

const PACKS = [
  { id: PACK_TRAVEL,    name: "Travel",    limitCents: 200_000n },  // $2,000
  { id: PACK_SAAS,      name: "SaaS",      limitCents: 50_000n  },  // $500
  { id: PACK_VENDOR,    name: "Vendor",    limitCents: 300_000n },  // $3,000
  { id: PACK_MARKETING, name: "Marketing", limitCents: 100_000n },  // $1,000
];

async function resolveSigner(privateKeyEnv: string) {
  const privateKey = process.env[privateKeyEnv];
  if (!privateKey) {
    throw new Error(`Missing ${privateKeyEnv} for testnet seeding`);
  }
  return new Wallet(privateKey, hre.ethers.provider);
}

async function resolveDemoSigners() {
  const signers = await hre.ethers.getSigners();

  if (hre.network.name === "hardhat") {
    return {
      admin: signers[0],
      employeeA: signers[1],
      employeeB: signers[2],
    };
  }

  return {
    admin: signers[0],
    employeeA: await resolveSigner("EMPLOYEE_A_PRIVATE_KEY"),
    employeeB: await resolveSigner("EMPLOYEE_B_PRIVATE_KEY"),
  };
}

async function encryptUint32(client: Awaited<ReturnType<typeof createCofheClient>>, value: bigint) {
  const [encrypted] = await client.encryptInputs([Encryptable.uint32(value)]).execute();
  return encrypted;
}

async function submitRequest(
  contract: any,
  signer: any,
  client: Awaited<ReturnType<typeof createCofheClient>>,
  packId: number,
  amountCents: bigint,
  memo: string,
  expected: string,
) {
  const encAmount = await encryptUint32(client, amountCents);
  await contract.connect(signer).submitRequest(packId, encAmount, memo);
  const count = await contract.getRequestCount();
  const id = count - 1n;
  const packName = PACKS.find(p => p.id === packId)?.name ?? packId.toString();
  console.log(`[seed] request #${id} | ${packName} | ${memo} | $${(Number(amountCents) / 100).toFixed(2)} | expected=${expected}`);
}

async function main() {
  if (hre.network.name === "hardhat") {
    await hre.run(TASK_COFHE_MOCKS_DEPLOY);
  }

  let deployment =
    process.env.SHIELDCARD_ADDRESS ??
    getDeployment(hre.network.name, "ShieldCardPolicy");

  if (!deployment) {
    if (hre.network.name !== "hardhat") {
      throw new Error(
        "No ShieldCardPolicy deployment found. Set SHIELDCARD_ADDRESS or deploy first.",
      );
    }
  } else {
    const code = await hre.ethers.provider.getCode(deployment);
    if (code === "0x") {
      deployment = undefined;
    }
  }

  if (!deployment) {
    const [adminSigner] = await hre.ethers.getSigners();
    const ShieldCardPolicy = await hre.ethers.getContractFactory("ShieldCardPolicy");
    const shieldCard = await ShieldCardPolicy.connect(adminSigner).deploy();
    await shieldCard.waitForDeployment();
    deployment = await shieldCard.getAddress();
    console.log(`[seed] deployed fresh ShieldCardPolicy to ${deployment}`);
  }

  const { admin, employeeA, employeeB } = await resolveDemoSigners();
  const shieldCard = await hre.ethers.getContractAt("ShieldCardPolicy", deployment);
  const adminClient = await createCofheClient(hre, admin);

  console.log(`[seed] contract: ${deployment}`);
  console.log(`[seed] admin:    ${await admin.getAddress()}`);
  console.log(`[seed] empA:     ${await employeeA.getAddress()}`);
  console.log(`[seed] empB:     ${await employeeB.getAddress()}`);

  // --- Create policy packs ---
  for (const pack of PACKS) {
    const exists = await shieldCard.packExists(pack.id);
    if (!exists) {
      await shieldCard.connect(admin).createPack(pack.id, pack.name);
      console.log(`[seed] created pack #${pack.id} "${pack.name}"`);
    } else {
      console.log(`[seed] pack #${pack.id} "${pack.name}" already exists, skipping`);
    }
    const [, , limitSet] = await shieldCard.getPackInfo(pack.id);
    if (!limitSet) {
      const encLimit = await encryptUint32(adminClient, pack.limitCents);
      await shieldCard.connect(admin).setPackLimit(pack.id, encLimit);
      console.log(`[seed] set encrypted limit for pack #${pack.id} ($${(Number(pack.limitCents) / 100).toFixed(2)})`);
    } else {
      console.log(`[seed] pack #${pack.id} limit already set, skipping`);
    }
  }

  // --- Register employees ---
  for (const [label, signer] of [['empA', employeeA], ['empB', employeeB]] as const) {
    const addr = await (signer as typeof employeeA).getAddress();
    const already = await shieldCard.employeeRegistered(addr);
    if (!already) {
      await shieldCard.connect(admin).registerEmployee(addr);
      console.log(`[seed] registered ${label}`);
    } else {
      console.log(`[seed] ${label} already registered, skipping`);
    }
  }

  const empAClient = await createCofheClient(hre, employeeA);
  const empBClient = await createCofheClient(hre, employeeB);

  // --- Seed requests: mix of approved/denied across all 4 packs ---
  // Travel pack (limit $2,000)
  await submitRequest(shieldCard, employeeA, empAClient, PACK_TRAVEL, 150_000n, "NYC conference flights", "APPROVED");
  await submitRequest(shieldCard, employeeB, empBClient, PACK_TRAVEL, 250_000n, "International summit travel", "DENIED_OVER_LIMIT");

  // SaaS pack (limit $500)
  await submitRequest(shieldCard, employeeA, empAClient, PACK_SAAS, 29_900n, "Figma annual plan", "APPROVED");
  await submitRequest(shieldCard, employeeB, empBClient, PACK_SAAS, 49_900n, "Linear team subscription", "APPROVED");
  await submitRequest(shieldCard, employeeA, empAClient, PACK_SAAS, 89_900n, "Salesforce seat renewal", "DENIED_OVER_LIMIT");

  // Vendor pack (limit $3,000)
  await submitRequest(shieldCard, employeeB, empBClient, PACK_VENDOR, 240_000n, "AWS compute invoice", "APPROVED");
  await submitRequest(shieldCard, employeeA, empAClient, PACK_VENDOR, 350_000n, "Hardware vendor payment", "DENIED_OVER_LIMIT");

  // Marketing pack (limit $1,000)
  await submitRequest(shieldCard, employeeA, empAClient, PACK_MARKETING, 75_000n, "LinkedIn ad campaign", "APPROVED");
  await submitRequest(shieldCard, employeeB, empBClient, PACK_MARKETING, 95_000n, "Event sponsorship", "APPROVED");
  await submitRequest(shieldCard, employeeA, empAClient, PACK_MARKETING, 130_000n, "Agency retainer", "DENIED_OVER_LIMIT");

  const total = await shieldCard.getRequestCount();
  console.log(`[seed] done — ${total} total requests on-chain`);

  for (const pack of PACKS) {
    const [total, , , pending] = await shieldCard.getPackSummary(pack.id);
    console.log(`[seed] ${pack.name}: ${total} total, ${pending} pending publish`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
