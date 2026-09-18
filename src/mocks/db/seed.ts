import type { Category, Edition, NftDetail, Network, Wallet } from '@/shared/api/contracts'
import { env } from '@/shared/config/env'
import { createRandom } from './random'
import type { MockDatabase, MockUser } from './types'
import {
  ARTWORKS,
  CATEGORY_ORDER,
  COLLECTIONS,
  COUPONS,
  CREATORS,
  NAME_PREFIXES,
  NAME_SUFFIXES,
  NETWORK_ORDER,
} from '../fixtures/catalog'

export const SCHEMA_VERSION = 1
const CATALOG_SIZE = 126
const BASE_DATE = Date.UTC(2026, 7, 12, 2, 25, 29)

/**
 * Two collectors with distinct carts, favourites, wallets and orders. They
 * exist so that the suite can prove data never leaks across a user switch.
 */
export const SEED_USERS: MockUser[] = [
  {
    id: 'usr-ana',
    name: 'Ana Ribeiro',
    displayName: 'Ana Ribeiro',
    username: 'anaribeiro',
    email: 'ana@kurio.test',
    password: 'kurio2026',
    avatarUrl: null,
    ensTld: '.eth',
    ensName: 'anaribeiro',
    walletLabel: 'Carteira principal',
    createdAt: new Date(BASE_DATE - 400 * 86400000).toISOString(),
  },
  {
    id: 'usr-bruno',
    name: 'Bruno Tavares',
    displayName: 'Bruno Tavares',
    username: 'btavares',
    email: 'bruno@kurio.test',
    password: 'kurio2026',
    avatarUrl: null,
    ensTld: '.eth',
    ensName: 'btavares',
    walletLabel: 'Cofre Coinbase',
    createdAt: new Date(BASE_DATE - 220 * 86400000).toISOString(),
  },
]

const SEED_WALLETS: Record<string, Wallet[]> = {
  'usr-ana': [
    {
      id: 'wal-ana-1',
      label: 'Carteira principal',
      displayName: 'Ana Ribeiro',
      profileName: 'Ana Ribeiro',
      network: 'ethereum',
      address: '0x8f2c41b3d5a76e90c1428b7fd3a51e60947ac2db',
      secondaryAddress: '',
      provider: 'metamask',
      referralCode: 'KURIO-ANA1',
      email: 'ana@kurio.test',
      ensTld: '.eth',
      ensName: 'anaribeiro',
      role: 'primary',
      connected: true,
      createdAt: new Date(BASE_DATE - 300 * 86400000).toISOString(),
    },
    {
      id: 'wal-ana-2',
      label: 'Reserva Polygon',
      displayName: 'Ana Ribeiro',
      profileName: 'Ana R.',
      network: 'polygon',
      address: '0x5d19a7cc0f38b4e2716d9a3f8c05be4471fd23aa',
      secondaryAddress: '',
      provider: 'walletconnect',
      referralCode: 'KURIO-ANA2',
      email: 'ana@kurio.test',
      ensTld: '.eth',
      ensName: 'anareserva',
      role: 'secondary',
      connected: false,
      createdAt: new Date(BASE_DATE - 120 * 86400000).toISOString(),
    },
  ],
  'usr-bruno': [
    {
      id: 'wal-bruno-1',
      label: 'Cofre Coinbase',
      displayName: 'Bruno Tavares',
      profileName: 'Bruno Tavares',
      network: 'ethereum',
      address: '0x1b7fe3c4aa0925d6f8341cb7205e9cf6843ad017',
      secondaryAddress: '',
      provider: 'coinbase',
      referralCode: 'KURIO-BRU1',
      email: 'bruno@kurio.test',
      ensTld: '.eth',
      ensName: 'btavares',
      role: 'primary',
      connected: true,
      createdAt: new Date(BASE_DATE - 190 * 86400000).toISOString(),
    },
  ],
}

function buildEditions(index: number, price: string, rng: ReturnType<typeof createRandom>): Edition[] {
  const kind = index % 5
  if (kind === 0) {
    return [
      {
        id: `ed-${index}-unique`,
        label: '1 de 1',
        supply: 1,
        available: rng.bool(0.75) ? 1 : 0,
        price,
        maxPerOrder: 1,
      },
    ]
  }

  const supply = [10, 25, 50, 100][kind - 1]!
  const soldOut = index % 17 === 0
  const scarce = index % 11 === 0
  const available = soldOut ? 0 : scarce ? 2 : rng.int(Math.ceil(supply * 0.2), supply)
  const openPrice = (Number(price) * 0.72).toFixed(2)

  return [
    {
      id: `ed-${index}-limited`,
      label: `Edição limitada · ${supply}`,
      supply,
      available,
      price,
      maxPerOrder: Math.min(5, Math.max(1, available || 1)),
    },
    {
      id: `ed-${index}-open`,
      label: 'Edição aberta',
      supply: supply * 4,
      available: index % 13 === 0 ? 0 : rng.int(12, supply * 4),
      price: openPrice,
      maxPerOrder: 10,
    },
  ]
}

function buildNfts(seed: number): NftDetail[] {
  const rng = createRandom(seed)
  const nfts: NftDetail[] = []

  for (let i = 0; i < CATALOG_SIZE; i += 1) {
    const artwork = ARTWORKS[i % ARTWORKS.length]!
    const creatorSeed = CREATORS[i % CREATORS.length]!
    const collection = COLLECTIONS[i % COLLECTIONS.length]!
    const category: Category = CATEGORY_ORDER[i % CATEGORY_ORDER.length]!
    const network: Network = NETWORK_ORDER[(i * 5 + Math.floor(i / 3)) % NETWORK_ORDER.length]!
    const prefix = NAME_PREFIXES[(i * 7) % NAME_PREFIXES.length]!
    const suffix = NAME_SUFFIXES[(i * 3) % NAME_SUFFIXES.length]!
    const token = String(100 + i * 7).padStart(3, '0')
    const name = `${prefix} ${suffix} #${token}`
    const slug = `${prefix}-${suffix}-${token}`.toLowerCase()
    const price = rng.eth(0.02, 12.3)
    const discounted = i % 6 === 0
    const editions = buildEditions(i, price, rng)
    const available = editions.reduce((sum, edition) => sum + edition.available, 0)

    nfts.push({
      id: `nft-${String(i + 1).padStart(3, '0')}`,
      slug,
      name,
      imageUrl: `${env.basePath}nft/${artwork.file}.webp`,
      imageAlt: `${name} — ${artwork.alt}`,
      price,
      compareAtPrice: discounted ? (Number(price) * 1.28).toFixed(2) : null,
      network,
      category,
      creator: {
        ...creatorSeed,
        avatarUrl: `${env.basePath}nft/${ARTWORKS[(i + 2) % ARTWORKS.length]!.file}.webp`,
      },
      collectionId: collection.id,
      collectionName: collection.name,
      available,
      favorited: false,
      rarity: i % 17 === 0 ? 'lendaria' : i % 5 === 0 ? 'rara' : 'comum',
      listedAt: new Date(BASE_DATE - i * 3.5 * 3600_000).toISOString(),
      trendingScore: Number((rng.next() * 100).toFixed(2)),
      version: 1,
      description:
        'Peça selecionada pela curadoria Kurio. A obra acompanha certificado on-chain, ' +
        'arquivo em alta resolução e acesso à comunidade do criador.',
      gallery: [
        { url: `${env.basePath}nft/${artwork.file}.webp`, alt: `${name} — ${artwork.alt}` },
        {
          url: `${env.basePath}nft/${ARTWORKS[(i + 1) % ARTWORKS.length]!.file}.webp`,
          alt: `${name} — variação de cor`,
        },
        {
          url: `${env.basePath}nft/${ARTWORKS[(i + 3) % ARTWORKS.length]!.file}.webp`,
          alt: `${name} — detalhe do traço`,
        },
      ],
      editions,
      contractAddress:
        `0x${(0x4a7b2c + i * 977).toString(16).padStart(6, '0')}f19d8e5c0a34b7126de9038af5cc21`.slice(0, 42),
      tokenId: token,
      royaltiesBasisPoints: 500 + (i % 4) * 250,
      rating: Number((3.6 + rng.next() * 1.4).toFixed(1)),
      reviewCount: rng.int(4, 240),
      attributes: [
        { trait: 'Fundo', value: ['Bege', 'Menta', 'Creme', 'Verde-água'][i % 4]! },
        { trait: 'Traço', value: ['Suave', 'Marcado', 'Texturizado'][i % 3]! },
        { trait: 'Raridade', value: i % 17 === 0 ? 'Lendária' : i % 5 === 0 ? 'Rara' : 'Comum' },
      ],
      updatedAt: new Date(BASE_DATE - i * 3.5 * 3600_000).toISOString(),
    })
  }

  return nfts
}

export function createSeedDatabase(seed: number): MockDatabase {
  const nfts = buildNfts(seed)

  return {
    schemaVersion: SCHEMA_VERSION,
    users: structuredClone(SEED_USERS),
    sessions: [],
    nfts,
    favorites: {
      'usr-ana': [nfts[2]!.id, nfts[9]!.id],
      'usr-bruno': [nfts[4]!.id],
    },
    carts: [],
    wallets: structuredClone(SEED_WALLETS),
    quotes: [],
    orders: [],
    idempotency: {},
    coupons: structuredClone(COUPONS),
    lastCollector: {},
  }
}
