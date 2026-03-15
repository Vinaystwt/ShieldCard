// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/**
 * @title IShieldCardControlPlane
 * @notice Minimal read interface for the ShieldCardControlPlane core contract.
 *         The encrypted slots (encAmount, encStatus) are returned as bytes32
 *         placeholders here — settlement does not consume them.
 */
interface IShieldCardControlPlane {
    function admin() external view returns (address);

    function getRequest(uint256 requestId) external view returns (
        address employee,
        uint8   packId,
        uint8   deptId,
        uint16  vendorId,
        bytes32 encAmount,
        bytes32 encStatus,
        string memory memo,
        uint256 timestamp,
        bool    resultPublished,
        uint8   publicStatus,
        bool    inReview,
        bytes32 receiptHash,
        uint16  riskBitmap
    );

    function getRequestCount() external view returns (uint256);

    function evidenceHash(uint256) external view returns (bytes32);

    function evidenceSubmitted(uint256) external view returns (bool);
}
