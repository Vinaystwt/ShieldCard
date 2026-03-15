// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { FHE, euint32, ebool, InEuint32 } from "@fhenixprotocol/cofhe-contracts/FHE.sol";

/**
 * @title MinimalEncCore
 * @notice Test-only probe contract. Stores one encrypted uint32 and exposes:
 *           - getEncValue() view returning the handle
 *           - grantTo(addr) to extend FHE.allow to an arbitrary address
 *         Used to validate Phase A1: can a companion contract perform
 *         FHE.lte on an externally retrieved encrypted handle?
 */
contract MinimalEncCore {
    euint32 public encValue;

    function setEncValue(InEuint32 calldata input) external {
        encValue = FHE.asEuint32(input);
        FHE.allowThis(encValue);
        FHE.allowSender(encValue);
    }

    function getEncValue() external view returns (euint32) {
        return encValue;
    }

    function grantTo(address who) external {
        FHE.allow(encValue, who);
    }
}
