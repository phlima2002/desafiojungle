/**
 * Generates neutral placeholder artwork so the app runs from a clean checkout.
 * The real Figma artwork replaces these files; see docs/assets.md.
 */
import { mkdirSync, writeFileSync } from 'node:fs'

const ART = [
  { file: 'ape-varsity', from: '#d9d6c0', to: '#2f5d43', accent: '#1f7a4c' },
  { file: 'ape-bucket', from: '#f2ead9', to: '#6b5a8c', accent: '#8b74b8' },
  { file: 'ape-noir', from: '#cfe0d8', to: '#24352f', accent: '#87a196' },
  { file: 'ape-headphones', from: '#dff0e4', to: '#b5773f', accent: '#4f9c7a' },
]

mkdirSync('public/nft', { recursive: true })

for (const [index, art] of ART.entries()) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${art.from}"/>
      <stop offset="1" stop-color="${art.to}"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#g)"/>
  <circle cx="256" cy="230" r="${120 + index * 6}" fill="${art.accent}" fill-opacity="0.55"/>
  <circle cx="204" cy="206" r="26" fill="#140d0a" fill-opacity="0.75"/>
  <circle cx="308" cy="206" r="26" fill="#140d0a" fill-opacity="0.75"/>
  <path d="M188 300 q68 46 136 0" stroke="#140d0a" stroke-opacity="0.65" stroke-width="12" fill="none" stroke-linecap="round"/>
  <rect x="96" y="372" width="320" height="76" rx="12" fill="#140d0a" fill-opacity="0.35"/>
</svg>
`
  writeFileSync(`public/nft/${art.file}.svg`, svg)
}

console.log(`geradas ${ART.length} imagens de placeholder em public/nft`)
