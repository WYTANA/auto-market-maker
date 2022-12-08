const hre = require("hardhat")

async function main() {
  // Deploy tokens
  const Token = await hre.ethers.getContractFactory("Token")

  // Token 1
  let blackHills = await Token.deploy("Black Hills Token", "BHT", "1000000")
  await blackHills.deployed()

  console.log(`Black Hills Token deployed to: ${blackHills.address}\n`)

  //Token 2
  let fusd = await Token.deploy("fUSD Token", "fUSD", "1000000")
  await fusd.deployed()

  console.log(`fUSD Token deployed to: ${fusd.address}\n`)

  // Deploy AMM
  const AMM = await hre.ethers.getContractFactory("AMM")
  let amm = await AMM.deploy(blackHills.address, fusd.address)
  await amm.deployed()

  console.log(`AMM contract deployed to: ${amm.address}\n`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
