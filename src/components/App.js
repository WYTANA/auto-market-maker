import { useEffect, useState } from "react"
import { useDispatch } from "react-redux"
import { Container } from "react-bootstrap"
import { ethers } from "ethers"

// Components
import Navigation from "./Navigation"
import Loading from "./Loading"

// Interactions
import { loadProvider, loadNetwork, loadAccount } from "../store/interactions"
import { chain } from "lodash"

// ABIs: Import your contract ABIs here
// import TOKEN_ABI from '../abis/Token.json'

// Config: Import your network config here
// import config from '../config.json';

function App() {
  const dispatch = useDispatch()

  const loadBlockchainData = async () => {
    // Initiate provider
    const provider = loadProvider(dispatch)

    // Fetch Chain Id
    const chainId = await loadNetwork(provider, dispatch)

    // Fetch accounts
    await loadAccount(dispatch)
  }

  useEffect(() => {
    loadBlockchainData()
  }, [])

  return (
    <Container>
      <Navigation account={"0x0..."} />

      <h1 className="my-4 text-center">Black Hills Swapper</h1>

      <>
        <p className="text-center">
          <strong>Your Balance:</strong> 0 ETH
        </p>
        <p className="text-center">Edit App.js to add your code here.</p>
      </>
    </Container>
  )
}

export default App
