import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { Encryptable, FheTypes } from "@cofhe/sdk";
import hre from "hardhat";

const TASK_COFHE_MOCKS_DEPLOY = "task:cofhe-mocks:deploy";

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
      ).to.be.revertedWithCustomError(
        shieldCard,
        "OwnableUnauthorizedAccount",
      );
    });
  });

  describe("setEmployeeLimit", function () {
    it("stores an encrypted limit for a registered employee", async function () {
      const { shieldCard, adminClient, employee } = await loadFixture(
        deployFixture,
      );

      await shieldCard.registerEmployee(employee.address);

      const [encLimit] = await adminClient
        .encryptInputs([Encryptable.uint32(50_000n)])
        .execute();

      await expect(shieldCard.setEmployeeLimit(employee.address, encLimit))
        .to.emit(shieldCard, "LimitSet")
        .withArgs(employee.address);

      const handle = await shieldCard.getEmployeeLimitHandle(employee.address);
      const decrypted = await adminClient
        .decryptForView(handle, FheTypes.Uint32)
        .execute();

      expect(decrypted).to.equal(50_000n);
    });

    it("rejects non-owner limit updates", async function () {
      const { shieldCard, employeeClient, employee, stranger } =
        await loadFixture(deployFixture);

      await shieldCard.registerEmployee(employee.address);

      const [encLimit] = await employeeClient
        .encryptInputs([Encryptable.uint32(50_000n)])
        .execute();

      await expect(
        shieldCard.connect(stranger).setEmployeeLimit(employee.address, encLimit),
      ).to.be.revertedWithCustomError(
        shieldCard,
        "OwnableUnauthorizedAccount",
      );
    });

    it("rejects setting a limit for an unregistered employee", async function () {
      const { shieldCard, adminClient, employee } = await loadFixture(
        deployFixture,
      );

      const [encLimit] = await adminClient
        .encryptInputs([Encryptable.uint32(50_000n)])
        .execute();

      await expect(
        shieldCard.setEmployeeLimit(employee.address, encLimit),
      ).to.be.revertedWithCustomError(
        shieldCard,
        "EmployeeNotRegistered",
      );
    });
  });

  describe("submitRequest", function () {
    async function registerAndSetLimit(limit: bigint = 50_000n) {
      const fixture = await loadFixture(deployFixture);
      const { shieldCard, adminClient, employee } = fixture;

      await shieldCard.registerEmployee(employee.address);
      const [encLimit] = await adminClient
        .encryptInputs([Encryptable.uint32(limit)])
        .execute();
      await shieldCard.setEmployeeLimit(employee.address, encLimit);

      return fixture;
    }

    it("allows a registered employee to submit an encrypted request", async function () {
      const { shieldCard, employee, employeeClient } = await registerAndSetLimit();

      const [encAmount, encCategory] = await employeeClient
        .encryptInputs([Encryptable.uint32(30_000n), Encryptable.uint8(1n)])
        .execute();

      const tx = await shieldCard
        .connect(employee)
        .submitRequest(encAmount, encCategory, "Figma subscription");
      const receipt = await tx.wait();
      const block = await hre.ethers.provider.getBlock(receipt!.blockNumber);

      await expect(tx)
        .to.emit(shieldCard, "RequestSubmitted")
        .withArgs(0n, employee.address, block!.timestamp);

      expect(await shieldCard.getRequestCount()).to.equal(1n);
      expect(await shieldCard.getEmployeeRequestIds(employee.address)).to.deep.equal([
        0n,
      ]);

      const request = await shieldCard.getRequest(0);
      expect(request.employee).to.equal(employee.address);
      expect(request.memo).to.equal("Figma subscription");
      expect(request.resultPublished).to.equal(false);
      expect(request.publicStatus).to.equal(0);

      const decryptedStatus = await employeeClient
        .decryptForView(await shieldCard.getEncryptedStatus(0), FheTypes.Uint8)
        .execute();
      const decryptedAmount = await employeeClient
        .decryptForView(await shieldCard.getEncryptedAmount(0), FheTypes.Uint32)
        .execute();

      expect(decryptedAmount).to.equal(30_000n);
      expect(decryptedStatus).to.equal(1n);
    });

    it("rejects request submission from an unregistered address", async function () {
      const { shieldCard, employeeClient, employee } = await loadFixture(
        deployFixture,
      );

      const [encAmount, encCategory] = await employeeClient
        .encryptInputs([Encryptable.uint32(30_000n), Encryptable.uint8(1n)])
        .execute();

      await expect(
        shieldCard
          .connect(employee)
          .submitRequest(encAmount, encCategory, "Unregistered submit"),
      ).to.be.revertedWithCustomError(
        shieldCard,
        "EmployeeNotRegistered",
      );
    });

    it("approves when amount is within the limit and category is allowed", async function () {
      const { shieldCard, employee, employeeClient } = await registerAndSetLimit();

      const [encAmount, encCategory] = await employeeClient
        .encryptInputs([Encryptable.uint32(30_000n), Encryptable.uint8(1n)])
        .execute();

      await shieldCard
        .connect(employee)
        .submitRequest(encAmount, encCategory, "Approved request");

      const decryptedStatus = await employeeClient
        .decryptForView(await shieldCard.getEncryptedStatus(0), FheTypes.Uint8)
        .execute();

      expect(decryptedStatus).to.equal(1n);
    });

    it("denies when amount exceeds the limit", async function () {
      const { shieldCard, employee, employeeClient } = await registerAndSetLimit();

      const [encAmount, encCategory] = await employeeClient
        .encryptInputs([Encryptable.uint32(60_000n), Encryptable.uint8(1n)])
        .execute();

      await shieldCard
        .connect(employee)
        .submitRequest(encAmount, encCategory, "Over limit request");

      const decryptedStatus = await employeeClient
        .decryptForView(await shieldCard.getEncryptedStatus(0), FheTypes.Uint8)
        .execute();

      expect(decryptedStatus).to.equal(2n);
    });

    it("denies when category is not approved", async function () {
      const { shieldCard, employee, employeeClient } = await registerAndSetLimit();

      const [encAmount, encCategory] = await employeeClient
        .encryptInputs([Encryptable.uint32(30_000n), Encryptable.uint8(2n)])
        .execute();

      await shieldCard
        .connect(employee)
        .submitRequest(encAmount, encCategory, "Wrong category request");

      const decryptedStatus = await employeeClient
        .decryptForView(await shieldCard.getEncryptedStatus(0), FheTypes.Uint8)
        .execute();

      expect(decryptedStatus).to.equal(2n);
    });

    it("approves when amount is exactly equal to the limit", async function () {
      const { shieldCard, employee, employeeClient } = await registerAndSetLimit();

      const [encAmount, encCategory] = await employeeClient
        .encryptInputs([Encryptable.uint32(50_000n), Encryptable.uint8(1n)])
        .execute();

      await shieldCard
        .connect(employee)
        .submitRequest(encAmount, encCategory, "Exact limit request");

      const decryptedStatus = await employeeClient
        .decryptForView(await shieldCard.getEncryptedStatus(0), FheTypes.Uint8)
        .execute();

      expect(decryptedStatus).to.equal(1n);
    });

    it("denies when amount exceeds the limit by one unit", async function () {
      const { shieldCard, employee, employeeClient } = await registerAndSetLimit();

      const [encAmount, encCategory] = await employeeClient
        .encryptInputs([Encryptable.uint32(50_001n), Encryptable.uint8(1n)])
        .execute();

      await shieldCard
        .connect(employee)
        .submitRequest(encAmount, encCategory, "One over limit request");

      const decryptedStatus = await employeeClient
        .decryptForView(await shieldCard.getEncryptedStatus(0), FheTypes.Uint8)
        .execute();

      expect(decryptedStatus).to.equal(2n);
    });
  });

  describe("ACL and publishing", function () {
    async function createRequest(
      amount: bigint,
      category: bigint,
      memo = "Request",
    ) {
      const fixture = await loadFixture(deployFixture);
      const { shieldCard, adminClient, employee, employeeClient } = fixture;

      await shieldCard.registerEmployee(employee.address);
      const [encLimit] = await adminClient
        .encryptInputs([Encryptable.uint32(50_000n)])
        .execute();
      await shieldCard.setEmployeeLimit(employee.address, encLimit);

      const [encAmount, encCategory] = await employeeClient
        .encryptInputs([Encryptable.uint32(amount), Encryptable.uint8(category)])
        .execute();
      await shieldCard.connect(employee).submitRequest(encAmount, encCategory, memo);

      return fixture;
    }

    it("lets the admin decrypt an employee result", async function () {
      const { shieldCard, adminClient } = await createRequest(30_000n, 1n);

      const decryptedStatus = await adminClient
        .decryptForView(await shieldCard.getEncryptedStatus(0), FheTypes.Uint8)
        .execute();

      expect(decryptedStatus).to.equal(1n);
    });

    it("prevents a random observer from decrypting an employee result", async function () {
      const { shieldCard, strangerClient } = await createRequest(30_000n, 1n);

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

      await shieldCard.registerEmployee(employee.address);
      await shieldCard.registerEmployee(employeeTwo.address);

      const [encLimitA] = await adminClient
        .encryptInputs([Encryptable.uint32(50_000n)])
        .execute();
      await shieldCard.setEmployeeLimit(employee.address, encLimitA);

      const [encLimitB] = await adminClient
        .encryptInputs([Encryptable.uint32(80_000n)])
        .execute();
      await shieldCard.setEmployeeLimit(employeeTwo.address, encLimitB);

      const [encAmount, encCategory] = await employeeClient
        .encryptInputs([Encryptable.uint32(30_000n), Encryptable.uint8(1n)])
        .execute();
      await shieldCard.connect(employee).submitRequest(encAmount, encCategory, "A");

      await expect(
        employeeTwoClient
          .decryptForView(await shieldCard.getEncryptedStatus(0), FheTypes.Uint8)
          .execute(),
      ).to.be.rejected;
    });

    it("allows the admin to publish a decrypted result on-chain", async function () {
      const { shieldCard, adminClient } = await createRequest(30_000n, 1n);

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
      const { shieldCard, adminClient, employee } = await createRequest(
        30_000n,
        1n,
      );

      const permit = await adminClient.permits.getOrCreateSelfPermit();
      const result = await adminClient
        .decryptForTx(await shieldCard.getEncryptedStatus(0))
        .withPermit(permit)
        .execute();

      await expect(
        shieldCard
          .connect(employee)
          .publishDecryptedResult(0, Number(result.decryptedValue), result.signature),
      ).to.be.revertedWithCustomError(
        shieldCard,
        "OwnableUnauthorizedAccount",
      );
    });

    it("rejects publishing the same result twice", async function () {
      const { shieldCard, adminClient } = await createRequest(30_000n, 1n);

      const permit = await adminClient.permits.getOrCreateSelfPermit();
      const result = await adminClient
        .decryptForTx(await shieldCard.getEncryptedStatus(0))
        .withPermit(permit)
        .execute();

      await shieldCard.publishDecryptedResult(
        0,
        Number(result.decryptedValue),
        result.signature,
      );

      await expect(
        shieldCard.publishDecryptedResult(
          0,
          Number(result.decryptedValue),
          result.signature,
        ),
      ).to.be.revertedWithCustomError(shieldCard, "ResultAlreadyPublished");
    });
  });
});
