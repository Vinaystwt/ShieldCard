/**
 * PhaseA_WithinBudget.test.ts
 * Within-budget attestation: FHE.lte(used, cap) -> ebool, reveal only boolean.
 */

import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { Encryptable, FheTypes } from "@cofhe/sdk";
import hre from "hardhat";

const TASK_COFHE_MOCKS_DEPLOY = "task:cofhe-mocks:deploy";

const PACK_TRAVEL = 1;
const DEPT_ENG    = 1;
const HARD        = 200_000n;
const AUTO        = 50_000n;
const BUDGET      = 500_000n;
const DEPT_CAP    = 1_000_000n;

describe("Within-budget attestation (ebool, no value leak)", function () {
  async function fixture() {
    await hre.run(TASK_COFHE_MOCKS_DEPLOY);
    const [admin, employee, auditor, stranger] = await hre.ethers.getSigners();

    const Factory = await hre.ethers.getContractFactory("ShieldCardControlPlaneHarness");
    const plane = await Factory.connect(admin).deploy();

    const adminClient    = await hre.cofhe.createClientWithBatteries(admin);
    const employeeClient = await hre.cofhe.createClientWithBatteries(employee);
    const auditorClient  = await hre.cofhe.createClientWithBatteries(auditor);

    await plane.createPack(PACK_TRAVEL, "Travel");
    const [encHard, encAuto, encBudget] = await adminClient
      .encryptInputs([
        Encryptable.uint32(HARD),
        Encryptable.uint32(AUTO),
        Encryptable.uint32(BUDGET),
      ])
      .execute();
    await plane.setPolicyThresholds(PACK_TRAVEL, encHard, encAuto, encBudget);

    await plane.createDept(DEPT_ENG, "Engineering");
    const [encCap] = await adminClient.encryptInputs([Encryptable.uint32(DEPT_CAP)]).execute();
    await plane.setDeptBudget(DEPT_ENG, encCap);

    await plane.registerEmployee(employee.address);

    return { plane, admin, employee, auditor, stranger, adminClient, employeeClient, auditorClient };
  }

  async function submitOne(plane: any, employee: any, employeeClient: any, amount: bigint, dept: number) {
    const [encAmt] = await employeeClient.encryptInputs([Encryptable.uint32(amount)]).execute();
    await plane.connect(employee).submitRequest(PACK_TRAVEL, dept, 0, encAmt, "x");
  }

  it("attestDeptWithinBudget = true when sum of requests is below cap", async function () {
    const { plane, employee, employeeClient, adminClient } = await loadFixture(fixture);
    await submitOne(plane, employee, employeeClient, 10_000n, DEPT_ENG);
    await submitOne(plane, employee, employeeClient, 20_000n, DEPT_ENG);

    await expect(plane.attestDeptWithinBudget(DEPT_ENG)).to.emit(plane, "DeptBudgetAttested");
    const handle = await plane.getDeptWithinBudget(DEPT_ENG);
    const permit = await (adminClient as any).permits.getOrCreateSelfPermit();
    const dec = await (adminClient as any).decryptForView(handle, FheTypes.Bool).withPermit(permit).execute();
    expect(Boolean(dec)).to.equal(true);
  });

  it("attestDeptWithinBudget = false when cumulative dept spend exceeds cap", async function () {
    const { plane, admin, employee, employeeClient, adminClient } = await loadFixture(fixture);
    // Raise dept cap exceeded path: shrink cap to 25_000, submit one 30_000 request
    const [encSmallCap] = await adminClient.encryptInputs([Encryptable.uint32(25_000n)]).execute();
    await plane.setDeptBudget(DEPT_ENG, encSmallCap);
    await submitOne(plane, employee, employeeClient, 30_000n, DEPT_ENG);

    await plane.attestDeptWithinBudget(DEPT_ENG);
    const handle = await plane.getDeptWithinBudget(DEPT_ENG);
    const permit = await (adminClient as any).permits.getOrCreateSelfPermit();
    const dec = await (adminClient as any).decryptForView(handle, FheTypes.Bool).withPermit(permit).execute();
    expect(Boolean(dec)).to.equal(false);
  });

  it("attestPackWithinBudget = true while within rolling budget cap", async function () {
    const { plane, employee, employeeClient, adminClient } = await loadFixture(fixture);
    await submitOne(plane, employee, employeeClient, 10_000n, DEPT_ENG);
    await plane.attestPackWithinBudget(PACK_TRAVEL);
    const handle = await plane.getPackWithinBudget(PACK_TRAVEL);
    const permit = await (adminClient as any).permits.getOrCreateSelfPermit();
    const dec = await (adminClient as any).decryptForView(handle, FheTypes.Bool).withPermit(permit).execute();
    expect(Boolean(dec)).to.equal(true);
  });

  it("attestPackWithinBudget = false once cumulative pack spend > budget", async function () {
    const { plane, employee, employeeClient, adminClient, admin } = await loadFixture(fixture);
    // Reset budget to small + submit one large request
    const [encHard, encAuto, encSmall] = await adminClient
      .encryptInputs([
        Encryptable.uint32(HARD),
        Encryptable.uint32(AUTO),
        Encryptable.uint32(40_000n),
      ])
      .execute();
    await plane.setPolicyThresholds(PACK_TRAVEL, encHard, encAuto, encSmall);

    await submitOne(plane, employee, employeeClient, 100_000n, DEPT_ENG);

    await plane.attestPackWithinBudget(PACK_TRAVEL);
    const handle = await plane.getPackWithinBudget(PACK_TRAVEL);
    const permit = await (adminClient as any).permits.getOrCreateSelfPermit();
    const dec = await (adminClient as any).decryptForView(handle, FheTypes.Bool).withPermit(permit).execute();
    expect(Boolean(dec)).to.equal(false);
  });

  it("non-admin cannot attest", async function () {
    const { plane, stranger } = await loadFixture(fixture);
    await expect(plane.connect(stranger).attestDeptWithinBudget(DEPT_ENG))
      .to.be.revertedWithCustomError(plane, "OwnableUnauthorizedAccount");
    await expect(plane.connect(stranger).attestPackWithinBudget(PACK_TRAVEL))
      .to.be.revertedWithCustomError(plane, "OwnableUnauthorizedAccount");
  });

  it("attest reverts on unknown dept/pack", async function () {
    const { plane } = await loadFixture(fixture);
    await expect(plane.attestDeptWithinBudget(99)).to.be.revertedWithCustomError(plane, "DeptNotFound");
    await expect(plane.attestPackWithinBudget(99)).to.be.revertedWithCustomError(plane, "PackNotFound");
  });

  it("auditor with grant can decrypt the ebool; stranger cannot", async function () {
    const { plane, admin, auditor, employee, employeeClient, adminClient, auditorClient, stranger } = await loadFixture(fixture);
    const strangerClient = await hre.cofhe.createClientWithBatteries(stranger);

    await submitOne(plane, employee, employeeClient, 10_000n, DEPT_ENG);
    await plane.setAuditor(auditor.address);
    await plane.attestDeptWithinBudget(DEPT_ENG);

    const handle = await plane.getDeptWithinBudget(DEPT_ENG);

    // Auditor (granted at attest time) succeeds
    const auditorPermit = await (auditorClient as any).permits.getOrCreateSelfPermit();
    const decAuditor = await (auditorClient as any).decryptForView(handle, FheTypes.Bool).withPermit(auditorPermit).execute();
    expect(Boolean(decAuditor)).to.equal(true);

    // Stranger (never granted) fails
    const strangerPermit = await (strangerClient as any).permits.getOrCreateSelfPermit();
    await expect(
      (strangerClient as any).decryptForView(handle, FheTypes.Bool).withPermit(strangerPermit).execute()
    ).to.be.rejected;
  });
});
