/**
 * Coin Prospect Finder - Configuration
 *
 * Central configuration file for DexScreener API integration,
 * multi-query scanning presets, prospect detection filters,
 * and website classification rules.
 */

export const CONFIG = {
  // Default DexScreener API endpoint to populate the input
  DEFAULT_API_URL: 'https://api.dexscreener.com/latest/dex/search?q=sol',

  // Optional API key if you are using an authenticated/enterprise proxy
  DEFAULT_API_KEY: '',

  // Pre-configured query sets for scanning high volumes of coins
  SCAN_MODES: {
    single: {
      id: 'single',
      label: 'Single Scan (~30 coins)',
      queries: []
    },
    deep: {
      id: 'deep',
      label: '⚡ Deep Scan (100+ coins)',
      queries: ['sol', 'pump', 'meme', 'pepe', 'doge', 'base']
    },
    ultra: {
      id: 'ultra',
      label: '🔥 Ultra Scan (250+ coins)',
      queries: ['sol', 'pump', 'meme', 'pepe', 'doge', 'base', 'cat', 'ai', 'wif', 'bonk', 'shib', 'trump']
    }
  },

  // Filter thresholds as required:
  FILTERS: {
    minMarketCap: 150_000,       // $150K
    maxMarketCap: 2_000_000,     // $2M
    minVolume24h: 500_000,       // $500K
    maxVolume24h: 10_000_000,    // $10M
    minLiquidity: 50_000,        // $50K
    minAgeDays: 2,               // 2 days
    maxAgeDays: 30,              // 30 days
    minTxns24h: 10_000,          // 10K transactions (buys + sells)
    minPriceChange24h: -30,      // -30%
    maxPriceChange24h: 100,      // +100%
  },

  // Website hosts and patterns that flag a project's website as basic / template / temporary
  BASIC_WEBSITE_HOSTS: [
    'carrd.co',
    'wixsite.com',
    'weebly.com',
    'linktr.ee',
    'notion.site',
    'sites.google.com',
    'google.com',
    'blogspot.com',
    'wordpress.com',
    'vercel.app',
    'netlify.app',
    'github.io',
    'webflow.io',
    'bento.me',
    'bio.link',
    'solo.to',
    'beacons.ai',
    'padlet.org',
    'canva.site',
    'strikingly.com',
    'godaddysites.com',
    'jimdosite.com',
    't.me',
    'telegram.org',
    'pump.fun',
    'dexscreener.com',
    'x.com',
    'twitter.com'
  ],

  // Preset endpoints for quick single scanning
  PRESET_ENDPOINTS: [
    { label: 'Solana (sol)', url: 'https://api.dexscreener.com/latest/dex/search?q=sol' },
    { label: 'Meme Coins', url: 'https://api.dexscreener.com/latest/dex/search?q=meme' },
    { label: 'Pump Coins', url: 'https://api.dexscreener.com/latest/dex/search?q=pump' },
    { label: 'Latest Profiles', url: 'https://api.dexscreener.com/token-profiles/latest/v1' },
    { label: 'Pepe Pairs', url: 'https://api.dexscreener.com/latest/dex/search?q=pepe' }
  ]
};
