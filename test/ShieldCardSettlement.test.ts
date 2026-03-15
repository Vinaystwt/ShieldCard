/**
 * ShieldCardSettlement.test.ts
 * Settlement state machine, multi-approver quorum, hash-chain, verifyReceipt.
 */

import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { Encryptable } from "@cofhe/sdk";
import hre from "hardhat";

const TASK_COFHE_MOCKS_DEPLOY = "task:cofhe-mocks:deploy";

const SETTLE_NONE = 0;
const SETTLE_PENDING = 1;
const SETTLE_APPROVED = 2;
const SETTLE_SETTLED = 3;
const SETTLE_CANCELLED = 4;

const PACK_TRAVEL = 1;
const HARD = 200_000n;
const AUTO = 50_000n;
const BUDGET = 500_000n;

describe("ShieldCardSettlement", function () {
  async function fixture() {
    await hre.run(TASK_COFHE_MOCKS_DEPLOY);
    const [admin, employee, approver1, approver2, approver3, recipient, stranger] = await hre.ethers.getSigners();

    const Core = await hre.ethers.getContractFactory("ShieldCardControlPlaneHarness");
    const core = await Core.connect(admin).deploy();

    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    const token = await MockUSDC.connect(admin).deploy();

    const Settle = await hre.ethers.getContractFactory("ShieldCardSettlement");
    const settle = await Settle.connect(admin).deploy(await core.getAddress(), await token.getAddress());

    const adminClient    = await hre.cofhe.createClientWithBatteries(admin);
    const employeeClient = await hre.cofhe.createClientWithBatteries(employee);

    // Seed core: Travel pack + register employee + submit one low-amount request
    await core.createPack(PACK_TRAVEL, "Travel");
    const [encHard, encAuto, encBudget] = await adminClient
      .encryptInputs([
        Encryptable.uint32(HARD),
        Encryptable.uint32(AUTO),
        Encryptable.uint32(BUDGET),
      ])
      .execute();
    await core.setPolicyThresholds(PACK_TRAVEL, encHard, encAuto, encBudget);
    await core.registerEmployee(employee.address);

    // Register dept + vendor so submitted request has riskBitmap=0 (low-risk path)
    await core.createDept(1, "Engineering");
    const [encDeptCap] = await adminClient
      .encryptInputs([Encryptable.uint32(1_000_000n)])
      .execute();
    await core.setDeptBudget(1, encDeptCap);
    await core.registerVendor(1, "Acme");
    await core.setVendorStatus(1, 1); // COMPLIANT

    // Submit one auto-approvable request (amount < AUTO) with dept+vendor (riskBitmap=0)
    const [encAmt] = await employeeClient
      .encryptInputs([Encryptable.uint32(1_000n)])
      .execute();
    await core.connect(employee).submitRequest(PACK_TRAVEL, 1, 1, encAmt, "small");

    // Publish it to AUTO_APPROVED so settlement can be created
    const encStatus = await core.getEncryptedStatus(0);
    const permit = await (adminClient as any).permits.getOrCreateSelfPermit();
    const dec = await (adminClient as any).decryptForTx(encStatus).withPermit(permit).execute();
    await core.publishDecryptedResult(0, Number(dec.decryptedValue), dec.signature);

    // Fund settlement contract with mUSDC
    await token.mint(await settle.getAddress(), 1_000_000n * 10n ** 6n);

    return { core, token, settle, admin, employee, approver1, approver2, approver3, recipient, stranger, adminClient, employeeClient };
  }

  it("constructor stores core + token addresses", async function () {
    const { core, token, settle } = await loadFixture(fixture);
    expect(await settle.core()).to.equal(await core.getAddress());
    expect(await settle.token()).to.equal(await token.getAddress());
    expect(await settle.normalQuorum()).to.equal(1);
    expect(await settle.highRiskQuorum()).to.equal(1);
    expect(await settle.chainHead()).to.equal(hre.ethers.ZeroHash);
  });

  describe("approver registry", function () {
    it("admin adds + removes approvers", async function () {
      const { settle, approver1 } = await loadFixture(fixture);
      await expect(settle.addApprover(approver1.address))
        .to.emit(settle, "ApproverAdded").withArgs(approver1.address);
      expect(await settle.isApprover(approver1.address)).to.be.true;
      const list = await settle.getApprovers();
      expect(list).to.deep.equal([approver1.address]);

      await expect(settle.removeApprover(approver1.address))
        .to.emit(settle, "ApproverRemoved").withArgs(approver1.address);
      expect(await settle.isApprover(approver1.address)).to.be.false;
    });

    it("addApprover reverts on duplicate", async function () {
      const { settle, approver1 } = await loadFixture(fixture);
      await settle.addApprover(approver1.address);
      await expect(settle.addApprover(approver1.address))
        .to.be.revertedWithCustomError(settle, "ApproverAlreadyAdded");
    });

    it("setQuorums reverts on quorum > approver count", async function () {
      const { settle } = await loadFixture(fixture);
      await expect(settle.setQuorums(5, 1))
        .to.be.revertedWithCustomError(settle, "QuorumTooHigh");
    });
  });

  describe("createSettlement", function () {
    it("admin creates settlement for AUTO_APPROVED request", async function () {
      const { settle, recipient } = await loadFixture(fixture);
      await expect(settle.createSettlement(0, recipient.address, 100n * 10n ** 6n))
        .to.emit(settle, "SettlementCreated").withArgs(0, recipient.address, 100n * 10n ** 6n, false);

      expect(await settle.settlementExists(0)).to.be.true;
      const s = await settle.getSettlement(0);
      expect(s.state).to.equal(SETTLE_PENDING);
      expect(s.recipient).to.equal(recipient.address);
      expect(s.amount).to.equal(100n * 10n ** 6n);
      expect(s.highRisk).to.be.false;
    });

    it("reverts on zero recipient", async function () {
      const { settle } = await loadFixture(fixture);
      await expect(settle.createSettlement(0, hre.ethers.ZeroAddress, 100n))
        .to.be.revertedWithCustomError(settle, "RecipientZero");
    });

    it("reverts on zero amount", async function () {
      const { settle, recipient } = await loadFixture(fixture);
      await expect(settle.createSettlement(0, recipient.address, 0))
        .to.be.revertedWithCustomError(settle, "AmountZero");
    });

    it("reverts on out-of-range requestId", async function () {
      const { settle, recipient } = await loadFixture(fixture);
      await expect(settle.createSettlement(99, recipient.address, 100n))
        .to.be.revertedWithCustomError(settle, "CoreRequestNotFound");
    });

    it("reverts on duplicate settlement", async function () {
      const { settle, recipient } = await loadFixture(fixture);
      await settle.createSettlement(0, recipient.address, 100n);
      await expect(settle.createSettlement(0, recipient.address, 100n))
        .to.be.revertedWithCustomError(settle, "SettlementAlreadyExists");
    });

    it("reverts when core publicStatus is not approved", async function () {
      const { core, settle, admin, employee, recipient, employeeClient, adminClient } = await loadFixture(fixture);

      // Submit a denied-tier request (amount > HARD)
      const [encAmt] = await employeeClient
        .encryptInputs([Encryptable.uint32(HARD + 1n)])
        .execute();
      await core.connect(employee).submitRequest(PACK_TRAVEL, 1, 1, encAmt, "over");
      const encStatus = await core.getEncryptedStatus(1);
      const permit = await (adminClient as any).permits.getOrCreateSelfPermit();
    const dec = await (adminClient as any).decryptForTx(encStatus).withPermit(permit).execute();
      await core.publishDecryptedResult(1, Number(dec.decryptedValue), dec.signature);

      // request 1 is AUTO_DENIED — settle creation should revert
      await expect(settle.createSettlement(1, recipient.address, 100n))
        .to.be.revertedWithCustomError(settle, "CoreRequestNotApproved");
    });
  });

  describe("approve quorum", function () {
    it("single approver hits quorum (normalQuorum=1)", async function () {
      const { settle, approver1, recipient } = await loadFixture(fixture);
      await settle.addApprover(approver1.address);
      await settle.createSettlement(0, recipient.address, 100n * 10n ** 6n);

      await expect(settle.connect(approver1).approve(0))
        .to.emit(settle, "SettlementApproved").withArgs(0, approver1.address, 1)
        .to.emit(settle, "SettlementQuorumReached").withArgs(0, 1);

      const s = await settle.getSettlement(0);
      expect(s.state).to.equal(SETTLE_APPROVED);
    });

    it("multi-approver quorum: 2-of-3 must approve before APPROVED", async function () {
      const { settle, approver1, approver2, approver3, recipient } = await loadFixture(fixture);
      await settle.addApprover(approver1.address);
      await settle.addApprover(approver2.address);
      await settle.addApprover(approver3.address);
      await settle.setQuorums(2, 3); // normalQuorum=2

      await settle.createSettlement(0, recipient.address, 100n * 10n ** 6n);
      await settle.connect(approver1).approve(0);
      let s = await settle.getSettlement(0);
      expect(s.state).to.equal(SETTLE_PENDING);
      expect(s.approvalsCount).to.equal(1);

      await settle.connect(approver2).approve(0);
      s = await settle.getSettlement(0);
      expect(s.state).to.equal(SETTLE_APPROVED);
      expect(s.approvalsCount).to.equal(2);
    });

    it("non-approver cannot approve", async function () {
      const { settle, stranger, recipient } = await loadFixture(fixture);
      await settle.createSettlement(0, recipient.address, 100n);
      await expect(settle.connect(stranger).approve(0))
        .to.be.revertedWithCustomError(settle, "NotApprover");
    });

    it("approver cannot double-approve", async function () {
      const { settle, approver1, approver2, recipient } = await loadFixture(fixture);
      await settle.addApprover(approver1.address);
      await settle.addApprover(approver2.address);
      await settle.setQuorums(2, 2);
      await settle.createSettlement(0, recipient.address, 100n);
      await settle.connect(approver1).approve(0);
      await expect(settle.connect(approver1).approve(0))
        .to.be.revertedWithCustomError(settle, "AlreadyApprovedBy");
    });

    it("approve in wrong state reverts", async function () {
      const { settle, approver1, recipient } = await loadFixture(fixture);
      await settle.addApprover(approver1.address);
      await settle.createSettlement(0, recipient.address, 100n);
      await settle.cancel(0, "test");
      await expect(settle.connect(approver1).approve(0))
        .to.be.revertedWithCustomError(settle, "WrongState");
    });
  });

  describe("settle (token transfer + chain)", function () {
    it("transfers MockUSDC and updates chain head", async function () {
      const { token, settle, approver1, recipient } = await loadFixture(fixture);
      await settle.addApprover(approver1.address);
      const amount = 250n * 10n ** 6n;
      await settle.createSettlement(0, recipient.address, amount);
      await settle.connect(approver1).approve(0);

      const recipientBefore = await token.balanceOf(recipient.address);
      const headBefore = await settle.chainHead();

      const tx = await settle.settle(0);
      await expect(tx).to.emit(settle, "Settled");

      const recipientAfter = await token.balanceOf(recipient.address);
      expect(recipientAfter - recipientBefore).to.equal(amount);

      const headAfter = await settle.chainHead();
      expect(headAfter).to.not.equal(headBefore);

      const s = await settle.getSettlement(0);
      expect(s.state).to.equal(SETTLE_SETTLED);
      expect(s.settlementHash).to.equal(headAfter);
      expect(s.prevChainHead).to.equal(headBefore);
    });

    it("verifyReceipt recomputes the stored chain link", async function () {
      const { settle, approver1, recipient } = await loadFixture(fixture);
      await settle.addApprover(approver1.address);
      const amount = 100n * 10n ** 6n;
      await settle.createSettlement(0, recipient.address, amount);
      await settle.connect(approver1).approve(0);
      await settle.settle(0);

      const s = await settle.getSettlement(0);
      const recomputed = await settle.verifyReceipt(
        s.prevChainHead,
        0,
        recipient.address,
        amount,
        s.coreReceiptHash,
      );
      expect(recomputed).to.equal(s.settlementHash);
    });

    it("verifyReceipt with tampered amount does NOT match", async function () {
      const { settle, approver1, recipient } = await loadFixture(fixture);
      await settle.addApprover(approver1.address);
      const amount = 100n * 10n ** 6n;
      await settle.createSettlement(0, recipient.address, amount);
      await settle.connect(approver1).approve(0);
      await settle.settle(0);
      const s = await settle.getSettlement(0);

      const tampered = await settle.verifyReceipt(
        s.prevChainHead,
        0,
        recipient.address,
        amount + 1n,
        s.coreReceiptHash,
      );
      expect(tampered).to.not.equal(s.settlementHash);
    });

    it("cannot settle twice (idempotency)", async function () {
      const { settle, approver1, recipient } = await loadFixture(fixture);
      await settle.addApprover(approver1.address);
      await settle.createSettlement(0, recipient.address, 100n);
      await settle.connect(approver1).approve(0);
      await settle.settle(0);
      await expect(settle.settle(0)).to.be.revertedWithCustomError(settle, "WrongState");
    });

    it("cannot settle PENDING without quorum", async function () {
      const { settle, approver1, approver2, recipient } = await loadFixture(fixture);
      await settle.addApprover(approver1.address);
      await settle.addApprover(approver2.address);
      await settle.setQuorums(2, 2);
      await settle.createSettlement(0, recipient.address, 100n);
      await settle.connect(approver1).approve(0);
      // Still PENDING — only 1 of 2 approvals
      await expect(settle.settle(0)).to.be.revertedWithCustomError(settle, "WrongState");
    });

    it("non-owner cannot settle", async function () {
      const { settle, approver1, stranger, recipient } = await loadFixture(fixture);
      await settle.addApprover(approver1.address);
      await settle.createSettlement(0, recipient.address, 100n);
      await settle.connect(approver1).approve(0);
      await expect(settle.connect(stranger).settle(0)).to.be.reverted;
    });
  });

  describe("cancel", function () {
    it("admin cancels pending settlement", async function () {
      const { settle, recipient } = await loadFixture(fixture);
      await settle.createSettlement(0, recipient.address, 100n);
      await expect(settle.cancel(0, "wrong recipient"))
        .to.emit(settle, "Cancelled").withArgs(0, "wrong recipient");
      const s = await settle.getSettlement(0);
      expect(s.state).to.equal(SETTLE_CANCELLED);
    });

    it("cannot cancel settled record", async function () {
      const { settle, approver1, recipient } = await loadFixture(fixture);
      await settle.addApprover(approver1.address);
      await settle.createSettlement(0, recipient.address, 100n);
      await settle.connect(approver1).approve(0);
      await settle.settle(0);
      await expect(settle.cancel(0, "x")).to.be.revertedWithCustomError(settle, "WrongState");
    });
  });

  describe("MockUSDC", function () {
    it("decimals is 6", async function () {
      const { token } = await loadFixture(fixture);
      expect(await token.decimals()).to.equal(6);
    });

    it("faucet mints 1000 mUSDC", async function () {
      const { token, stranger } = await loadFixture(fixture);
      await token.connect(stranger).faucet();
      expect(await token.balanceOf(stranger.address)).to.equal(1_000n * 10n ** 6n);
    });

    it("permissionless mint", async function () {
      const { token, stranger } = await loadFixture(fixture);
      await token.connect(stranger).mint(stranger.address, 12345n);
      expect(await token.balanceOf(stranger.address)).to.equal(12345n);
    });
  });
});
