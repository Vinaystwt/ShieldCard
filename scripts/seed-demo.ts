import { Wallet } from "ethers";
import { Encryptable } from "@cofhe/sdk";
import hre from "hardhat";

// Node v20+ built-in fetch (via bundled undici) drops TLS connections to the
// Fhenix CoFHE VRF verifier with UND_ERR_SOCKET. Override global fetch with
// a native https-based implementation that handles keep-alive correctly.
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

type DemoRole = {
  label: string;
  signer: Awaited<ReturnType<typeof resolveSigner>>;
};

async function resolveSigner(privateKeyEnv: string) {
  const privateKey = process.env[privateKeyEnv];
  if (!privateKey) {
    throw new Error(`Missing ${privateKeyEnv} for testnet seeding`);
  }

  return new Wallet(privateKey, hre.ethers.provider);
}

async function resolveDemoSigners() {
  const signers = await hre.ethers.getSigners();

  if (signers.length >= 3 && hre.network.name === "hardhat") {
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

async function encryptUint8(client: Awaited<ReturnType<typeof createCofheClient>>, value: bigint) {
  const [encrypted] = await client.encryptInputs([Encryptable.uint8(value)]).execute();
  return encrypted;
}

async function submitRequest(
  contract: any,
  role: DemoRole,
  amount: bigint,
  category: bigint,
  memo: string,
  expected: string,
) {
  const client = await createCofheClient(hre, role.signer);
  const encAmount = await encryptUint32(client, amount);
  const encCategory = await encryptUint8(client, category);

  await contract.connect(role.signer).submitRequest(encAmount, encCategory, memo);
  const requestCount = await contract.getRequestCount();
  const requestId = requestCount - 1n;

  console.log(
    `[seed-demo] request #${requestId} | ${role.label} | ${memo} | expected=${expected}`,
  );
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
    console.log(`[seed-demo] deployed fresh ShieldCardPolicy to ${deployment}`);
  }

  const { admin, employeeA, employeeB } = await resolveDemoSigners();
  const shieldCard = await hre.ethers.getContractAt("ShieldCardPolicy", deployment);

  const adminClient = await createCofheClient(hre, admin);

  console.log(`[seed-demo] using ShieldCardPolicy at ${deployment}`);
  console.log(`[seed-demo] admin=${await admin.getAddress()}`);
  console.log(`[seed-demo] employeeA=${await employeeA.getAddress()}`);
  console.log(`[seed-demo] employeeB=${await employeeB.getAddress()}`);

  // Register employees — skip if already registered (idempotent for re-runs)
  for (const [label, signer] of [['employeeA', employeeA], ['employeeB', employeeB]] as const) {
    const addr = await (signer as typeof employeeA).getAddress();
    const already = await shieldCard.employeeRegistered(addr);
    if (!already) {
      await shieldCard.connect(admin).registerEmployee(addr);
      console.log(`[seed-demo] registered ${label}`);
    } else {
      console.log(`[seed-demo] ${label} already registered, skipping`);
    }
  }

  const limitA = await encryptUint32(adminClient, 50_000n);
  const limitB = await encryptUint32(adminClient, 100_000n);

  await shieldCard.connect(admin).setEmployeeLimit(await employeeA.getAddress(), limitA);
  await shieldCard.connect(admin).setEmployeeLimit(await employeeB.getAddress(), limitB);

  await submitRequest(
    shieldCard,
    { label: "employeeA", signer: employeeA },
    30_000n,
    1n,
    "Figma subscription",
    "APPROVED",
  );
  await submitRequest(
    shieldCard,
    { label: "employeeA", signer: employeeA },
    70_000n,
    1n,
    "Server upgrade",
    "DENIED_OVER_LIMIT",
  );
  await submitRequest(
    shieldCard,
    { label: "employeeB", signer: employeeB },
    80_000n,
    1n,
    "AWS compute",
    "APPROVED",
  );
  await submitRequest(
    shieldCard,
    { label: "employeeA", signer: employeeA },
    20_000n,
    2n,
    "Marketing spend",
    "DENIED_WRONG_CATEGORY",
  );

  console.log(`[seed-demo] total requests=${await shieldCard.getRequestCount()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
