// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { euint32, euint8 } from "@fhenixprotocol/cofhe-contracts/FHE.sol";

import { ShieldCardPolicyEngine } from "../ShieldCardPolicyEngine.sol";

/**
 * @dev Test harness that exposes internal encrypted pack handles for
 *      unit-test decryption assertions.
 */
contract ShieldCardPolicyEngineHarness is ShieldCardPolicyEngine {
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
}
