// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { euint32, euint8, InEuint32, InEuint8 } from "@fhenixprotocol/cofhe-contracts/FHE.sol";

interface IShieldCardPolicy {
    struct PaymentRequestView {
        address employee;
        euint32 encAmount;
        euint8 encCategory;
        euint8 encStatus;
        string memo;
        uint256 timestamp;
        bool resultPublished;
        uint8 publicStatus;
    }

    event EmployeeRegistered(address indexed employee);
    event LimitSet(address indexed employee);
    event RequestSubmitted(uint256 indexed requestId, address indexed employee, uint256 timestamp);
    event ResultPublished(uint256 indexed requestId, uint8 status);

    function admin() external view returns (address);
    function employeeRegistered(address employee) external view returns (bool);
    function registeredEmployees(uint256 index) external view returns (address);
    function employeeRequestIds(address employee, uint256 index) external view returns (uint256);

    function registerEmployee(address employee) external;
    function setEmployeeLimit(address employee, InEuint32 calldata encLimit) external;
    function submitRequest(InEuint32 calldata encAmount, InEuint8 calldata encCategory, string calldata memo) external;
    function publishDecryptedResult(uint256 requestId, uint8 plainStatus, bytes calldata sig) external;

    function getEncryptedStatus(uint256 requestId) external view returns (euint8);
    function getEncryptedAmount(uint256 requestId) external view returns (euint32);
    function getRequest(uint256 requestId) external view returns (PaymentRequestView memory request);
    function getRequestCount() external view returns (uint256);
    function getEmployeeRequestIds(address employee) external view returns (uint256[] memory);
}
