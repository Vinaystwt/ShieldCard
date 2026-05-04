import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { Encryptable, FheTypes } from "@cofhe/sdk";
import hre from "hardhat";

const TASK_COFHE_MOCKS_DEPLOY = "task:cofhe-mocks:deploy";

const PACK_TRAVEL    = 1;
const PACK_SAAS      = 2;
const PACK_VENDOR    = 3;
const PACK_MARKETING = 4;

// Thresholds (in cents): hard=200_000, auto=50_000, budget=500_000
const HARD_LIMIT    = 200_000n;
const AUTO_THRESH   = 50_000n;
const BUDGET_LIMIT  = 500_000n;

describe("ShieldCardPolicyEngine", function () {
  async function deployFixture() {
    await hre.run(TASK_COFHE_MOCKS_DEPLOY);

    const [admin, employee, employeeTwo, stranger] = await hre.ethers.getSigners();
    const Factory = await hre.ethers.getContractFactory("ShieldCardPolicyEngineHarness");
    const engine = await Factory.connect(admin).deploy();

    const adminClient        = await hre.cofhe.createClientWithBatteries(admin);
    const employeeClient     = await hre.cofhe.createClientWithBatteries(employee);
    const employeeTwoClient  = await hre.cofhe.createClientWithBatteries(employeeTwo);
    const strangerClient     = await hre.cofhe.createClientWithBatteries(stranger);

    return { engine, admin, employee, employeeTwo, stranger, adminClient, employeeClient, employeeTwoClient, strangerClient };
  }

  /** Fixture: Travel pack set up + employee registered */
  async function fixtureWithPackAndEmployee() {
    const base = await loadFixture(deployFixture);
    const { engine, adminClient, employee } = base;

    await engine.createPack(PACK_TRAVEL, "Travel");

    const [encHard, encAuto, encBudget] = await adminClient
      .encryptInputs([
        Encryptable.uint32(HARD_LIMIT),
        Encryptable.uint32(AUTO_THRESH),
        Encryptable.uint32(BUDGET_LIMIT),
      ])
      .execute();
    await engine.setPolicyThresholds(PACK_TRAVEL, encHard, encAuto, encBudget);
    await engine.registerEmployee(employee.address);

    return base;
  }

  /** Helpers */
  async function decryptStatus(engine: any, client: any, requestId: number) {
    const handle = await engine.getEncryptedStatus(requestId);
    return client.decryptForView(handle, FheTypes.Uint8).execute();
  }

  async function publishRequest(engine: any, adminClient: any, requestId: number) {
    const permit = await adminClient.permits.getOrCreateSelfPermit();
    const result = await adminClient
      .decryptForTx(await engine.getEncryptedStatus(requestId))
      .withPermit(permit)
      .execute();
    await engine.publishDecryptedResult(requestId, Number(result.decryptedValue), result.signature);
    return Number(result.decryptedValue);
  }

  // ===========================================================================
  // Global controls
  // ===========================================================================

  describe("pauseSubmissions / unpauseSubmissions", function () {
    it("admin can pause and unpause submissions", async function () {
      const { engine } = await loadFixture(deployFixture);

      await expect(engine.pauseSubmissions())
        .to.emit(engine, "SubmissionsPausedEvent");
      expect(await engine.submissionsPaused()).to.equal(true);

      await expect(engine.unpauseSubmissions())
        .to.emit(engine, "SubmissionsUnpausedEvent");
      expect(await engine.submissionsPaused()).to.equal(false);
    });

    it("non-admin cannot pause", async function () {
      const { engine, stranger } = await loadFixture(deployFixture);
      await expect(
        engine.connect(stranger).pauseSubmissions(),
      ).to.be.revertedWithCustomError(engine, "OwnableUnauthorizedAccount");
    });

    it("submission reverts when paused", async function () {
      const { engine, employee, employeeClient } = await fixtureWithPackAndEmployee();

      await engine.pauseSubmissions();
      const [enc] = await employeeClient.encryptInputs([Encryptable.uint32(10_000n)]).execute();

      await expect(
        engine.connect(employee).submitRequest(PACK_TRAVEL, enc, "Paused"),
      ).to.be.revertedWithCustomError(engine, "SubmissionsPaused");
    });
  });

  // ===========================================================================
  // Employee management
  // ===========================================================================

  describe("registerEmployee", function () {
    it("registers an employee and emits event", async function () {
      const { engine, employee } = await loadFixture(deployFixture);

      await expect(engine.registerEmployee(employee.address))
        .to.emit(engine, "EmployeeRegistered")
        .withArgs(employee.address);

      expect(await engine.employeeRegistered(employee.address)).to.equal(true);
    });

    it("rejects non-owner registration", async function () {
      const { engine, employee, stranger } = await loadFixture(deployFixture);
      await expect(
        engine.connect(stranger).registerEmployee(employee.address),
      ).to.be.revertedWithCustomError(engine, "OwnableUnauthorizedAccount");
    });

    it("rejects duplicate registration", async function () {
      const { engine, employee } = await loadFixture(deployFixture);
      await engine.registerEmployee(employee.address);
      await expect(
        engine.registerEmployee(employee.address),
      ).to.be.revertedWithCustomError(engine, "EmployeeAlreadyRegistered");
    });
  });

  describe("freezeEmployee / unfreezeEmployee", function () {
    it("admin can freeze and unfreeze an employee", async function () {
      const { engine, employee } = await loadFixture(deployFixture);
      await engine.registerEmployee(employee.address);

      await expect(engine.freezeEmployee(employee.address))
        .to.emit(engine, "EmployeeFrozen")
        .withArgs(employee.address);
      expect(await engine.employeeFrozen(employee.address)).to.equal(true);

      await expect(engine.unfreezeEmployee(employee.address))
        .to.emit(engine, "EmployeeUnfrozen")
        .withArgs(employee.address);
      expect(await engine.employeeFrozen(employee.address)).to.equal(false);
    });

    it("frozen employee cannot submit", async function () {
      const { engine, employee, employeeClient } = await fixtureWithPackAndEmployee();
      await engine.freezeEmployee(employee.address);

      const [enc] = await employeeClient.encryptInputs([Encryptable.uint32(10_000n)]).execute();
      await expect(
        engine.connect(employee).submitRequest(PACK_TRAVEL, enc, "Frozen"),
      ).to.be.revertedWithCustomError(engine, "EmployeeIsFrozen");
    });

    it("unfrozen employee can submit again", async function () {
      const { engine, employee, employeeClient } = await fixtureWithPackAndEmployee();
      await engine.freezeEmployee(employee.address);
      await engine.unfreezeEmployee(employee.address);

      const [enc] = await employeeClient.encryptInputs([Encryptable.uint32(10_000n)]).execute();
      await expect(
        engine.connect(employee).submitRequest(PACK_TRAVEL, enc, "Back"),
      ).to.emit(engine, "RequestSubmitted");
    });

    it("rejects freeze for unregistered address", async function () {
      const { engine, stranger } = await loadFixture(deployFixture);
      await expect(
        engine.freezeEmployee(stranger.address),
      ).to.be.revertedWithCustomError(engine, "EmployeeNotRegistered");
    });
  });

  // ===========================================================================
  // Policy pack management
  // ===========================================================================

  describe("createPack", function () {
    it("creates a pack with correct initial state", async function () {
      const { engine } = await loadFixture(deployFixture);

      await expect(engine.createPack(PACK_SAAS, "SaaS"))
        .to.emit(engine, "PackCreated")
        .withArgs(PACK_SAAS, "SaaS");

      const [name, active, limitsSet] = await engine.getPackInfo(PACK_SAAS);
      expect(name).to.equal("SaaS");
      expect(active).to.equal(true);
      expect(limitsSet).to.equal(false);
      expect(await engine.packCount()).to.equal(1n);
    });

    it("rejects duplicate pack id", async function () {
      const { engine } = await loadFixture(deployFixture);
      await engine.createPack(PACK_SAAS, "SaaS");
      await expect(
        engine.createPack(PACK_SAAS, "SaaS Again"),
      ).to.be.revertedWithCustomError(engine, "PackAlreadyExists");
    });

    it("rejects non-admin creation", async function () {
      const { engine, stranger } = await loadFixture(deployFixture);
      await expect(
        engine.connect(stranger).createPack(PACK_SAAS, "SaaS"),
      ).to.be.revertedWithCustomError(engine, "OwnableUnauthorizedAccount");
    });
  });

  describe("setPolicyThresholds", function () {
    it("stores all three encrypted thresholds", async function () {
      const { engine, adminClient } = await loadFixture(deployFixture);
      await engine.createPack(PACK_TRAVEL, "Travel");

      const [encHard, encAuto, encBudget] = await adminClient
        .encryptInputs([
          Encryptable.uint32(HARD_LIMIT),
          Encryptable.uint32(AUTO_THRESH),
          Encryptable.uint32(BUDGET_LIMIT),
        ])
        .execute();

      await expect(engine.setPolicyThresholds(PACK_TRAVEL, encHard, encAuto, encBudget))
        .to.emit(engine, "PackLimitsSet")
        .withArgs(PACK_TRAVEL);

      const [, , limitsSet] = await engine.getPackInfo(PACK_TRAVEL);
      expect(limitsSet).to.equal(true);

      const hardHandle   = await engine.getPackEncHardLimit(PACK_TRAVEL);
      const autoHandle   = await engine.getPackEncAutoThreshold(PACK_TRAVEL);
      const budgetHandle = await engine.getPackEncBudgetLimit(PACK_TRAVEL);

      const hard   = await adminClient.decryptForView(hardHandle,   FheTypes.Uint32).execute();
      const auto_  = await adminClient.decryptForView(autoHandle,   FheTypes.Uint32).execute();
      const budget = await adminClient.decryptForView(budgetHandle, FheTypes.Uint32).execute();

      expect(hard).to.equal(HARD_LIMIT);
      expect(auto_).to.equal(AUTO_THRESH);
      expect(budget).to.equal(BUDGET_LIMIT);
    });

    it("rejects thresholds for non-existent pack", async function () {
      const { engine, adminClient } = await loadFixture(deployFixture);
      const [a, b, c] = await adminClient.encryptInputs([
        Encryptable.uint32(1n), Encryptable.uint32(1n), Encryptable.uint32(1n),
      ]).execute();
      await expect(
        engine.setPolicyThresholds(99, a, b, c),
      ).to.be.revertedWithCustomError(engine, "PackNotFound");
    });

    it("allows updating thresholds after initial set", async function () {
      const { engine, adminClient } = await loadFixture(deployFixture);
      await engine.createPack(PACK_SAAS, "SaaS");

      const [h1, a1, b1] = await adminClient.encryptInputs([
        Encryptable.uint32(100_000n), Encryptable.uint32(30_000n), Encryptable.uint32(400_000n),
      ]).execute();
      await engine.setPolicyThresholds(PACK_SAAS, h1, a1, b1);

      const [h2, a2, b2] = await adminClient.encryptInputs([
        Encryptable.uint32(150_000n), Encryptable.uint32(40_000n), Encryptable.uint32(600_000n),
      ]).execute();
      await engine.setPolicyThresholds(PACK_SAAS, h2, a2, b2);

      const hardHandle = await engine.getPackEncHardLimit(PACK_SAAS);
      const val = await adminClient.decryptForView(hardHandle, FheTypes.Uint32).execute();
      expect(val).to.equal(150_000n);
    });
  });

  describe("setPackActive", function () {
    it("deactivates and reactivates a pack", async function () {
      const { engine } = await loadFixture(deployFixture);
      await engine.createPack(PACK_MARKETING, "Marketing");

      await expect(engine.setPackActive(PACK_MARKETING, false))
        .to.emit(engine, "PackActiveChanged").withArgs(PACK_MARKETING, false);

      expect((await engine.getPackInfo(PACK_MARKETING))[1]).to.equal(false);

      await engine.setPackActive(PACK_MARKETING, true);
      expect((await engine.getPackInfo(PACK_MARKETING))[1]).to.equal(true);
    });
  });

  // ===========================================================================
  // Request submission guards
  // ===========================================================================

  describe("submitRequest guards", function () {
    it("rejects unregistered employee", async function () {
      const { engine, stranger, strangerClient } = await fixtureWithPackAndEmployee();
      const [enc] = await strangerClient.encryptInputs([Encryptable.uint32(10_000n)]).execute();
      await expect(
        engine.connect(stranger).submitRequest(PACK_TRAVEL, enc, "Unauth"),
      ).to.be.revertedWithCustomError(engine, "EmployeeNotRegistered");
    });

    it("rejects unknown pack", async function () {
      const { engine, employee, employeeClient } = await fixtureWithPackAndEmployee();
      const [enc] = await employeeClient.encryptInputs([Encryptable.uint32(10_000n)]).execute();
      await expect(
        engine.connect(employee).submitRequest(99, enc, "Bad pack"),
      ).to.be.revertedWithCustomError(engine, "PackNotFound");
    });

    it("rejects inactive pack", async function () {
      const { engine, employee, employeeClient } = await fixtureWithPackAndEmployee();
      await engine.setPackActive(PACK_TRAVEL, false);
      const [enc] = await employeeClient.encryptInputs([Encryptable.uint32(10_000n)]).execute();
      await expect(
        engine.connect(employee).submitRequest(PACK_TRAVEL, enc, "Inactive"),
      ).to.be.revertedWithCustomError(engine, "PackInactive");
    });

    it("rejects pack with no limits set", async function () {
      const { engine, employee, employeeClient } = await loadFixture(deployFixture);
      await engine.createPack(PACK_VENDOR, "Vendor");
      await engine.registerEmployee(employee.address);
      const [enc] = await employeeClient.encryptInputs([Encryptable.uint32(10_000n)]).execute();
      await expect(
        engine.connect(employee).submitRequest(PACK_VENDOR, enc, "No limits"),
      ).to.be.revertedWithCustomError(engine, "PackLimitsNotSet");
    });
  });

  // ===========================================================================
  // FHE policy evaluation — three-tier routing
  // ===========================================================================

  describe("FHE three-tier policy routing", function () {
    it("auto-approves when amount is within auto-threshold", async function () {
      const { engine, employee, employeeClient } = await fixtureWithPackAndEmployee();
      const [enc] = await employeeClient.encryptInputs([Encryptable.uint32(30_000n)]).execute();
      await engine.connect(employee).submitRequest(PACK_TRAVEL, enc, "Under auto");

      const status = await decryptStatus(engine, employeeClient, 0);
      expect(status).to.equal(1n); // AUTO_APPROVED
    });

    it("auto-approves exactly at auto-threshold", async function () {
      const { engine, employee, employeeClient } = await fixtureWithPackAndEmployee();
      const [enc] = await employeeClient.encryptInputs([Encryptable.uint32(AUTO_THRESH)]).execute();
      await engine.connect(employee).submitRequest(PACK_TRAVEL, enc, "Exact auto");

      const status = await decryptStatus(engine, employeeClient, 0);
      expect(status).to.equal(1n);
    });

    it("routes to review when above auto-threshold but within hard limit", async function () {
      const { engine, employee, employeeClient } = await fixtureWithPackAndEmployee();
      const [enc] = await employeeClient.encryptInputs([Encryptable.uint32(100_000n)]).execute();
      await engine.connect(employee).submitRequest(PACK_TRAVEL, enc, "Review zone");

      const status = await decryptStatus(engine, employeeClient, 0);
      expect(status).to.equal(2n); // NEEDS_REVIEW
    });

    it("auto-denies when amount exceeds hard limit", async function () {
      const { engine, employee, employeeClient } = await fixtureWithPackAndEmployee();
      const [enc] = await employeeClient.encryptInputs([Encryptable.uint32(250_000n)]).execute();
      await engine.connect(employee).submitRequest(PACK_TRAVEL, enc, "Over hard");

      const status = await decryptStatus(engine, employeeClient, 0);
      expect(status).to.equal(3n); // AUTO_DENIED
    });

    it("auto-denies at one unit over hard limit", async function () {
      const { engine, employee, employeeClient } = await fixtureWithPackAndEmployee();
      const [enc] = await employeeClient.encryptInputs([Encryptable.uint32(HARD_LIMIT + 1n)]).execute();
      await engine.connect(employee).submitRequest(PACK_TRAVEL, enc, "One over");

      const status = await decryptStatus(engine, employeeClient, 0);
      expect(status).to.equal(3n);
    });

    it("approves exactly at hard limit (goes to review since above auto-threshold)", async function () {
      const { engine, employee, employeeClient } = await fixtureWithPackAndEmployee();
      const [enc] = await employeeClient.encryptInputs([Encryptable.uint32(HARD_LIMIT)]).execute();
      await engine.connect(employee).submitRequest(PACK_TRAVEL, enc, "Exact hard");

      const status = await decryptStatus(engine, employeeClient, 0);
      expect(status).to.equal(2n); // NEEDS_REVIEW (within hard, above auto)
    });

    it("different packs evaluate independently with different thresholds", async function () {
      const { engine, adminClient, employee, employeeClient } = await loadFixture(deployFixture);

      // Travel: auto=50k, hard=200k
      await engine.createPack(PACK_TRAVEL, "Travel");
      const [h1, a1, b1] = await adminClient.encryptInputs([
        Encryptable.uint32(200_000n), Encryptable.uint32(50_000n), Encryptable.uint32(1_000_000n),
      ]).execute();
      await engine.setPolicyThresholds(PACK_TRAVEL, h1, a1, b1);

      // SaaS: auto=200k (everything auto-approved)
      await engine.createPack(PACK_SAAS, "SaaS");
      const [h2, a2, b2] = await adminClient.encryptInputs([
        Encryptable.uint32(500_000n), Encryptable.uint32(200_000n), Encryptable.uint32(2_000_000n),
      ]).execute();
      await engine.setPolicyThresholds(PACK_SAAS, h2, a2, b2);

      await engine.registerEmployee(employee.address);

      // 100k: Travel → NEEDS_REVIEW, SaaS → AUTO_APPROVED
      const [enc1] = await employeeClient.encryptInputs([Encryptable.uint32(100_000n)]).execute();
      await engine.connect(employee).submitRequest(PACK_TRAVEL, enc1, "Travel 100k");

      const [enc2] = await employeeClient.encryptInputs([Encryptable.uint32(100_000n)]).execute();
      await engine.connect(employee).submitRequest(PACK_SAAS, enc2, "SaaS 100k");

      const s0 = await decryptStatus(engine, employeeClient, 0);
      const s1 = await decryptStatus(engine, employeeClient, 1);
      expect(s0).to.equal(2n); // NEEDS_REVIEW
      expect(s1).to.equal(1n); // AUTO_APPROVED
    });
  });

  // ===========================================================================
  // Rolling budget
  // ===========================================================================

  describe("rolling budget", function () {
    it("auto-denies when cumulative spend exceeds budget", async function () {
      const { engine, adminClient, employee, employeeClient } = await loadFixture(deployFixture);

      // Low budget: 60k; auto=40k; hard=200k
      await engine.createPack(PACK_TRAVEL, "Travel");
      const [h, a, b] = await adminClient.encryptInputs([
        Encryptable.uint32(200_000n), Encryptable.uint32(40_000n), Encryptable.uint32(60_000n),
      ]).execute();
      await engine.setPolicyThresholds(PACK_TRAVEL, h, a, b);
      await engine.registerEmployee(employee.address);

      // First request 40k — auto-approved, uses 40k of 60k budget
      const [e1] = await employeeClient.encryptInputs([Encryptable.uint32(40_000n)]).execute();
      await engine.connect(employee).submitRequest(PACK_TRAVEL, e1, "First");
      const s1 = await decryptStatus(engine, employeeClient, 0);
      expect(s1).to.equal(1n); // AUTO_APPROVED

      // Second request 30k — would total 70k > 60k budget → AUTO_DENIED
      const [e2] = await employeeClient.encryptInputs([Encryptable.uint32(30_000n)]).execute();
      await engine.connect(employee).submitRequest(PACK_TRAVEL, e2, "Over budget");
      const s2 = await decryptStatus(engine, employeeClient, 1);
      expect(s2).to.equal(3n); // AUTO_DENIED
    });

    it("budget epoch reset allows new spending", async function () {
      const { engine, adminClient, employee, employeeClient } = await loadFixture(deployFixture);

      // Budget: 50k
      await engine.createPack(PACK_TRAVEL, "Travel");
      const [h, a, b] = await adminClient.encryptInputs([
        Encryptable.uint32(200_000n), Encryptable.uint32(40_000n), Encryptable.uint32(50_000n),
      ]).execute();
      await engine.setPolicyThresholds(PACK_TRAVEL, h, a, b);
      await engine.registerEmployee(employee.address);

      // Exhaust budget
      const [e1] = await employeeClient.encryptInputs([Encryptable.uint32(40_000n)]).execute();
      await engine.connect(employee).submitRequest(PACK_TRAVEL, e1, "Exhaust");
      const [e2] = await employeeClient.encryptInputs([Encryptable.uint32(30_000n)]).execute();
      await engine.connect(employee).submitRequest(PACK_TRAVEL, e2, "Budget gone");
      const s2 = await decryptStatus(engine, employeeClient, 1);
      expect(s2).to.equal(3n); // DENIED due to budget

      // Reset epoch
      await expect(engine.resetBudgetEpoch(PACK_TRAVEL))
        .to.emit(engine, "BudgetEpochReset");

      // New request should be auto-approved again
      const [e3] = await employeeClient.encryptInputs([Encryptable.uint32(20_000n)]).execute();
      await engine.connect(employee).submitRequest(PACK_TRAVEL, e3, "After reset");
      const s3 = await decryptStatus(engine, employeeClient, 2);
      expect(s3).to.equal(1n); // AUTO_APPROVED
    });

    it("only admin can reset budget epoch", async function () {
      const { engine, stranger } = await loadFixture(deployFixture);
      await engine.createPack(PACK_TRAVEL, "Travel");
      await expect(
        engine.connect(stranger).resetBudgetEpoch(PACK_TRAVEL),
      ).to.be.revertedWithCustomError(engine, "OwnableUnauthorizedAccount");
    });
  });

  // ===========================================================================
  // Publish flow + review queue
  // ===========================================================================

  describe("publishDecryptedResult", function () {
    it("publishes auto-approved result and updates counters", async function () {
      const { engine, employee, employeeClient, adminClient } = await fixtureWithPackAndEmployee();
      const [enc] = await employeeClient.encryptInputs([Encryptable.uint32(30_000n)]).execute();
      await engine.connect(employee).submitRequest(PACK_TRAVEL, enc, "Approved");

      const plainStatus = await publishRequest(engine, adminClient, 0);
      expect(plainStatus).to.equal(1); // AUTO_APPROVED

      const req = await engine.getRequest(0);
      expect(req.resultPublished).to.equal(true);
      expect(req.publicStatus).to.equal(1);
      expect(req.inReview).to.equal(false);
      expect(req.receiptHash).to.not.equal("0x" + "0".repeat(64));

      expect(await engine.packApprovedCount(PACK_TRAVEL)).to.equal(1n);
    });

    it("publishes auto-denied result", async function () {
      const { engine, employee, employeeClient, adminClient } = await fixtureWithPackAndEmployee();
      const [enc] = await employeeClient.encryptInputs([Encryptable.uint32(250_000n)]).execute();
      await engine.connect(employee).submitRequest(PACK_TRAVEL, enc, "Denied");

      await publishRequest(engine, adminClient, 0);

      expect(await engine.packDeniedCount(PACK_TRAVEL)).to.equal(1n);
      const req = await engine.getRequest(0);
      expect(req.publicStatus).to.equal(3);
    });

    it("routes to review queue on NeedsReview result", async function () {
      const { engine, employee, employeeClient, adminClient } = await fixtureWithPackAndEmployee();
      const [enc] = await employeeClient.encryptInputs([Encryptable.uint32(100_000n)]).execute();
      await engine.connect(employee).submitRequest(PACK_TRAVEL, enc, "Review me");

      const permit = await adminClient.permits.getOrCreateSelfPermit();
      const result = await adminClient
        .decryptForTx(await engine.getEncryptedStatus(0))
        .withPermit(permit)
        .execute();
      expect(Number(result.decryptedValue)).to.equal(2); // NEEDS_REVIEW

      await expect(
        engine.publishDecryptedResult(0, Number(result.decryptedValue), result.signature),
      ).to.emit(engine, "RequestNeedsReview").withArgs(0n, employee.address, PACK_TRAVEL);

      const req = await engine.getRequest(0);
      expect(req.inReview).to.equal(true);
      expect(req.resultPublished).to.equal(false);

      expect(await engine.packReviewPendingCount(PACK_TRAVEL)).to.equal(1n);
    });

    it("rejects publishing the same result twice", async function () {
      const { engine, employee, employeeClient, adminClient } = await fixtureWithPackAndEmployee();
      const [enc] = await employeeClient.encryptInputs([Encryptable.uint32(30_000n)]).execute();
      await engine.connect(employee).submitRequest(PACK_TRAVEL, enc, "Once");

      await publishRequest(engine, adminClient, 0);

      const permit = await adminClient.permits.getOrCreateSelfPermit();
      const result = await adminClient
        .decryptForTx(await engine.getEncryptedStatus(0))
        .withPermit(permit)
        .execute();
      await expect(
        engine.publishDecryptedResult(0, Number(result.decryptedValue), result.signature),
      ).to.be.revertedWithCustomError(engine, "ResultAlreadyPublished");
    });

    it("rejects non-admin publish", async function () {
      const { engine, employee, employeeClient, adminClient } = await fixtureWithPackAndEmployee();
      const [enc] = await employeeClient.encryptInputs([Encryptable.uint32(30_000n)]).execute();
      await engine.connect(employee).submitRequest(PACK_TRAVEL, enc, "Test");

      const permit = await adminClient.permits.getOrCreateSelfPermit();
      const result = await adminClient
        .decryptForTx(await engine.getEncryptedStatus(0))
        .withPermit(permit)
        .execute();
      await expect(
        engine.connect(employee).publishDecryptedResult(0, Number(result.decryptedValue), result.signature),
      ).to.be.revertedWithCustomError(engine, "OwnableUnauthorizedAccount");
    });
  });

  // ===========================================================================
  // Admin review resolution
  // ===========================================================================

  describe("adminReviewRequest", function () {
    async function fixtureWithReviewRequest() {
      const base = await fixtureWithPackAndEmployee();
      const { engine, employee, employeeClient, adminClient } = base;

      const [enc] = await employeeClient.encryptInputs([Encryptable.uint32(100_000n)]).execute();
      await engine.connect(employee).submitRequest(PACK_TRAVEL, enc, "Needs review");

      const permit = await adminClient.permits.getOrCreateSelfPermit();
      const result = await adminClient
        .decryptForTx(await engine.getEncryptedStatus(0))
        .withPermit(permit)
        .execute();
      await engine.publishDecryptedResult(0, Number(result.decryptedValue), result.signature);

      return base;
    }

    it("admin can approve a review request", async function () {
      const { engine } = await fixtureWithReviewRequest();

      await expect(engine.adminReviewRequest(0, true))
        .to.emit(engine, "AdminResolved").withArgs(0n, true)
        .and.to.emit(engine, "ResultPublished").withArgs(0n, 4n);

      const req = await engine.getRequest(0);
      expect(req.publicStatus).to.equal(4); // ADMIN_APPROVED
      expect(req.resultPublished).to.equal(true);
      expect(req.inReview).to.equal(false);
      expect(req.receiptHash).to.not.equal("0x" + "0".repeat(64));

      expect(await engine.packApprovedCount(PACK_TRAVEL)).to.equal(1n);
      expect(await engine.packReviewPendingCount(PACK_TRAVEL)).to.equal(0n);
    });

    it("admin can deny a review request", async function () {
      const { engine } = await fixtureWithReviewRequest();

      await engine.adminReviewRequest(0, false);
      const req = await engine.getRequest(0);
      expect(req.publicStatus).to.equal(5); // ADMIN_DENIED

      expect(await engine.packDeniedCount(PACK_TRAVEL)).to.equal(1n);
    });

    it("rejects adminReviewRequest on non-review request", async function () {
      const { engine, employee, employeeClient, adminClient } = await fixtureWithPackAndEmployee();
      const [enc] = await employeeClient.encryptInputs([Encryptable.uint32(30_000n)]).execute();
      await engine.connect(employee).submitRequest(PACK_TRAVEL, enc, "Auto approved");
      await publishRequest(engine, adminClient, 0);

      await expect(
        engine.adminReviewRequest(0, true),
      ).to.be.revertedWithCustomError(engine, "RequestNotInReview");
    });

    it("rejects double admin resolution", async function () {
      const { engine } = await fixtureWithReviewRequest();
      await engine.adminReviewRequest(0, true);
      await expect(
        engine.adminReviewRequest(0, true),
      ).to.be.revertedWithCustomError(engine, "RequestNotInReview");
    });

    it("rejects non-admin resolution", async function () {
      const { engine, employee } = await fixtureWithReviewRequest();
      await expect(
        engine.connect(employee).adminReviewRequest(0, true),
      ).to.be.revertedWithCustomError(engine, "OwnableUnauthorizedAccount");
    });
  });

  // ===========================================================================
  // ACL: encryption access control
  // ===========================================================================

  describe("ACL", function () {
    it("admin can decrypt an employee request status", async function () {
      const { engine, employee, employeeClient, adminClient } = await fixtureWithPackAndEmployee();
      const [enc] = await employeeClient.encryptInputs([Encryptable.uint32(30_000n)]).execute();
      await engine.connect(employee).submitRequest(PACK_TRAVEL, enc, "Test");

      const status = await decryptStatus(engine, adminClient, 0);
      expect(status).to.equal(1n);
    });

    it("stranger cannot decrypt a request status", async function () {
      const { engine, employee, employeeClient, strangerClient } = await fixtureWithPackAndEmployee();
      const [enc] = await employeeClient.encryptInputs([Encryptable.uint32(30_000n)]).execute();
      await engine.connect(employee).submitRequest(PACK_TRAVEL, enc, "Test");

      await expect(
        strangerClient
          .decryptForView(await engine.getEncryptedStatus(0), FheTypes.Uint8)
          .execute(),
      ).to.be.rejected;
    });

    it("employee cannot decrypt another employee request", async function () {
      const {
        engine, adminClient, employee, employeeClient, employeeTwo, employeeTwoClient,
      } = await loadFixture(deployFixture);

      await engine.createPack(PACK_TRAVEL, "Travel");
      const [h, a, b] = await adminClient.encryptInputs([
        Encryptable.uint32(200_000n), Encryptable.uint32(50_000n), Encryptable.uint32(1_000_000n),
      ]).execute();
      await engine.setPolicyThresholds(PACK_TRAVEL, h, a, b);
      await engine.registerEmployee(employee.address);
      await engine.registerEmployee(employeeTwo.address);

      const [enc] = await employeeClient.encryptInputs([Encryptable.uint32(20_000n)]).execute();
      await engine.connect(employee).submitRequest(PACK_TRAVEL, enc, "Private");

      await expect(
        employeeTwoClient
          .decryptForView(await engine.getEncryptedStatus(0), FheTypes.Uint8)
          .execute(),
      ).to.be.rejected;
    });
  });

  // ===========================================================================
  // Pack summary and counters
  // ===========================================================================

  describe("pack summary counters", function () {
    it("tracks total, approved, denied, inReview, pending correctly", async function () {
      const { engine, employee, employeeClient, adminClient } = await fixtureWithPackAndEmployee();

      // Submit 3 requests: one under auto, one in review zone, one over hard
      const [e1] = await employeeClient.encryptInputs([Encryptable.uint32(20_000n)]).execute();
      await engine.connect(employee).submitRequest(PACK_TRAVEL, e1, "A");

      const [e2] = await employeeClient.encryptInputs([Encryptable.uint32(100_000n)]).execute();
      await engine.connect(employee).submitRequest(PACK_TRAVEL, e2, "B");

      const [e3] = await employeeClient.encryptInputs([Encryptable.uint32(300_000n)]).execute();
      await engine.connect(employee).submitRequest(PACK_TRAVEL, e3, "C");

      // Before any publish: all pending
      let [total, approved, denied, pending, inReview] = await engine.getPackSummary(PACK_TRAVEL);
      expect(total).to.equal(3n);
      expect(approved).to.equal(0n);
      expect(denied).to.equal(0n);
      expect(pending).to.equal(3n);
      expect(inReview).to.equal(0n);

      // Publish request 0 (auto-approved)
      await publishRequest(engine, adminClient, 0);

      [total, approved, denied, pending, inReview] = await engine.getPackSummary(PACK_TRAVEL);
      expect(approved).to.equal(1n);
      expect(pending).to.equal(2n);

      // Publish request 1 (needs review) → goes to review queue
      const permit = await adminClient.permits.getOrCreateSelfPermit();
      const r1 = await adminClient
        .decryptForTx(await engine.getEncryptedStatus(1))
        .withPermit(permit)
        .execute();
      await engine.publishDecryptedResult(1, Number(r1.decryptedValue), r1.signature);

      [total, approved, denied, pending, inReview] = await engine.getPackSummary(PACK_TRAVEL);
      expect(inReview).to.equal(1n);
      expect(pending).to.equal(1n);

      // Publish request 2 (auto-denied)
      await publishRequest(engine, adminClient, 2);
      [total, approved, denied, pending, inReview] = await engine.getPackSummary(PACK_TRAVEL);
      expect(denied).to.equal(1n);
      expect(pending).to.equal(0n);

      // Admin resolves review
      await engine.adminReviewRequest(1, true);
      [total, approved, denied, pending, inReview] = await engine.getPackSummary(PACK_TRAVEL);
      expect(approved).to.equal(2n);
      expect(inReview).to.equal(0n);
    });
  });

  // ===========================================================================
  // Receipt hash
  // ===========================================================================

  describe("receipt hash", function () {
    it("receipt hash is deterministic and non-zero after publish", async function () {
      const { engine, employee, employeeClient, adminClient } = await fixtureWithPackAndEmployee();
      const [enc] = await employeeClient.encryptInputs([Encryptable.uint32(30_000n)]).execute();
      await engine.connect(employee).submitRequest(PACK_TRAVEL, enc, "Receipt test");
      await publishRequest(engine, adminClient, 0);

      const req = await engine.getRequest(0);
      expect(req.receiptHash).to.not.equal("0x" + "0".repeat(64));

      // Should be stable (same call returns same value)
      const req2 = await engine.getRequest(0);
      expect(req.receiptHash).to.equal(req2.receiptHash);
    });

    it("receipt hashes differ for different requests", async function () {
      const { engine, employee, employeeClient, adminClient } = await fixtureWithPackAndEmployee();

      const [e1] = await employeeClient.encryptInputs([Encryptable.uint32(20_000n)]).execute();
      await engine.connect(employee).submitRequest(PACK_TRAVEL, e1, "Req A");
      await publishRequest(engine, adminClient, 0);

      const [e2] = await employeeClient.encryptInputs([Encryptable.uint32(25_000n)]).execute();
      await engine.connect(employee).submitRequest(PACK_TRAVEL, e2, "Req B");
      await publishRequest(engine, adminClient, 1);

      const req0 = await engine.getRequest(0);
      const req1 = await engine.getRequest(1);
      expect(req0.receiptHash).to.not.equal(req1.receiptHash);
    });
  });
});
