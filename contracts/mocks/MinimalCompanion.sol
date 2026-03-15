// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { FHE, euint32, ebool, InEuint32 } from "@fhenixprotocol/cofhe-contracts/FHE.sol";

interface IMinimalEncCore {
    function getEncValue() external view returns (euint32);
}

/**
 * @title MinimalCompanion
 * @notice Test-only probe. Reads MinimalEncCore.getEncValue() and runs
 *         FHE.lte against a fresh-encrypted threshold. Stores the resulting
 *         ebool handle and grants it to admin. Phase A1 probe.
 */
contract MinimalCompanion {
    IMinimalEncCore public immutable core;
    address public immutable admin;
    ebool public lastResult;

    event AttestationComputed(bool callerSucceeded);

    constructor(address coreAddr) {
        core = IMinimalEncCore(coreAddr);
        admin = msg.sender;
    }

    function attest(InEuint32 calldata thresholdInput) external {
        euint32 coreValue = core.getEncValue();
        euint32 threshold = FHE.asEuint32(thresholdInput);
        FHE.allowThis(threshold);

        // The critical call: FHE.lte on an externally retrieved encrypted handle.
        ebool result = FHE.lte(coreValue, threshold);
        FHE.allowThis(result);
        FHE.allow(result, admin);
        FHE.allowSender(result);
        lastResult = result;

        emit AttestationComputed(true);
    }
}
