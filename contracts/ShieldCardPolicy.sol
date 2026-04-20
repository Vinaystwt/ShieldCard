// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { FHE, euint32, euint8, ebool, InEuint32, InEuint8 } from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { IShieldCardPolicy } from "./interfaces/IShieldCardPolicy.sol";

contract ShieldCardPolicy is Ownable, IShieldCardPolicy {
    uint8 public constant STATUS_PENDING = 0;
    uint8 public constant STATUS_APPROVED = 1;
    uint8 public constant STATUS_DENIED = 2;
    uint8 public constant APPROVED_CATEGORY = 1;

    error EmployeeAlreadyRegistered(address employee);
    error EmployeeNotRegistered(address employee);
    error InvalidEncryptedInput();
    error ResultAlreadyPublished(uint256 requestId);
    error NotImplemented();

    address public admin;

    mapping(address => euint32) internal _employeeLimit;
    mapping(address => bool) public employeeRegistered;
    address[] public registeredEmployees;

    struct PaymentRequest {
        address employee;
        euint32 encAmount;
        euint8 encCategory;
        euint8 encStatus;
        string memo;
        uint256 timestamp;
        bool resultPublished;
        uint8 publicStatus;
    }

    PaymentRequest[] internal requests;
    mapping(address => uint256[]) public employeeRequestIds;

    constructor() Ownable(msg.sender) {
        admin = msg.sender;
    }

    function registerEmployee(address employee) external onlyOwner {
        if (employeeRegistered[employee]) {
            revert EmployeeAlreadyRegistered(employee);
        }

        employeeRegistered[employee] = true;
        registeredEmployees.push(employee);

        emit EmployeeRegistered(employee);
    }

    function setEmployeeLimit(address employee, InEuint32 calldata encLimit) external onlyOwner {
        if (!employeeRegistered[employee]) {
            revert EmployeeNotRegistered(employee);
        }
        if (encLimit.ctHash == 0) {
            revert InvalidEncryptedInput();
        }

        euint32 limit = FHE.asEuint32(encLimit);
        _employeeLimit[employee] = limit;

        FHE.allowThis(limit);
        FHE.allow(limit, admin);

        emit LimitSet(employee);
    }

    function submitRequest(
        InEuint32 calldata encAmount,
        InEuint8 calldata encCategory,
        string calldata memo
    ) external {
        if (!employeeRegistered[msg.sender]) {
            revert EmployeeNotRegistered(msg.sender);
        }
        if (encAmount.ctHash == 0 || encCategory.ctHash == 0) {
            revert InvalidEncryptedInput();
        }

        euint32 amount = FHE.asEuint32(encAmount);
        euint8 category = FHE.asEuint8(encCategory);

        FHE.allowThis(amount);
        FHE.allowSender(amount);
        FHE.allowThis(category);
        FHE.allowSender(category);

        uint256 requestId = requests.length;
        requests.push();

        PaymentRequest storage request = requests[requestId];
        request.employee = msg.sender;
        request.encAmount = amount;
        request.encCategory = category;
        request.memo = memo;
        request.timestamp = block.timestamp;

        employeeRequestIds[msg.sender].push(requestId);
        _evaluatePolicy(requestId);

        emit RequestSubmitted(requestId, msg.sender, block.timestamp);
    }

    function publishDecryptedResult(uint256 requestId, uint8 plainStatus, bytes calldata sig) external onlyOwner {
        PaymentRequest storage request = requests[requestId];
        if (request.resultPublished) {
            revert ResultAlreadyPublished(requestId);
        }

        FHE.publishDecryptResult(request.encStatus, plainStatus, sig);
        request.publicStatus = plainStatus;
        request.resultPublished = true;

        emit ResultPublished(requestId, plainStatus);
    }

    function getEncryptedStatus(uint256 requestId) external view returns (euint8) {
        return requests[requestId].encStatus;
    }

    function getEncryptedAmount(uint256 requestId) external view returns (euint32) {
        return requests[requestId].encAmount;
    }

    function getRequest(uint256 requestId) external view returns (PaymentRequestView memory request) {
        PaymentRequest storage stored = requests[requestId];
        return PaymentRequestView({
            employee: stored.employee,
            encAmount: stored.encAmount,
            encCategory: stored.encCategory,
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

    function getEmployeeRequestIds(address employee) external view returns (uint256[] memory) {
        return employeeRequestIds[employee];
    }

    function _evaluatePolicy(uint256 requestId) internal returns (ebool policyPass, euint8 result) {
        PaymentRequest storage request = requests[requestId];

        policyPass = FHE.and(
            FHE.lte(request.encAmount, _employeeLimit[request.employee]),
            FHE.eq(request.encCategory, FHE.asEuint8(APPROVED_CATEGORY))
        );

        result = FHE.select(
            policyPass,
            FHE.asEuint8(STATUS_APPROVED),
            FHE.asEuint8(STATUS_DENIED)
        );

        request.encStatus = result;

        FHE.allowThis(result);
        FHE.allow(result, admin);
        FHE.allowSender(result);
    }
}
