import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { TECH_CATALOG } from './data/frameworks'
import './index.css'

const status = document.getElementById('splash-status')
if (status) status.textContent = `Loading ${TECH_CATALOG.length} frameworks…`

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// The startup screen (index.html) stays until the app has painted, and long enough for the
// mark to finish drawing; with reduced motion it leaves as soon as the app is ready.
const splash = document.getElementById('splash')
if (splash) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  const wait = reduce ? 0 : Math.max(0, 1600 - performance.now())
  requestAnimationFrame(() => setTimeout(() => {
    splash.classList.add('done')
    setTimeout(() => splash.remove(), 500)
  }, wait))
}
