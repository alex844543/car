import { CONFIG } from './config.js';

/**
 * Classifies website quality for meme-coin prospect detection.
 * 
 * Rules:
 * - No website -> HIGH PRIORITY (Hot lead for website creation)
 * - Website exists but appears basic/broken/free builder -> POTENTIAL
 * - Custom polished website -> SKIP
 * 
 * @param {string|null} websiteUrl 
 * @returns {{ priority: 'HIGH PRIORITY' | 'POTENTIAL' | 'SKIP', rank: number, reason: string, badgeClass: string }}
 */
export function classifyWebsite(websiteUrl) {
  if (!websiteUrl || typeof websiteUrl !== 'string' || !websiteUrl.trim()) {
    return {
      priority: 'HIGH PRIORITY',
      rank: 1,
      reason: 'No website detected. Highest value prospect for web design outreach.',
      badgeClass: 'badge-high'
    };
  }

  const cleanUrl = websiteUrl.trim().toLowerCase();

  // Check if link is insecure or just a plain IP/empty
  if (cleanUrl.startsWith('http://')) {
    return {
      priority: 'POTENTIAL',
      rank: 2,
      reason: 'Insecure HTTP site or unconfigured SSL. Likely raw or outdated.',
      badgeClass: 'badge-potential'
    };
  }

  // Check if hosted on known basic/free builders or social redirects
  const isBasicHost = CONFIG.BASIC_WEBSITE_HOSTS.some(host => cleanUrl.includes(host));

  if (isBasicHost) {
    return {
      priority: 'POTENTIAL',
      rank: 2,
      reason: 'Uses basic template/free builder or link redirect (e.g. Carrd, Linktree, Telegram, Wix).',
      badgeClass: 'badge-potential'
    };
  }

  // Otherwise, it appears to be a custom branded domain
  return {
    priority: 'SKIP',
    rank: 3,
    reason: 'Has dedicated custom website. Lower priority for cold outreach.',
    badgeClass: 'badge-skip'
  };
}

/**
 * Checks if a token matches the strict filtering criteria.
 */
export function evaluateFilters(token, filters = CONFIG.FILTERS) {
  const mcPass = token.marketCap >= filters.minMarketCap && token.marketCap <= filters.maxMarketCap;
  const volPass = token.volume24h >= filters.minVolume24h && token.volume24h <= filters.maxVolume24h;
  const liqPass = token.liquidity > filters.minLiquidity;
  
  // Pair age check (in days)
  const agePass = token.ageDays !== null 
    ? (token.ageDays >= filters.minAgeDays && token.ageDays <= filters.maxAgeDays)
    : false;

  const txnsPass = token.txns24h > filters.minTxns24h;
  const changePass = token.priceChange24h >= filters.minPriceChange24h && token.priceChange24h <= filters.maxPriceChange24h;

  const passesAll = mcPass && volPass && liqPass && agePass && txnsPass && changePass;

  return {
    passesAll,
    breakdown: {
      marketCap: { pass: mcPass, value: token.marketCap, label: '$150K - $2M' },
      volume: { pass: volPass, value: token.volume24h, label: '$500K - $10M' },
      liquidity: { pass: liqPass, value: token.liquidity, label: '>$50K' },
      age: { pass: agePass, value: token.ageDays, label: '2 - 30 days' },
      txns: { pass: txnsPass, value: token.txns24h, label: '>10K txns' },
      change: { pass: changePass, value: token.priceChange24h, label: '-30% to +100%' }
    }
  };
}

/**
 * Normalizes raw DexScreener pair objects into a consistent prospect model.
 */
export function normalizePair(pair) {
  const now = Date.now();
  const pairCreatedAt = pair.pairCreatedAt ? Number(pair.pairCreatedAt) : null;
  const ageDays = pairCreatedAt ? Math.max(0, (now - pairCreatedAt) / (1000 * 60 * 60 * 24)) : null;

  // Extract website URL
  let websiteUrl = '';
  if (Array.isArray(pair.info?.websites) && pair.info.websites.length > 0) {
    websiteUrl = pair.info.websites[0]?.url || '';
  } else if (Array.isArray(pair.links)) {
    const webLink = pair.links.find(l => l.type === 'website' || l.label?.toLowerCase()?.includes('web'));
    if (webLink?.url) websiteUrl = webLink.url;
  }

  // Extract Twitter/X URL
  let xUrl = '';
  if (Array.isArray(pair.info?.socials)) {
    const twitterSocial = pair.info.socials.find(s => 
      s.type === 'twitter' || 
      s.url?.toLowerCase()?.includes('x.com') || 
      s.url?.toLowerCase()?.includes('twitter.com')
    );
    if (twitterSocial?.url) xUrl = twitterSocial.url;
  } else if (Array.isArray(pair.links)) {
    const twLink = pair.links.find(l => l.type === 'twitter' || l.url?.includes('x.com') || l.url?.includes('twitter.com'));
    if (twLink?.url) xUrl = twLink.url;
  }

  // Extract Telegram URL
  let telegramUrl = '';
  if (Array.isArray(pair.info?.socials)) {
    const tgSocial = pair.info.socials.find(s => s.type === 'telegram' || s.url?.includes('t.me'));
    if (tgSocial?.url) telegramUrl = tgSocial.url;
  }

  const txnsBuys = Number(pair.txns?.h24?.buys) || 0;
  const txnsSells = Number(pair.txns?.h24?.sells) || 0;
  const totalTxns24h = txnsBuys + txnsSells;

  const marketCap = Number(pair.marketCap) || Number(pair.fdv) || 0;
  const volume24h = Number(pair.volume?.h24) || 0;
  const liquidity = Number(pair.liquidity?.usd) || 0;
  const priceChange24h = Number(pair.priceChange?.h24) || 0;

  const prospect = classifyWebsite(websiteUrl);

  const tokenData = {
    id: pair.baseToken?.address || pair.pairAddress || `${pair.chainId}-${pair.pairAddress}`,
    tokenAddress: pair.baseToken?.address || '',
    pairAddress: pair.pairAddress || '',
    name: pair.baseToken?.name || 'Unknown Token',
    symbol: pair.baseToken?.symbol || 'UNKNOWN',
    chainId: pair.chainId || 'unknown',
    dexId: pair.dexId || '',
    dexUrl: pair.url || `https://dexscreener.com/${pair.chainId || 'solana'}/${pair.pairAddress}`,
    icon: pair.info?.imageUrl || null,
    priceUsd: Number(pair.priceUsd) || 0,
    marketCap,
    volume24h,
    liquidity,
    txns24h: totalTxns24h,
    txnsBuys,
    txnsSells,
    priceChange24h,
    pairCreatedAt,
    ageDays,
    websiteUrl,
    xUrl,
    telegramUrl,
    priority: prospect.priority,
    rank: prospect.rank,
    priorityReason: prospect.reason,
    badgeClass: prospect.badgeClass
  };

  const evalResult = evaluateFilters(tokenData);
  tokenData.passesFilters = evalResult.passesAll;
  tokenData.filterBreakdown = evalResult.breakdown;

  return tokenData;
}

/**
 * Deduplicates tokens/pairs so the same project is not shown multiple times.
 * Retains the pair with higher 24h volume.
 */
export function deduplicateTokens(tokens) {
  const map = new Map();

  for (const token of tokens) {
    const key = (token.tokenAddress || token.symbol || token.name).toLowerCase();
    if (!map.has(key)) {
      map.set(key, token);
    } else {
      const existing = map.get(key);
      if (token.volume24h > existing.volume24h) {
        map.set(key, token);
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Sorts prospects with the most promising website prospects first:
 * 1. HIGH PRIORITY (No website)
 * 2. POTENTIAL (Basic/broken website)
 * 3. SKIP (Custom polished website)
 * Secondary sorting: 24h volume descending.
 */
export function sortProspects(tokens) {
  return [...tokens].sort((a, b) => {
    if (a.rank !== b.rank) {
      return a.rank - b.rank; // 1 before 2 before 3
    }
    return b.volume24h - a.volume24h; // higher volume first
  });
}

/**
 * Fetches raw pairs from a single DexScreener URL.
 */
async function fetchSingleEndpoint(cleanUrl, apiKey = '') {
  const headers = { 'Accept': 'application/json' };
  if (apiKey && apiKey.trim()) {
    headers['X-API-KEY'] = apiKey.trim();
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
  }

  const response = await fetch(cleanUrl, { headers });

  if (response.status === 429) {
    throw new Error('DexScreener API rate limit reached (HTTP 429). Please wait 10-15 seconds and try again.');
  }

  if (!response.ok) {
    throw new Error(`DexScreener API returned HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  let rawPairs = [];

  if (Array.isArray(data?.pairs)) {
    rawPairs = data.pairs;
  } else if (Array.isArray(data) && data[0]?.baseToken) {
    rawPairs = data;
  } else if (Array.isArray(data) && data[0]?.tokenAddress) {
    const tokenAddresses = data.map(item => item.tokenAddress).filter(Boolean).slice(0, 30);
    if (tokenAddresses.length > 0) {
      try {
        const batchUrl = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddresses.join(',')}`;
        const batchRes = await fetch(batchUrl, { headers });
        if (batchRes.ok) {
          const batchData = await batchRes.json();
          if (Array.isArray(batchData?.pairs)) {
            rawPairs = batchData.pairs;
          }
        }
      } catch (err) {
        console.warn('Batch token pair lookup failed:', err);
      }
    }
  } else if (data?.pair) {
    rawPairs = [data.pair];
  } else if (data?.baseToken) {
    rawPairs = [data];
  }

  return rawPairs;
}

/**
 * Fetches data from one or multiple queries/endpoints.
 * DexScreener limits any single query to 30 pairs.
 * By querying multiple meme / chain targets in parallel, we can return 100-300+ coins!
 * 
 * @param {string|string[]} inputUrlsOrQueries 
 * @param {string} [apiKey]
 * @returns {Promise<{ rawCount: number, tokens: Array, queriesCount: number }>}
 */
export async function fetchDexScreenerData(inputUrlsOrQueries, apiKey = '') {
  let urls = [];

  if (Array.isArray(inputUrlsOrQueries)) {
    urls = inputUrlsOrQueries;
  } else if (typeof inputUrlsOrQueries === 'string') {
    const raw = inputUrlsOrQueries.trim();
    // Support comma-separated queries or URLs: e.g. "sol, pump, pepe" or "https://api.dexscreener.com/..."
    if (raw.includes(',')) {
      const parts = raw.split(',').map(p => p.trim()).filter(Boolean);
      urls = parts.map(part => {
        if (part.startsWith('http://') || part.startsWith('https://')) {
          return part;
        }
        return `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(part)}`;
      });
    } else if (raw.startsWith('http://') || raw.startsWith('https://')) {
      urls = [raw];
    } else {
      // User entered a plain search keyword like "pump" or "doge"
      urls = [`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(raw)}`];
    }
  }

  if (urls.length === 0) {
    throw new Error('Please enter a valid DexScreener API URL or search keyword.');
  }

  // Fetch all endpoints concurrently
  const promises = urls.map(url => fetchSingleEndpoint(url, apiKey).catch(err => {
    console.warn(`Failed fetching ${url}:`, err);
    return [];
  }));

  const results = await Promise.all(promises);
  const allPairs = results.flat();

  if (allPairs.length === 0) {
    throw new Error('No pairs returned from DexScreener. Please verify the URL or search keyword.');
  }

  // Normalize all pairs
  const normalized = allPairs.map(normalizePair);

  // Remove duplicates across all combined queries
  const deduplicated = deduplicateTokens(normalized);

  return {
    rawCount: allPairs.length,
    tokens: deduplicated,
    queriesCount: urls.length
  };
}
