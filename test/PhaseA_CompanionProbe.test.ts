/**
 * PhaseA_CompanionProbe.test.ts
 * Validates whether one contract can run FHE.lte against an encrypted
 * handle retrieved from another contract's external view function.
 *
 * Result drives Phase A2 decision tree:
 *   - companion pattern WORKS  -> ship ShieldCardBudgetAttestor.sol (no core redeploy)
 *   - companion pattern FAILS  -> add attest functions to core directly (requires redeploy)
 */

import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { Encryptable, FheTypes } from "@cofhe/sdk";
import hre from "hardhat";

const TASK_COFHE_MOCKS_DEPLOY = "task:cofhe-mocks:deploy";

describe("Phase A1 — companion FHE.lte on externally retrieved handle", function () {
  async function fixture() {
    await hre.run(TASK_COFHE_MOCKS_DEPLOY);
    const [admin, stranger] = await hre.ethers.getSigners();

    const CoreFactory = await hre.ethers.getContractFactory("MinimalEncCore");
    const core = await CoreFactory.connect(admin).deploy();

    const CompanionFactory = await hre.ethers.getContractFactory("MinimalCompanion");
    const companion = await CompanionFactory.connect(admin).deploy(await core.getAddress());

    const adminClient = await hre.cofhe.createClientWithBatteries(admin);
    return { core, companion, admin, stranger, adminClient };
  }

  it("FAIL EXPECTED: companion call to FHE.lte without ACL grant", async function () {
    const { core, companion, adminClient } = await loadFixture(fixture);

    // Store an encrypted 100 in the core (admin is the setter; only core + admin granted)
    const [encVal] = await adminClient
      .encryptInputs([Encryptable.uint32(100n)])
      .execute();
    await core.setEncValue(encVal);

    // Companion attempts attest with threshold 200; FHE.lte should evaluate 100 <= 200 = true
    const [encThreshold] = await adminClient
      .encryptInputs([Encryptable.uint32(200n)])
      .execute();

    // Without core.grantTo(companion), the FHE.lte should not have authorization
    let reverted = false;
    try {
      const tx = await companion.attest(encThreshold);
      await tx.wait();
    } catch {
      reverted = true;
    }

    // Note: mock CoFHE plugin may or may not enforce ACL. Outcome documented either way.
    console.log(`[probe] companion attest without grant: ${reverted ? "REVERTED (ACL enforced)" : "SUCCEEDED (mock is permissive)"}`);
  });

  it("PASS EXPECTED: companion FHE.lte succeeds after core.grantTo(companion)", async function () {
    const { core, companion, adminClient, admin } = await loadFixture(fixture);

    const [encVal] = await adminClient
      .encryptInputs([Encryptable.uint32(100n)])
      .execute();
    await core.setEncValue(encVal);

    // Grant the companion contract address scoped access to encValue
    await core.grantTo(await companion.getAddress());

    const [encThreshold] = await adminClient
      .encryptInputs([Encryptable.uint32(200n)])
      .execute();

    await expect(companion.attest(encThreshold))
      .to.emit(companion, "AttestationComputed").withArgs(true);

    // Admin should be able to decrypt the resulting ebool (companion granted admin in attest)
    const handle = await companion.lastResult();
    const permit = await (adminClient as any).permits.getOrCreateSelfPermit();
    const dec = await (adminClient as any).decryptForView(handle, FheTypes.Bool).withPermit(permit).execute();
    // 100 <= 200 == true
    expect(Boolean(dec)).to.equal(true);
  });

  it("companion FHE.lte returns false for over-threshold value", async function () {
    const { core, companion, adminClient, admin } = await loadFixture(fixture);

    const [encVal] = await adminClient
      .encryptInputs([Encryptable.uint32(500n)])
      .execute();
    await core.setEncValue(encVal);
    await core.grantTo(await companion.getAddress());

    const [encThreshold] = await adminClient
      .encryptInputs([Encryptable.uint32(200n)])
      .execute();

    await companion.attest(encThreshold);
    const handle = await companion.lastResult();
    const permit = await (adminClient as any).permits.getOrCreateSelfPermit();
    const dec = await (adminClient as any).decryptForView(handle, FheTypes.Bool).withPermit(permit).execute();
    // 500 <= 200 == false
    expect(Boolean(dec)).to.equal(false);
  });
});
