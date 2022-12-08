const { expect } = require("chai")
const { ethers } = require("hardhat")

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), "ether")
}

const ether = tokens
const shares = ether

describe("AMM", () => {
  let accounts, deployer, liquidityProvider, investor1, investor2
  let token1, token2, amm

  beforeEach(async () => {
    // Setup accounts
    accounts = await ethers.getSigners()
    deployer = accounts[0]
    liquidityProvider = accounts[1]
    investor1 = accounts[2] // swaps token1 for token2
    investor2 = accounts[3] // swaps token2 for token1

    // Deploy tokens
    const Token = await ethers.getContractFactory("Token")
    token1 = await Token.deploy(" TLO AMM Token", "AMM", "1000000") // One million
    token2 = await Token.deploy("fUSD Token", "fUSD", "1000000") // One million

    // Send tokens to LP
    let transaction = await token1
      .connect(deployer)
      .transfer(liquidityProvider.address, tokens(100000))
    await transaction.wait()

    transaction = await token2
      .connect(deployer)
      .transfer(liquidityProvider.address, tokens(100000))
    await transaction.wait()

    // Send token1 to investor1
    transaction = await token1
      .connect(deployer)
      .transfer(investor1.address, tokens(100000))
    await transaction.wait()

    // Send token2 to investor2
    transaction = await token2
      .connect(deployer)
      .transfer(investor2.address, tokens(100000))
    await transaction.wait()

    // Deploy AMM
    const AMM = await ethers.getContractFactory("AMM")
    amm = await AMM.deploy(token1.address, token2.address)
  })

  describe("Deployment", () => {
    it("has an address", async () => {
      expect(amm.address).to.not.equal(0x0)
    })

    it("tracks token1 address", async () => {
      expect(await amm.token1()).to.equal(token1.address)
    })

    it("tracks token2 address", async () => {
      expect(await amm.token2()).to.equal(token2.address)
    })
  })

  describe("Token swaps", () => {
    let amount, transaction, result, balance, estimate

    it("have been facilitated", async () => {
      // Deployer approves 100k tokens
      amount = tokens(100000)
      transaction = await token1.connect(deployer).approve(amm.address, amount)
      await transaction.wait()

      transaction = await token2.connect(deployer).approve(amm.address, amount)
      await transaction.wait()

      // Deployer add liquidity
      transaction = await amm.connect(deployer).addLiquidity(amount, amount)
      await transaction.wait()

      // Check that AMM receives tokens
      expect(await token1.balanceOf(amm.address)).to.equal(amount)
      expect(await token2.balanceOf(amm.address)).to.equal(amount)

      expect(await amm.token1Balance()).to.equal(amount)
      expect(await amm.token2Balance()).to.equal(amount)
      expect(await amm.K()).to.be.greaterThan(amount)

      // Check deployer has 100 shares
      expect(await amm.shares(deployer.address)).to.equal(tokens(100))

      // Check pool has 100 total shares
      expect(await amm.totalShares()).to.equal(tokens(100))

      //////////////////////////////////////////////////
      // LP adds liquidity
      // LP approves 50k tokens
      amount = tokens(50000)
      transaction = await token1
        .connect(liquidityProvider)
        .approve(amm.address, amount)
      await transaction.wait()

      transaction = await token2
        .connect(liquidityProvider)
        .approve(amm.address, amount)
      await transaction.wait()

      // Calculate token2 deposit
      let token2Deposit = await amm.calculateToken2Deposit(amount)

      // LP add liquidity
      transaction = await amm
        .connect(liquidityProvider)
        .addLiquidity(amount, token2Deposit)
      await transaction.wait()

      // LP should have 50 shares
      expect(await amm.shares(liquidityProvider.address)).to.equal(tokens(50))

      // Verify deployer still has 100 shares
      expect(await amm.shares(deployer.address)).to.equal(tokens(100))

      // Verify pool shares outstanding are 150
      expect(await amm.totalShares()).to.equal(tokens(150))

      //////////////////////////////////////////////////
      // Investor1 Swaps

      // Check price before swap
      console.log(
        `\nTLO Price: ${
          (await amm.token2Balance()) / (await amm.token1Balance())
        }\n`
      )

      // Investor 1 approves all tokens
      transaction = await token1
        .connect(investor1)
        .approve(amm.address, tokens(100000))
      await transaction.wait()

      // Check investor1 token2 balance pre-swap
      balance = await token2.balanceOf(investor1.address)
      console.log(
        `\nInvestor1 token2 balance PRE-swap: ${ethers.utils.formatEther(
          balance
        )}\n`
      )

      // Estimate amount of tokens investor1 receives after swap - including slippage
      estimate = await amm.calculateToken1Swap(tokens(1))
      console.log(
        `Token2 amount Investor1 will receive post-swap: ${estimate}\n`
      )

      // Investor1 swaps (1) token1
      transaction = await amm.connect(investor1).swapToken1(tokens(1))
      await transaction.wait()

      // Check swap event
      await expect(transaction)
        .to.emit(amm, "Swap")
        .withArgs(
          investor1.address,
          token1.address,
          tokens(1),
          token2.address,
          estimate,
          await amm.token1Balance(),
          await amm.token2Balance(),
          (
            await ethers.provider.getBlock(
              await ethers.provider.getBlockNumber()
            )
          ).timestamp
        )

      // Check investor1 balance post-swap
      balance = await token2.balanceOf(investor1.address)
      console.log(
        `\nInvestor1 token2 balance POST-swap: ${ethers.utils.formatEther(
          balance
        )}\n`
      )
      expect(estimate).to.equal(balance)

      // Check that AMM balances are in sync
      expect(await token1.balanceOf(amm.address)).to.equal(
        await amm.token1Balance()
      )
      expect(await token2.balanceOf(amm.address)).to.equal(
        await amm.token2Balance()
      )

      // Check price after swap
      console.log(
        `\nTLO Price: ${
          (await amm.token2Balance()) / (await amm.token1Balance())
        }\n`
      )

      //////////////////////////////////////////////////
      // Investor1 Swaps Again

      // Check investor1 token2 balance pre-swap for second time
      balance = await token2.balanceOf(investor1.address)
      console.log(
        `\nInvestor1 token2 balance PRE-swap: ${ethers.utils.formatEther(
          balance
        )}\n`
      )

      // Estimate amount of tokens investor1 receives after swap - including slippage
      estimate = await amm.calculateToken1Swap(tokens(1))
      console.log(
        `Token2 amount Investor1 will receive post-swap: ${estimate}\n`
      )

      // Investor1 swaps (1) token1
      transaction = await amm.connect(investor1).swapToken1(tokens(1))
      await transaction.wait()

      // Check investor1 balance post-swap
      balance = await token2.balanceOf(investor1.address)
      console.log(
        `\nInvestor1 token2 balance POST-swap: ${ethers.utils.formatEther(
          balance
        )}\n`
      )

      // Check that AMM balances are in sync
      expect(await token1.balanceOf(amm.address)).to.equal(
        await amm.token1Balance()
      )
      expect(await token2.balanceOf(amm.address)).to.equal(
        await amm.token2Balance()
      )

      // Check price after swap
      console.log(
        `\nTLO Price: ${
          (await amm.token2Balance()) / (await amm.token1Balance())
        }\n`
      )

      //////////////////////////////////////////////////
      // Investor1 Swaps Large Amount

      // Check investor1 token2 balance pre-swap for second time
      balance = await token2.balanceOf(investor1.address)
      console.log(
        `\nInvestor1 token2 balance PRE-swap: ${ethers.utils.formatEther(
          balance
        )}\n`
      )

      // Estimate amount of tokens investor1 receives after swap - including slippage
      estimate = await amm.calculateToken1Swap(tokens(100))
      console.log(
        `Token2 amount Investor1 will receive post-swap: ${estimate}\n`
      )

      // Investor1 swaps (1) token1
      transaction = await amm.connect(investor1).swapToken1(tokens(100))
      await transaction.wait()

      // Check investor1 balance post-swap
      balance = await token2.balanceOf(investor1.address)
      console.log(
        `\nInvestor1 token2 balance POST-swap: ${ethers.utils.formatEther(
          balance
        )}\n`
      )

      // Check that AMM balances are in sync
      expect(await token1.balanceOf(amm.address)).to.equal(
        await amm.token1Balance()
      )
      expect(await token2.balanceOf(amm.address)).to.equal(
        await amm.token2Balance()
      )

      // Check price after swap
      console.log(
        `\nTLO Price: ${
          (await amm.token2Balance()) / (await amm.token1Balance())
        }\n`
      )

      //////////////////////////////////////////////////
      // Investor2 Swaps

      // Investor2 approves all tokens
      transaction = await token2
        .connect(investor2)
        .approve(amm.address, tokens(100000))
      await transaction.wait()

      // Check investor2 balance PRE-swap
      balance = await token1.balanceOf(investor2.address)
      console.log(
        `\nInvestor2 token1 balance PRE-swap: ${ethers.utils.formatEther(
          balance
        )}\n`
      )

      // Estimate amount of tokens investor2 receives after swapping token2 - including slippage
      estimate = await amm.calculateToken2Swap(tokens(1))
      console.log(
        `Token1 amount Investor2 will receive post-swap: ${estimate}\n`
      )

      // Investor2 swaps (1) token2
      transaction = await amm.connect(investor2).swapToken2(tokens(1))
      await transaction.wait()

      // Check swap event
      await expect(transaction)
        .to.emit(amm, "Swap")
        .withArgs(
          investor2.address,
          token2.address,
          tokens(1),
          token1.address,
          estimate,
          await amm.token1Balance(),
          await amm.token2Balance(),
          (
            await ethers.provider.getBlock(
              await ethers.provider.getBlockNumber()
            )
          ).timestamp
        )

      // Check investor2 balance post-swap
      balance = await token1.balanceOf(investor2.address)
      console.log(
        `\nInvestor2 token1 balance POST-swap: ${ethers.utils.formatEther(
          balance
        )}\n`
      )
      expect(estimate).to.equal(balance)

      // Check that AMM balances are in sync
      expect(await token1.balanceOf(amm.address)).to.equal(
        await amm.token1Balance()
      )
      expect(await token2.balanceOf(amm.address)).to.equal(
        await amm.token2Balance()
      )

      // Check price after swap
      console.log(
        `\nTLO Price: ${
          (await amm.token2Balance()) / (await amm.token1Balance())
        }\n`
      )

      //////////////////////////////////////////////////
      // Removing Liquidity

      // Check balances
      // Token (balance * pool share) /total pool shares
      console.log(
        `AMM Token1 Balance: ${ethers.utils.formatEther(
          await amm.token1Balance()
        )}\n`
      )
      console.log(
        `AMM Token2 Balance: ${ethers.utils.formatEther(
          await amm.token2Balance()
        )}\n`
      )

      // Check LP balance before removing tokens
      balance = await token1.balanceOf(liquidityProvider.address)
      console.log(
        `Liquidity Provider Token1 balance before removing funds: ${ethers.utils.formatEther(
          balance
        )}\n`
      )

      balance = await token2.balanceOf(liquidityProvider.address)
      console.log(
        `Liquidity Provider Token2 balance before removing funds: ${ethers.utils.formatEther(
          balance
        )}\n`
      )

      // LP removes tokens from AMM pool
      transaction = await amm
        .connect(liquidityProvider)
        .removeLiquidity(shares(50))
      await transaction.wait()

      // Check LP balance after removing funds
      balance = await token1.balanceOf(liquidityProvider.address)
      console.log(
        `Liquidity Provider Token1 balance after removing funds: ${ethers.utils.formatEther(
          balance
        )}\n`
      )

      balance = await token2.balanceOf(liquidityProvider.address)
      console.log(
        `Liquidity Provider Token2 balance after removing funds: ${ethers.utils.formatEther(
          balance
        )}\n`
      )

      // LP should have zero shares
      expect(await amm.shares(liquidityProvider.address)).to.equal(0)

      // Deployer should have 100 shares
      expect(await amm.shares(deployer.address)).to.equal(shares(100))

      // AMM Pool has 100 total shares
      expect(await amm.totalShares()).to.equal(shares(100))
    })
  })
})
