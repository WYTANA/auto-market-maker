const hre = require("hardhat")
const config = require("../src/config.json")

const tokens = (n) => {
  return hre.ethers.utils.parseUnits(n.toString(), "ether")
}

async function main() {
  // Fetch accounts
  console.log(`Fetching accounts and network \n`)
  const accounts = await hre.ethers.getSigners()
  const deployer = accounts[0]
  const investor1 = accounts[1]
  const investor2 = accounts[2]
  const investor3 = accounts[3]
  const investor4 = accounts[4]

  // Fetch network
  const { chainId } = await hre.ethers.provider.getNetwork()
  console.log(`Fetching token and transferring to accounts ... \n`)

  // Fetch BHT
  const blackHills = await hre.ethers.getContractAt(
    "Token",
    config[chainId].blackHills.address
  )
  console.log(`BHT fetched: ${blackHills.address}\n`)

  // Fetch fUSD
  const fusd = await hre.ethers.getContractAt(
    "Token",
    config[chainId].fusd.address
  )
  console.log(`fUSD fetched: ${fusd.address}\n`)

  ////////////////////////////////////////////////////////////
  // Deployer Distributes Tokens to Investors

  let transaction

  // Send BHT tokens to investor 1
  transaction = await blackHills
    .connect(deployer)
    .transfer(investor1.address, tokens(10))
  await transaction.wait()

  // Send fUSD tokens to investor 2
  transaction = await fusd
    .connect(deployer)
    .transfer(investor2.address, tokens(10))
  await transaction.wait()

  // Send BHT tokens to investor 3
  transaction = await blackHills
    .connect(deployer)
    .transfer(investor3.address, tokens(10))
  await transaction.wait()

  // Send fUSD tokens to investor 4
  transaction = await fusd
    .connect(deployer)
    .transfer(investor4.address, tokens(10))
  await transaction.wait()

  //////////////////////////////////////////////////////////
  // Add liquidity to AMM contract

  let amount = tokens(100)

  console.log(`Fetching AMM ... \n`)

  // Fetch AMM and approvals
  const amm = await hre.ethers.getContractAt("AMM", config[chainId].amm.address)
  console.log(`AMM fetched: ${amm.address}\n`)

  transaction = await blackHills.connect(deployer).approve(amm.address, amount)
  await transaction.wait()

  transaction = await fusd.connect(deployer).approve(amm.address, amount)
  await transaction.wait()

  // Deployer adds liquidity
  console.log(`Adding liquidity ...\n`)
  transaction = await amm.connect(deployer).addLiquidity(amount, amount)
  await transaction.wait()

  ////////////////////////////////////////////////////////////
  // Investor1 Swaps: BHT --> fUSD

  console.log(`Investor 1 swaps ...\n`)

  // Investor approves all tokens
  transaction = await blackHills
    .connect(investor1)
    .approve(amm.address, tokens(10))
  await transaction.wait()

  // Investor swaps 1 token
  transaction = await amm.connect(investor1).swapToken1(tokens(1))
  await transaction.wait()

  ////////////////////////////////////////////////////////////
  // Investor2 Swaps: fUSD --> BHT

  console.log(`Investor 2 swaps ...\n`)

  // Investor approves all tokens
  transaction = await fusd.connect(investor2).approve(amm.address, tokens(10))
  await transaction.wait()

  // Investor swaps 1 token
  transaction = await amm.connect(investor2).swapToken2(tokens(1))
  await transaction.wait()

  ////////////////////////////////////////////////////////////
  // Investor3 Swaps: BHT --> fUSD

  console.log(`Investor 3 swaps ...\n`)

  // Investor approves all tokens
  transaction = await blackHills
    .connect(investor3)
    .approve(amm.address, tokens(10))
  await transaction.wait()

  // Investor swaps 10 tokens
  transaction = await amm.connect(investor3).swapToken1(tokens(10))
  await transaction.wait()

  ////////////////////////////////////////////////////////////
  // Investor4 Swaps: fUSD --> BHT

  console.log(`Investor 4 swaps ...\n`)

  // Investor approves all tokens
  transaction = await fusd.connect(investor4).approve(amm.address, tokens(10))
  await transaction.wait()

  // Investor swaps 5 token
  transaction = await amm.connect(investor4).swapToken2(tokens(5))
  await transaction.wait()

  console.log(`Finished!\n`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
