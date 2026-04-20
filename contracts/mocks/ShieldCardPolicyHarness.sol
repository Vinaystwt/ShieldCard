// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { euint32 } from "@fhenixprotocol/cofhe-contracts/FHE.sol";

import { ShieldCardPolicy } from "../ShieldCardPolicy.sol";

contract ShieldCardPolicyHarness is ShieldCardPolicy {
    function getEmployeeLimitHandle(address employee) external view returns (euint32) {
        return _employeeLimit[employee];
    }
}
