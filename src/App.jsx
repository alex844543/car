import React, { useState, useEffect } from 'react';
import { CONFIG } from './config.js';
import { fetchDexScreenerData, sortProspects } from './dexscreener.js';

export default function App() {
  const [apiUrl, setApiUrl] = useState(CONFIG.DEFAULT_API_URL);
  const [apiKey, setApiKey] = useState(CONFIG.DEFAULT_API_KEY);
  const [scanMode, setScanMode] = useState('single');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Results
  const [rawTokens, setRawTokens] = useState([]);
  const [hasScanned, setHasScanned] = useState(false);
  const [strictFilterOnly, setStrictFilterOnly] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  // Auto-scan on initial mount
  useEffect(() => {
    handleScan(apiUrl, 'single');
  }, []);

  async function handleScan(targetInput = apiUrl, mode = scanMode) {
    setLoading(true);
    setError(null);

    let endpointsToScan;

    if (mode === 'deep') {
      endpointsToScan = CONFIG.SCAN_MODES.deep.queries.map(
        q => `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`
      );
    } else if (mode === 'ultra') {
      endpointsToScan = [
        ...CONFIG.SCAN_MODES.ultra.queries.map(
          q => `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`
        ),
        'https://api.dexscreener.com/token-profiles/latest/v1'
      ];
    } else {
      if (!targetInput.trim()) {
        setError('Please provide a valid DexScreener API URL or search keyword.');
        setLoading(false);
        return;
      }
      endpointsToScan = targetInput;
    }

    try {
      const result = await fetchDexScreenerData(endpointsToScan, apiKey);
      setRawTokens(result.tokens);
      setHasScanned(true);
    } catch (err) {
      setError(err.message || 'Failed to fetch tokens from DexScreener.');
    } finally {
      setLoading(false);
    }
  }

  // Filter and sort tokens
  const displayedTokens = React.useMemo(() => {
    let list = rawTokens;
    if (strictFilterOnly) {
      list = list.filter(t => t.passesFilters);
    }
    return sortProspects(list);
  }, [rawTokens, strictFilterOnly]);

  // Statistics counters
  const highPriorityCount = rawTokens.filter(t => t.priority === 'HIGH PRIORITY').length;
  const potentialCount = rawTokens.filter(t => t.priority === 'POTENTIAL').length;
  const strictMatchCount = rawTokens.filter(t => t.passesFilters).length;

  function copyToClipboard(text, id) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function exportToCsv() {
    if (displayedTokens.length === 0) return;

    const headers = [
      'Priority',
      'Name',
      'Symbol',
      'Token Address',
      'Market Cap (USD)',
      'Liquidity (USD)',
      '24h Volume (USD)',
      '24h Txns',
      'Age (Days)',
      '24h Change (%)',
      'Website URL',
      'Twitter/X URL',
      'DexScreener URL'
    ];

    const rows = displayedTokens.map(t => [
      t.priority,
      `"${t.name.replace(/"/g, '""')}"`,
      t.symbol,
      t.tokenAddress,
      t.marketCap.toFixed(0),
      t.liquidity.toFixed(0),
      t.volume24h.toFixed(0),
      t.txns24h,
      t.ageDays !== null ? t.ageDays.toFixed(1) : 'N/A',
      t.priceChange24h.toFixed(2),
      t.websiteUrl || 'None',
      t.xUrl || 'None',
      t.dexUrl
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `coin-prospects-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="brand">
          <div className="logo-icon">🎯</div>
          <div>
            <h1 className="title">Coin Prospect Finder</h1>
            <p className="subtitle">
              Scan DexScreener meme-coins & instantly detect hot leads for web design outreach
            </p>
          </div>
        </div>

        {/* Quick Stats Pill */}
        {hasScanned && (
          <div className="header-stats">
            <div className="stat-badge stat-high">
              <span className="dot dot-high"></span>
              <strong>{highPriorityCount}</strong> No Website (Hot Leads)
            </div>
            <div className="stat-badge stat-potential">
              <span className="dot dot-potential"></span>
              <strong>{potentialCount}</strong> Basic Site (Potential)
            </div>
          </div>
        )}
      </header>

      {/* Main Input Controls */}
      <div className="card control-card">
        {/* Scan Depth Selector */}
        <div className="scan-mode-bar">
          <span className="scan-mode-title">Scan Scope:</span>
          <button
            type="button"
            className={`mode-btn ${scanMode === 'single' ? 'active' : ''}`}
            onClick={() => {
              setScanMode('single');
              handleScan(apiUrl, 'single');
            }}
            disabled={loading}
          >
            🎯 Custom URL (~30 coins)
          </button>
          <button
            type="button"
            className={`mode-btn highlight-btn ${scanMode === 'deep' ? 'active' : ''}`}
            onClick={() => {
              setScanMode('deep');
              handleScan(null, 'deep');
            }}
            disabled={loading}
          >
            ⚡ Deep Scan (100+ coins)
          </button>
          <button
            type="button"
            className={`mode-btn fire-btn ${scanMode === 'ultra' ? 'active' : ''}`}
            onClick={() => {
              setScanMode('ultra');
              handleScan(null, 'ultra');
            }}
            disabled={loading}
          >
            🔥 Ultra Scan (250+ coins)
          </button>
        </div>

        <form
          className="search-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleScan(apiUrl, 'single');
          }}
        >
          <div className="input-group">
            <div className="label-row">
              <label htmlFor="apiUrlInput" className="input-label">
                DexScreener API URL or Comma-Separated Keywords
              </label>
              <span className="api-note">
                💡 Tip: DexScreener limits 1 query to 30 pairs. Use <strong>Deep Scan</strong> or separate keywords with commas (e.g. <code>sol, pump, meme, pepe</code>) for 100+ coins!
              </span>
            </div>

            <div className="input-wrapper">
              <input
                id="apiUrlInput"
                type="text"
                className="text-input"
                placeholder="https://api.dexscreener.com/latest/dex/search?q=sol or sol, pump, meme"
                value={apiUrl}
                onChange={(e) => {
                  setApiUrl(e.target.value);
                  setScanMode('single');
                }}
                disabled={loading}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span> Scanning...
                  </>
                ) : (
                  <>🔍 Scan Coins</>
                )}
              </button>
            </div>
          </div>

          {/* Quick presets & API key toggle */}
          <div className="presets-row">
            <span className="presets-label">Single Presets:</span>
            <div className="presets-list">
              {CONFIG.PRESET_ENDPOINTS.map((preset) => (
                <button
                  key={preset.url}
                  type="button"
                  className={`preset-btn ${apiUrl === preset.url && scanMode === 'single' ? 'active' : ''}`}
                  onClick={() => {
                    setApiUrl(preset.url);
                    setScanMode('single');
                    handleScan(preset.url, 'single');
                  }}
                  disabled={loading}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="key-toggle-btn"
              onClick={() => setShowApiKeyInput(!showApiKeyInput)}
            >
              {showApiKeyInput ? '− Hide Custom Key' : '+ Add API Key / Header'}
            </button>
          </div>

          {/* Optional API Key Input */}
          {showApiKeyInput && (
            <div className="key-input-row">
              <label htmlFor="apiKeyInput" className="input-label small">
                Custom API Key / Bearer Token (Optional):
              </label>
              <input
                id="apiKeyInput"
                type="password"
                className="text-input small"
                placeholder="Enter custom API key if your proxy requires authorization"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
          )}
        </form>

        {/* Filter Criteria Summary Bar */}
        <div className="filters-summary">
          <div className="filters-title">
            <span>⚙️ Active Filters:</span>
            <span className="filter-chip">MC: $150K–$2M</span>
            <span className="filter-chip">Vol: $500K–$10M</span>
            <span className="filter-chip">Liq: &gt;$50K</span>
            <span className="filter-chip">Age: 2–30 days</span>
            <span className="filter-chip">Txns: &gt;10K</span>
            <span className="filter-chip">24h Chg: -30% to +100%</span>
            <span className="filter-chip dedupe">Duplicates Merged</span>
          </div>

          <div className="filter-mode-toggle">
            <label className="switch-label">
              <input
                type="checkbox"
                checked={strictFilterOnly}
                onChange={(e) => setStrictFilterOnly(e.target.checked)}
              />
              <span>Strict Filter Mode ({strictMatchCount} qualified)</span>
            </label>
            {!strictFilterOnly && (
              <span className="filter-note">
                Showing all {rawTokens.length} deduplicated tokens sorted by website prospect priority
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-banner">
          <div className="error-icon">⚠️</div>
          <div className="error-content">
            <strong>Scan Failed</strong>
            <p>{error}</p>
          </div>
          <button className="btn-retry" onClick={() => handleScan(apiUrl, scanMode)}>
            Retry
          </button>
        </div>
      )}

      {/* Loading Bar */}
      {loading && (
        <div className="loading-card">
          <div className="loading-spinner-large"></div>
          <h3>
            {scanMode === 'deep' ? '⚡ Deep Scanning Multi-Queries...' : scanMode === 'ultra' ? '🔥 Ultra Scanning Across 12+ Endpoints...' : 'Scanning DexScreener Pairs...'}
          </h3>
          <p>Aggregating token pairs, deduplicating, verifying websites & prospect signals</p>
        </div>
      )}

      {/* Results Section */}
      {!loading && hasScanned && (
        <div className="results-container">
          <div className="results-toolbar">
            <div className="results-count">
              <strong>{displayedTokens.length}</strong> {strictFilterOnly ? 'Strict Qualified Prospects' : 'Scanned Tokens'}
              {strictFilterOnly && rawTokens.length > displayedTokens.length && (
                <span className="sub-count">
                  {' '}(from {rawTokens.length} total deduplicated coins scanned)
                </span>
              )}
            </div>

            <div className="toolbar-actions">
              {displayedTokens.length > 0 && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={exportToCsv}
                >
                  📥 Export CSV ({displayedTokens.length})
                </button>
              )}
            </div>
          </div>

          {displayedTokens.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <h3>No tokens matched all 6 strict criteria in this batch</h3>
              <p>
                DexScreener returned {rawTokens.length} pairs, but none met all 6 strict filters simultaneously
                (MC $150K-$2M, Vol $500K-$10M, Liq &gt;$50K, Age 2-30d, Txns &gt;10K, Chg -30% to +100%).
              </p>
              <div className="empty-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setStrictFilterOnly(false)}
                >
                  View All {rawTokens.length} Tokens Ranked by Website Priority
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setScanMode('deep');
                    handleScan(null, 'deep');
                  }}
                >
                  ⚡ Try Deep Scan (100+ coins)
                </button>
              </div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="prospects-table">
                <thead>
                  <tr>
                    <th>Prospect Status</th>
                    <th>Token / Project</th>
                    <th>Market Cap</th>
                    <th>Liquidity</th>
                    <th>24h Volume</th>
                    <th>24h Txns</th>
                    <th>Pair Age</th>
                    <th>24h Change</th>
                    <th>Website URL</th>
                    <th>X / Twitter</th>
                    <th>Dex</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedTokens.map((token) => (
                    <tr key={token.id} className={`row-${token.priority.toLowerCase().replace(' ', '-')}`}>
                      {/* Prospect Status */}
                      <td>
                        <span className={`badge ${token.badgeClass}`}>
                          {token.priority === 'HIGH PRIORITY' && '🔥 HIGH PRIORITY'}
                          {token.priority === 'POTENTIAL' && '⚡ POTENTIAL'}
                          {token.priority === 'SKIP' && '💤 SKIP'}
                        </span>
                        <div className="prospect-reason" title={token.priorityReason}>
                          {token.priority === 'HIGH PRIORITY' && 'No Website (Pitch Target)'}
                          {token.priority === 'POTENTIAL' && 'Basic / Free Builder'}
                          {token.priority === 'SKIP' && 'Polished Website'}
                        </div>
                      </td>

                      {/* Token */}
                      <td>
                        <div className="token-cell">
                          {token.icon ? (
                            <img
                              src={token.icon}
                              alt={token.symbol}
                              className="token-icon"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="token-icon-fallback">
                              {token.symbol.slice(0, 2)}
                            </div>
                          )}
                          <div className="token-info">
                            <span className="token-name" title={token.name}>
                              {token.name}
                            </span>
                            <div className="token-sub">
                              <span className="token-symbol">{token.symbol}</span>
                              <span className="chain-badge">{token.chainId}</span>
                              {token.tokenAddress && (
                                <button
                                  type="button"
                                  className="copy-btn"
                                  title="Copy Token Address"
                                  onClick={() => copyToClipboard(token.tokenAddress, token.id)}
                                >
                                  {copiedId === token.id ? '✓ Copied' : '📋'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Market Cap */}
                      <td className="metric-cell">
                        <strong>${formatNumber(token.marketCap)}</strong>
                      </td>

                      {/* Liquidity */}
                      <td className="metric-cell">
                        ${formatNumber(token.liquidity)}
                      </td>

                      {/* 24h Volume */}
                      <td className="metric-cell">
                        ${formatNumber(token.volume24h)}
                      </td>

                      {/* 24h Txns */}
                      <td>
                        <div className="txns-cell">
                          <strong>{token.txns24h.toLocaleString()}</strong>
                          <span className="txns-sub">
                            +{token.txnsBuys.toLocaleString()} / -{token.txnsSells.toLocaleString()}
                          </span>
                        </div>
                      </td>

                      {/* Pair Age */}
                      <td>
                        {token.ageDays !== null ? (
                          <span className="age-tag">
                            {token.ageDays < 1 
                              ? `${Math.round(token.ageDays * 24)}h old`
                              : `${token.ageDays.toFixed(1)} days`}
                          </span>
                        ) : (
                          <span className="text-muted">N/A</span>
                        )}
                      </td>

                      {/* 24h Change */}
                      <td>
                        <span
                          className={`change-tag ${
                            token.priceChange24h >= 0 ? 'change-positive' : 'change-negative'
                          }`}
                        >
                          {token.priceChange24h >= 0 ? '+' : ''}
                          {token.priceChange24h.toFixed(2)}%
                        </span>
                      </td>

                      {/* Website */}
                      <td>
                        {token.websiteUrl ? (
                          <a
                            href={token.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="site-link"
                            title={token.websiteUrl}
                          >
                            🌐 {cleanDomain(token.websiteUrl)}
                          </a>
                        ) : (
                          <span className="no-site-pill">None (Needs Site)</span>
                        )}
                      </td>

                      {/* Twitter / X */}
                      <td>
                        {token.xUrl ? (
                          <a
                            href={token.xUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="x-link"
                            title={token.xUrl}
                          >
                            𝕏 Profile
                          </a>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>

                      {/* Dex Link */}
                      <td>
                        <a
                          href={token.dexUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-dex"
                          title="Open on DexScreener"
                        >
                          📈 View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Helper: format big numbers */
function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '0';
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toFixed(0);
}

/** Helper: clean domain display */
function cleanDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '').slice(0, 20);
  }
}
