import type { Category, Network } from '@/shared/api/contracts'

export const ARTWORKS = [
  { file: 'ape-varsity', alt: 'Macaco de óculos escuros com jaqueta college verde sobre fundo bege' },
  { file: 'ape-bucket', alt: 'Macaco de chapéu bucket verde e moletom roxo sobre fundo creme' },
  { file: 'ape-noir', alt: 'Macaco de pelagem escura com blazer claro sobre fundo verde-água' },
  { file: 'ape-headphones', alt: 'Macaco ruivo de fones de ouvido verdes sobre fundo menta' },
] as const

export const CATEGORY_LABELS: Record<Category, string> = {
  'arte-digital': 'Arte digital',
  fotografia: 'Fotografia',
  musica: 'Música',
  'arte-3d': 'Arte 3D',
  colecionaveis: 'Colecionáveis',
  generativa: 'Generativa',
  jogos: 'Jogos',
  assinaturas: 'Assinaturas',
  utilidade: 'Utilidade',
}

export const NETWORK_LABELS: Record<Network, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

export const CATEGORY_ORDER: readonly Category[] = [
  'arte-digital',
  'fotografia',
  'musica',
  'arte-3d',
  'colecionaveis',
  'generativa',
  'jogos',
  'assinaturas',
  'utilidade',
]

export const NETWORK_ORDER: readonly Network[] = ['ethereum', 'polygon', 'solana']

/** Name fragments used to build recognisable, stable NFT titles. */
export const NAME_PREFIXES = [
  'Emerald',
  'Sage',
  'Neon',
  'Cosmic',
  'Violet',
  'Ivory',
  'Golden',
  'Midnight',
  'Solar',
  'Crimson',
  'Obsidian',
  'Copper',
] as const

export const NAME_SUFFIXES = [
  'Ape',
  'Nomad',
  'Vessel',
  'Bloom',
  'Baron',
  'Beat',
  'Signal',
  'Oracle',
  'Drifter',
  'Relic',
] as const

export const CREATORS = [
  { id: 'cr-01', name: 'Studio Cunhagem', handle: 'cunhagem', verified: true },
  { id: 'cr-02', name: 'Marina Volpe', handle: 'mvolpe', verified: true },
  { id: 'cr-03', name: 'Kaio Ferraz', handle: 'kaioferraz', verified: false },
  { id: 'cr-04', name: 'Coletivo Bruma', handle: 'bruma', verified: true },
  { id: 'cr-05', name: 'Nara Aguiar', handle: 'naraaguiar', verified: false },
  { id: 'cr-06', name: 'Atelier Pixel', handle: 'atelierpixel', verified: true },
] as const

export const COLLECTIONS = [
  { id: 'col-01', name: 'Diário da Cunhagem' },
  { id: 'col-02', name: 'Gênesis Kurio' },
  { id: 'col-03', name: 'Bruma Noturna' },
  { id: 'col-04', name: 'Retratos de Sal' },
] as const

export const COUPONS: Array<{
  code: string
  label: string
  discountBasisPoints: number
  expiresAt: string | null
}> = [
  {
    code: 'KURIO10',
    label: '10% de desconto na primeira coleção',
    discountBasisPoints: 1000,
    expiresAt: null,
  },
  {
    code: 'GENESIS15',
    label: '15% em lançamentos gênesis',
    discountBasisPoints: 1500,
    expiresAt: '2027-01-31T23:59:59.000Z',
  },
  {
    code: 'EXPIRADO',
    label: 'Campanha encerrada',
    discountBasisPoints: 2000,
    expiresAt: '2025-01-01T00:00:00.000Z',
  },
]

/** Per-network fee applied to the order total. */
export const NETWORK_FEES: Record<Network, string> = {
  ethereum: '0.0042',
  polygon: '0.0008',
  solana: '0.0003',
}

export const EXPLORER_BASE: Record<Network, string> = {
  ethereum: 'https://etherscan.io/tx/',
  polygon: 'https://polygonscan.com/tx/',
  solana: 'https://solscan.io/tx/',
}
