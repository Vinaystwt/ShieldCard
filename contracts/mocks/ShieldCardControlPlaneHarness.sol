// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { euint32, euint8 } from "@fhenixprotocol/cofhe-contracts/FHE.sol";

import { ShieldCardControlPlane } from "../ShieldCardControlPlane.sol";

/**
 * @dev Test harness that exposes internal encrypted pack and department handles
 *      for unit-test decryption assertions.
 */
contract ShieldCardControlPlaneHarness is ShieldCardControlPlane {
    // Pack internals
    function getPackEncHardLimit(uint8 packId) external view returns (euint32) {
        return _packs[packId].encHardLimit;
    }

    function getPackEncAutoThreshold(uint8 packId) external view returns (euint32) {
        return _packs[packId].encAutoThreshold;
    }

    function getPackEncBudgetLimit(uint8 packId) external view returns (euint32) {
        return _packs[packId].encBudgetLimit;
    }

    function getPackEncUsedBudget(uint8 packId) external view returns (euint32) {
        return _packs[packId].encUsedBudget;
    }

    // Department internals
    function getDeptEncBudgetCapInternal(uint8 deptId) external view returns (euint32) {
        return _departments[deptId].encBudgetCap;
    }

    function getDeptEncUsedBudgetInternal(uint8 deptId) external view returns (euint32) {
        return _departments[deptId].encUsedBudget;
    }

    // Request internals (for testing extended fields)
    function getRequestRiskBitmap(uint256 requestId) external view returns (uint16) {
        return _requests[requestId].riskBitmap;
    }

    function getRequestDeptId(uint256 requestId) external view returns (uint8) {
        return _requests[requestId].deptId;
    }

    function getRequestVendorId(uint256 requestId) external view returns (uint16) {
        return _requests[requestId].vendorId;
    }
}
