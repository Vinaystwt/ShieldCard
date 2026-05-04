// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { FHE, euint32, euint8, ebool, InEuint32 } from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ShieldCardPolicyEngine
 * @notice Confidential corporate spend-policy engine with multi-threshold routing,
 *         encrypted rolling budgets, admin review queue, and settlement receipts.
 *
 * Status lifecycle:
 *   0  Submitted       — initial, FHE not yet published
 *   1  AutoApproved    — FHE: amount ≤ autoThreshold AND budget has room
 *   2  NeedsReview     — FHE: autoThreshold < amount ≤ hardLimit AND budget has room
 *   3  AutoDenied      — FHE: amount > hardLimit OR budget exhausted
 *   4  AdminApproved   — admin resolved a NeedsReview request as approved
 *   5  AdminDenied     — admin resolved a NeedsReview request as denied
 */
contract ShieldCardPolicyEngine is Ownable {
    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------

    uint8 public constant STATUS_SUBMITTED      = 0;
    uint8 public constant STATUS_AUTO_APPROVED  = 1;
    uint8 public constant STATUS_NEEDS_REVIEW   = 2;
    uint8 public constant STATUS_AUTO_DENIED    = 3;
    uint8 public constant STATUS_ADMIN_APPROVED = 4;
    uint8 public constant STATUS_ADMIN_DENIED   = 5;

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error EmployeeAlreadyRegistered(address employee);
    error EmployeeNotRegistered(address employee);
    error EmployeeIsFrozen(address employee);
    error InvalidEncryptedInput();
    error ResultAlreadyPublished(uint256 requestId);
    error PackAlreadyExists(uint8 packId);
    error PackNotFound(uint8 packId);
    error PackInactive(uint8 packId);
    error PackLimitsNotSet(uint8 packId);
    error SubmissionsPaused();
    error RequestNotInReview(uint256 requestId);
    error RequestNotFound(uint256 requestId);

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event EmployeeRegistered(address indexed employee);
    event EmployeeFrozen(address indexed employee);
    event EmployeeUnfrozen(address indexed employee);
    event SubmissionsPausedEvent();
    event SubmissionsUnpausedEvent();
    event PackCreated(uint8 indexed packId, string name);
    event PackLimitsSet(uint8 indexed packId);
    event PackActiveChanged(uint8 indexed packId, bool active);
    event BudgetEpochReset(uint8 indexed packId, uint256 timestamp);
    event RequestSubmitted(uint256 indexed requestId, address indexed employee, uint8 packId, uint256 timestamp);
    event ResultPublished(uint256 indexed requestId, uint8 status);
    event RequestNeedsReview(uint256 indexed requestId, address indexed employee, uint8 packId);
    event AdminResolved(uint256 indexed requestId, bool approved);

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    address public admin;
    bool public submissionsPaused;

    // Employee registry
    mapping(address => bool) public employeeRegistered;
    mapping(address => bool) public employeeFrozen;
    address[] public registeredEmployees;
    mapping(address => uint256[]) public employeeRequestIds;

    // Policy packs
    struct PolicyPack {
        string name;
        bool active;
        bool limitsSet;
        euint32 encHardLimit;       // absolute ceiling — deny if exceeded
        euint32 encAutoThreshold;   // auto-approve if amount ≤ this
        euint32 encBudgetLimit;     // rolling epoch budget cap
        euint32 encUsedBudget;      // encrypted running spend total for epoch
        uint256 epochStart;         // unix ts when current budget epoch began
    }

    mapping(uint8 => PolicyPack) internal _packs;
    mapping(uint8 => bool) public packExists;
    uint8 public packCount;

    // Plaintext counters — safe to expose
    mapping(uint8 => uint256) public packTotalRequests;
    mapping(uint8 => uint256) public packApprovedCount;
    mapping(uint8 => uint256) public packDeniedCount;
    mapping(uint8 => uint256) public packReviewPendingCount;

    // Requests
    struct PaymentRequest {
        address employee;
        uint8 packId;
        euint32 encAmount;
        euint8 encStatus;           // FHE-computed (1–3); set after publishDecryptedResult
        string memo;
        uint256 timestamp;
        bool resultPublished;
        uint8 publicStatus;         // final status (1–5) visible after publish
        bool inReview;              // true when NeedsReview pending admin action
        bytes32 receiptHash;        // set on publish
    }

    PaymentRequest[] internal _requests;

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor() Ownable(msg.sender) {
        admin = msg.sender;
    }

    // =========================================================================
    // Admin: global controls
    // =========================================================================

    function pauseSubmissions() external onlyOwner {
        submissionsPaused = true;
        emit SubmissionsPausedEvent();
    }

    function unpauseSubmissions() external onlyOwner {
        submissionsPaused = false;
        emit SubmissionsUnpausedEvent();
    }

    // =========================================================================
    // Admin: employee management
    // =========================================================================

    function registerEmployee(address employee) external onlyOwner {
        if (employeeRegistered[employee]) revert EmployeeAlreadyRegistered(employee);
        employeeRegistered[employee] = true;
        registeredEmployees.push(employee);
        emit EmployeeRegistered(employee);
    }

    function freezeEmployee(address employee) external onlyOwner {
        if (!employeeRegistered[employee]) revert EmployeeNotRegistered(employee);
        employeeFrozen[employee] = true;
        emit EmployeeFrozen(employee);
    }

    function unfreezeEmployee(address employee) external onlyOwner {
        if (!employeeRegistered[employee]) revert EmployeeNotRegistered(employee);
        employeeFrozen[employee] = false;
        emit EmployeeUnfrozen(employee);
    }

    function getRegisteredEmployeeCount() external view returns (uint256) {
        return registeredEmployees.length;
    }

    // =========================================================================
    // Admin: policy pack management
    // =========================================================================

    function createPack(uint8 packId, string calldata name) external onlyOwner {
        if (packExists[packId]) revert PackAlreadyExists(packId);
        _packs[packId].name = name;
        _packs[packId].active = true;
        _packs[packId].epochStart = block.timestamp;
        packExists[packId] = true;
        packCount++;
        emit PackCreated(packId, name);
    }

    /**
     * @notice Set all three encrypted thresholds for a pack in one call.
     *         Also initialises the rolling spend accumulator to encrypted zero.
     */
    function setPolicyThresholds(
        uint8 packId,
        InEuint32 calldata encHardLimit,
        InEuint32 calldata encAutoThreshold,
        InEuint32 calldata encBudgetLimit
    ) external onlyOwner {
        if (!packExists[packId]) revert PackNotFound(packId);
        if (encHardLimit.ctHash == 0 || encAutoThreshold.ctHash == 0 || encBudgetLimit.ctHash == 0) {
            revert InvalidEncryptedInput();
        }

        euint32 hardLimit    = FHE.asEuint32(encHardLimit);
        euint32 autoThresh   = FHE.asEuint32(encAutoThreshold);
        euint32 budgetLimit  = FHE.asEuint32(encBudgetLimit);
        euint32 zeroUsed     = FHE.asEuint32(0);

        FHE.allowThis(hardLimit);   FHE.allow(hardLimit,   admin);
        FHE.allowThis(autoThresh);  FHE.allow(autoThresh,  admin);
        FHE.allowThis(budgetLimit); FHE.allow(budgetLimit, admin);
        FHE.allowThis(zeroUsed);    FHE.allow(zeroUsed,    admin);

        _packs[packId].encHardLimit     = hardLimit;
        _packs[packId].encAutoThreshold = autoThresh;
        _packs[packId].encBudgetLimit   = budgetLimit;
        _packs[packId].encUsedBudget    = zeroUsed;
        _packs[packId].limitsSet        = true;
        _packs[packId].epochStart       = block.timestamp;

        emit PackLimitsSet(packId);
    }

    function setPackActive(uint8 packId, bool active) external onlyOwner {
        if (!packExists[packId]) revert PackNotFound(packId);
        _packs[packId].active = active;
        emit PackActiveChanged(packId, active);
    }

    /**
     * @notice Reset the rolling budget epoch — zeroes the encrypted spend accumulator.
     */
    function resetBudgetEpoch(uint8 packId) external onlyOwner {
        if (!packExists[packId]) revert PackNotFound(packId);
        euint32 zeroUsed = FHE.asEuint32(0);
        FHE.allowThis(zeroUsed);
        FHE.allow(zeroUsed, admin);
        _packs[packId].encUsedBudget = zeroUsed;
        _packs[packId].epochStart    = block.timestamp;
        emit BudgetEpochReset(packId, block.timestamp);
    }

    // =========================================================================
    // Employee: submit request
    // =========================================================================

    function submitRequest(
        uint8 packId,
        InEuint32 calldata encAmount,
        string calldata memo
    ) external {
        if (submissionsPaused) revert SubmissionsPaused();
        if (!employeeRegistered[msg.sender]) revert EmployeeNotRegistered(msg.sender);
        if (employeeFrozen[msg.sender]) revert EmployeeIsFrozen(msg.sender);
        if (!packExists[packId]) revert PackNotFound(packId);
        if (!_packs[packId].active) revert PackInactive(packId);
        if (!_packs[packId].limitsSet) revert PackLimitsNotSet(packId);
        if (encAmount.ctHash == 0) revert InvalidEncryptedInput();

        euint32 amount = FHE.asEuint32(encAmount);
        FHE.allowThis(amount);
        FHE.allowSender(amount);

        uint256 requestId = _requests.length;
        _requests.push();

        PaymentRequest storage req = _requests[requestId];
        req.employee  = msg.sender;
        req.packId    = packId;
        req.encAmount = amount;
        req.memo      = memo;
        req.timestamp = block.timestamp;

        employeeRequestIds[msg.sender].push(requestId);
        packTotalRequests[packId]++;

        _evaluatePolicy(requestId);

        emit RequestSubmitted(requestId, msg.sender, packId, block.timestamp);
    }

    // =========================================================================
    // Admin: publish FHE result
    // =========================================================================

    /**
     * @notice Publish the FHE-decrypted result for a request.
     *         plainStatus must be 1 (AutoApproved), 2 (NeedsReview), or 3 (AutoDenied).
     *         If NeedsReview, the request is queued for admin action — not finalised.
     */
    function publishDecryptedResult(
        uint256 requestId,
        uint8 plainStatus,
        bytes calldata sig
    ) external onlyOwner {
        if (requestId >= _requests.length) revert RequestNotFound(requestId);
        PaymentRequest storage req = _requests[requestId];
        if (req.resultPublished) revert ResultAlreadyPublished(requestId);

        FHE.publishDecryptResult(req.encStatus, plainStatus, sig);

        if (plainStatus == STATUS_NEEDS_REVIEW) {
            req.inReview = true;
            packReviewPendingCount[req.packId]++;
            emit RequestNeedsReview(requestId, req.employee, req.packId);
        } else {
            _finaliseRequest(requestId, plainStatus);
        }
    }

    /**
     * @notice Admin resolves a NeedsReview request.
     */
    function adminReviewRequest(uint256 requestId, bool approved) external onlyOwner {
        if (requestId >= _requests.length) revert RequestNotFound(requestId);
        PaymentRequest storage req = _requests[requestId];
        if (!req.inReview) revert RequestNotInReview(requestId);

        req.inReview = false;
        if (packReviewPendingCount[req.packId] > 0) {
            packReviewPendingCount[req.packId]--;
        }

        uint8 finalStatus = approved ? STATUS_ADMIN_APPROVED : STATUS_ADMIN_DENIED;
        _finaliseRequest(requestId, finalStatus);
        emit AdminResolved(requestId, approved);
    }

    // =========================================================================
    // View helpers
    // =========================================================================

    function getPackInfo(uint8 packId)
        external
        view
        returns (string memory name, bool active, bool limitsSet, uint256 epochStart)
    {
        if (!packExists[packId]) revert PackNotFound(packId);
        PolicyPack storage p = _packs[packId];
        return (p.name, p.active, p.limitsSet, p.epochStart);
    }

    function getPackSummary(uint8 packId)
        external
        view
        returns (uint256 total, uint256 approved, uint256 denied, uint256 pending, uint256 inReview)
    {
        if (!packExists[packId]) revert PackNotFound(packId);
        total    = packTotalRequests[packId];
        approved = packApprovedCount[packId];
        denied   = packDeniedCount[packId];
        inReview = packReviewPendingCount[packId];
        uint256 published = approved + denied + inReview;
        pending  = total > published ? total - published : 0;
    }

    function getEncryptedStatus(uint256 requestId) external view returns (euint8) {
        return _requests[requestId].encStatus;
    }

    function getEncryptedAmount(uint256 requestId) external view returns (euint32) {
        return _requests[requestId].encAmount;
    }

    function getRequest(uint256 requestId)
        external
        view
        returns (
            address employee,
            uint8 packId,
            euint32 encAmount,
            euint8 encStatus,
            string memory memo,
            uint256 timestamp,
            bool resultPublished,
            uint8 publicStatus,
            bool inReview,
            bytes32 receiptHash
        )
    {
        if (requestId >= _requests.length) revert RequestNotFound(requestId);
        PaymentRequest storage req = _requests[requestId];
        return (
            req.employee,
            req.packId,
            req.encAmount,
            req.encStatus,
            req.memo,
            req.timestamp,
            req.resultPublished,
            req.publicStatus,
            req.inReview,
            req.receiptHash
        );
    }

    function getRequestCount() external view returns (uint256) {
        return _requests.length;
    }

    function getEmployeeRequestIds(address employee)
        external
        view
        returns (uint256[] memory)
    {
        return employeeRequestIds[employee];
    }

    // =========================================================================
    // Internal
    // =========================================================================

    /**
     * @dev Evaluates the three-tier policy using FHE comparisons.
     *
     *      Tier 1 (Auto-Approved):  amount ≤ autoThreshold  AND  newBudget ≤ budgetLimit
     *      Tier 2 (NeedsReview):   amount ≤ hardLimit       AND  newBudget ≤ budgetLimit
     *                               (implicitly: amount > autoThreshold)
     *      Tier 3 (AutoDenied):    amount > hardLimit        OR  newBudget > budgetLimit
     *
     *      FHE encoded as: select(autoOk, 1, select(reviewOk, 2, 3))
     */
    function _evaluatePolicy(uint256 requestId) internal {
        PaymentRequest storage req = _requests[requestId];
        PolicyPack storage pack    = _packs[req.packId];

        // Budget check: tentatively accumulate spend at submission
        euint32 newUsed = FHE.add(pack.encUsedBudget, req.encAmount);
        FHE.allowThis(newUsed);

        ebool withinAutoThresh = FHE.lte(req.encAmount, pack.encAutoThreshold);
        ebool withinHardLimit  = FHE.lte(req.encAmount, pack.encHardLimit);
        ebool withinBudget     = FHE.lte(newUsed, pack.encBudgetLimit);

        // autoOk:   within auto-threshold AND budget
        // reviewOk: within hard limit AND budget (auto-threshold exceeded, handled by ordering)
        ebool autoOk   = FHE.and(withinAutoThresh, withinBudget);
        ebool reviewOk = FHE.and(withinHardLimit,  withinBudget);

        euint8 statusAuto   = FHE.asEuint8(STATUS_AUTO_APPROVED);
        euint8 statusReview = FHE.asEuint8(STATUS_NEEDS_REVIEW);
        euint8 statusDenied = FHE.asEuint8(STATUS_AUTO_DENIED);

        euint8 result = FHE.select(autoOk, statusAuto, FHE.select(reviewOk, statusReview, statusDenied));

        req.encStatus = result;

        // Update rolling budget accumulator (pessimistic: commit spend now)
        pack.encUsedBudget = newUsed;
        FHE.allowThis(pack.encUsedBudget);
        FHE.allow(pack.encUsedBudget, admin);

        // ACL for encrypted status
        FHE.allowThis(result);
        FHE.allow(result, admin);
        FHE.allowSender(result);
    }

    /**
     * @dev Finalise a request: mark as published, compute receipt hash, update counters.
     *      Called for auto-outcomes (status 1 / 3) and admin resolutions (status 4 / 5).
     */
    function _finaliseRequest(uint256 requestId, uint8 finalStatus) internal {
        PaymentRequest storage req = _requests[requestId];

        req.publicStatus    = finalStatus;
        req.resultPublished = true;

        // Settlement receipt: keccak over identity, outcome, and context
        req.receiptHash = keccak256(
            abi.encodePacked(
                requestId,
                req.employee,
                req.packId,
                finalStatus,
                req.timestamp,
                address(this),
                block.chainid
            )
        );

        // Update counters
        bool isApproved = finalStatus == STATUS_AUTO_APPROVED || finalStatus == STATUS_ADMIN_APPROVED;
        bool isDenied   = finalStatus == STATUS_AUTO_DENIED   || finalStatus == STATUS_ADMIN_DENIED;

        if (isApproved) packApprovedCount[req.packId]++;
        if (isDenied)   packDeniedCount[req.packId]++;

        emit ResultPublished(requestId, finalStatus);
    }
}
