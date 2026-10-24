#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distCli = path.join(__dirname, '../dist-cli/cli.js')
const srcCli = path.join(__dirname, '../src/cli/index.ts')

if (fs.existsSync(distCli)) {
  const { runCli } = await import('../dist-cli/cli.js')
  runCli().catch(err => {
    console.error('LazyStack CLI encountered an unexpected error:', err)
    process.exit(1)
  })
} else {
  const tsx = spawn('npx', ['tsx', srcCli, ...process.argv.slice(2)], { stdio: 'inherit' })
  tsx.on('exit', (code) => process.exit(code || 0))
}
