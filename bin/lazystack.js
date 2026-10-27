#!/usr/bin/env node
import { runCli } from '../packages/cli/dist/cli.js'

runCli().catch(err => {
  console.error('LazyStack CLI encountered an unexpected error:', err)
  process.exitCode = 1
})
