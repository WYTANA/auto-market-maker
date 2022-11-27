//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./Token.sol";

// Manage Pool
// Manage Deposits
// Facilitate Swaps
// Manage Withdrawals

contract AMM {
    Token public token1;
    Token public token2;

    uint256 public token1Balance;
    uint256 public token2Balance;
    uint256 public K;

    uint256 public totalShares;
    mapping(address => uint256) public shares;
    uint256 constant PRECISION = 10 ** 18;

    event Swap(
        address user,
        address tokenGive,
        uint256 tokenGiveAmount,
        address tokenGet,
        uint256 tokenGetAmount,
        uint256 token1Balance,
        uint256 token2Balance,
        uint256 timestamp
    );

    constructor(Token _token1, Token _token2) {
        token1 = _token1;
        token2 = _token2;
    }

    function addLiquidity(
        uint256 _token1Amount,
        uint256 _token2Amount
    ) external {
        // Deposit tokens
        require(
            token1.transferFrom(msg.sender, address(this), _token1Amount),
            "transfer of token1 failed"
        );
        require(
            token2.transferFrom(msg.sender, address(this), _token2Amount),
            "transfer of token2 failed"
        );

        // LP shares
        uint256 share;

        // Issue shares
        // First time LPs receive 100 shares
        if (totalShares == 0) {
            share = 100 * PRECISION;
        } else {
            uint256 share1 = (totalShares * _token1Amount) / token1Balance;
            uint256 share2 = (totalShares * _token2Amount) / token2Balance;
            require(
                (share1 / 1) * 10 ** 3 == (share2 / 1) * 10 ** 3,
                "must provide equal weights for pairs"
            );
            share = share1;
        }

        // Update shares
        totalShares += share;
        shares[msg.sender] += share;

        // Manage pool
        token1Balance += _token1Amount;
        token2Balance += _token2Amount;
        K = token1Balance * token2Balance;
    }

    // Determine how many token2 tokens must be deposited when depositing liquidity for token1
    function calculateToken2Deposit(
        uint256 _token1Amount
    ) public view returns (uint256 token2Amount) {
        token2Amount = (token2Balance * _token1Amount) / token1Balance;
    }

    // Determine how many token1 tokens must be deposited when depositing liquidity for token2
    function calculateToken1Deposit(
        uint256 _token2Amount
    ) public view returns (uint256 token1Amount) {
        token1Amount = (token1Balance * _token2Amount) / token2Balance;
    }

    // X * Y = K -> Y = K/(X + swap amount)
    // Return amount of token2 received when swapping token1
    function calculateToken1Swap(
        uint256 _token1Amount
    ) public view returns (uint256 token2Amount) {
        uint256 token1After = token1Balance + _token1Amount;
        uint256 token2After = K / token1After;
        token2Amount = token2Balance - token2After;

        // Pool !== zero
        if (token2Amount == token2Balance) {
            token2Amount--;
        }

        require(
            token2Amount < token2Balance,
            "swap cannot exceed pool balance"
        );
    }

    function swapToken1(
        uint256 _token1Amount
    ) external returns (uint256 token2Amount) {
        // Calculate token 2 amount
        token2Amount = calculateToken1Swap(_token1Amount);

        // Swap
        // 1) Transfer tokens out of user wallet to contract
        token1.transferFrom(msg.sender, address(this), _token1Amount);

        // 2) Update the token1 balance in the contract
        token1Balance += _token1Amount;

        // 3) Update the token2 balance in the contract
        token2Balance -= token2Amount;

        // 4) Transfer token2 tokens from contract to user wallet
        token2.transfer(msg.sender, token2Amount);

        // Emit event
        emit Swap(
            msg.sender,
            address(token1),
            _token1Amount,
            address(token2),
            token2Amount,
            token1Balance,
            token2Balance,
            block.timestamp
        );
    }
}
