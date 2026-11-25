import { HostingType } from '../types'

/** Files LazyStack already generates that apply to a hosting type. The planner never adds deploy files. */
export type GeneratedFileKind =
  | 'compose'
  | 'dev-orchestrator'
  | 'env'
  | 'dockerfiles'
  | 'fly'
  | 'render'
  | 'terraform-containers'
  | 'terraform-paas'
  | 'k8s'
  | 'helm'
  | 'proxy'
  | 'deploy-ssh'
  | 'cloud-clients'

export interface HostingOption {
  id: HostingType
  label: string
  summary: string
  goodFor: string[]
  watchOutFor: string[]
  /** Plain service names, no prices: prices and free tiers change too often. */
  examples: string[]
  upkeep: 'none' | 'low' | 'medium' | 'high'
  generatedFiles: GeneratedFileKind[]
}

/** `local` first (the default), then the ten deploy targets from least to most server work. */
export const HOSTING_OPTIONS: HostingOption[] = [
  {
    id: 'local',
    label: 'Local only',
    summary: 'Runs on your machine with the generated dev orchestrator and Compose files; not deployed',
    goodFor: ['Development', 'Demos', 'Personal and LAN-only tools'],
    watchOutFor: ['Not reachable from the internet', 'Stops when your machine does'],
    examples: ['Docker Compose', 'lazystack dev'],
    upkeep: 'none',
    generatedFiles: ['dev-orchestrator', 'compose', 'env']
  },
  {
    id: 'static',
    label: 'Static / CDN',
    summary: 'Built files served from a global CDN, no server',
    goodFor: ['SPAs', 'Docs', 'Marketing sites', 'Static Astro/SvelteKit/Vite builds'],
    watchOutFor: ["Can't run server code; APIs live elsewhere"],
    examples: ['Cloudflare Pages', 'Netlify', 'GitHub Pages', 'S3 + CloudFront'],
    upkeep: 'none',
    generatedFiles: []
  },
  {
    id: 'serverless',
    label: 'Serverless',
    summary: 'Functions per request, scale to zero',
    goodFor: ['SSR apps', 'Light APIs', 'Webhooks', 'Spiky or low traffic'],
    watchOutFor: ['Cold starts', 'Time limits', 'No long-lived connections', 'Usage-based bills'],
    examples: ['Cloudflare Workers', 'Vercel', 'Netlify Functions', 'AWS Lambda', 'Google Cloud Functions', 'Azure Functions'],
    upkeep: 'none',
    generatedFiles: []
  },
  {
    id: 'baas',
    label: 'BaaS',
    summary: 'A hosted backend (auth, database, storage, functions) you call from the client',
    goodFor: ['Apps whose backend is mostly CRUD + auth', 'Mobile and frontend-only teams'],
    watchOutFor: ["Lock-in to the provider's APIs", 'Custom logic squeezed into their functions'],
    examples: ['Supabase', 'Firebase', 'Appwrite Cloud', 'PocketBase (hosted)', 'Convex'],
    upkeep: 'none',
    generatedFiles: ['cloud-clients', 'env']
  },
  {
    id: 'paas',
    label: 'PaaS',
    summary: 'Push code or a Dockerfile; the platform runs and scales it',
    goodFor: ['Full-stack apps', 'APIs with a database', 'Getting started fast'],
    watchOutFor: ['Always-on services bill when idle', 'Managed databases cost extra'],
    examples: ['Railway', 'Render', 'Fly.io', 'Heroku', 'DigitalOcean App Platform', 'Koyeb'],
    upkeep: 'low',
    generatedFiles: ['fly', 'render', 'terraform-paas', 'dockerfiles']
  },
  {
    id: 'self-hosted-paas',
    label: 'Self-hosted PaaS',
    summary: 'PaaS-style git-push deploys running on your own server',
    goodFor: ['Heroku-like workflow at VPS prices', 'Many small apps on one box'],
    watchOutFor: ['You still own the server underneath'],
    examples: ['Coolify', 'Dokku', 'CapRover', 'Kamal'],
    upkeep: 'medium',
    generatedFiles: ['compose', 'dockerfiles']
  },
  {
    id: 'containers',
    label: 'Managed containers',
    summary: 'Your Docker image on a managed runtime, no cluster to run',
    goodFor: ['Docker apps', 'Polyglot stacks', 'Scale-to-zero containers'],
    watchOutFor: ['More config than a PaaS'],
    examples: ['Google Cloud Run', 'AWS App Runner', 'AWS ECS Fargate', 'Azure Container Apps'],
    upkeep: 'low',
    generatedFiles: ['dockerfiles', 'terraform-containers']
  },
  {
    id: 'kubernetes',
    label: 'Kubernetes',
    summary: 'Managed cluster running your containers',
    goodFor: ['Many services', 'Autoscaling', 'Teams already on K8s'],
    watchOutFor: ['Steep learning curve', 'Cluster cost even when idle'],
    examples: ['GKE', 'EKS', 'AKS', 'DigitalOcean Kubernetes', 'Linode LKE'],
    upkeep: 'high',
    generatedFiles: ['k8s', 'helm', 'dockerfiles']
  },
  {
    id: 'cloud-vm',
    label: 'Cloud VM',
    summary: 'A virtual machine from a hyperscaler, inside its network and IAM',
    goodFor: ['Workloads that need the rest of AWS/GCP/Azure (private networking, managed DBs, IAM)', 'Compliance', 'Reserved/spot pricing'],
    watchOutFor: ['Pricier than a VPS for the same size', 'Egress and extras billed separately', 'You manage the OS'],
    examples: ['AWS EC2', 'Google Compute Engine', 'Azure Virtual Machines', 'Oracle Cloud'],
    upkeep: 'high',
    generatedFiles: ['compose', 'deploy-ssh', 'proxy']
  },
  {
    id: 'vps',
    label: 'VPS',
    summary: 'A simple virtual server at a flat monthly price',
    goodFor: ['Lowest steady cost', 'Full control', 'Whole stack + DB on one box via Compose'],
    watchOutFor: ['You handle updates, backups, TLS, monitoring'],
    examples: ['Hetzner', 'DigitalOcean Droplets', 'Linode', 'Vultr', 'AWS Lightsail'],
    upkeep: 'high',
    generatedFiles: ['compose', 'proxy', 'deploy-ssh']
  },
  {
    id: 'bare-metal',
    label: 'Bare metal',
    summary: 'A dedicated physical server (rented or your own/on-prem)',
    goodFor: ['Heavy steady load', 'GPUs', 'Data that must stay on your hardware'],
    watchOutFor: ['Hardware failures', 'No instant scaling', 'Most upkeep of all'],
    examples: ['Hetzner dedicated', 'OVHcloud', 'Latitude.sh', 'Your own homelab or on-prem servers'],
    upkeep: 'high',
    generatedFiles: ['compose', 'proxy']
  }
]

export const HOSTING_TYPES: HostingType[] = HOSTING_OPTIONS.map(option => option.id)

/** The type used when an app has no `hosting` in its blueprint. */
export const DEFAULT_HOSTING: HostingType = 'local'

export function isHostingType(value: unknown): value is HostingType {
  return typeof value === 'string' && (HOSTING_TYPES as string[]).includes(value)
}

export function getHostingOption(type: HostingType): HostingOption {
  return HOSTING_OPTIONS.find(option => option.id === type)!
}

export const VPS_VS_CLOUD_VM_NOTE =
  'A VPS is a flat-priced box from a simple host; a cloud VM lives inside AWS/GCP/Azure with their networking, IAM and managed services, and bills per resource.'

export const BEFORE_YOU_PICK: string[] = [
  'Free tiers can be personal-use only, or go offline when credits run out.',
  'Usage billing can overshoot: set spending alerts or caps.',
  'Databases are usually a separate bill.',
  'Cloud VMs and hyperscaler services charge for egress (data leaving their network).',
  'PaaS, serverless and BaaS manage the servers for you; VPS, cloud VM and bare metal are yours to maintain.',
  "Prices change, so check the provider's pricing page."
]

export const HOSTING_CREDIT = {
  text: "Based on Flavio Copes's Where to host your app",
  url: 'https://flaviocopes.com/where-to-host/'
}
