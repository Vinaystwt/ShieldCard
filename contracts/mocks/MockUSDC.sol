// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @notice Test-only ERC-20 with permissionless mint, used by ShieldCardSettlement
 *         for testnet settlement demonstrations.
 *
 * THIS IS NOT REAL USDC. THIS IS NOT REAL MONEY. ALL TRANSFERS ARE TESTNET ONLY.
 *
 * - Decimals: 6 (matches real USDC).
 * - mint(to, amount): permissionless on testnet to make demo flows easy.
 * - faucet(): convenience self-mint of 1_000 USDC for any caller.
 */
contract MockUSDC is ERC20 {
    uint8 private constant DECIMALS = 6;
    uint256 public constant FAUCET_AMOUNT = 1_000 * 10 ** DECIMALS;

    event Faucet(address indexed to, uint256 amount);

    constructor() ERC20("MockUSDC (testnet)", "mUSDC") {}

    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function faucet() external {
        _mint(msg.sender, FAUCET_AMOUNT);
        emit Faucet(msg.sender, FAUCET_AMOUNT);
    }
}
