import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { Encryptable, FheTypes } from "@cofhe/sdk";
import hre from "hardhat";

const TASK_COFHE_MOCKS_DEPLOY = "task:cofhe-mocks:deploy";

const PACK_TRAVEL    = 1;
const PACK_SAAS      = 2;
const PACK_VENDOR    = 3;
const PACK_MARKETING = 4;

const DEPT_ENG   = 1;
const DEPT_SALES = 2;
const DEPT_OPS   = 3;

const VENDOR_ACME   = 1;
const VENDOR_GLOBEX = 2;
const VENDOR_INITECH = 3;

// Thresholds (in cents): hard=200_000, auto=50_000, budget=500_000
const HARD_LIMIT    = 200_000n;
const AUTO_THRESH   = 50_000n;
const BUDGET_LIMIT  = 500_000n;

// Risk bitmap constants (must match contract)
const RISK_VENDOR_SUSPENDED = 0x0001;
const RISK_VENDOR_UNCHECKED = 0x0002;
const RISK_NO_DEPT          = 0x0004;
const RISK_NO_VENDOR        = 0x0008;

// Vendor status constants
const VENDOR_UNCHECKED = 0;
const VENDOR_COMPLIANT = 1;
const VENDOR_SUSPENDED = 2;
const VENDOR_BANNED    = 3;

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

    return { plane, admin, employee, employeeTwo, stranger, adminClient, employeeClient, employeeTwoClient, strangerClient };
  }

  /** Fixture: Travel pack + employee registered */
  async function fixtureWithPackAndEmployee() {
    const base = await loadFixture(deployFixture);
    const { plane, adminClient, employee } = base;

    await plane.createPack(PACK_TRAVEL, "Travel");

    const [encHard, encAuto, encBudget] = await adminClient
      .encryptInputs([
        Encryptable.uint32(HARD_LIMIT),
        Encryptable.uint32(AUTO_THRESH),
        Encryptable.uint32(BUDGET_LIMIT),
      ])
      .execute();
    await plane.setPolicyThresholds(PACK_TRAVEL, encHard, encAuto, encBudget);
    await plane.registerEmployee(employee.address);

    return base;
  }

  /** Fixture: pack + employee + department */
  async function fixtureWithPackDeptEmployee() {
    const base = await fixtureWithPackAndEmployee();
    const { plane, adminClient, employee } = base;

    await plane.createDept(DEPT_ENG, "Engineering");
    const [encCap] = await adminClient
      .encryptInputs([Encryptable.uint32(1_000_000n)])
      .execute();
    await plane.setDeptBudget(DEPT_ENG, encCap);
    await plane.assignEmployeeDept(employee.address, DEPT_ENG);

    return base;
  }

  /** Helper: submit a request with all params */
  async function submitRequest(
    plane: any,
    signer: any,
    client: any,
    packId: number,
    deptId: number,
    vendorId: number,
    amount: bigint,
    memo = "Test request",
  ) {
    const [enc] = await client.encryptInputs([Encryptable.uint32(amount)]).execute();
    return plane.connect(signer).submitRequest(packId, deptId, vendorId, enc, memo);
  }

  /** Helper: decrypt status */
  async function decryptStatus(plane: any, client: any, requestId: number) {
    const handle = await plane.getEncryptedStatus(requestId);
    return client.decryptForView(handle, FheTypes.Uint8).execute();
  }

  /** Helper: publish result */
  async function publishRequest(plane: any, adminClient: any, requestId: number) {
    const permit = await adminClient.permits.getOrCreateSelfPermit();
    const result = await adminClient
      .decryptForTx(await plane.getEncryptedStatus(requestId))
      .withPermit(permit)
      .execute();
    await plane.publishDecryptedResult(requestId, Number(result.decryptedValue), result.signature);
    return Number(result.decryptedValue);
  }

  // ===========================================================================
  // 1. Global controls
  // ===========================================================================

  describe("pauseSubmissions / unpauseSubmissions", function () {
    it("admin can pause and unpause submissions", async function () {
      const { plane } = await loadFixture(deployFixture);

      await expect(plane.pauseSubmissions()).to.emit(plane, "SubmissionsPausedEvent");
      expect(await plane.submissionsPaused()).to.equal(true);

      await expect(plane.unpauseSubmissions()).to.emit(plane, "SubmissionsUnpausedEvent");
      expect(await plane.submissionsPaused()).to.equal(false);
    });

    it("non-admin cannot pause", async function () {
      const { plane, stranger } = await loadFixture(deployFixture);
      await expect(
        plane.connect(stranger).pauseSubmissions(),
      ).to.be.revertedWithCustomError(plane, "OwnableUnauthorizedAccount");
    });

    it("submission reverts when paused", async function () {
      const { plane, employee, employeeClient } = await fixtureWithPackAndEmployee();
      await plane.pauseSubmissions();
      const [enc] = await employeeClient.encryptInputs([Encryptable.uint32(10_000n)]).execute();
      await expect(
        plane.connect(employee).submitRequest(PACK_TRAVEL, 0, 0, enc, "Paused"),
      ).to.be.revertedWithCustomError(plane, "SubmissionsPaused");
    });
  });

  // ===========================================================================
  // 2. Employee management
  // ===========================================================================

  describe("registerEmployee", function () {
    it("registers an employee and emits event", async function () {
      const { plane, employee } = await loadFixture(deployFixture);
      await expect(plane.registerEmployee(employee.address))
        .to.emit(plane, "EmployeeRegistered")
        .withArgs(employee.address);
      expect(await plane.employeeRegistered(employee.address)).to.equal(true);
    });

    it("rejects non-owner registration", async function () {
      const { plane, employee, stranger } = await loadFixture(deployFixture);
      await expect(
        plane.connect(stranger).registerEmployee(employee.address),
      ).to.be.revertedWithCustomError(plane, "OwnableUnauthorizedAccount");
    });

    it("rejects duplicate registration", async function () {
      const { plane, employee } = await loadFixture(deployFixture);
      await plane.registerEmployee(employee.address);
      await expect(
        plane.registerEmployee(employee.address),
      ).to.be.revertedWithCustomError(plane, "EmployeeAlreadyRegistered");
    });

    it("tracks registered employee count", async function () {
      const { plane, employee, employeeTwo } = await loadFixture(deployFixture);
      expect(await plane.getRegisteredEmployeeCount()).to.equal(0n);
      await plane.registerEmployee(employee.address);
      await plane.registerEmployee(employeeTwo.address);
      expect(await plane.getRegisteredEmployeeCount()).to.equal(2n);
    });
  });

  describe("freezeEmployee / unfreezeEmployee", function () {
    it("admin can freeze and unfreeze an employee", async function () {
      const { plane, employee } = await loadFixture(deployFixture);
      await plane.registerEmployee(employee.address);

      await expect(plane.freezeEmployee(employee.address))
        .to.emit(plane, "EmployeeFrozen")
        .withArgs(employee.address);
      expect(await plane.employeeFrozen(employee.address)).to.equal(true);

      await expect(plane.unfreezeEmployee(employee.address))
        .to.emit(plane, "EmployeeUnfrozen")
        .withArgs(employee.address);
      expect(await plane.employeeFrozen(employee.address)).to.equal(false);
    });

    it("frozen employee cannot submit", async function () {
      const { plane, employee, employeeClient } = await fixtureWithPackAndEmployee();
      await plane.freezeEmployee(employee.address);
      const [enc] = await employeeClient.encryptInputs([Encryptable.uint32(10_000n)]).execute();
      await expect(
        plane.connect(employee).submitRequest(PACK_TRAVEL, 0, 0, enc, "Frozen"),
      ).to.be.revertedWithCustomError(plane, "EmployeeIsFrozen");
    });

    it("unfrozen employee can submit again", async function () {
      const { plane, employee, employeeClient } = await fixtureWithPackAndEmployee();
      await plane.freezeEmployee(employee.address);
      await plane.unfreezeEmployee(employee.address);
      const [enc] = await employeeClient.encryptInputs([Encryptable.uint32(10_000n)]).execute();
      await expect(
        plane.connect(employee).submitRequest(PACK_TRAVEL, 0, 0, enc, "Back"),
      ).to.emit(plane, "RequestSubmitted");
    });

    it("rejects freeze for unregistered address", async function () {
      const { plane, stranger } = await loadFixture(deployFixture);
      await expect(
        plane.freezeEmployee(stranger.address),
      ).to.be.revertedWithCustomError(plane, "EmployeeNotRegistered");
    });
  });

  // ===========================================================================
  // 3. Policy pack management
  // ===========================================================================

  describe("createPack", function () {
    it("creates a pack with correct initial state", async function () {
      const { plane } = await loadFixture(deployFixture);
      await expect(plane.createPack(PACK_SAAS, "SaaS"))
        .to.emit(plane, "PackCreated")
        .withArgs(PACK_SAAS, "SaaS");

      const [name, active, limitsSet] = await plane.getPackInfo(PACK_SAAS);
      expect(name).to.equal("SaaS");
      expect(active).to.equal(true);
      expect(limitsSet).to.equal(false);
      expect(await plane.packCount()).to.equal(1n);
    });

    it("rejects duplicate pack id", async function () {
      const { plane } = await loadFixture(deployFixture);
      await plane.createPack(PACK_SAAS, "SaaS");
      await expect(
        plane.createPack(PACK_SAAS, "SaaS Again"),
      ).to.be.revertedWithCustomError(plane, "PackAlreadyExists");
    });

    it("rejects non-admin creation", async function () {
      const { plane, stranger } = await loadFixture(deployFixture);
      await expect(
        plane.connect(stranger).createPack(PACK_SAAS, "SaaS"),
      ).to.be.revertedWithCustomError(plane, "OwnableUnauthorizedAccount");
    });
  });

  describe("setPolicyThresholds", function () {
    it("stores all three encrypted thresholds", async function () {
      const { plane, adminClient } = await loadFixture(deployFixture);
      await plane.createPack(PACK_TRAVEL, "Travel");

      const [encHard, encAuto, encBudget] = await adminClient
        .encryptInputs([
          Encryptable.uint32(HARD_LIMIT),
          Encryptable.uint32(AUTO_THRESH),
          Encryptable.uint32(BUDGET_LIMIT),
        ])
        .execute();

      await expect(plane.setPolicyThresholds(PACK_TRAVEL, encHard, encAuto, encBudget))
        .to.emit(plane, "PackLimitsSet")
        .withArgs(PACK_TRAVEL);

      const [, , limitsSet] = await plane.getPackInfo(PACK_TRAVEL);
      expect(limitsSet).to.equal(true);

      const hard   = await adminClient.decryptForView(await plane.getPackEncHardLimit(PACK_TRAVEL), FheTypes.Uint32).execute();
      const auto_  = await adminClient.decryptForView(await plane.getPackEncAutoThreshold(PACK_TRAVEL), FheTypes.Uint32).execute();
      const budget = await adminClient.decryptForView(await plane.getPackEncBudgetLimit(PACK_TRAVEL), FheTypes.Uint32).execute();

      expect(hard).to.equal(HARD_LIMIT);
      expect(auto_).to.equal(AUTO_THRESH);
      expect(budget).to.equal(BUDGET_LIMIT);
    });

    it("rejects thresholds for non-existent pack", async function () {
      const { plane, adminClient } = await loadFixture(deployFixture);
      const [a, b, c] = await adminClient.encryptInputs([
        Encryptable.uint32(1n), Encryptable.uint32(1n), Encryptable.uint32(1n),
      ]).execute();
      await expect(
        plane.setPolicyThresholds(99, a, b, c),
      ).to.be.revertedWithCustomError(plane, "PackNotFound");
    });

    it("rejects zero ctHash inputs", async function () {
      const { plane } = await loadFixture(deployFixture);
      await plane.createPack(PACK_SAAS, "SaaS");
      const zeroInput = { ctHash: 0n, securityZone: 0, utype: 0, signature: "0x00" };
      // InvalidEncryptedInput name collides with FHE lib error — just verify reverts
      await expect(
        plane.setPolicyThresholds(PACK_SAAS, zeroInput, zeroInput, zeroInput),
      ).to.be.reverted;
    });
  });

  describe("setPackActive / resetBudgetEpoch", function () {
    it("admin can deactivate and reactivate a pack", async function () {
      const { plane } = await loadFixture(deployFixture);
      await plane.createPack(PACK_SAAS, "SaaS");

      await expect(plane.setPackActive(PACK_SAAS, false))
        .to.emit(plane, "PackActiveChanged")
        .withArgs(PACK_SAAS, false);

      const [, active] = await plane.getPackInfo(PACK_SAAS);
      expect(active).to.equal(false);

      await plane.setPackActive(PACK_SAAS, true);
      const [, active2] = await plane.getPackInfo(PACK_SAAS);
      expect(active2).to.equal(true);
    });

    it("inactive pack rejects submissions", async function () {
      const { plane, employee, employeeClient } = await fixtureWithPackAndEmployee();
      await plane.setPackActive(PACK_TRAVEL, false);
      const [enc] = await employeeClient.encryptInputs([Encryptable.uint32(10_000n)]).execute();
      await expect(
        plane.connect(employee).submitRequest(PACK_TRAVEL, 0, 0, enc, "Inactive"),
      ).to.be.revertedWithCustomError(plane, "PackInactive");
    });

    it("resetBudgetEpoch zeroes pack used budget", async function () {
      const { plane, adminClient } = await fixtureWithPackAndEmployee();
      await expect(plane.resetBudgetEpoch(PACK_TRAVEL))
        .to.emit(plane, "BudgetEpochReset")
        .withArgs(PACK_TRAVEL, anyValue);

      const usedHandle = await plane.getPackEncUsedBudget(PACK_TRAVEL);
      const used = await adminClient.decryptForView(usedHandle, FheTypes.Uint32).execute();
      expect(used).to.equal(0n);
    });
  });

  // ===========================================================================
  // 4. Dynamic pack enumeration
  // ===========================================================================

  describe("getPackIds / getActivePackIds", function () {
    it("getPackIds returns all created packs in order", async function () {
      const { plane } = await loadFixture(deployFixture);
      await plane.createPack(PACK_TRAVEL, "Travel");
      await plane.createPack(PACK_SAAS, "SaaS");
      await plane.createPack(PACK_VENDOR, "Vendor");

      const ids = await plane.getPackIds();
      expect(ids.length).to.equal(3);
      expect(Number(ids[0])).to.equal(PACK_TRAVEL);
      expect(Number(ids[1])).to.equal(PACK_SAAS);
      expect(Number(ids[2])).to.equal(PACK_VENDOR);
    });

    it("getActivePackIds excludes deactivated packs", async function () {
      const { plane } = await loadFixture(deployFixture);
      await plane.createPack(PACK_TRAVEL, "Travel");
      await plane.createPack(PACK_SAAS, "SaaS");
      await plane.createPack(PACK_VENDOR, "Vendor");
      await plane.setPackActive(PACK_SAAS, false);

      const active = await plane.getActivePackIds();
      expect(active.length).to.equal(2);
      const activeNums = active.map(Number);
      expect(activeNums).to.include(PACK_TRAVEL);
      expect(activeNums).to.include(PACK_VENDOR);
      expect(activeNums).to.not.include(PACK_SAAS);
    });

    it("getPackIds is empty before any packs created", async function () {
      const { plane } = await loadFixture(deployFixture);
      const ids = await plane.getPackIds();
      expect(ids.length).to.equal(0);
    });
  });

  // ===========================================================================
  // 5. Department management
  // ===========================================================================

  describe("createDept", function () {
    it("creates a department and emits event", async function () {
      const { plane } = await loadFixture(deployFixture);
      await expect(plane.createDept(DEPT_ENG, "Engineering"))
        .to.emit(plane, "DeptCreated")
        .withArgs(DEPT_ENG, "Engineering");

      const [name, active, budgetSet] = await plane.getDeptInfo(DEPT_ENG);
      expect(name).to.equal("Engineering");
      expect(active).to.equal(true);
      expect(budgetSet).to.equal(false);
      expect(await plane.deptExists(DEPT_ENG)).to.equal(true);
    });

    it("rejects duplicate dept id", async function () {
      const { plane } = await loadFixture(deployFixture);
      await plane.createDept(DEPT_ENG, "Engineering");
      await expect(
        plane.createDept(DEPT_ENG, "Eng Duplicate"),
      ).to.be.revertedWithCustomError(plane, "DeptAlreadyExists");
    });

    it("rejects non-admin dept creation", async function () {
      const { plane, stranger } = await loadFixture(deployFixture);
      await expect(
        plane.connect(stranger).createDept(DEPT_ENG, "Engineering"),
      ).to.be.revertedWithCustomError(plane, "OwnableUnauthorizedAccount");
    });

    it("getDeptIds returns all departments in order", async function () {
      const { plane } = await loadFixture(deployFixture);
      await plane.createDept(DEPT_ENG, "Engineering");
      await plane.createDept(DEPT_SALES, "Sales");
      await plane.createDept(DEPT_OPS, "Operations");

      const ids = await plane.getDeptIds();
      expect(ids.length).to.equal(3);
      expect(Number(ids[0])).to.equal(DEPT_ENG);
      expect(Number(ids[1])).to.equal(DEPT_SALES);
      expect(Number(ids[2])).to.equal(DEPT_OPS);
    });
  });

  describe("setDeptBudget / resetDeptEpoch", function () {
    it("sets encrypted department budget cap", async function () {
      const { plane, adminClient } = await loadFixture(deployFixture);
      await plane.createDept(DEPT_ENG, "Engineering");

      const [encCap] = await adminClient.encryptInputs([Encryptable.uint32(1_000_000n)]).execute();
      await expect(plane.setDeptBudget(DEPT_ENG, encCap))
        .to.emit(plane, "DeptBudgetSet")
        .withArgs(DEPT_ENG);

      const [, , budgetSet] = await plane.getDeptInfo(DEPT_ENG);
      expect(budgetSet).to.equal(true);

      const capHandle = await plane.getDeptEncBudgetCapInternal(DEPT_ENG);
      const cap = await adminClient.decryptForView(capHandle, FheTypes.Uint32).execute();
      expect(cap).to.equal(1_000_000n);
    });

    it("rejects zero ctHash for dept budget", async function () {
      const { plane } = await loadFixture(deployFixture);
      await plane.createDept(DEPT_ENG, "Engineering");
      const zeroInput = { ctHash: 0n, securityZone: 0, utype: 0, signature: "0x00" };
      // InvalidEncryptedInput name collides with FHE lib error — just verify reverts
      await expect(
        plane.setDeptBudget(DEPT_ENG, zeroInput),
      ).to.be.reverted;
    });

    it("rejects dept budget for non-existent dept", async function () {
      const { plane, adminClient } = await loadFixture(deployFixture);
      const [enc] = await adminClient.encryptInputs([Encryptable.uint32(100n)]).execute();
      await expect(
        plane.setDeptBudget(99, enc),
      ).to.be.revertedWithCustomError(plane, "DeptNotFound");
    });

    it("resetDeptEpoch zeroes dept used budget", async function () {
      const { plane, adminClient } = await fixtureWithPackDeptEmployee();
      await expect(plane.resetDeptEpoch(DEPT_ENG))
        .to.emit(plane, "DeptEpochReset")
        .withArgs(DEPT_ENG, anyValue);

      const usedHandle = await plane.getDeptEncUsedBudgetInternal(DEPT_ENG);
      const used = await adminClient.decryptForView(usedHandle, FheTypes.Uint32).execute();
      expect(used).to.equal(0n);
    });
  });

  describe("assignEmployeeDept", function () {
    it("assigns employee to a department", async function () {
      const { plane, employee } = await loadFixture(deployFixture);
      await plane.registerEmployee(employee.address);
      await plane.createDept(DEPT_ENG, "Engineering");

      await expect(plane.assignEmployeeDept(employee.address, DEPT_ENG))
        .to.emit(plane, "EmployeeDeptAssigned")
        .withArgs(employee.address, DEPT_ENG);

      expect(await plane.employeeDept(employee.address)).to.equal(DEPT_ENG);
    });

    it("rejects assignment for unregistered employee", async function () {
      const { plane, stranger } = await loadFixture(deployFixture);
      await plane.createDept(DEPT_ENG, "Engineering");
      await expect(
        plane.assignEmployeeDept(stranger.address, DEPT_ENG),
      ).to.be.revertedWithCustomError(plane, "EmployeeNotRegistered");
    });

    it("rejects assignment to non-existent dept", async function () {
      const { plane, employee } = await loadFixture(deployFixture);
      await plane.registerEmployee(employee.address);
      await expect(
        plane.assignEmployeeDept(employee.address, 99),
      ).to.be.revertedWithCustomError(plane, "DeptNotFound");
    });

    it("clears dept assignment with deptId = 0", async function () {
      const { plane, employee } = await loadFixture(deployFixture);
      await plane.registerEmployee(employee.address);
      await plane.createDept(DEPT_ENG, "Engineering");
      await plane.assignEmployeeDept(employee.address, DEPT_ENG);
      await plane.assignEmployeeDept(employee.address, 0);
      expect(await plane.employeeDept(employee.address)).to.equal(0);
    });
  });

  // ===========================================================================
  // 6. Vendor registry
  // ===========================================================================

  describe("registerVendor", function () {
    it("registers a vendor as unchecked and emits event", async function () {
      const { plane } = await loadFixture(deployFixture);
      await expect(plane.registerVendor(VENDOR_ACME, "Acme Corp"))
        .to.emit(plane, "VendorRegistered")
        .withArgs(VENDOR_ACME, "Acme Corp");

      expect(await plane.vendorExists(VENDOR_ACME)).to.equal(true);
      expect(await plane.vendorCount()).to.equal(1n);

      const [name, status] = await plane.getVendorInfo(VENDOR_ACME);
      expect(name).to.equal("Acme Corp");
      expect(status).to.equal(VENDOR_UNCHECKED);
    });

    it("rejects duplicate vendor id", async function () {
      const { plane } = await loadFixture(deployFixture);
      await plane.registerVendor(VENDOR_ACME, "Acme Corp");
      await expect(
        plane.registerVendor(VENDOR_ACME, "Acme Dup"),
      ).to.be.revertedWithCustomError(plane, "VendorAlreadyRegistered");
    });

    it("rejects non-admin vendor registration", async function () {
      const { plane, stranger } = await loadFixture(deployFixture);
      await expect(
        plane.connect(stranger).registerVendor(VENDOR_ACME, "Acme"),
      ).to.be.revertedWithCustomError(plane, "OwnableUnauthorizedAccount");
    });
  });

  describe("setVendorStatus", function () {
    it("updates vendor status to compliant", async function () {
      const { plane } = await loadFixture(deployFixture);
      await plane.registerVendor(VENDOR_ACME, "Acme Corp");

      await expect(plane.setVendorStatus(VENDOR_ACME, VENDOR_COMPLIANT))
        .to.emit(plane, "VendorStatusUpdated")
        .withArgs(VENDOR_ACME, VENDOR_COMPLIANT);

      const [, status] = await plane.getVendorInfo(VENDOR_ACME);
      expect(status).to.equal(VENDOR_COMPLIANT);
    });

    it("updates vendor status to suspended", async function () {
      const { plane } = await loadFixture(deployFixture);
      await plane.registerVendor(VENDOR_ACME, "Acme Corp");
      await plane.setVendorStatus(VENDOR_ACME, VENDOR_SUSPENDED);
      const [, status] = await plane.getVendorInfo(VENDOR_ACME);
      expect(status).to.equal(VENDOR_SUSPENDED);
    });

    it("updates vendor status to banned", async function () {
      const { plane } = await loadFixture(deployFixture);
      await plane.registerVendor(VENDOR_ACME, "Acme Corp");
      await plane.setVendorStatus(VENDOR_ACME, VENDOR_BANNED);
      const [, status] = await plane.getVendorInfo(VENDOR_ACME);
      expect(status).to.equal(VENDOR_BANNED);
    });

    it("rejects status update for non-existent vendor", async function () {
      const { plane } = await loadFixture(deployFixture);
      await expect(
        plane.setVendorStatus(999, VENDOR_COMPLIANT),
      ).to.be.revertedWithCustomError(plane, "VendorNotFound");
    });
  });

  // ===========================================================================
  // 7. Request submission with extended params
  // ===========================================================================

  describe("submitRequest — basic", function () {
    it("submits with deptId=0 and vendorId=0 successfully", async function () {
      const { plane, employee, employeeClient } = await fixtureWithPackAndEmployee();
      await expect(
        submitRequest(plane, employee, employeeClient, PACK_TRAVEL, 0, 0, 10_000n),
      ).to.emit(plane, "RequestSubmitted")
        .withArgs(0n, employee.address, PACK_TRAVEL, anyValue);

      expect(await plane.getRequestCount()).to.equal(1n);
    });

    it("stores deptId and vendorId in request", async function () {
      const { plane, employee, employeeClient } = await fixtureWithPackDeptEmployee();
      await plane.registerVendor(VENDOR_ACME, "Acme");
      await plane.setVendorStatus(VENDOR_ACME, VENDOR_COMPLIANT);

      await submitRequest(plane, employee, employeeClient, PACK_TRAVEL, DEPT_ENG, VENDOR_ACME, 10_000n);

      expect(await plane.getRequestDeptId(0)).to.equal(DEPT_ENG);
      expect(await plane.getRequestVendorId(0)).to.equal(VENDOR_ACME);
    });

    it("unregistered employee cannot submit", async function () {
      const { plane, stranger, strangerClient } = await fixtureWithPackAndEmployee();
      const [enc] = await strangerClient.encryptInputs([Encryptable.uint32(10_000n)]).execute();
      await expect(
        plane.connect(stranger).submitRequest(PACK_TRAVEL, 0, 0, enc, "Stranger"),
      ).to.be.revertedWithCustomError(plane, "EmployeeNotRegistered");
    });

    it("rejects zero ctHash amount", async function () {
      const { plane, employee } = await fixtureWithPackAndEmployee();
      const zeroInput = { ctHash: 0n, securityZone: 0, utype: 0, signature: "0x00" };
      // InvalidEncryptedInput name collides with FHE lib error — just verify reverts
      await expect(
        plane.connect(employee).submitRequest(PACK_TRAVEL, 0, 0, zeroInput, "Zero"),
      ).to.be.reverted;
    });

    it("rejects submission to non-existent dept", async function () {
      const { plane, employee, employeeClient } = await fixtureWithPackAndEmployee();
      const [enc] = await employeeClient.encryptInputs([Encryptable.uint32(10_000n)]).execute();
      await expect(
        plane.connect(employee).submitRequest(PACK_TRAVEL, 99, 0, enc, "Bad dept"),
      ).to.be.revertedWithCustomError(plane, "DeptNotFound");
    });

    it("rejects submission to non-existent vendor", async function () {
      const { plane, employee, employeeClient } = await fixtureWithPackAndEmployee();
      const [enc] = await employeeClient.encryptInputs([Encryptable.uint32(10_000n)]).execute();
      await expect(
        plane.connect(employee).submitRequest(PACK_TRAVEL, 0, 999, enc, "Bad vendor"),
      ).to.be.revertedWithCustomError(plane, "VendorNotFound");
    });
  });

  // ===========================================================================
  // 8. Risk bitmap
  // ===========================================================================

  describe("risk bitmap", function () {
    it("sets RISK_NO_DEPT and RISK_NO_VENDOR when both are 0", async function () {
      const { plane, employee, employeeClient } = await fixtureWithPackAndEmployee();
      await submitRequest(plane, employee, employeeClient, PACK_TRAVEL, 0, 0, 10_000n);
      const bitmap = await plane.getRequestRiskBitmap(0);
      expect(Number(bitmap) & RISK_NO_DEPT).to.not.equal(0);
      expect(Number(bitmap) & RISK_NO_VENDOR).to.not.equal(0);
    });

    it("sets RISK_VENDOR_SUSPENDED for suspended vendor", async function () {
      const { plane, employee, employeeClient } = await fixtureWithPackDeptEmployee();
      await plane.registerVendor(VENDOR_ACME, "Acme");
      await plane.setVendorStatus(VENDOR_ACME, VENDOR_SUSPENDED);

      await submitRequest(plane, employee, employeeClient, PACK_TRAVEL, DEPT_ENG, VENDOR_ACME, 10_000n);
      const bitmap = await plane.getRequestRiskBitmap(0);
      expect(Number(bitmap) & RISK_VENDOR_SUSPENDED).to.not.equal(0);
      expect(Number(bitmap) & RISK_NO_DEPT).to.equal(0);    // dept is set
    });

    it("sets RISK_VENDOR_UNCHECKED for unchecked vendor", async function () {
      const { plane, employee, employeeClient } = await fixtureWithPackDeptEmployee();
      await plane.registerVendor(VENDOR_ACME, "Acme");
      // leave as VENDOR_UNCHECKED

      await submitRequest(plane, employee, employeeClient, PACK_TRAVEL, DEPT_ENG, VENDOR_ACME, 10_000n);
      const bitmap = await plane.getRequestRiskBitmap(0);
      expect(Number(bitmap) & RISK_VENDOR_UNCHECKED).to.not.equal(0);
    });

    it("no risk flags for compliant vendor with dept", async function () {
      const { plane, employee, employeeClient } = await fixtureWithPackDeptEmployee();
      await plane.registerVendor(VENDOR_ACME, "Acme");
      await plane.setVendorStatus(VENDOR_ACME, VENDOR_COMPLIANT);

      await submitRequest(plane, employee, employeeClient, PACK_TRAVEL, DEPT_ENG, VENDOR_ACME, 10_000n);
      const bitmap = await plane.getRequestRiskBitmap(0);
      expect(Number(bitmap)).to.equal(0);
    });

    it("banned vendor blocks submission with VendorBanned revert", async function () {
      const { plane, employee, employeeClient } = await fixtureWithPackAndEmployee();
      await plane.registerVendor(VENDOR_ACME, "Acme");
      await plane.setVendorStatus(VENDOR_ACME, VENDOR_BANNED);

      const [enc] = await employeeClient.encryptInputs([Encryptable.uint32(10_000n)]).execute();
      await expect(
        plane.connect(employee).submitRequest(PACK_TRAVEL, 0, VENDOR_ACME, enc, "Banned vendor"),
      ).to.be.revertedWithCustomError(plane, "VendorBanned");
    });

    it("inactive dept blocks submission with DeptInactive revert", async function () {
      const { plane, employee, employeeClient } = await fixtureWithPackAndEmployee();
      await plane.createDept(DEPT_ENG, "Engineering");
      await plane.setDeptActive(DEPT_ENG, false);

      const [enc] = await employeeClient.encryptInputs([Encryptable.uint32(10_000n)]).execute();
      await expect(
        plane.connect(employee).submitRequest(PACK_TRAVEL, DEPT_ENG, 0, enc, "Inactive dept"),
      ).to.be.revertedWithCustomError(plane, "DeptInactive");
    });
  });

  // ===========================================================================
  // 9. Recurring interval enforcement
  // ===========================================================================

  describe("setPackRecurringInterval / recurring enforcement", function () {
    it("admin sets recurring interval and emits event", async function () {
      const { plane } = await fixtureWithPackAndEmployee();
      await expect(plane.setPackRecurringInterval(PACK_TRAVEL, 3600))
        .to.emit(plane, "PackIntervalSet")
        .withArgs(PACK_TRAVEL, 3600);
      expect(await plane.packRecurringInterval(PACK_TRAVEL)).to.equal(3600n);
    });

    it("rejects interval set for non-existent pack", async function () {
      const { plane } = await loadFixture(deployFixture);
      await expect(
        plane.setPackRecurringInterval(99, 3600),
      ).to.be.revertedWithCustomError(plane, "PackNotFound");
    });

    it("second submission within interval reverts", async function () {
      const { plane, employee, employeeClient } = await fixtureWithPackAndEmployee();
      await plane.setPackRecurringInterval(PACK_TRAVEL, 3600); // 1 hour

      await submitRequest(plane, employee, employeeClient, PACK_TRAVEL, 0, 0, 10_000n);

      // Second immediate submission should fail
      const [enc2] = await employeeClient.encryptInputs([Encryptable.uint32(10_000n)]).execute();
      await expect(
        plane.connect(employee).submitRequest(PACK_TRAVEL, 0, 0, enc2, "Too fast"),
      ).to.be.revertedWithCustomError(plane, "RecurringIntervalNotElapsed");
    });

    it("submission succeeds after interval has elapsed", async function () {
      const { plane, employee, employeeClient } = await fixtureWithPackAndEmployee();
      await plane.setPackRecurringInterval(PACK_TRAVEL, 3600); // 1 hour

      await submitRequest(plane, employee, employeeClient, PACK_TRAVEL, 0, 0, 10_000n);

      // Advance time by 2 hours
      await time.increase(7200);

      await expect(
        submitRequest(plane, employee, employeeClient, PACK_TRAVEL, 0, 0, 10_000n),
      ).to.emit(plane, "RequestSubmitted");
    });

    it("different employees are tracked independently", async function () {
      const { plane, employee, employeeTwo, employeeClient, employeeTwoClient } =
        await fixtureWithPackAndEmployee();
      await plane.registerEmployee(employeeTwo.address);
      await plane.setPackRecurringInterval(PACK_TRAVEL, 3600);

      await submitRequest(plane, employee, employeeClient, PACK_TRAVEL, 0, 0, 10_000n);

      // employeeTwo should be able to submit immediately
      await expect(
        submitRequest(plane, employeeTwo, employeeTwoClient, PACK_TRAVEL, 0, 0, 10_000n),
      ).to.emit(plane, "RequestSubmitted");
    });

    it("interval=0 disables recurring enforcement", async function () {
      const { plane, employee, employeeClient } = await fixtureWithPackAndEmployee();
      await plane.setPackRecurringInterval(PACK_TRAVEL, 3600);
      await submitRequest(plane, employee, employeeClient, PACK_TRAVEL, 0, 0, 10_000n);

      // Disable interval
      await plane.setPackRecurringInterval(PACK_TRAVEL, 0);

      // Should now succeed immediately
      await expect(
        submitRequest(plane, employee, employeeClient, PACK_TRAVEL, 0, 0, 10_000n),
      ).to.emit(plane, "RequestSubmitted");
    });
  });

  // ===========================================================================
  // 10. Department budget accumulation
  // ===========================================================================

  describe("department budget accumulation", function () {
    it("dept used budget accumulates with each submission", async function () {
      const { plane, employee, employeeClient, adminClient } =
        await fixtureWithPackDeptEmployee();

      await submitRequest(plane, employee, employeeClient, PACK_TRAVEL, DEPT_ENG, 0, 30_000n);

      const usedHandle = await plane.getDeptEncUsedBudgetInternal(DEPT_ENG);
      const used = await adminClient.decryptForView(usedHandle, FheTypes.Uint32).execute();
      expect(used).to.equal(30_000n);
    });

    it("dept budget starts at zero before any submissions", async function () {
      const { plane, adminClient } = await fixtureWithPackDeptEmployee();
      const usedHandle = await plane.getDeptEncUsedBudgetInternal(DEPT_ENG);
      const used = await adminClient.decryptForView(usedHandle, FheTypes.Uint32).execute();
      expect(used).to.equal(0n);
    });

    it("dept budget does not accumulate when dept budget not set", async function () {
      const { plane, employee, employeeClient, adminClient } = await fixtureWithPackAndEmployee();
      // Create dept without setting budget
      await plane.createDept(DEPT_SALES, "Sales");

      await submitRequest(plane, employee, employeeClient, PACK_TRAVEL, DEPT_SALES, 0, 30_000n);

      // Should not throw — just no accumulation
      const [, , budgetSet] = await plane.getDeptInfo(DEPT_SALES);
      expect(budgetSet).to.equal(false);
    });
  });

  // ===========================================================================
  // 11. FHE policy evaluation (auto-approve / needs-review / auto-deny)
  // ===========================================================================

  describe("FHE policy evaluation", function () {
    it("amount ≤ autoThreshold routes to AutoApproved", async function () {
      const { plane, employee, employeeClient, adminClient } = await fixtureWithPackAndEmployee();
      await submitRequest(plane, employee, employeeClient, PACK_TRAVEL, 0, 0, AUTO_THRESH);

      const status = await decryptStatus(plane, adminClient, 0);
      expect(status).to.equal(1n); // STATUS_AUTO_APPROVED
    });

    it("amount between autoThreshold and hardLimit routes to NeedsReview", async function () {
      const { plane, employee, employeeClient, adminClient } = await fixtureWithPackAndEmployee();
      await submitRequest(plane, employee, employeeClient, PACK_TRAVEL, 0, 0, AUTO_THRESH + 1n);

      const status = await decryptStatus(plane, adminClient, 0);
      expect(status).to.equal(2n); // STATUS_NEEDS_REVIEW
    });

    it("amount > hardLimit routes to AutoDenied", async function () {
      const { plane, employee, employeeClient, adminClient } = await fixtureWithPackAndEmployee();
      await submitRequest(plane, employee, employeeClient, PACK_TRAVEL, 0, 0, HARD_LIMIT + 1n);

      const status = await decryptStatus(plane, adminClient, 0);
      expect(status).to.equal(3n); // STATUS_AUTO_DENIED
    });

    it("budget exhaustion routes to AutoDenied", async function () {
      const { plane, employee, employeeClient, adminClient } = await fixtureWithPackAndEmployee();
      // First fill the budget
      await submitRequest(plane, employee, employeeClient, PACK_TRAVEL, 0, 0, BUDGET_LIMIT);
      // Now submit a small amount that would exceed the filled budget
      await submitRequest(plane, employee, employeeClient, PACK_TRAVEL, 0, 0, 1n);

      const status = await decryptStatus(plane, adminClient, 1);
      expect(status).to.equal(3n); // STATUS_AUTO_DENIED (budget exhausted)
    });
  });

  // ===========================================================================
  // 12. Publish & admin review
  // ===========================================================================

  describe("publishDecryptedResult", function () {
    it("publishes auto-approved result and sets receipt hash", async function () {
      const { plane, employee, employeeClient, adminClient } = await fixtureWithPackAndEmployee();
      await submitRequest(plane, employee, employeeClient, PACK_TRAVEL, 0, 0, AUTO_THRESH);

      const status = await publishRequest(plane, adminClient, 0);
      expect(status).to.equal(1); // STATUS_AUTO_APPROVED

      const [,,,,,,,, resultPublished, publicStatus,,receiptHash] = await plane.getRequest(0);
      expect(resultPublished).to.equal(true);
      expect(publicStatus).to.equal(1);
      expect(receiptHash).to.not.equal("0x" + "00".repeat(32));
    });

    it("publishes auto-denied result", async function () {
      const { plane, employee, employeeClient, adminClient } = await fixtureWithPackAndEmployee();
      await submitRequest(plane, employee, employeeClient, PACK_TRAVEL, 0, 0, HARD_LIMIT + 1n);
      await publishRequest(plane, adminClient, 0);

      const [,,,,,,,,, publicStatus] = await plane.getRequest(0);
      expect(publicStatus).to.equal(3); // STATUS_AUTO_DENIED
    });

    it("routes to review queue on NeedsReview result", async function () {
      const { plane, employee, employeeClient, adminClient } = await fixtureWithPackAndEmployee();
      await submitRequest(plane, employee, employeeClient, PACK_TRAVEL, 0, 0, AUTO_THRESH + 1n);

      const status = await publishRequest(plane, adminClient, 0);
      expect(status).to.equal(2); // STATUS_NEEDS_REVIEW

      const [,,,,,,,,, publicStatus, inReview] = await plane.getRequest(0);
      expect(publicStatus).to.equal(0); // not yet finalised
      expect(inReview).to.equal(true);
      expect(await plane.packReviewPendingCount(PACK_TRAVEL)).to.equal(1n);
    });

    it("rejects publishing the same result twice", async function () {
      const { plane, employee, employeeClient, adminClient } = await fixtureWithPackAndEmployee();
      await submitRequest(plane, employee, employeeClient, PACK_TRAVEL, 0, 0, AUTO_THRESH);
      await publishRequest(plane, adminClient, 0);

      const permit = await adminClient.permits.getOrCreateSelfPermit();
      const result = await adminClient
        .decryptForTx(await plane.getEncryptedStatus(0))
        .withPermit(permit)
        .execute();
      await expect(
        plane.publishDecryptedResult(0, Number(result.decryptedValue), result.signature),
      ).to.be.revertedWithCustomError(plane, "ResultAlreadyPublished");
    });

    it("rejects non-admin publish", async function () {
      const { plane, employee, employeeClient, stranger } = await fixtureWithPackAndEmployee();
      await submitRequest(plane, employee, employeeClient, PACK_TRAVEL, 0, 0, AUTO_THRESH);
      await expect(
        plane.connect(stranger).publishDecryptedResult(0, 1, "0x"),
      ).to.be.revertedWithCustomError(plane, "OwnableUnauthorizedAccount");
    });
  });

  describe("adminReviewRequest", function () {
    async function fixtureInReview() {
      const base = await fixtureWithPackAndEmployee();
      const { plane, employee, employeeClient, adminClient } = base;
      await submitRequest(plane, employee, employeeClient, PACK_TRAVEL, 0, 0, AUTO_THRESH + 1n);
      await publishRequest(plane, adminClient, 0);
      return base;
    }

    it("admin can approve a review request", async function () {
      const { plane } = await fixtureInReview();
      await expect(plane.adminReviewRequest(0, true))
        .to.emit(plane, "AdminResolved")
        .withArgs(0n, true);

      const [,,,,,,,,, publicStatus, inReview] = await plane.getRequest(0);
      expect(publicStatus).to.equal(4); // STATUS_ADMIN_APPROVED
      expect(inReview).to.equal(false);
    });

    it("admin can deny a review request", async function () {
      const { plane } = await fixtureInReview();
      await plane.adminReviewRequest(0, false);

      const [,,,,,,,,, publicStatus] = await plane.getRequest(0);
      expect(publicStatus).to.equal(5); // STATUS_ADMIN_DENIED
    });

    it("rejects adminReviewRequest on non-review request", async function () {
      const { plane, employee, employeeClient, adminClient } = await fixtureWithPackAndEmployee();
      await submitRequest(plane, employee, employeeClient, PACK_TRAVEL, 0, 0, AUTO_THRESH);
      await publishRequest(plane, adminClient, 0);

      await expect(
        plane.adminReviewRequest(0, true),
      ).to.be.revertedWithCustomError(plane, "RequestNotInReview");
    });

    it("rejects double admin resolution", async function () {
      const { plane } = await fixtureInReview();
      await plane.adminReviewRequest(0, true);
      await expect(
        plane.adminReviewRequest(0, true),
      ).to.be.revertedWithCustomError(plane, "RequestNotInReview");
    });

    it("rejects non-admin resolution", async function () {
      const { plane, stranger } = await fixtureInReview();
      await expect(
        plane.connect(stranger).adminReviewRequest(0, true),
      ).to.be.revertedWithCustomError(plane, "OwnableUnauthorizedAccount");
    });
  });

  // ===========================================================================
  // 13. Evidence registry
  // ===========================================================================

  describe("submitEvidence", function () {
    it("employee can submit evidence hash for their request", async function () {
      const { plane, employee, employeeClient } = await fixtureWithPackAndEmployee();
      await submitRequest(plane, employee, employeeClient, PACK_TRAVEL, 0, 0, 10_000n);

      const hash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("receipt-pdf-bytes"));
      await expect(
        plane.connect(employee).submitEvidence(0, hash),
      ).to.emit(plane, "EvidenceSubmitted")
        .withArgs(0n, hash);

      expect(await plane.evidenceHash(0)).to.equal(hash);
      expect(await plane.evidenceSubmitted(0)).to.equal(true);
    });

    it("rejects evidence from non-owner", async function () {
      const { plane, employee, employeeTwo, employeeClient } = await fixtureWithPackAndEmployee();
      await plane.registerEmployee(employeeTwo.address);
      await submitRequest(plane, employee, employeeClient, PACK_TRAVEL, 0, 0, 10_000n);

      const hash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("receipt"));
      await expect(
        plane.connect(employeeTwo).submitEvidence(0, hash),
      ).to.be.revertedWithCustomError(plane, "NotRequestOwner");
    });

    it("rejects duplicate evidence submission", async function () {
      const { plane, employee, employeeClient } = await fixtureWithPackAndEmployee();
      await submitRequest(plane, employee, employeeClient, PACK_TRAVEL, 0, 0, 10_000n);

      const hash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("receipt"));
      await plane.connect(employee).submitEvidence(0, hash);

      await expect(
        plane.connect(employee).submitEvidence(0, hash),
      ).to.be.revertedWithCustomError(plane, "EvidenceAlreadySubmitted");
    });

    it("rejects evidence for non-existent request", async function () {
      const { plane, employee } = await fixtureWithPackAndEmployee();
      const hash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("receipt"));
      await expect(
        plane.connect(employee).submitEvidence(999, hash),
      ).to.be.revertedWithCustomError(plane, "RequestNotFound");
    });
  });

  // ===========================================================================
  // 14. ACL (decrypt access control)
  // ===========================================================================

  describe("ACL", function () {
    it("admin can decrypt an employee request status", async function () {
      const { plane, employee, employeeClient, adminClient } = await fixtureWithPackAndEmployee();
      await submitRequest(plane, employee, employeeClient, PACK_TRAVEL, 0, 0, AUTO_THRESH);

      const status = await decryptStatus(plane, adminClient, 0);
      expect([1n, 2n, 3n]).to.include(status);
    });

    it("employee can decrypt their own request status", async function () {
      const { plane, employee, employeeClient } = await fixtureWithPackAndEmployee();
      await submitRequest(plane, employee, employeeClient, PACK_TRAVEL, 0, 0, AUTO_THRESH);

      const status = await decryptStatus(plane, employeeClient, 0);
      expect([1n, 2n, 3n]).to.include(status);
    });

    it("stranger cannot decrypt a request status", async function () {
      const { plane, employee, employeeClient, strangerClient } = await fixtureWithPackAndEmployee();
      await submitRequest(plane, employee, employeeClient, PACK_TRAVEL, 0, 0, AUTO_THRESH);

      // CoFHE mock throws on unauthorized seal — any rejection is correct
      await expect(
        decryptStatus(plane, strangerClient, 0),
      ).to.be.rejected;
    });

    it("employee cannot decrypt another employee's request", async function () {
      const { plane, employee, employeeTwo, employeeClient, employeeTwoClient } =
        await fixtureWithPackAndEmployee();
      await plane.registerEmployee(employeeTwo.address);
      await submitRequest(plane, employee, employeeClient, PACK_TRAVEL, 0, 0, AUTO_THRESH);

      // CoFHE mock throws on unauthorized seal — any rejection is correct
      await expect(
        decryptStatus(plane, employeeTwoClient, 0),
      ).to.be.rejected;
    });
  });

  // ===========================================================================
  // 15. Pack summary counters
  // ===========================================================================

  describe("pack summary counters", function () {
    it("tracks total, approved, denied, inReview, pending correctly", async function () {
      const { plane, employee, employeeClient, adminClient } = await fixtureWithPackAndEmployee();

      // Submit 3 requests: auto-approve, needs-review, auto-deny
      await submitRequest(plane, employee, employeeClient, PACK_TRAVEL, 0, 0, AUTO_THRESH);
      await submitRequest(plane, employee, employeeClient, PACK_TRAVEL, 0, 0, AUTO_THRESH + 1n);
      await submitRequest(plane, employee, employeeClient, PACK_TRAVEL, 0, 0, HARD_LIMIT + 1n);

      await publishRequest(plane, adminClient, 0); // AutoApproved
      await publishRequest(plane, adminClient, 1); // NeedsReview
      await publishRequest(plane, adminClient, 2); // AutoDenied

      const [total, approved, denied, pending, inReview] = await plane.getPackSummary(PACK_TRAVEL);
      expect(total).to.equal(3n);
      expect(approved).to.equal(1n);
      expect(denied).to.equal(1n);
      expect(inReview).to.equal(1n);
      expect(pending).to.equal(0n);
    });
  });

  // ===========================================================================
  // 16. Receipt hash
  // ===========================================================================

  describe("receipt hash", function () {
    it("receipt hash is deterministic and non-zero after publish", async function () {
      const { plane, employee, employeeClient, adminClient } = await fixtureWithPackAndEmployee();
      await submitRequest(plane, employee, employeeClient, PACK_TRAVEL, 0, 0, AUTO_THRESH);
      await publishRequest(plane, adminClient, 0);

      const [,,,,,,,,,,, receiptHash] = await plane.getRequest(0);
      expect(receiptHash).to.not.equal("0x" + "00".repeat(32));
    });

    it("receipt hashes differ for different requests", async function () {
      const { plane, employee, employeeClient, adminClient } = await fixtureWithPackAndEmployee();
      await submitRequest(plane, employee, employeeClient, PACK_TRAVEL, 0, 0, AUTO_THRESH);
      await submitRequest(plane, employee, employeeClient, PACK_TRAVEL, 0, 0, AUTO_THRESH);
      await publishRequest(plane, adminClient, 0);
      await publishRequest(plane, adminClient, 1);

      const [,,,,,,,,,,,hash0] = await plane.getRequest(0);
      const [,,,,,,,,,,,hash1] = await plane.getRequest(1);
      expect(hash0).to.not.equal(hash1);
    });
  });

  // ===========================================================================
  // 17. getRequest returns extended fields
  // ===========================================================================

  describe("getRequest extended fields", function () {
    it("returns all 13 fields including deptId, vendorId, riskBitmap", async function () {
      const { plane, employee, employeeClient } = await fixtureWithPackDeptEmployee();
      await plane.registerVendor(VENDOR_ACME, "Acme");
      await plane.setVendorStatus(VENDOR_ACME, VENDOR_COMPLIANT);

      await submitRequest(plane, employee, employeeClient, PACK_TRAVEL, DEPT_ENG, VENDOR_ACME, 10_000n, "Full test");

      const [
        empAddr, packId, deptId, vendorId,
        encAmount, encStatus, memo, timestamp,
        resultPublished, publicStatus, inReview, receiptHash, riskBitmap
      ] = await plane.getRequest(0);

      expect(empAddr).to.equal(employee.address);
      expect(packId).to.equal(PACK_TRAVEL);
      expect(deptId).to.equal(DEPT_ENG);
      expect(vendorId).to.equal(VENDOR_ACME);
      expect(memo).to.equal("Full test");
      expect(resultPublished).to.equal(false);
      expect(publicStatus).to.equal(0);
      expect(inReview).to.equal(false);
      expect(Number(riskBitmap)).to.equal(0); // compliant vendor + dept set = no risk
    });
  });
});
