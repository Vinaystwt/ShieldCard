// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { IShieldCardControlPlane } from "./interfaces/IShieldCardControlPlane.sol";

/**
 * @title ShieldCardSettlement
 * @notice Wave 5 companion contract. Closes the loop from approved confidential
 *         policy decision (in ShieldCardControlPlane) to a testnet MockUSDC payout.
 *
 *         IMPORTANT — all transfers here are TESTNET ONLY. Token is MockUSDC.
 *
 * Lifecycle per requestId:
 *   Pending   — settlement created with recipient + amount; waiting for approvals.
 *   Approved  — required threshold of approver signatures reached; ready to settle.
 *   Settled   — admin executed token transfer; recipient received MockUSDC.
 *   Cancelled — admin cancelled settlement; no further action permitted.
 *
 * High-risk requests (riskBitmap != 0) require `highRiskQuorum` approvals.
 * Normal requests require `normalQuorum` approvals (typically 1).
 *
 * Each settlement appends to a hash-chain: chainHead = keccak256(
 *   abi.encodePacked(prevChainHead, requestId, recipient, amount, coreReceiptHash, block.chainid)
 * ). Tamper-evident: any reordering or modification breaks chain continuity.
 */
contract ShieldCardSettlement is Ownable {
    using SafeERC20 for IERC20;

    // =========================================================================
    // Status constants — settlement state machine
    // =========================================================================

    uint8 public constant SETTLE_NONE      = 0; // request never had a settlement created
    uint8 public constant SETTLE_PENDING   = 1;
    uint8 public constant SETTLE_APPROVED  = 2;
    uint8 public constant SETTLE_SETTLED   = 3;
    uint8 public constant SETTLE_CANCELLED = 4;

    // Core publicStatus values that allow settlement creation
    uint8 public constant CORE_AUTO_APPROVED  = 1;
    uint8 public constant CORE_ADMIN_APPROVED = 4;

    // =========================================================================
    // Errors
    // =========================================================================

    error CoreRequestNotFound();
    error CoreRequestNotApproved();
    error SettlementAlreadyExists();
    error SettlementNotFound();
    error WrongState(uint8 actual, uint8 expected);
    error AlreadyApprovedBy(address approver);
    error NotApprover(address caller);
    error QuorumNotReached(uint8 have, uint8 need);
    error RecipientZero();
    error AmountZero();
    error TokenTransferFailed();
    error PrevChainHeadMismatch(bytes32 expected, bytes32 actual);
    error ApproverAlreadyAdded(address approver);
    error ApproverNotFound(address approver);
    error QuorumTooHigh(uint8 quorum, uint8 approverCount);

    // =========================================================================
    // Events
    // =========================================================================

    event SettlementCreated(
        uint256 indexed requestId,
        address indexed recipient,
        uint256 amount,
        bool highRisk
    );
    event SettlementApproved(uint256 indexed requestId, address indexed approver, uint8 totalApprovals);
    event SettlementQuorumReached(uint256 indexed requestId, uint8 quorum);
    event Settled(
        uint256 indexed requestId,
        address indexed recipient,
        uint256 amount,
        bytes32 chainHead,
        bytes32 prevChainHead
    );
    event Cancelled(uint256 indexed requestId, string reason);
    event ApproverAdded(address indexed approver);
    event ApproverRemoved(address indexed approver);
    event QuorumChanged(uint8 normal, uint8 highRisk);

    // =========================================================================
    // State
    // =========================================================================

    IShieldCardControlPlane public immutable core;
    IERC20 public immutable token;

    struct SettlementRecord {
        address recipient;        // payout address
        uint256 amount;           // amount in token base units (mUSDC has 6 decimals)
        uint8   state;            // SETTLE_* constant
        uint8   approvalsCount;   // how many approvers have signed
        bool    highRisk;         // snapshot of core riskBitmap != 0 at creation
        uint256 createdAt;
        uint256 settledAt;
        bytes32 settlementHash;   // chain-link of this settlement (zero until settled)
        bytes32 prevChainHead;    // value of chainHead at moment of settlement
        bytes32 coreReceiptHash;  // copy of core's receiptHash at settlement time
        string  cancelReason;     // populated when state == SETTLE_CANCELLED
    }

    mapping(uint256 => SettlementRecord) internal _records;
    mapping(uint256 => bool) public settlementExists;
    mapping(uint256 => mapping(address => bool)) public hasApproved;

    // Approver registry + quorums
    mapping(address => bool) public isApprover;
    address[] public approvers;
    uint8 public normalQuorum;
    uint8 public highRiskQuorum;

    // Hash chain
    bytes32 public chainHead;

    // =========================================================================
    // Constructor
    // =========================================================================

    constructor(address coreAddress, address tokenAddress) Ownable(msg.sender) {
        require(coreAddress != address(0), "core=0");
        require(tokenAddress != address(0), "token=0");
        core = IShieldCardControlPlane(coreAddress);
        token = IERC20(tokenAddress);
        normalQuorum   = 1;
        highRiskQuorum = 1;
        // chainHead starts as zero (genesis)
    }

    // =========================================================================
    // Admin — approver and quorum management
    // =========================================================================

    function addApprover(address a) external onlyOwner {
        if (isApprover[a]) revert ApproverAlreadyAdded(a);
        isApprover[a] = true;
        approvers.push(a);
        emit ApproverAdded(a);
    }

    function removeApprover(address a) external onlyOwner {
        if (!isApprover[a]) revert ApproverNotFound(a);
        isApprover[a] = false;
        // swap-pop
        uint256 len = approvers.length;
        for (uint256 i = 0; i < len; i++) {
            if (approvers[i] == a) {
                approvers[i] = approvers[len - 1];
                approvers.pop();
                break;
            }
        }
        emit ApproverRemoved(a);
    }

    function setQuorums(uint8 normal, uint8 highRisk) external onlyOwner {
        if (normal   > uint8(approvers.length) && normal   != 0) revert QuorumTooHigh(normal,   uint8(approvers.length));
        if (highRisk > uint8(approvers.length) && highRisk != 0) revert QuorumTooHigh(highRisk, uint8(approvers.length));
        normalQuorum   = normal;
        highRiskQuorum = highRisk;
        emit QuorumChanged(normal, highRisk);
    }

    function getApprovers() external view returns (address[] memory) {
        return approvers;
    }

    // =========================================================================
    // Create settlement (admin) — references core publicStatus
    // =========================================================================

    /**
     * @notice Open a settlement record for an approved core request.
     *         The core's publicStatus must be AUTO_APPROVED or ADMIN_APPROVED.
     *         No double-create per requestId.
     */
    function createSettlement(uint256 requestId, address recipient, uint256 amount) external onlyOwner {
        if (recipient == address(0)) revert RecipientZero();
        if (amount == 0) revert AmountZero();
        if (settlementExists[requestId]) revert SettlementAlreadyExists();
        if (requestId >= core.getRequestCount()) revert CoreRequestNotFound();

        (
            ,,,,,,,
            ,
            bool resultPublished,
            uint8 publicStatus,
            ,
            ,
            uint16 riskBitmap
        ) = core.getRequest(requestId);

        if (!resultPublished) revert CoreRequestNotApproved();
        if (publicStatus != CORE_AUTO_APPROVED && publicStatus != CORE_ADMIN_APPROVED) {
            revert CoreRequestNotApproved();
        }

        bool highRisk = riskBitmap != 0;
        _records[requestId] = SettlementRecord({
            recipient:       recipient,
            amount:          amount,
            state:           SETTLE_PENDING,
            approvalsCount:  0,
            highRisk:        highRisk,
            createdAt:       block.timestamp,
            settledAt:       0,
            settlementHash:  bytes32(0),
            prevChainHead:   bytes32(0),
            coreReceiptHash: bytes32(0),
            cancelReason:    ""
        });
        settlementExists[requestId] = true;

        emit SettlementCreated(requestId, recipient, amount, highRisk);
    }

    // =========================================================================
    // Approve settlement (n-of-m)
    // =========================================================================

    function approve(uint256 requestId) external {
        if (!settlementExists[requestId]) revert SettlementNotFound();
        SettlementRecord storage s = _records[requestId];
        if (s.state != SETTLE_PENDING) revert WrongState(s.state, SETTLE_PENDING);
        if (!isApprover[msg.sender]) revert NotApprover(msg.sender);
        if (hasApproved[requestId][msg.sender]) revert AlreadyApprovedBy(msg.sender);

        hasApproved[requestId][msg.sender] = true;
        s.approvalsCount += 1;
        emit SettlementApproved(requestId, msg.sender, s.approvalsCount);

        uint8 needed = s.highRisk ? highRiskQuorum : normalQuorum;
        if (s.approvalsCount >= needed) {
            s.state = SETTLE_APPROVED;
            emit SettlementQuorumReached(requestId, needed);
        }
    }

    // =========================================================================
    // Settle — execute MockUSDC transfer (admin)
    // =========================================================================

    /**
     * @notice Execute the testnet token transfer for an approved settlement.
     *         Updates the hash-chain. Idempotent: cannot settle twice.
     */
    function settle(uint256 requestId) external onlyOwner {
        if (!settlementExists[requestId]) revert SettlementNotFound();
        SettlementRecord storage s = _records[requestId];
        if (s.state != SETTLE_APPROVED) revert WrongState(s.state, SETTLE_APPROVED);

        // Snapshot core receipt at moment of settlement
        (
            ,,,,,,,
            , , , , bytes32 coreReceiptHash,
        ) = core.getRequest(requestId);

        bytes32 prev = chainHead;
        bytes32 newHead = keccak256(abi.encodePacked(
            prev,
            requestId,
            s.recipient,
            s.amount,
            coreReceiptHash,
            block.chainid
        ));

        s.state           = SETTLE_SETTLED;
        s.settledAt       = block.timestamp;
        s.prevChainHead   = prev;
        s.settlementHash  = newHead;
        s.coreReceiptHash = coreReceiptHash;
        chainHead         = newHead;

        token.safeTransfer(s.recipient, s.amount);

        emit Settled(requestId, s.recipient, s.amount, newHead, prev);
    }

    // =========================================================================
    // Cancel
    // =========================================================================

    function cancel(uint256 requestId, string calldata reason) external onlyOwner {
        if (!settlementExists[requestId]) revert SettlementNotFound();
        SettlementRecord storage s = _records[requestId];
        if (s.state != SETTLE_PENDING && s.state != SETTLE_APPROVED) {
            revert WrongState(s.state, SETTLE_PENDING);
        }
        s.state        = SETTLE_CANCELLED;
        s.cancelReason = reason;
        emit Cancelled(requestId, reason);
    }

    // =========================================================================
    // Funding helpers
    // =========================================================================

    /// @notice Pull funds from sender to this contract (sender must approve first).
    function fund(uint256 amount) external {
        token.safeTransferFrom(msg.sender, address(this), amount);
    }

    /// @notice Sweep idle balance back to admin (admin only).
    function sweep(uint256 amount) external onlyOwner {
        token.safeTransfer(msg.sender, amount);
    }

    // =========================================================================
    // View helpers
    // =========================================================================

    function getSettlement(uint256 requestId) external view returns (SettlementRecord memory) {
        return _records[requestId];
    }

    function getSettlementState(uint256 requestId) external view returns (uint8) {
        if (!settlementExists[requestId]) return SETTLE_NONE;
        return _records[requestId].state;
    }

    /**
     * @notice Pure receipt-chain verifier. Given the inputs that would have
     *         produced a settlement, returns the chain-head it would have created.
     *         Off-chain auditors recompute and compare to the on-chain settlementHash.
     */
    function verifyReceipt(
        bytes32 prevChainHead,
        uint256 requestId,
        address recipient,
        uint256 amount,
        bytes32 coreReceiptHash
    ) external view returns (bytes32) {
        return keccak256(abi.encodePacked(
            prevChainHead,
            requestId,
            recipient,
            amount,
            coreReceiptHash,
            block.chainid
        ));
    }
}
