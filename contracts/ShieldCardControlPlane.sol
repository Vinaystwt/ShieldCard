// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { FHE, euint32, euint8, ebool, InEuint32 } from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ShieldCardControlPlane
 * @notice Confidential corporate spend-control plane — Wave 4.
 *
 *         Extends the ShieldCardPolicyEngine design with:
 *          • Department-level encrypted budget caps with epoch resets
 *          • Vendor compliance registry (Unchecked / Compliant / Suspended / Banned)
 *          • Receipt/invoice evidence hash registry (on-chain keccak linkage)
 *          • Recurring-spend interval enforcement per (employee, pack)
 *          • Risk-routing reason bitmap on every request (fully public)
 *          • Dynamic pack enumeration (getPackIds / getActivePackIds)
 *
 * Status lifecycle (unchanged from Engine):
 *   0  Submitted       — initial, FHE not yet published
 *   1  AutoApproved    — amount ≤ autoThreshold AND budget has room
 *   2  NeedsReview     — autoThreshold < amount ≤ hardLimit AND budget has room
 *   3  AutoDenied      — amount > hardLimit OR budget exhausted
 *   4  AdminApproved   — admin resolved NeedsReview as approved
 *   5  AdminDenied     — admin resolved NeedsReview as denied
 *
 * Risk bitmap (uint16, set at submission time, fully public):
 *   Bit 0  (0x0001)  VENDOR_SUSPENDED — vendor is currently suspended
 *   Bit 1  (0x0002)  VENDOR_UNCHECKED — vendor compliance not yet verified
 *   Bit 2  (0x0004)  NO_DEPT          — request submitted without a department
 *   Bit 3  (0x0008)  NO_VENDOR        — request submitted without a vendor ID
 */
contract ShieldCardControlPlane is Ownable {
    // =========================================================================
    // Status constants
    // =========================================================================

    uint8 public constant STATUS_SUBMITTED      = 0;
    uint8 public constant STATUS_AUTO_APPROVED  = 1;
    uint8 public constant STATUS_NEEDS_REVIEW   = 2;
    uint8 public constant STATUS_AUTO_DENIED    = 3;
    uint8 public constant STATUS_ADMIN_APPROVED = 4;
    uint8 public constant STATUS_ADMIN_DENIED   = 5;

    // =========================================================================
    // Vendor status constants
    // =========================================================================

    uint8 public constant VENDOR_UNCHECKED = 0;
    uint8 public constant VENDOR_COMPLIANT = 1;
    uint8 public constant VENDOR_SUSPENDED = 2;
    uint8 public constant VENDOR_BANNED    = 3;

    // =========================================================================
    // Risk bitmap constants
    // =========================================================================

    uint16 public constant RISK_VENDOR_SUSPENDED = 0x0001;
    uint16 public constant RISK_VENDOR_UNCHECKED = 0x0002;
    uint16 public constant RISK_NO_DEPT          = 0x0004;
    uint16 public constant RISK_NO_VENDOR        = 0x0008;

    // =========================================================================
    // Errors
    // =========================================================================

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
    error NotRequestOwner(uint256 requestId);
    // Department errors
    error DeptAlreadyExists(uint8 deptId);
    error DeptNotFound(uint8 deptId);
    error DeptInactive(uint8 deptId);
    // Vendor errors
    error VendorAlreadyRegistered(uint16 vendorId);
    error VendorNotFound(uint16 vendorId);
    error VendorBanned(uint16 vendorId);
    // Recurring errors
    error RecurringIntervalNotElapsed(uint256 nextAllowedTimestamp);
    // Evidence errors
    error EvidenceAlreadySubmitted(uint256 requestId);

    // =========================================================================
    // Events
    // =========================================================================

    // Engine events
    event EmployeeRegistered(address indexed employee);
    event EmployeeFrozen(address indexed employee);
    event EmployeeUnfrozen(address indexed employee);
    event EmployeeDeptAssigned(address indexed employee, uint8 deptId);
    event SubmissionsPausedEvent();
    event SubmissionsUnpausedEvent();
    event PackCreated(uint8 indexed packId, string name);
    event PackLimitsSet(uint8 indexed packId);
    event PackActiveChanged(uint8 indexed packId, bool active);
    event BudgetEpochReset(uint8 indexed packId, uint256 timestamp);
    event PackIntervalSet(uint8 indexed packId, uint256 intervalSeconds);
    event RequestSubmitted(uint256 indexed requestId, address indexed employee, uint8 packId, uint256 timestamp);
    event ResultPublished(uint256 indexed requestId, uint8 status);
    event RequestNeedsReview(uint256 indexed requestId, address indexed employee, uint8 packId);
    event AdminResolved(uint256 indexed requestId, bool approved);
    // Department events
    event DeptCreated(uint8 indexed deptId, string name);
    event DeptActiveChanged(uint8 indexed deptId, bool active);
    event DeptBudgetSet(uint8 indexed deptId);
    event DeptEpochReset(uint8 indexed deptId, uint256 timestamp);
    // Vendor events
    event VendorRegistered(uint16 indexed vendorId, string name);
    event VendorStatusUpdated(uint16 indexed vendorId, uint8 status);
    // Evidence event
    event EvidenceSubmitted(uint256 indexed requestId, bytes32 hash);

    // =========================================================================
    // Structs
    // =========================================================================

    struct PolicyPack {
        string name;
        bool active;
        bool limitsSet;
        euint32 encHardLimit;       // absolute ceiling — deny if exceeded
        euint32 encAutoThreshold;   // auto-approve if amount ≤ this
        euint32 encBudgetLimit;     // rolling epoch budget cap
        euint32 encUsedBudget;      // encrypted running spend total
        uint256 epochStart;         // unix ts when current budget epoch began
    }

    struct Department {
        string name;
        bool active;
        bool budgetSet;
        euint32 encBudgetCap;       // encrypted max spend per dept per epoch
        euint32 encUsedBudget;      // encrypted dept spend accumulator
        uint256 epochStart;
    }

    struct Vendor {
        string name;
        uint8 status;               // VENDOR_* constants
    }

    struct PaymentRequest {
        address employee;
        uint8   packId;
        uint8   deptId;             // 0 = no department specified
        uint16  vendorId;           // 0 = no vendor specified
        euint32 encAmount;
        euint8  encStatus;          // FHE-computed (1–3)
        string  memo;
        uint256 timestamp;
        bool    resultPublished;
        uint8   publicStatus;       // final status (1–5) visible after publish
        bool    inReview;
        bytes32 receiptHash;
        uint16  riskBitmap;         // public risk flags set at submission time
    }

    // =========================================================================
    // State
    // =========================================================================

    address public admin;
    bool public submissionsPaused;

    // Employee registry
    mapping(address => bool) public employeeRegistered;
    mapping(address => bool) public employeeFrozen;
    mapping(address => uint8) public employeeDept;    // default department assignment
    address[] public registeredEmployees;
    mapping(address => uint256[]) public employeeRequestIds;

    // Policy packs
    mapping(uint8 => PolicyPack) internal _packs;
    mapping(uint8 => bool) public packExists;
    uint8 public packCount;
    uint8[] internal _packIds;                        // ordered list for enumeration

    // Plaintext counters
    mapping(uint8 => uint256) public packTotalRequests;
    mapping(uint8 => uint256) public packApprovedCount;
    mapping(uint8 => uint256) public packDeniedCount;
    mapping(uint8 => uint256) public packReviewPendingCount;

    // Recurring spend intervals
    mapping(uint8 => uint256) public packRecurringInterval;             // min seconds between (emp, pack) submits
    mapping(address => mapping(uint8 => uint256)) public lastSubmitTimestamp;

    // Departments
    mapping(uint8 => Department) internal _departments;
    mapping(uint8 => bool) public deptExists;
    uint8[] public deptIds;                           // ordered list for enumeration

    // Vendors
    mapping(uint16 => Vendor) public vendors;
    mapping(uint16 => bool) public vendorExists;
    uint16 public vendorCount;

    // Requests
    PaymentRequest[] internal _requests;

    // Evidence registry
    mapping(uint256 => bytes32) public evidenceHash;
    mapping(uint256 => bool) public evidenceSubmitted;

    // =========================================================================
    // Constructor
    // =========================================================================

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

    /**
     * @notice Assign an employee's default department.
     *         deptId = 0 clears the assignment.
     */
    function assignEmployeeDept(address employee, uint8 deptId) external onlyOwner {
        if (!employeeRegistered[employee]) revert EmployeeNotRegistered(employee);
        if (deptId != 0 && !deptExists[deptId]) revert DeptNotFound(deptId);
        employeeDept[employee] = deptId;
        emit EmployeeDeptAssigned(employee, deptId);
    }

    function getRegisteredEmployeeCount() external view returns (uint256) {
        return registeredEmployees.length;
    }

    // =========================================================================
    // Admin: policy pack management
    // =========================================================================

    function createPack(uint8 packId, string calldata name) external onlyOwner {
        if (packExists[packId]) revert PackAlreadyExists(packId);
        _packs[packId].name       = name;
        _packs[packId].active     = true;
        _packs[packId].epochStart = block.timestamp;
        packExists[packId]        = true;
        packCount++;
        _packIds.push(packId);
        emit PackCreated(packId, name);
    }

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

        euint32 hardLimit   = FHE.asEuint32(encHardLimit);
        euint32 autoThresh  = FHE.asEuint32(encAutoThreshold);
        euint32 budgetLimit = FHE.asEuint32(encBudgetLimit);
        euint32 zeroUsed    = FHE.asEuint32(0);

        FHE.allowThis(hardLimit);    FHE.allow(hardLimit,   admin);
        FHE.allowThis(autoThresh);   FHE.allow(autoThresh,  admin);
        FHE.allowThis(budgetLimit);  FHE.allow(budgetLimit, admin);
        FHE.allowThis(zeroUsed);     FHE.allow(zeroUsed,    admin);

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

    function resetBudgetEpoch(uint8 packId) external onlyOwner {
        if (!packExists[packId]) revert PackNotFound(packId);
        euint32 zeroUsed = FHE.asEuint32(0);
        FHE.allowThis(zeroUsed);
        FHE.allow(zeroUsed, admin);
        _packs[packId].encUsedBudget = zeroUsed;
        _packs[packId].epochStart    = block.timestamp;
        emit BudgetEpochReset(packId, block.timestamp);
    }

    /**
     * @notice Set minimum seconds between submissions for an (employee, pack) pair.
     *         intervalSeconds = 0 disables interval enforcement for this pack.
     */
    function setPackRecurringInterval(uint8 packId, uint256 intervalSeconds) external onlyOwner {
        if (!packExists[packId]) revert PackNotFound(packId);
        packRecurringInterval[packId] = intervalSeconds;
        emit PackIntervalSet(packId, intervalSeconds);
    }

    // =========================================================================
    // Admin: department management
    // =========================================================================

    function createDept(uint8 deptId, string calldata name) external onlyOwner {
        if (deptExists[deptId]) revert DeptAlreadyExists(deptId);
        _departments[deptId].name       = name;
        _departments[deptId].active     = true;
        _departments[deptId].epochStart = block.timestamp;
        deptExists[deptId]              = true;
        deptIds.push(deptId);
        emit DeptCreated(deptId, name);
    }

    function setDeptActive(uint8 deptId, bool active) external onlyOwner {
        if (!deptExists[deptId]) revert DeptNotFound(deptId);
        _departments[deptId].active = active;
        emit DeptActiveChanged(deptId, active);
    }

    /**
     * @notice Set encrypted budget cap for a department, resetting the spend accumulator.
     */
    function setDeptBudget(uint8 deptId, InEuint32 calldata encBudgetCap) external onlyOwner {
        if (!deptExists[deptId]) revert DeptNotFound(deptId);
        if (encBudgetCap.ctHash == 0) revert InvalidEncryptedInput();

        euint32 cap      = FHE.asEuint32(encBudgetCap);
        euint32 zeroUsed = FHE.asEuint32(0);

        FHE.allowThis(cap);      FHE.allow(cap,      admin);
        FHE.allowThis(zeroUsed); FHE.allow(zeroUsed, admin);

        _departments[deptId].encBudgetCap  = cap;
        _departments[deptId].encUsedBudget = zeroUsed;
        _departments[deptId].budgetSet     = true;
        _departments[deptId].epochStart    = block.timestamp;

        emit DeptBudgetSet(deptId);
    }

    function resetDeptEpoch(uint8 deptId) external onlyOwner {
        if (!deptExists[deptId]) revert DeptNotFound(deptId);
        euint32 zeroUsed = FHE.asEuint32(0);
        FHE.allowThis(zeroUsed);
        FHE.allow(zeroUsed, admin);
        _departments[deptId].encUsedBudget = zeroUsed;
        _departments[deptId].epochStart    = block.timestamp;
        emit DeptEpochReset(deptId, block.timestamp);
    }

    // =========================================================================
    // Admin: vendor registry
    // =========================================================================

    function registerVendor(uint16 vendorId, string calldata name) external onlyOwner {
        if (vendorExists[vendorId]) revert VendorAlreadyRegistered(vendorId);
        vendors[vendorId]    = Vendor({ name: name, status: VENDOR_UNCHECKED });
        vendorExists[vendorId] = true;
        vendorCount++;
        emit VendorRegistered(vendorId, name);
    }

    function setVendorStatus(uint16 vendorId, uint8 status) external onlyOwner {
        if (!vendorExists[vendorId]) revert VendorNotFound(vendorId);
        vendors[vendorId].status = status;
        emit VendorStatusUpdated(vendorId, status);
    }

    // =========================================================================
    // Employee: submit request
    // =========================================================================

    /**
     * @notice Submit a confidential payment request.
     * @param packId    Policy pack to evaluate against.
     * @param deptId    Department context (0 = none — sets RISK_NO_DEPT bitmap bit).
     * @param vendorId  Vendor ID (0 = none — sets RISK_NO_VENDOR bitmap bit).
     *                  Banned vendors cause immediate revert.
     * @param encAmount FHE-encrypted request amount (uint32, in cents).
     * @param memo      Plaintext memo (visible on-chain — no sensitive data).
     */
    function submitRequest(
        uint8 packId,
        uint8 deptId,
        uint16 vendorId,
        InEuint32 calldata encAmount,
        string calldata memo
    ) external {
        if (submissionsPaused)                        revert SubmissionsPaused();
        if (!employeeRegistered[msg.sender])          revert EmployeeNotRegistered(msg.sender);
        if (employeeFrozen[msg.sender])               revert EmployeeIsFrozen(msg.sender);
        if (!packExists[packId])                      revert PackNotFound(packId);
        if (!_packs[packId].active)                   revert PackInactive(packId);
        if (!_packs[packId].limitsSet)                revert PackLimitsNotSet(packId);
        if (encAmount.ctHash == 0)                    revert InvalidEncryptedInput();

        // Dept check
        if (deptId != 0) {
            if (!deptExists[deptId]) revert DeptNotFound(deptId);
            if (!_departments[deptId].active) revert DeptInactive(deptId);
        }

        // Vendor check
        if (vendorId != 0) {
            if (!vendorExists[vendorId]) revert VendorNotFound(vendorId);
            if (vendors[vendorId].status == VENDOR_BANNED) revert VendorBanned(vendorId);
        }

        // Recurring interval check
        uint256 interval = packRecurringInterval[packId];
        if (interval > 0) {
            uint256 last = lastSubmitTimestamp[msg.sender][packId];
            if (last != 0 && block.timestamp < last + interval) {
                revert RecurringIntervalNotElapsed(last + interval);
            }
        }
        lastSubmitTimestamp[msg.sender][packId] = block.timestamp;

        // Compute risk bitmap from plaintext-observable signals
        uint16 riskBitmap = 0;
        if (deptId == 0) riskBitmap |= RISK_NO_DEPT;
        if (vendorId == 0) {
            riskBitmap |= RISK_NO_VENDOR;
        } else {
            uint8 vStatus = vendors[vendorId].status;
            if (vStatus == VENDOR_SUSPENDED) riskBitmap |= RISK_VENDOR_SUSPENDED;
            if (vStatus == VENDOR_UNCHECKED) riskBitmap |= RISK_VENDOR_UNCHECKED;
        }

        euint32 amount = FHE.asEuint32(encAmount);
        FHE.allowThis(amount);
        FHE.allowSender(amount);

        uint256 requestId = _requests.length;
        _requests.push();

        PaymentRequest storage req = _requests[requestId];
        req.employee   = msg.sender;
        req.packId     = packId;
        req.deptId     = deptId;
        req.vendorId   = vendorId;
        req.encAmount  = amount;
        req.memo       = memo;
        req.timestamp  = block.timestamp;
        req.riskBitmap = riskBitmap;

        employeeRequestIds[msg.sender].push(requestId);
        packTotalRequests[packId]++;

        _evaluatePolicy(requestId);

        // Department budget accumulation (runs after FHE evaluation so amount handle is set)
        if (deptId != 0 && _departments[deptId].budgetSet) {
            Department storage dept = _departments[deptId];
            euint32 newDeptUsed = FHE.add(dept.encUsedBudget, amount);
            FHE.allowThis(newDeptUsed);
            FHE.allow(newDeptUsed, admin);
            dept.encUsedBudget = newDeptUsed;
        }

        emit RequestSubmitted(requestId, msg.sender, packId, block.timestamp);
    }

    // =========================================================================
    // Employee: submit evidence
    // =========================================================================

    /**
     * @notice Attach a receipt/invoice evidence hash to a settled request.
     *         Only the request owner may submit evidence.
     *         hash should be keccak256 of the off-chain receipt bytes.
     */
    function submitEvidence(uint256 requestId, bytes32 hash) external {
        if (requestId >= _requests.length) revert RequestNotFound(requestId);
        PaymentRequest storage req = _requests[requestId];
        if (req.employee != msg.sender) revert NotRequestOwner(requestId);
        if (evidenceSubmitted[requestId]) revert EvidenceAlreadySubmitted(requestId);
        evidenceHash[requestId]      = hash;
        evidenceSubmitted[requestId] = true;
        emit EvidenceSubmitted(requestId, hash);
    }

    // =========================================================================
    // Admin: publish FHE result
    // =========================================================================

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
    // View helpers — packs
    // =========================================================================

    /**
     * @notice Returns all pack IDs in creation order.
     */
    function getPackIds() external view returns (uint8[] memory) {
        return _packIds;
    }

    /**
     * @notice Returns only active pack IDs.
     */
    function getActivePackIds() external view returns (uint8[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < _packIds.length; i++) {
            if (_packs[_packIds[i]].active) count++;
        }
        uint8[] memory result = new uint8[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < _packIds.length; i++) {
            if (_packs[_packIds[i]].active) result[idx++] = _packIds[i];
        }
        return result;
    }

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

    // =========================================================================
    // View helpers — departments
    // =========================================================================

    function getDeptIds() external view returns (uint8[] memory) {
        return deptIds;
    }

    function getDeptInfo(uint8 deptId)
        external
        view
        returns (string memory name, bool active, bool budgetSet, uint256 epochStart)
    {
        if (!deptExists[deptId]) revert DeptNotFound(deptId);
        Department storage d = _departments[deptId];
        return (d.name, d.active, d.budgetSet, d.epochStart);
    }

    function getDeptEncBudgetCap(uint8 deptId) external view returns (euint32) {
        return _departments[deptId].encBudgetCap;
    }

    function getDeptEncUsedBudget(uint8 deptId) external view returns (euint32) {
        return _departments[deptId].encUsedBudget;
    }

    // =========================================================================
    // View helpers — vendors
    // =========================================================================

    function getVendorInfo(uint16 vendorId)
        external
        view
        returns (string memory name, uint8 status)
    {
        if (!vendorExists[vendorId]) revert VendorNotFound(vendorId);
        return (vendors[vendorId].name, vendors[vendorId].status);
    }

    // =========================================================================
    // View helpers — requests
    // =========================================================================

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
            uint8   packId,
            uint8   deptId,
            uint16  vendorId,
            euint32 encAmount,
            euint8  encStatus,
            string memory memo,
            uint256 timestamp,
            bool    resultPublished,
            uint8   publicStatus,
            bool    inReview,
            bytes32 receiptHash,
            uint16  riskBitmap
        )
    {
        if (requestId >= _requests.length) revert RequestNotFound(requestId);
        PaymentRequest storage req = _requests[requestId];
        return (
            req.employee,
            req.packId,
            req.deptId,
            req.vendorId,
            req.encAmount,
            req.encStatus,
            req.memo,
            req.timestamp,
            req.resultPublished,
            req.publicStatus,
            req.inReview,
            req.receiptHash,
            req.riskBitmap
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
     * @dev Three-tier FHE policy evaluation.
     *      Tier 1 (Auto-Approved):  amount ≤ autoThreshold  AND  newBudget ≤ budgetLimit
     *      Tier 2 (NeedsReview):   amount ≤ hardLimit       AND  newBudget ≤ budgetLimit
     *      Tier 3 (AutoDenied):    amount > hardLimit        OR   newBudget > budgetLimit
     */
    function _evaluatePolicy(uint256 requestId) internal {
        PaymentRequest storage req  = _requests[requestId];
        PolicyPack storage pack     = _packs[req.packId];

        euint32 newUsed = FHE.add(pack.encUsedBudget, req.encAmount);
        FHE.allowThis(newUsed);

        ebool withinAutoThresh = FHE.lte(req.encAmount, pack.encAutoThreshold);
        ebool withinHardLimit  = FHE.lte(req.encAmount, pack.encHardLimit);
        ebool withinBudget     = FHE.lte(newUsed, pack.encBudgetLimit);

        ebool autoOk   = FHE.and(withinAutoThresh, withinBudget);
        ebool reviewOk = FHE.and(withinHardLimit,  withinBudget);

        euint8 statusAuto   = FHE.asEuint8(STATUS_AUTO_APPROVED);
        euint8 statusReview = FHE.asEuint8(STATUS_NEEDS_REVIEW);
        euint8 statusDenied = FHE.asEuint8(STATUS_AUTO_DENIED);

        euint8 result = FHE.select(autoOk, statusAuto, FHE.select(reviewOk, statusReview, statusDenied));

        req.encStatus = result;

        pack.encUsedBudget = newUsed;
        FHE.allowThis(pack.encUsedBudget);
        FHE.allow(pack.encUsedBudget, admin);

        FHE.allowThis(result);
        FHE.allow(result, admin);
        FHE.allowSender(result);
    }

    function _finaliseRequest(uint256 requestId, uint8 finalStatus) internal {
        PaymentRequest storage req = _requests[requestId];

        req.publicStatus    = finalStatus;
        req.resultPublished = true;

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

        bool isApproved = finalStatus == STATUS_AUTO_APPROVED || finalStatus == STATUS_ADMIN_APPROVED;
        bool isDenied   = finalStatus == STATUS_AUTO_DENIED   || finalStatus == STATUS_ADMIN_DENIED;

        if (isApproved) packApprovedCount[req.packId]++;
        if (isDenied)   packDeniedCount[req.packId]++;

        emit ResultPublished(requestId, finalStatus);
    }
}
