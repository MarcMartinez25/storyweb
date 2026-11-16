import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@xyflow/react/dist/style.css'
import './index.css'
import App from './App.tsx'
import { LibraryProvider } from './store/LibraryProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LibraryProvider>
      <App />
    </LibraryProvider>
  </StrictMode>,
)
