// Runs a browser-targeted bundle in a context that has no `process`, `require` or Buffer, like the renderer.
import vm from 'node:vm'
import fs from 'node:fs'

const context = vm.createContext({ console })
vm.runInContext(fs.readFileSync(process.argv[2], 'utf8'), context)
console.log(context.RESULT)
if (!String(context.RESULT).startsWith('OK')) process.exit(1)
