// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { euint32, euint8, InEuint32 } from "@fhenixprotocol/cofhe-contracts/FHE.sol";

interface IShieldCardPolicy {
    struct PaymentRequestView {
        address employee;
        uint8 packId;
        euint32 encAmount;
        euint8 encStatus;
        string memo;
        uint256 timestamp;
        bool resultPublished;
        uint8 publicStatus;
    }

    event EmployeeRegistered(address indexed employee);
    event PackCreated(uint8 indexed packId, string name);
    event PackLimitSet(uint8 indexed packId);
    event PackActiveChanged(uint8 indexed packId, bool active);
    event RequestSubmitted(uint256 indexed requestId, address indexed employee, uint8 packId, uint256 timestamp);
    event ResultPublished(uint256 indexed requestId, uint8 status);

    function admin() external view returns (address);
    function employeeRegistered(address employee) external view returns (bool);
    function registeredEmployees(uint256 index) external view returns (address);
    function employeeRequestIds(address employee, uint256 index) external view returns (uint256);
    function packExists(uint8 packId) external view returns (bool);
    function packCount() external view returns (uint8);
    function packTotalRequests(uint8 packId) external view returns (uint256);
    function packApprovedCount(uint8 packId) external view returns (uint256);
    function packDeniedCount(uint8 packId) external view returns (uint256);

    function registerEmployee(address employee) external;
    function createPack(uint8 packId, string calldata name) external;
    function setPackLimit(uint8 packId, InEuint32 calldata encLimit) external;
    function setPackActive(uint8 packId, bool active) external;
    function submitRequest(uint8 packId, InEuint32 calldata encAmount, string calldata memo) external;
    function publishDecryptedResult(uint256 requestId, uint8 plainStatus, bytes calldata sig) external;

    function getPackInfo(uint8 packId) external view returns (string memory name, bool active, bool limitSet);
    function getPackSummary(uint8 packId) external view returns (uint256 total, uint256 approved, uint256 denied, uint256 pending);
    function getEncryptedStatus(uint256 requestId) external view returns (euint8);
    function getEncryptedAmount(uint256 requestId) external view returns (euint32);
    function getRequest(uint256 requestId) external view returns (PaymentRequestView memory);
    function getRequestCount() external view returns (uint256);
    function getEmployeeRequestIds(address employee) external view returns (uint256[] memory);
}
