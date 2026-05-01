import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { Encryptable, FheTypes } from "@cofhe/sdk";
import hre from "hardhat";

const TASK_COFHE_MOCKS_DEPLOY = "task:cofhe-mocks:deploy";

const PACK_TRAVEL = 1;
const PACK_SAAS = 2;
const PACK_VENDOR = 3;
const PACK_MARKETING = 4;

describe("ShieldCardPolicy", function () {
  async function deployFixture() {
    await hre.run(TASK_COFHE_MOCKS_DEPLOY);

    const [admin, employee, employeeTwo, stranger] = await hre.ethers.getSigners();
    const ShieldCardPolicyHarness = await hre.ethers.getContractFactory(
      "ShieldCardPolicyHarness",
    );
    const shieldCard = await ShieldCardPolicyHarness.connect(admin).deploy();

    const adminClient = await hre.cofhe.createClientWithBatteries(admin);
    const employeeClient = await hre.cofhe.createClientWithBatteries(employee);
    const employeeTwoClient = await hre.cofhe.createClientWithBatteries(employeeTwo);
    const strangerClient = await hre.cofhe.createClientWithBatteries(stranger);

    return {
      shieldCard,
      admin,
      employee,
      employeeTwo,
      stranger,
      adminClient,
      employeeClient,
      employeeTwoClient,
      strangerClient,
    };
  }

  // Fixture with one active pack (Travel, limit 50_000) and one registered employee
  async function fixtureWithPackAndEmployee() {
    const base = await loadFixture(deployFixture);
    const { shieldCard, adminClient, employee } = base;

    await shieldCard.createPack(PACK_TRAVEL, "Travel");
    const [encLimit] = await adminClient
      .encryptInputs([Encryptable.uint32(50_000n)])
      .execute();
    await shieldCard.setPackLimit(PACK_TRAVEL, encLimit);
    await shieldCard.registerEmployee(employee.address);

    return base;
  }

  // -------------------------------------------------------------------------
  // Employee registration
  // -------------------------------------------------------------------------

  describe("registerEmployee", function () {
    it("allows the owner to register an employee", async function () {
      const { shieldCard, employee } = await loadFixture(deployFixture);

      await expect(shieldCard.registerEmployee(employee.address))
        .to.emit(shieldCard, "EmployeeRegistered")
        .withArgs(employee.address);

      expect(await shieldCard.employeeRegistered(employee.address)).to.equal(true);
      expect(await shieldCard.registeredEmployees(0)).to.equal(employee.address);
    });

    it("rejects non-owner registration", async function () {
      const { shieldCard, employee, stranger } = await loadFixture(deployFixture);

      await expect(
        shieldCard.connect(stranger).registerEmployee(employee.address),
      ).to.be.revertedWithCustomError(shieldCard, "OwnableUnauthorizedAccount");
    });

    it("rejects registering the same employee twice", async function () {
      const { shieldCard, employee } = await loadFixture(deployFixture);

      await shieldCard.registerEmployee(employee.address);

      await expect(
        shieldCard.registerEmployee(employee.address),
      ).to.be.revertedWithCustomError(shieldCard, "EmployeeAlreadyRegistered");
    });
  });

  // -------------------------------------------------------------------------
  // Policy pack management
  // -------------------------------------------------------------------------

  describe("createPack", function () {
    it("allows admin to create a pack", async function () {
      const { shieldCard } = await loadFixture(deployFixture);

      await expect(shieldCard.createPack(PACK_SAAS, "SaaS"))
        .to.emit(shieldCard, "PackCreated")
        .withArgs(PACK_SAAS, "SaaS");

      expect(await shieldCard.packExists(PACK_SAAS)).to.equal(true);
      expect(await shieldCard.packCount()).to.equal(1);

      const [name, active, limitSet] = await shieldCard.getPackInfo(PACK_SAAS);
      expect(name).to.equal("SaaS");
      expect(active).to.equal(true);
      expect(limitSet).to.equal(false);
    });

    it("rejects non-admin pack creation", async function () {
      const { shieldCard, stranger } = await loadFixture(deployFixture);

      await expect(
        shieldCard.connect(stranger).createPack(PACK_SAAS, "SaaS"),
      ).to.be.revertedWithCustomError(shieldCard, "OwnableUnauthorizedAccount");
    });

    it("rejects duplicate pack id", async function () {
      const { shieldCard } = await loadFixture(deployFixture);

      await shieldCard.createPack(PACK_SAAS, "SaaS");

      await expect(
        shieldCard.createPack(PACK_SAAS, "SaaS Again"),
      ).to.be.revertedWithCustomError(shieldCard, "PackAlreadyExists");
    });

    it("creates multiple packs with independent state", async function () {
      const { shieldCard } = await loadFixture(deployFixture);

      await shieldCard.createPack(PACK_TRAVEL, "Travel");
      await shieldCard.createPack(PACK_SAAS, "SaaS");
      await shieldCard.createPack(PACK_VENDOR, "Vendor");
      await shieldCard.createPack(PACK_MARKETING, "Marketing");

      expect(await shieldCard.packCount()).to.equal(4);

      const [nameT] = await shieldCard.getPackInfo(PACK_TRAVEL);
      const [nameS] = await shieldCard.getPackInfo(PACK_SAAS);
      expect(nameT).to.equal("Travel");
      expect(nameS).to.equal("SaaS");
    });
  });

  describe("setPackLimit", function () {
    it("stores an encrypted limit for an existing pack", async function () {
      const { shieldCard, adminClient } = await loadFixture(deployFixture);

      await shieldCard.createPack(PACK_TRAVEL, "Travel");

      const [encLimit] = await adminClient
        .encryptInputs([Encryptable.uint32(75_000n)])
        .execute();

      await expect(shieldCard.setPackLimit(PACK_TRAVEL, encLimit))
        .to.emit(shieldCard, "PackLimitSet")
        .withArgs(PACK_TRAVEL);

      const [, , limitSet] = await shieldCard.getPackInfo(PACK_TRAVEL);
      expect(limitSet).to.equal(true);

      const handle = await shieldCard.getPackEncLimit(PACK_TRAVEL);
      const decrypted = await adminClient
        .decryptForView(handle, FheTypes.Uint32)
        .execute();
      expect(decrypted).to.equal(75_000n);
    });

    it("rejects non-admin limit setting", async function () {
      const { shieldCard, employeeClient, employee } = await loadFixture(deployFixture);

      await shieldCard.createPack(PACK_TRAVEL, "Travel");
      const [encLimit] = await employeeClient
        .encryptInputs([Encryptable.uint32(50_000n)])
        .execute();

      await expect(
        shieldCard.connect(employee).setPackLimit(PACK_TRAVEL, encLimit),
      ).to.be.revertedWithCustomError(shieldCard, "OwnableUnauthorizedAccount");
    });

    it("rejects limit setting for non-existent pack", async function () {
      const { shieldCard, adminClient } = await loadFixture(deployFixture);

      const [encLimit] = await adminClient
        .encryptInputs([Encryptable.uint32(50_000n)])
        .execute();

      await expect(
        shieldCard.setPackLimit(99, encLimit),
      ).to.be.revertedWithCustomError(shieldCard, "PackNotFound");
    });

    it("allows updating the encrypted limit after initial set", async function () {
      const { shieldCard, adminClient } = await loadFixture(deployFixture);

      await shieldCard.createPack(PACK_SAAS, "SaaS");

      const [encLimit1] = await adminClient
        .encryptInputs([Encryptable.uint32(30_000n)])
        .execute();
      await shieldCard.setPackLimit(PACK_SAAS, encLimit1);

      const [encLimit2] = await adminClient
        .encryptInputs([Encryptable.uint32(60_000n)])
        .execute();
      await shieldCard.setPackLimit(PACK_SAAS, encLimit2);

      const handle = await shieldCard.getPackEncLimit(PACK_SAAS);
      const decrypted = await adminClient
        .decryptForView(handle, FheTypes.Uint32)
        .execute();
      expect(decrypted).to.equal(60_000n);
    });
  });

  describe("setPackActive", function () {
    it("allows admin to deactivate and reactivate a pack", async function () {
      const { shieldCard } = await loadFixture(deployFixture);

      await shieldCard.createPack(PACK_MARKETING, "Marketing");
      expect((await shieldCard.getPackInfo(PACK_MARKETING))[1]).to.equal(true);

      await expect(shieldCard.setPackActive(PACK_MARKETING, false))
        .to.emit(shieldCard, "PackActiveChanged")
        .withArgs(PACK_MARKETING, false);

      expect((await shieldCard.getPackInfo(PACK_MARKETING))[1]).to.equal(false);

      await shieldCard.setPackActive(PACK_MARKETING, true);
      expect((await shieldCard.getPackInfo(PACK_MARKETING))[1]).to.equal(true);
    });

    it("rejects non-admin pack activation change", async function () {
      const { shieldCard, stranger } = await loadFixture(deployFixture);

      await shieldCard.createPack(PACK_VENDOR, "Vendor");

      await expect(
        shieldCard.connect(stranger).setPackActive(PACK_VENDOR, false),
      ).to.be.revertedWithCustomError(shieldCard, "OwnableUnauthorizedAccount");
    });

    it("rejects setPackActive for non-existent pack", async function () {
      const { shieldCard } = await loadFixture(deployFixture);

      await expect(
        shieldCard.setPackActive(99, false),
      ).to.be.revertedWithCustomError(shieldCard, "PackNotFound");
    });
  });

  // -------------------------------------------------------------------------
  // Request submission with policy packs
  // -------------------------------------------------------------------------

  describe("submitRequest", function () {
    it("allows a registered employee to submit under an active pack", async function () {
      const { shieldCard, employee, employeeClient } =
        await fixtureWithPackAndEmployee();

      const [encAmount] = await employeeClient
        .encryptInputs([Encryptable.uint32(30_000n)])
        .execute();

      const tx = await shieldCard
        .connect(employee)
        .submitRequest(PACK_TRAVEL, encAmount, "Conference flights");
      const receipt = await tx.wait();
      const block = await hre.ethers.provider.getBlock(receipt!.blockNumber);

      await expect(tx)
        .to.emit(shieldCard, "RequestSubmitted")
        .withArgs(0n, employee.address, PACK_TRAVEL, block!.timestamp);

      expect(await shieldCard.getRequestCount()).to.equal(1n);
      expect(await shieldCard.getEmployeeRequestIds(employee.address)).to.deep.equal([0n]);

      const request = await shieldCard.getRequest(0);
      expect(request.employee).to.equal(employee.address);
      expect(request.packId).to.equal(PACK_TRAVEL);
      expect(request.memo).to.equal("Conference flights");
      expect(request.resultPublished).to.equal(false);

      expect(await shieldCard.packTotalRequests(PACK_TRAVEL)).to.equal(1n);
    });

    it("rejects submission from unregistered address", async function () {
      const { shieldCard, stranger, strangerClient } =
        await fixtureWithPackAndEmployee();

      const [encAmount] = await strangerClient
        .encryptInputs([Encryptable.uint32(10_000n)])
        .execute();

      await expect(
        shieldCard.connect(stranger).submitRequest(PACK_TRAVEL, encAmount, "Unauth"),
      ).to.be.revertedWithCustomError(shieldCard, "EmployeeNotRegistered");
    });

    it("rejects submission with non-existent pack id", async function () {
      const { shieldCard, employee, employeeClient } =
        await fixtureWithPackAndEmployee();

      const [encAmount] = await employeeClient
        .encryptInputs([Encryptable.uint32(10_000n)])
        .execute();

      await expect(
        shieldCard.connect(employee).submitRequest(99, encAmount, "Bad pack"),
      ).to.be.revertedWithCustomError(shieldCard, "PackNotFound");
    });

    it("rejects submission to an inactive pack", async function () {
      const { shieldCard, employee, employeeClient } =
        await fixtureWithPackAndEmployee();

      await shieldCard.setPackActive(PACK_TRAVEL, false);

      const [encAmount] = await employeeClient
        .encryptInputs([Encryptable.uint32(10_000n)])
        .execute();

      await expect(
        shieldCard.connect(employee).submitRequest(PACK_TRAVEL, encAmount, "Inactive pack"),
      ).to.be.revertedWithCustomError(shieldCard, "PackInactive");
    });

    it("rejects submission when pack limit is not set", async function () {
      const { shieldCard, employee, employeeClient } = await loadFixture(deployFixture);

      await shieldCard.createPack(PACK_VENDOR, "Vendor");
      await shieldCard.registerEmployee(employee.address);

      const [encAmount] = await employeeClient
        .encryptInputs([Encryptable.uint32(10_000n)])
        .execute();

      await expect(
        shieldCard.connect(employee).submitRequest(PACK_VENDOR, encAmount, "No limit"),
      ).to.be.revertedWithCustomError(shieldCard, "PackLimitNotSet");
    });
  });

  // -------------------------------------------------------------------------
  // FHE policy evaluation per pack
  // -------------------------------------------------------------------------

  describe("FHE policy evaluation", function () {
    it("approves when amount is within the pack limit", async function () {
      const { shieldCard, employee, employeeClient } =
        await fixtureWithPackAndEmployee();

      const [encAmount] = await employeeClient
        .encryptInputs([Encryptable.uint32(30_000n)])
        .execute();
      await shieldCard.connect(employee).submitRequest(PACK_TRAVEL, encAmount, "Under limit");

      const status = await employeeClient
        .decryptForView(await shieldCard.getEncryptedStatus(0), FheTypes.Uint8)
        .execute();
      expect(status).to.equal(1n);
    });

    it("denies when amount exceeds the pack limit", async function () {
      const { shieldCard, employee, employeeClient } =
        await fixtureWithPackAndEmployee();

      const [encAmount] = await employeeClient
        .encryptInputs([Encryptable.uint32(60_000n)])
        .execute();
      await shieldCard.connect(employee).submitRequest(PACK_TRAVEL, encAmount, "Over limit");

      const status = await employeeClient
        .decryptForView(await shieldCard.getEncryptedStatus(0), FheTypes.Uint8)
        .execute();
      expect(status).to.equal(2n);
    });

    it("approves when amount is exactly equal to the pack limit", async function () {
      const { shieldCard, employee, employeeClient } =
        await fixtureWithPackAndEmployee();

      const [encAmount] = await employeeClient
        .encryptInputs([Encryptable.uint32(50_000n)])
        .execute();
      await shieldCard.connect(employee).submitRequest(PACK_TRAVEL, encAmount, "Exact limit");

      const status = await employeeClient
        .decryptForView(await shieldCard.getEncryptedStatus(0), FheTypes.Uint8)
        .execute();
      expect(status).to.equal(1n);
    });

    it("denies when amount is one unit over the pack limit", async function () {
      const { shieldCard, employee, employeeClient } =
        await fixtureWithPackAndEmployee();

      const [encAmount] = await employeeClient
        .encryptInputs([Encryptable.uint32(50_001n)])
        .execute();
      await shieldCard.connect(employee).submitRequest(PACK_TRAVEL, encAmount, "One over");

      const status = await employeeClient
        .decryptForView(await shieldCard.getEncryptedStatus(0), FheTypes.Uint8)
        .execute();
      expect(status).to.equal(2n);
    });

    it("evaluates different packs independently with different encrypted limits", async function () {
      const { shieldCard, adminClient, employee, employeeClient } =
        await loadFixture(deployFixture);

      // Travel: limit 50_000, SaaS: limit 100_000
      await shieldCard.createPack(PACK_TRAVEL, "Travel");
      await shieldCard.createPack(PACK_SAAS, "SaaS");

      const [encLimitTravel] = await adminClient
        .encryptInputs([Encryptable.uint32(50_000n)])
        .execute();
      await shieldCard.setPackLimit(PACK_TRAVEL, encLimitTravel);

      const [encLimitSaaS] = await adminClient
        .encryptInputs([Encryptable.uint32(100_000n)])
        .execute();
      await shieldCard.setPackLimit(PACK_SAAS, encLimitSaaS);

      await shieldCard.registerEmployee(employee.address);

      // 70_000 over Travel limit → DENIED
      const [encAmount1] = await employeeClient
        .encryptInputs([Encryptable.uint32(70_000n)])
        .execute();
      await shieldCard.connect(employee).submitRequest(PACK_TRAVEL, encAmount1, "Travel over");

      // Same 70_000 under SaaS limit → APPROVED
      const [encAmount2] = await employeeClient
        .encryptInputs([Encryptable.uint32(70_000n)])
        .execute();
      await shieldCard.connect(employee).submitRequest(PACK_SAAS, encAmount2, "SaaS under");

      const status0 = await employeeClient
        .decryptForView(await shieldCard.getEncryptedStatus(0), FheTypes.Uint8)
        .execute();
      const status1 = await employeeClient
        .decryptForView(await shieldCard.getEncryptedStatus(1), FheTypes.Uint8)
        .execute();

      expect(status0).to.equal(2n); // Travel: DENIED
      expect(status1).to.equal(1n); // SaaS: APPROVED
    });
  });

  // -------------------------------------------------------------------------
  // Pack counters
  // -------------------------------------------------------------------------

  describe("pack counters", function () {
    it("increments packTotalRequests on submission", async function () {
      const { shieldCard, employee, employeeClient } =
        await fixtureWithPackAndEmployee();

      expect(await shieldCard.packTotalRequests(PACK_TRAVEL)).to.equal(0n);

      const [encAmount] = await employeeClient
        .encryptInputs([Encryptable.uint32(10_000n)])
        .execute();
      await shieldCard.connect(employee).submitRequest(PACK_TRAVEL, encAmount, "R1");

      expect(await shieldCard.packTotalRequests(PACK_TRAVEL)).to.equal(1n);
    });

    it("updates packApprovedCount and packDeniedCount on publish", async function () {
      const { shieldCard, adminClient, employee, employeeClient } =
        await fixtureWithPackAndEmployee();

      const [encApproved] = await employeeClient
        .encryptInputs([Encryptable.uint32(20_000n)])
        .execute();
      await shieldCard.connect(employee).submitRequest(PACK_TRAVEL, encApproved, "Approved");

      const [encDenied] = await employeeClient
        .encryptInputs([Encryptable.uint32(60_000n)])
        .execute();
      await shieldCard.connect(employee).submitRequest(PACK_TRAVEL, encDenied, "Denied");

      expect(await shieldCard.packApprovedCount(PACK_TRAVEL)).to.equal(0n);
      expect(await shieldCard.packDeniedCount(PACK_TRAVEL)).to.equal(0n);

      const permit = await adminClient.permits.getOrCreateSelfPermit();

      const result0 = await adminClient
        .decryptForTx(await shieldCard.getEncryptedStatus(0))
        .withPermit(permit)
        .execute();
      await shieldCard.publishDecryptedResult(0, Number(result0.decryptedValue), result0.signature);

      expect(await shieldCard.packApprovedCount(PACK_TRAVEL)).to.equal(1n);
      expect(await shieldCard.packDeniedCount(PACK_TRAVEL)).to.equal(0n);

      const result1 = await adminClient
        .decryptForTx(await shieldCard.getEncryptedStatus(1))
        .withPermit(permit)
        .execute();
      await shieldCard.publishDecryptedResult(1, Number(result1.decryptedValue), result1.signature);

      expect(await shieldCard.packApprovedCount(PACK_TRAVEL)).to.equal(1n);
      expect(await shieldCard.packDeniedCount(PACK_TRAVEL)).to.equal(1n);
    });

    it("getPackSummary returns correct pending count", async function () {
      const { shieldCard, adminClient, employee, employeeClient } =
        await fixtureWithPackAndEmployee();

      const [enc1] = await employeeClient
        .encryptInputs([Encryptable.uint32(10_000n)])
        .execute();
      await shieldCard.connect(employee).submitRequest(PACK_TRAVEL, enc1, "R1");

      const [enc2] = await employeeClient
        .encryptInputs([Encryptable.uint32(20_000n)])
        .execute();
      await shieldCard.connect(employee).submitRequest(PACK_TRAVEL, enc2, "R2");

      let [total, approved, denied, pending] = await shieldCard.getPackSummary(PACK_TRAVEL);
      expect(total).to.equal(2n);
      expect(approved).to.equal(0n);
      expect(denied).to.equal(0n);
      expect(pending).to.equal(2n);

      const permit = await adminClient.permits.getOrCreateSelfPermit();
      const result = await adminClient
        .decryptForTx(await shieldCard.getEncryptedStatus(0))
        .withPermit(permit)
        .execute();
      await shieldCard.publishDecryptedResult(0, Number(result.decryptedValue), result.signature);

      [total, approved, denied, pending] = await shieldCard.getPackSummary(PACK_TRAVEL);
      expect(total).to.equal(2n);
      expect(approved).to.equal(1n);
      expect(pending).to.equal(1n);
    });
  });

  // -------------------------------------------------------------------------
  // ACL and publishing
  // -------------------------------------------------------------------------

  describe("ACL and publishing", function () {
    async function submitOneRequest(amount: bigint, memo = "Test request") {
      const base = await fixtureWithPackAndEmployee();
      const { shieldCard, employee, employeeClient } = base;

      const [encAmount] = await employeeClient
        .encryptInputs([Encryptable.uint32(amount)])
        .execute();
      await shieldCard.connect(employee).submitRequest(PACK_TRAVEL, encAmount, memo);

      return base;
    }

    it("lets the admin decrypt an employee result", async function () {
      const { shieldCard, adminClient } = await submitOneRequest(30_000n);

      const status = await adminClient
        .decryptForView(await shieldCard.getEncryptedStatus(0), FheTypes.Uint8)
        .execute();
      expect(status).to.equal(1n);
    });

    it("prevents a random observer from decrypting a result", async function () {
      const { shieldCard, strangerClient } = await submitOneRequest(30_000n);

      await expect(
        strangerClient
          .decryptForView(await shieldCard.getEncryptedStatus(0), FheTypes.Uint8)
          .execute(),
      ).to.be.rejected;
    });

    it("prevents one employee from decrypting another employee result", async function () {
      const {
        shieldCard,
        adminClient,
        employee,
        employeeClient,
        employeeTwo,
        employeeTwoClient,
      } = await loadFixture(deployFixture);

      await shieldCard.createPack(PACK_TRAVEL, "Travel");
      const [encLimit] = await adminClient
        .encryptInputs([Encryptable.uint32(50_000n)])
        .execute();
      await shieldCard.setPackLimit(PACK_TRAVEL, encLimit);

      await shieldCard.registerEmployee(employee.address);
      await shieldCard.registerEmployee(employeeTwo.address);

      const [encAmount] = await employeeClient
        .encryptInputs([Encryptable.uint32(20_000n)])
        .execute();
      await shieldCard.connect(employee).submitRequest(PACK_TRAVEL, encAmount, "A");

      await expect(
        employeeTwoClient
          .decryptForView(await shieldCard.getEncryptedStatus(0), FheTypes.Uint8)
          .execute(),
      ).to.be.rejected;
    });

    it("allows the admin to publish a decrypted result on-chain", async function () {
      const { shieldCard, adminClient } = await submitOneRequest(30_000n);

      const permit = await adminClient.permits.getOrCreateSelfPermit();
      const result = await adminClient
        .decryptForTx(await shieldCard.getEncryptedStatus(0))
        .withPermit(permit)
        .execute();

      await expect(
        shieldCard.publishDecryptedResult(0, Number(result.decryptedValue), result.signature),
      )
        .to.emit(shieldCard, "ResultPublished")
        .withArgs(0n, 1n);

      const request = await shieldCard.getRequest(0);
      expect(request.resultPublished).to.equal(true);
      expect(request.publicStatus).to.equal(1);
    });

    it("rejects non-admin result publication", async function () {
      const { shieldCard, adminClient, employee } = await submitOneRequest(30_000n);

      const permit = await adminClient.permits.getOrCreateSelfPermit();
      const result = await adminClient
        .decryptForTx(await shieldCard.getEncryptedStatus(0))
        .withPermit(permit)
        .execute();

      await expect(
        shieldCard
          .connect(employee)
          .publishDecryptedResult(0, Number(result.decryptedValue), result.signature),
      ).to.be.revertedWithCustomError(shieldCard, "OwnableUnauthorizedAccount");
    });

    it("rejects publishing the same result twice", async function () {
      const { shieldCard, adminClient } = await submitOneRequest(30_000n);

      const permit = await adminClient.permits.getOrCreateSelfPermit();
      const result = await adminClient
        .decryptForTx(await shieldCard.getEncryptedStatus(0))
        .withPermit(permit)
        .execute();

      await shieldCard.publishDecryptedResult(
        0, Number(result.decryptedValue), result.signature,
      );

      await expect(
        shieldCard.publishDecryptedResult(
          0, Number(result.decryptedValue), result.signature,
        ),
      ).to.be.revertedWithCustomError(shieldCard, "ResultAlreadyPublished");
    });
  });
});
