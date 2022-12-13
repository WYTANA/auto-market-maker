import { useEffect } from "react"
import { useDispatch } from "react-redux"
import { HashRouter, Routes, Route } from "react-router-dom"
import { Container } from "react-bootstrap"

// Components
import Navigation from "./Navigation"
import Tabs from "./Tabs"
import Swap from "./Swap"
import Deposit from "./Deposit"
import Withdraw from "./Withdraw"
import Charts from "./Charts"

// Interactions
import {
  loadProvider,
  loadNetwork,
  loadAccount,
  loadTokens,
  loadAMM,
} from "../store/interactions"

function App() {
  const dispatch = useDispatch()

  const loadBlockchainData = async () => {
    // Initiate provider
    const provider = await loadProvider(dispatch)

    // Fetch Chain Id
    const chainId = await loadNetwork(provider, dispatch)

    // Reload page when network changes
    window.ethereum.on("chainChanged", () => {
      window.location.reload()
    })

    // Fetch current account from Metamask when changed
    window.ethereum.on("accountsChanged", async () => {
      await loadAccount(dispatch)
    })

    // Initiate contracts
    await loadTokens(provider, chainId, dispatch)
    await loadAMM(provider, chainId, dispatch)
  }

  useEffect(() => {
    loadBlockchainData()
  }, [])

  return (
    <Container>
      <HashRouter>
        <Navigation />

        <hr />

        <Tabs />

        <Routes>
          <Route exact path="/" element={<Swap />} />
          <Route path="/deposit" element={<Deposit />} />
          <Route path="/withdraw" element={<Withdraw />} />
          <Route path="/charts" element={<Charts />} />
        </Routes>
      </HashRouter>
    </Container>
  )
}

export default App
