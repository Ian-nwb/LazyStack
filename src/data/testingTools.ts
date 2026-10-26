export type TestingToolCategory = 'unit' | 'api' | 'e2e' | 'visual' | 'performance' | 'contract' | 'security'
export type TestingEcosystem = 'npm' | 'python' | 'go' | 'rust' | 'jvm' | 'dotnet' | 'php' | 'builtin' | 'cli'

export interface TestingToolOption {
  id: string
  name: string
  category: TestingToolCategory
  ecosystem: TestingEcosystem
  description: string
  installPackages?: string[]
  scriptName?: string
  scriptCommand?: string
  roles: Array<'frontend' | 'backend' | 'fullstack' | 'worker' | 'desktop-mobile' | 'other'>
  techIds?: string[]
  devDependencies?: boolean
}

const web = ['frontend', 'fullstack'] as TestingToolOption['roles']
const services = ['backend', 'worker', 'fullstack'] as TestingToolOption['roles']
const any = ['frontend', 'backend', 'fullstack', 'worker', 'desktop-mobile', 'other'] as TestingToolOption['roles']

export const TESTING_TOOLS: TestingToolOption[] = [
  { id: 'jest', name: 'Jest', category: 'unit', ecosystem: 'npm', description: 'JavaScript and TypeScript unit tests.', installPackages: ['jest'], scriptName: 'test', scriptCommand: 'jest', roles: any, devDependencies: true },
  { id: 'vitest', name: 'Vitest', category: 'unit', ecosystem: 'npm', description: 'Fast unit tests with Vite configuration reuse.', installPackages: ['vitest'], scriptName: 'test', scriptCommand: 'vitest run', roles: web, devDependencies: true },
  { id: 'mocha', name: 'Mocha', category: 'unit', ecosystem: 'npm', description: 'Flexible JavaScript test runner.', installPackages: ['mocha'], scriptName: 'test', scriptCommand: 'mocha', roles: any, devDependencies: true },
  { id: 'ava', name: 'AVA', category: 'unit', ecosystem: 'npm', description: 'Concurrent JavaScript test runner.', installPackages: ['ava'], scriptName: 'test', scriptCommand: 'ava', roles: any, devDependencies: true },
  { id: 'node-test', name: 'Node.js test runner', category: 'unit', ecosystem: 'builtin', description: 'Built-in node:test runner with no extra package.', scriptName: 'test', scriptCommand: 'node --test', roles: any },
  { id: 'testing-library', name: 'Testing Library', category: 'unit', ecosystem: 'npm', description: 'User-focused component testing utilities.', installPackages: ['@testing-library/react', '@testing-library/jest-dom', '@testing-library/user-event', 'jsdom'], roles: web, devDependencies: true },
  { id: 'supertest', name: 'Supertest', category: 'api', ecosystem: 'npm', description: 'HTTP assertions for Node.js app servers.', installPackages: ['supertest'], roles: services, devDependencies: true },
  { id: 'playwright', name: 'Playwright', category: 'e2e', ecosystem: 'npm', description: 'Cross-browser end-to-end and browser automation.', installPackages: ['@playwright/test'], scriptName: 'test:e2e', scriptCommand: 'playwright test', roles: web, devDependencies: true },
  { id: 'cypress', name: 'Cypress', category: 'e2e', ecosystem: 'npm', description: 'Browser end-to-end and component testing.', installPackages: ['cypress'], scriptName: 'test:e2e', scriptCommand: 'cypress run', roles: web, devDependencies: true },
  { id: 'webdriverio', name: 'WebdriverIO', category: 'e2e', ecosystem: 'npm', description: 'Extensible browser and mobile automation.', installPackages: ['@wdio/cli'], roles: web, devDependencies: true },
  { id: 'puppeteer', name: 'Puppeteer', category: 'e2e', ecosystem: 'npm', description: 'Chrome and Firefox browser automation.', installPackages: ['puppeteer'], roles: web, devDependencies: true },
  { id: 'newman', name: 'Newman (Postman CLI)', category: 'api', ecosystem: 'npm', description: 'Run Postman API collections from the command line.', installPackages: ['newman'], scriptName: 'test:api', scriptCommand: 'newman run tests/api.collection.json', roles: services, devDependencies: true },
  { id: 'bruno', name: 'Bruno CLI', category: 'api', ecosystem: 'npm', description: 'Git-friendly API collection runner.', installPackages: ['@usebruno/cli'], scriptName: 'test:api', scriptCommand: 'bru run tests/bruno', roles: services, devDependencies: true },
  { id: 'rest-assured', name: 'REST Assured', category: 'api', ecosystem: 'jvm', description: 'Java DSL for REST API integration tests.', roles: services },
  { id: 'schemathesis', name: 'Schemathesis', category: 'api', ecosystem: 'python', description: 'Property-based API testing from OpenAPI schemas.', roles: services },
  { id: 'pytest', name: 'pytest', category: 'unit', ecosystem: 'python', description: 'Python unit and integration test framework.', roles: any },
  { id: 'hypothesis', name: 'Hypothesis', category: 'unit', ecosystem: 'python', description: 'Property-based testing for Python.', roles: any },
  { id: 'go-test', name: 'Go test', category: 'unit', ecosystem: 'builtin', description: 'Go standard-library test runner.', scriptName: 'test', scriptCommand: 'go test ./...', roles: any },
  { id: 'testify', name: 'Testify', category: 'unit', ecosystem: 'go', description: 'Assertions and mocks for Go tests.', roles: any },
  { id: 'rust-test', name: 'Rust test harness', category: 'unit', ecosystem: 'builtin', description: 'Built-in Rust unit and integration tests.', scriptName: 'test', scriptCommand: 'cargo test', roles: any },
  { id: 'nextest', name: 'cargo-nextest', category: 'unit', ecosystem: 'rust', description: 'Next-generation Rust test runner.', roles: any },
  { id: 'junit', name: 'JUnit 5', category: 'unit', ecosystem: 'jvm', description: 'Standard Java and JVM test framework.', roles: any },
  { id: 'xunit', name: 'xUnit', category: 'unit', ecosystem: 'dotnet', description: '.NET unit testing framework.', roles: any },
  { id: 'phpunit', name: 'PHPUnit', category: 'unit', ecosystem: 'php', description: 'PHP unit testing framework.', roles: any },
  { id: 'pest', name: 'Pest', category: 'unit', ecosystem: 'php', description: 'Expressive PHP testing framework.', roles: any },
  { id: 'pact', name: 'Pact', category: 'contract', ecosystem: 'npm', description: 'Consumer-driven contract testing.', installPackages: ['@pact-foundation/pact'], roles: services, devDependencies: true },
  { id: 'k6', name: 'k6', category: 'performance', ecosystem: 'cli', description: 'Load and performance testing for APIs and websites.', roles: any },
  { id: 'locust', name: 'Locust', category: 'performance', ecosystem: 'python', description: 'Python-based load testing.', roles: services },
  { id: 'zap', name: 'OWASP ZAP baseline', category: 'security', ecosystem: 'cli', description: 'Baseline web application security scan.', roles: web },
  { id: 'storybook', name: 'Storybook', category: 'visual', ecosystem: 'npm', description: 'Build, document, and visually test UI components in isolation.', installPackages: ['storybook', '@storybook/react-vite', '@storybook/react'], scriptName: 'storybook', scriptCommand: 'storybook dev -p 6006', roles: ['frontend'], techIds: ['react-vite', 'react-mui'], devDependencies: true }
]

export const TESTING_CATEGORIES: Array<{ id: TestingToolCategory; label: string }> = [
  { id: 'unit', label: 'Unit & component' },
  { id: 'api', label: 'API & integration' },
  { id: 'e2e', label: 'Browser E2E' },
  { id: 'visual', label: 'Visual & component docs' },
  { id: 'performance', label: 'Performance' },
  { id: 'contract', label: 'Contract' },
  { id: 'security', label: 'Security' }
]
