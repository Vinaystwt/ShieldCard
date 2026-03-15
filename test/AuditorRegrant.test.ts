/**
 * AuditorRegrant.test.ts
 * Verifies audit-report Open Question 1: FHE.allow(storedHandle, newAddress) callable
 * by the contract on encAmount/encStatus handles from a prior tx.
 *
 * Flow:
 *  1. employee submits a request (encAmount + encStatus stored, granted only to
 *     {contract, admin, employee})
 *  2. auditor signer tries decryptForView(encStatus) — should fail (no grant)
 *  3. owner calls setAuditor(auditor) then grantAuditorAccess([0])
 *  4. auditor decryptForView(encStatus) — should succeed
 */

import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { Encryptable, FheTypes } from "@cofhe/sdk";
import hre from "hardhat";

const TASK_COFHE_MOCKS_DEPLOY = "task:cofhe-mocks:deploy";

describe("Auditor scoped disclosure (FHE.allow re-grant on stored handles)", function () {
  async function fixture() {
    await hre.run(TASK_COFHE_MOCKS_DEPLOY);
    const [admin, employee, auditor, stranger] = await hre.ethers.getSigners();

    const Factory = await hre.ethers.getContractFactory("ShieldCardControlPlaneHarness");
    const plane = await Factory.connect(admin).deploy();

    const adminClient    = await hre.cofhe.createClientWithBatteries(admin);
    const employeeClient = await hre.cofhe.createClientWithBatteries(employee);
    const auditorClient  = await hre.cofhe.createClientWithBatteries(auditor);

    // Create Travel pack with thresholds: hard=200_000 auto=50_000 budget=500_000
    await plane.createPack(1, "Travel");
    const [encHard, encAuto, encBudget] = await adminClient
      .encryptInputs([
        Encryptable.uint32(200_000n),
        Encryptable.uint32(50_000n),
        Encryptable.uint32(500_000n),
      ])
      .execute();
    await plane.setPolicyThresholds(1, encHard, encAuto, encBudget);
    await plane.registerEmployee(employee.address);

    // Employee submits a 1_000-cent (below auto-threshold) request
    const [encAmount] = await employeeClient
      .encryptInputs([Encryptable.uint32(1_000n)])
      .execute();
    await plane.connect(employee).submitRequest(1, 0, 0, encAmount, "audit me");
    const requestId = 0;

    return { plane, admin, employee, auditor, stranger, adminClient, employeeClient, auditorClient, requestId };
  }

  it("auditor cannot decrypt encStatus before grant", async function () {
    const { plane, auditorClient, requestId } = await loadFixture(fixture);
    const encStatus = await plane.getEncryptedStatus(requestId);
    // CoFHE mock: unauthorized decryptForView should reject
    await expect(
      (auditorClient as any).decryptForView(encStatus, FheTypes.Uint8).execute()
    ).to.be.rejected;
  });

  it("owner can rotate auditor and grant scoped read on stored handles", async function () {
    const { plane, admin, auditor, auditorClient, requestId } = await loadFixture(fixture);

    await expect(plane.connect(admin).setAuditor(auditor.address))
      .to.emit(plane, "AuditorRotated").withArgs(hre.ethers.ZeroAddress, auditor.address);

    expect(await plane.auditor()).to.equal(auditor.address);

    await expect(plane.connect(admin).grantAuditorAccess([requestId]))
      .to.emit(plane, "DisclosureGranted").withArgs(requestId, auditor.address);

    // After grant, auditor should now be able to decryptForView
    const encStatus = await plane.getEncryptedStatus(requestId);
    const dec = await (auditorClient as any).decryptForView(encStatus, FheTypes.Uint8).execute();
    // status code is 1..3 (AUTO_APPROVED=1 in this case since amount < autoThresh and budget ok)
    const v = Number(dec);
    expect(v).to.be.greaterThanOrEqual(1);
    expect(v).to.be.lessThanOrEqual(3);
  });

  it("grantAuditorAccess reverts when auditor not set", async function () {
    const { plane, admin } = await loadFixture(fixture);
    await expect(plane.connect(admin).grantAuditorAccess([0])).to.be.revertedWith("auditor=0");
  });

  it("grantAuditorAccess reverts on out-of-range requestId", async function () {
    const { plane, admin, auditor } = await loadFixture(fixture);
    await plane.connect(admin).setAuditor(auditor.address);
    await expect(plane.connect(admin).grantAuditorAccess([99]))
      .to.be.revertedWithCustomError(plane, "RequestNotFound");
  });

  it("setAdmin rotates and grantAdminAccess re-grants stored handle to new admin", async function () {
    const { plane, admin, stranger, requestId } = await loadFixture(fixture);
    const strangerClient = await hre.cofhe.createClientWithBatteries(stranger);

    // stranger has no grant — decryption should fail
    const encStatus = await plane.getEncryptedStatus(requestId);
    await expect(
      (strangerClient as any).decryptForView(encStatus, FheTypes.Uint8).execute()
    ).to.be.rejected;

    // Rotate admin storage to stranger
    await expect(plane.connect(admin).setAdmin(stranger.address))
      .to.emit(plane, "AdminRotated").withArgs(admin.address, stranger.address);
    expect(await plane.admin()).to.equal(stranger.address);

    // owner still owns the contract (admin storage var ≠ Ownable.owner — by design)
    // owner grants the new admin storage value access to the stored handle
    await expect(plane.connect(admin).grantAdminAccess([requestId]))
      .to.emit(plane, "AdminAccessRegranted").withArgs(requestId);

    const dec = await (strangerClient as any).decryptForView(encStatus, FheTypes.Uint8).execute();
    expect(Number(dec)).to.be.greaterThanOrEqual(1);
  });

  it("setAdmin reverts on zero address", async function () {
    const { plane, admin } = await loadFixture(fixture);
    await expect(plane.connect(admin).setAdmin(hre.ethers.ZeroAddress)).to.be.revertedWith("admin=0");
  });
});
