// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { FHE, euint32, euint8, ebool, InEuint32 } from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { IShieldCardPolicy } from "./interfaces/IShieldCardPolicy.sol";

contract ShieldCardPolicy is Ownable, IShieldCardPolicy {
    uint8 public constant STATUS_PENDING = 0;
    uint8 public constant STATUS_APPROVED = 1;
    uint8 public constant STATUS_DENIED = 2;

    error EmployeeAlreadyRegistered(address employee);
    error EmployeeNotRegistered(address employee);
    error InvalidEncryptedInput();
    error ResultAlreadyPublished(uint256 requestId);
    error PackAlreadyExists(uint8 packId);
    error PackNotFound(uint8 packId);
    error PackInactive(uint8 packId);
    error PackLimitNotSet(uint8 packId);

    address public admin;

    // --- Employee registry ---
    mapping(address => bool) public employeeRegistered;
    address[] public registeredEmployees;
    mapping(address => uint256[]) public employeeRequestIds;

    // --- Policy packs ---
    struct PolicyPack {
        string name;
        euint32 encLimit;
        bool active;
        bool limitSet;
    }

    mapping(uint8 => PolicyPack) internal _packs;
    mapping(uint8 => bool) public packExists;
    uint8 public packCount;

    // Plaintext counters — safe to expose publicly
    mapping(uint8 => uint256) public packTotalRequests;
    mapping(uint8 => uint256) public packApprovedCount;
    mapping(uint8 => uint256) public packDeniedCount;

    // --- Requests ---
    struct PaymentRequest {
        address employee;
        uint8 packId;
        euint32 encAmount;
        euint8 encStatus;
        string memo;
        uint256 timestamp;
        bool resultPublished;
        uint8 publicStatus;
    }

    PaymentRequest[] internal requests;

    constructor() Ownable(msg.sender) {
        admin = msg.sender;
    }

    // -------------------------------------------------------------------------
    // Employee management
    // -------------------------------------------------------------------------

    function registerEmployee(address employee) external onlyOwner {
        if (employeeRegistered[employee]) {
            revert EmployeeAlreadyRegistered(employee);
        }
        employeeRegistered[employee] = true;
        registeredEmployees.push(employee);
        emit EmployeeRegistered(employee);
    }

    // -------------------------------------------------------------------------
    // Policy pack management
    // -------------------------------------------------------------------------

    function createPack(uint8 packId, string calldata name) external onlyOwner {
        if (packExists[packId]) revert PackAlreadyExists(packId);
        _packs[packId].name = name;
        _packs[packId].active = true;
        packExists[packId] = true;
        packCount++;
        emit PackCreated(packId, name);
    }

    function setPackLimit(uint8 packId, InEuint32 calldata encLimit) external onlyOwner {
        if (!packExists[packId]) revert PackNotFound(packId);
        if (encLimit.ctHash == 0) revert InvalidEncryptedInput();

        euint32 limit = FHE.asEuint32(encLimit);
        _packs[packId].encLimit = limit;
        _packs[packId].limitSet = true;

        FHE.allowThis(limit);
        FHE.allow(limit, admin);

        emit PackLimitSet(packId);
    }

    function setPackActive(uint8 packId, bool active) external onlyOwner {
        if (!packExists[packId]) revert PackNotFound(packId);
        _packs[packId].active = active;
        emit PackActiveChanged(packId, active);
    }

    // -------------------------------------------------------------------------
    // Request submission
    // -------------------------------------------------------------------------

    function submitRequest(
        uint8 packId,
        InEuint32 calldata encAmount,
        string calldata memo
    ) external {
        if (!employeeRegistered[msg.sender]) revert EmployeeNotRegistered(msg.sender);
        if (!packExists[packId]) revert PackNotFound(packId);
        if (!_packs[packId].active) revert PackInactive(packId);
        if (!_packs[packId].limitSet) revert PackLimitNotSet(packId);
        if (encAmount.ctHash == 0) revert InvalidEncryptedInput();

        euint32 amount = FHE.asEuint32(encAmount);
        FHE.allowThis(amount);
        FHE.allowSender(amount);

        uint256 requestId = requests.length;
        requests.push();

        PaymentRequest storage request = requests[requestId];
        request.employee = msg.sender;
        request.packId = packId;
        request.encAmount = amount;
        request.memo = memo;
        request.timestamp = block.timestamp;

        employeeRequestIds[msg.sender].push(requestId);
        packTotalRequests[packId]++;

        _evaluatePolicy(requestId);

        emit RequestSubmitted(requestId, msg.sender, packId, block.timestamp);
    }

    // -------------------------------------------------------------------------
    // Publish flow
    // -------------------------------------------------------------------------

    function publishDecryptedResult(
        uint256 requestId,
        uint8 plainStatus,
        bytes calldata sig
    ) external onlyOwner {
        PaymentRequest storage request = requests[requestId];
        if (request.resultPublished) revert ResultAlreadyPublished(requestId);

        FHE.publishDecryptResult(request.encStatus, plainStatus, sig);
        request.publicStatus = plainStatus;
        request.resultPublished = true;

        if (plainStatus == STATUS_APPROVED) {
            packApprovedCount[request.packId]++;
        } else if (plainStatus == STATUS_DENIED) {
            packDeniedCount[request.packId]++;
        }

        emit ResultPublished(requestId, plainStatus);
    }

    // -------------------------------------------------------------------------
    // View helpers
    // -------------------------------------------------------------------------

    function getPackInfo(uint8 packId)
        external
        view
        returns (string memory name, bool active, bool limitSet)
    {
        if (!packExists[packId]) revert PackNotFound(packId);
        PolicyPack storage pack = _packs[packId];
        return (pack.name, pack.active, pack.limitSet);
    }

    function getPackSummary(uint8 packId)
        external
        view
        returns (uint256 total, uint256 approved, uint256 denied, uint256 pending)
    {
        if (!packExists[packId]) revert PackNotFound(packId);
        total = packTotalRequests[packId];
        approved = packApprovedCount[packId];
        denied = packDeniedCount[packId];
        pending = total - approved - denied;
    }

    function getEncryptedStatus(uint256 requestId) external view returns (euint8) {
        return requests[requestId].encStatus;
    }

    function getEncryptedAmount(uint256 requestId) external view returns (euint32) {
        return requests[requestId].encAmount;
    }

    function getRequest(uint256 requestId)
        external
        view
        returns (PaymentRequestView memory)
    {
        PaymentRequest storage stored = requests[requestId];
        return PaymentRequestView({
            employee: stored.employee,
            packId: stored.packId,
            encAmount: stored.encAmount,
            encStatus: stored.encStatus,
            memo: stored.memo,
            timestamp: stored.timestamp,
            resultPublished: stored.resultPublished,
            publicStatus: stored.publicStatus
        });
    }

    function getRequestCount() external view returns (uint256) {
        return requests.length;
    }

    function getEmployeeRequestIds(address employee)
        external
        view
        returns (uint256[] memory)
    {
        return employeeRequestIds[employee];
    }

    // -------------------------------------------------------------------------
    // Internal
    // -------------------------------------------------------------------------

    function _evaluatePolicy(uint256 requestId) internal {
        PaymentRequest storage request = requests[requestId];
        PolicyPack storage pack = _packs[request.packId];

        euint8 result = FHE.select(
            FHE.lte(request.encAmount, pack.encLimit),
            FHE.asEuint8(STATUS_APPROVED),
            FHE.asEuint8(STATUS_DENIED)
        );

        request.encStatus = result;

        FHE.allowThis(result);
        FHE.allow(result, admin);
        FHE.allowSender(result);
    }
}
