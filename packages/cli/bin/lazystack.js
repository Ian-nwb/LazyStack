#!/usr/bin/env node
import { runCli } from '../dist/cli.js'

runCli().catch(error => {
  console.error('LazyStack CLI encountered an unexpected error:', error)
  process.exitCode = 1
})
