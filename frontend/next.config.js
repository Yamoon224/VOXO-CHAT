const path = require('path')

const rawBasePath = process.env.APP_BASE_PATH?.trim() || ''
const basePath = rawBasePath === '/' ? '' : rawBasePath.replace(/\/+$/, '')

if (basePath && !basePath.startsWith('/')) {
  throw new Error('APP_BASE_PATH doit être vide ou commencer par "/"')
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  basePath,
  // Les composants client ne peuvent pas lire APP_BASE_PATH directement. On
  // publie uniquement ce préfixe public, déjà connu du navigateur, afin que
  // les assets placés dans /public soient résolus sous le bon chemin.
  env: {
    NEXT_PUBLIC_APP_BASE_PATH: basePath,
  },
  // shared/ vit à la racine du dépôt, hors du dossier frontend : sans cette
  // racine de tracing, le build standalone n'embarquerait pas ses fichiers.
  outputFileTracingRoot: path.join(__dirname, '..'),
  experimental: {
    optimizePackageImports: ['lucide-react']
  },
  webpack: (config) => {
    config.resolve.alias['@shared'] = path.join(__dirname, '..', 'shared')
    return config
  }
}

module.exports = nextConfig
