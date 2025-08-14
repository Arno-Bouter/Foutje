import './App.css'
import { VaultProvider, useVault } from './state/VaultContext'
import Unlock from './components/Unlock'
import VaultApp from './components/VaultApp'

function Inner() {
  const { isExistingVault, isUnlocked } = useVault()

  if (isExistingVault === null) {
    return <div style={{ padding: 24 }}>Bezig met laden…</div>
  }

  if (!isUnlocked) {
    return <Unlock />
  }

  return <VaultApp />
}

function App() {
  return (
    <VaultProvider>
      <Inner />
    </VaultProvider>
  )
}

export default App
