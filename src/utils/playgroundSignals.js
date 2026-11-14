/**
 * Browser-side signal analysis using Massive or Alpha Vantage market data.
 * Combines RSI, SMA50/SMA200, trend, analyst price targets and news sentiment into a
 * 0-100 Tradeviser Score and a STRONG BUY ... STRONG SELL signal.
 * API keys are passed in by the caller (entered by the user, kept in their browser).
 */

const MASSIVE_BASE = 'https://api.massive.com';
const AV_BASE = 'https://www.alphavantage.co/query';
const MASSIVE_TIMEOUT_MS = 120000;
const AV_TIMEOUT_MS = 120000;
const AV_GAP_MS = 850;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseFloatSafe(val, defaultVal = null) {
  if (val == null || val === '' || val === 'None') return defaultVal;
  const v = Number.parseFloat(val);
  if (Number.isNaN(v)) return defaultVal;
  return v;
}

function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

function formatSymbol(ticker, exchange) {
  const ex = (exchange || 'US').toUpperCase();
  const t = String(ticker || '').trim().toUpperCase();
  if (ex === 'US') return t;
  return `${t}.${ex}`;
}

function pathTicker(symbol) {
  return encodeURIComponent(symbol).replace(/%2E/g, '.');
}

function sentimentNumeric(sentiment) {
  const s = String(sentiment || '').trim().toLowerCase();
  if (s === 'positive') return 0.65;
  if (s === 'negative') return -0.65;
  if (s === 'neutral') return 0.0;
  return null;
}

async function fetchJson(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 60000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data;
  } finally {
    clearTimeout(t);
  }
}

async function massiveGet(path, params, apiKey) {
  const merged = { ...params, apiKey };
  const q = new URLSearchParams();
  Object.entries(merged).forEach(([k, v]) => {
    if (v != null) q.set(k, String(v));
  });
  const url = `${MASSIVE_BASE}${path}?${q.toString()}`;
  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const data = await fetchJson(url, { timeoutMs: MASSIVE_TIMEOUT_MS });
      if (data && typeof data === 'object' && data.status === 'ERROR') {
        throw new Error(data.error || 'Massive API error');
      }
      return data && typeof data === 'object' ? data : {};
    } catch (e) {
      if (attempt < MAX_RETRIES && (e.name === 'AbortError' || String(e.message || '').includes('HTTP'))) {
        await sleep(2000);
      } else {
        throw e;
      }
    }
  }
  return {};
}

async function massiveSafe(path, params, apiKey) {
  try {
    return await massiveGet(path, params, apiKey);
  } catch {
    return null;
  }
}

function latestIndicatorValue(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const results = payload.results;
  if (!results || typeof results !== 'object') return null;
  const values = results.values;
  if (!Array.isArray(values) || values.length === 0) return null;
  const latest = values.reduce((a, b) => ((a.timestamp || 0) >= (b.timestamp || 0) ? a : b));
  return parseFloatSafe(latest.value);
}

export async function getMassiveCombinedSignals(ticker, exchange = 'US', apiKey = '', onProgress = () => {}) {
  if (!apiKey) throw new Error('Add your Massive API key in Settings to run an analysis.');

  const symbol = formatSymbol(ticker, exchange);
  let score = 0;
  const seg = pathTicker(symbol);

  onProgress(0);
  const rsiPayload = await massiveSafe(
    `/v1/indicators/rsi/${seg}`,
    { timespan: 'day', window: 14, series_type: 'close', limit: 10, order: 'desc' },
    apiKey
  );
  const rsi = rsiPayload ? latestIndicatorValue(rsiPayload) : null;
  if (rsi != null) {
    if (rsi < 30) score += (30 - rsi) / 30;
    else if (rsi > 70) score += (70 - rsi) / 30;
  }

  onProgress(1);
  const sma50Payload = await massiveSafe(
    `/v1/indicators/sma/${seg}`,
    { timespan: 'day', window: 50, series_type: 'close', limit: 10, order: 'desc' },
    apiKey
  );
  const sma50 = sma50Payload ? latestIndicatorValue(sma50Payload) : null;

  onProgress(2);
  const sma200Payload = await massiveSafe(
    `/v1/indicators/sma/${seg}`,
    { timespan: 'day', window: 200, series_type: 'close', limit: 10, order: 'desc' },
    apiKey
  );
  const sma200 = sma200Payload ? latestIndicatorValue(sma200Payload) : null;

  let currentPrice = null;
  let tradingVolume = null;
  let supportLevel = null;
  let resistanceLevel = null;
  const toD = new Date();
  const fromD = new Date(toD);
  fromD.setDate(fromD.getDate() - 550);
  const fromStr = fromD.toISOString().slice(0, 10);
  const toStr = toD.toISOString().slice(0, 10);
  onProgress(3);
  const aggs = await massiveSafe(
    `/v2/aggs/ticker/${seg}/range/1/day/${fromStr}/${toStr}`,
    { adjusted: 'true', sort: 'desc', limit: 500 },
    apiKey
  );
  let bars = [];
  if (aggs && Array.isArray(aggs.results)) bars = aggs.results;
  if (bars.length > 0) {
    const last = bars[0];
    currentPrice = parseFloatSafe(last.c);
    tradingVolume = parseFloatSafe(last.v);
    const entries = bars.slice(0, 20);
    const lows = entries.map((r) => parseFloatSafe(r.l)).filter((x) => x != null);
    const highs = entries.map((r) => parseFloatSafe(r.h)).filter((x) => x != null);
    if (lows.length) supportLevel = Math.min(...lows);
    if (highs.length) resistanceLevel = Math.max(...highs);
  }

  if (currentPrice != null && sma50 != null && sma50 > 0) {
    score += clamp((currentPrice - sma50) / sma50 / 0.15, -1, 1);
  }
  if (currentPrice != null && sma200 != null && sma200 > 0) {
    score += clamp((currentPrice - sma200) / sma200 / 0.15, -1, 1);
  }

  let trend = null;
  let trendSignal = null;
  if (sma50 != null && sma200 != null && currentPrice != null) {
    if (currentPrice > sma50 && sma50 > sma200) {
      trend = 'Bullish';
      trendSignal = 'up';
      score += 1;
    } else if (currentPrice < sma50 && sma50 < sma200) {
      trend = 'Bearish';
      trendSignal = 'down';
      score -= 1;
    } else {
      trend = 'Neutral';
      trendSignal = 'sideways';
    }
  }

  let companyName = symbol;
  onProgress(4);
  const ref = await massiveSafe(`/v3/reference/tickers/${seg}`, {}, apiKey);
  if (ref && ref.results && typeof ref.results === 'object' && ref.results.name) {
    companyName = ref.results.name;
  }

  let peRatio = null;
  let eps = null;
  onProgress(5);
  const ratios = await massiveSafe('/stocks/financials/v1/ratios', { ticker: symbol, limit: 1, sort: 'date.desc' }, apiKey);
  if (ratios && Array.isArray(ratios.results) && ratios.results[0]) {
    const row = ratios.results[0];
    peRatio = parseFloatSafe(row.price_to_earnings);
    eps = parseFloatSafe(row.earnings_per_share);
  }

  let analystTarget = null;
  onProgress(6);
  const ins = await massiveSafe('/benzinga/v1/analyst-insights', { ticker: symbol, limit: 15, sort: 'last_updated.desc' }, apiKey);
  if (ins && Array.isArray(ins.results)) {
    for (const row of ins.results) {
      if (!row || typeof row !== 'object') continue;
      const pt = parseFloatSafe(row.price_target);
      if (pt != null) {
        analystTarget = pt;
        break;
      }
    }
  }

  let analystRating = null;
  if (analystTarget != null && currentPrice != null && currentPrice > 0) {
    const priceDiffPct = ((analystTarget - currentPrice) / currentPrice) * 100;
    if (priceDiffPct > 10) analystRating = 'Strong Buy';
    else if (priceDiffPct > 5) analystRating = 'Buy';
    else if (priceDiffPct > -5) analystRating = 'Hold';
    else if (priceDiffPct > -10) analystRating = 'Sell';
    else analystRating = 'Strong Sell';
    score += clamp(priceDiffPct / 5, -2, 2);
  }

  let marketSentiment = null;
  let sentimentScore = null;
  onProgress(7);
  const news = await massiveSafe('/v2/reference/news', { ticker: symbol, limit: 50, sort: 'published_utc', order: 'desc' }, apiKey);
  if (news && Array.isArray(news.results)) {
    const scores = [];
    const symU = symbol.toUpperCase();
    for (const article of news.results) {
      if (!article || typeof article !== 'object') continue;
      const tickers = (article.tickers || []).map((t) => String(t).toUpperCase());
      if (!tickers.includes(symU)) continue;
      for (const insight of article.insights || []) {
        if (!insight || typeof insight !== 'object') continue;
        const it = insight.ticker;
        if (it && String(it).toUpperCase() !== symU) continue;
        const s = sentimentNumeric(insight.sentiment);
        if (s != null) scores.push(s);
      }
    }
    if (scores.length > 0) {
      sentimentScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (sentimentScore > 0.35) {
        marketSentiment = 'Bullish';
        score += (sentimentScore - 0.35) / 0.65;
      } else if (sentimentScore < -0.35) {
        marketSentiment = 'Bearish';
        score += (sentimentScore + 0.35) / 0.65;
      } else {
        marketSentiment = 'Neutral';
      }
    }
  }

  const rawMin = -7;
  const rawMax = 7;
  const scoreNormalized = Math.round(Math.max(0, Math.min(100, ((score - rawMin) / (rawMax - rawMin)) * 100)) * 100) / 100;

  let signal = 'STRONG SELL';
  if (scoreNormalized >= 75) signal = 'STRONG BUY';
  else if (scoreNormalized >= 55) signal = 'BUY';
  else if (scoreNormalized >= 40) signal = 'HOLD';
  else if (scoreNormalized >= 25) signal = 'SELL';

  const rsiHealth = rsi == null ? 'neutral' : rsi < 30 ? 'good' : rsi > 70 ? 'bad' : 'neutral';
  const sma50Health =
    currentPrice != null && sma50 != null ? (currentPrice > sma50 ? 'good' : 'bad') : 'neutral';
  const sma200Health =
    currentPrice != null && sma200 != null ? (currentPrice > sma200 ? 'good' : 'bad') : 'neutral';
  const trendHealth = trend === 'Bullish' ? 'good' : trend === 'Bearish' ? 'bad' : 'neutral';
  let analystHealth = 'neutral';
  if (analystRating) {
    if (analystRating === 'Strong Buy' || analystRating === 'Buy') analystHealth = 'good';
    else if (analystRating === 'Sell' || analystRating === 'Strong Sell') analystHealth = 'bad';
  }
  const sentimentHealth =
    marketSentiment === 'Bullish' ? 'good' : marketSentiment === 'Bearish' ? 'bad' : 'neutral';

  let peratioHealth = 'neutral';
  if (peRatio != null) {
    if (peRatio < 0) peratioHealth = 'bad';
    else if (peRatio <= 15) peratioHealth = 'good';
    else if (peRatio <= 25) peratioHealth = 'neutral';
    else peratioHealth = 'bad';
  }

  let epsHealth = 'neutral';
  if (eps != null) epsHealth = eps > 0 ? 'good' : eps < 0 ? 'bad' : 'neutral';

  let supportHealth = 'neutral';
  if (currentPrice != null && supportLevel != null && supportLevel > 0) {
    supportHealth = currentPrice >= supportLevel * 1.02 ? 'good' : 'bad';
  }

  let resistanceHealth = 'neutral';
  if (currentPrice != null && resistanceLevel != null && resistanceLevel > 0) {
    resistanceHealth = currentPrice <= resistanceLevel * 0.98 ? 'good' : 'neutral';
  }

  const volumeHealth = tradingVolume == null ? 'neutral' : tradingVolume > 0 ? 'good' : 'bad';

  return {
    Ticker: String(ticker).trim().toUpperCase(),
    Price: currentPrice != null ? Math.round(currentPrice * 100) / 100 : null,
    RSI: rsi != null ? Math.round(rsi * 100) / 100 : null,
    RSIHealth: rsiHealth,
    SMA50: sma50 != null ? Math.round(sma50 * 100) / 100 : null,
    SMA50Health: sma50Health,
    SMA200: sma200 != null ? Math.round(sma200 * 100) / 100 : null,
    SMA200Health: sma200Health,
    Score: scoreNormalized,
    Signal: signal,
    Trend: trend,
    TrendSignal: trendSignal,
    TrendHealth: trendHealth,
    MarketSentiment: marketSentiment,
    SentimentScore: sentimentScore != null ? Math.round(sentimentScore * 10000) / 10000 : null,
    SentimentHealth: sentimentHealth,
    AnalystRating: analystRating,
    AnalystHealth: analystHealth,
    PERatio: peRatio != null ? Math.round(peRatio * 100) / 100 : null,
    PERatioHealth: peratioHealth,
    EPS: eps != null ? Math.round(eps * 100) / 100 : null,
    EPSHealth: epsHealth,
    SupportLevel: supportLevel != null ? Math.round(supportLevel * 100) / 100 : null,
    SupportHealth: supportHealth,
    ResistanceLevel: resistanceLevel != null ? Math.round(resistanceLevel * 100) / 100 : null,
    ResistanceHealth: resistanceHealth,
    TradingVolume: tradingVolume != null ? Math.trunc(tradingVolume) : null,
    TradingVolumeHealth: volumeHealth,
    CompanyName: companyName,
  };
}

async function avRequest(params, apiKey) {
  const q = new URLSearchParams({ ...params, datatype: 'json', apikey: apiKey });
  const url = `${AV_BASE}?${q.toString()}`;
  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const data = await fetchJson(url, { timeoutMs: AV_TIMEOUT_MS });
      if (data['Error Message']) throw new Error(data['Error Message']);
      if (data.Note) throw new Error(`Alpha Vantage rate limit: ${data.Note}`);
      if (data.Information && String(data.Information).toLowerCase().includes('api key')) {
        throw new Error(String(data.Information));
      }
      return data;
    } catch (e) {
      if (attempt < MAX_RETRIES && (e.name === 'AbortError' || String(e.message || '').includes('HTTP'))) {
        await sleep(2000);
      } else {
        throw e;
      }
    }
  }
  throw new Error('Alpha Vantage request failed after retries');
}

function avGetSeries(data, ...keys) {
  for (const key of keys) {
    const val = data[key];
    if (val && typeof val === 'object' && Object.keys(val).length > 0) return val;
  }
  throw new Error(`No series in response: ${keys.join(', ')}`);
}

function avLatest(series) {
  const dates = Object.keys(series).sort().reverse();
  return [dates[0], series[dates[0]]];
}

export async function getAlphavantageCombinedSignals(ticker, exchange = 'US', apiKey = '', onProgress = () => {}) {
  if (!apiKey) throw new Error('Add your Alpha Vantage API key in Settings to run an analysis.');

  const symbol = formatSymbol(ticker, exchange);
  let score = 0;

  let rsi = null;
  try {
    onProgress(0);
    const rsiData = await avRequest(
      { function: 'RSI', symbol, interval: 'daily', time_period: 14, series_type: 'close' },
      apiKey
    );
    const rsiSeries = avGetSeries(rsiData, 'Technical Analysis: RSI');
    const rsiRow = avLatest(rsiSeries)[1];
    rsi = parseFloatSafe(rsiRow.RSI);
  } catch {
    /* optional */
  }
  await sleep(AV_GAP_MS);

  if (rsi != null) {
    if (rsi < 30) score += (30 - rsi) / 30;
    else if (rsi > 70) score += (70 - rsi) / 30;
  }

  let sma50 = null;
  try {
    onProgress(1);
    const sma50Data = await avRequest(
      { function: 'SMA', symbol, interval: 'daily', time_period: 50, series_type: 'close' },
      apiKey
    );
    const sma50Series = avGetSeries(sma50Data, 'Technical Analysis: SMA');
    sma50 = parseFloatSafe(avLatest(sma50Series)[1].SMA);
  } catch {
    /* optional */
  }
  await sleep(AV_GAP_MS);

  let sma200 = null;
  try {
    onProgress(2);
    const sma200Data = await avRequest(
      { function: 'SMA', symbol, interval: 'daily', time_period: 200, series_type: 'close' },
      apiKey
    );
    const sma200Series = avGetSeries(sma200Data, 'Technical Analysis: SMA');
    sma200 = parseFloatSafe(avLatest(sma200Series)[1].SMA);
  } catch {
    /* optional */
  }
  await sleep(AV_GAP_MS);

  let entries = [];
  let lastRow = {};
  try {
    onProgress(3);
    const dailyData = await avRequest({ function: 'TIME_SERIES_DAILY', symbol, outputsize: 'compact' }, apiKey);
    const dailySeries = avGetSeries(dailyData, 'Time Series (Daily)', 'Time Series (Daily) (Compact)');
    entries = Object.entries(dailySeries).sort((a, b) => b[0].localeCompare(a[0]));
    if (entries.length > 0) [, lastRow] = entries[0];
  } catch {
    /* optional */
  }
  await sleep(AV_GAP_MS);

  const currentPrice = lastRow && lastRow['4. close'] != null ? parseFloatSafe(lastRow['4. close']) : null;
  const tradingVolume = lastRow && lastRow['5. volume'] != null ? parseFloatSafe(lastRow['5. volume']) : null;

  let supportLevel = null;
  let resistanceLevel = null;
  if (entries.length >= 20) {
    const recent = entries.slice(0, 20);
    const lows = recent.map(([, r]) => parseFloatSafe(r['3. low'])).filter((x) => x != null);
    const highs = recent.map(([, r]) => parseFloatSafe(r['2. high'])).filter((x) => x != null);
    if (lows.length) supportLevel = Math.min(...lows);
    if (highs.length) resistanceLevel = Math.max(...highs);
  }

  if (currentPrice != null && sma50 != null && sma50 > 0) {
    score += clamp((currentPrice - sma50) / sma50 / 0.15, -1, 1);
  }
  if (currentPrice != null && sma200 != null && sma200 > 0) {
    score += clamp((currentPrice - sma200) / sma200 / 0.15, -1, 1);
  }

  let trend = null;
  let trendSignal = null;
  if (sma50 != null && sma200 != null && currentPrice != null) {
    if (currentPrice > sma50 && sma50 > sma200) {
      trend = 'Bullish';
      trendSignal = 'up';
      score += 1;
    } else if (currentPrice < sma50 && sma50 < sma200) {
      trend = 'Bearish';
      trendSignal = 'down';
      score -= 1;
    } else {
      trend = 'Neutral';
      trendSignal = 'sideways';
    }
  }

  let peRatio = null;
  let eps = null;
  let analystTarget = null;
  let companyName = symbol;
  try {
    onProgress(4);
    const overviewData = await avRequest({ function: 'OVERVIEW', symbol }, apiKey);
    peRatio = parseFloatSafe(overviewData.PERatio);
    eps = parseFloatSafe(overviewData.EPS);
    analystTarget = parseFloatSafe(overviewData.AnalystTargetPrice);
    companyName = overviewData.Name || symbol;
  } catch {
    /* optional */
  }
  await sleep(AV_GAP_MS);

  let analystRating = null;
  if (analystTarget != null && currentPrice != null && currentPrice > 0) {
    const priceDiffPct = ((analystTarget - currentPrice) / currentPrice) * 100;
    if (priceDiffPct > 10) analystRating = 'Strong Buy';
    else if (priceDiffPct > 5) analystRating = 'Buy';
    else if (priceDiffPct > -5) analystRating = 'Hold';
    else if (priceDiffPct > -10) analystRating = 'Sell';
    else analystRating = 'Strong Sell';
    score += clamp(priceDiffPct / 5, -2, 2);
  }

  let marketSentiment = null;
  let sentimentScore = null;
  try {
    onProgress(5);
    const newsData = await avRequest({ function: 'NEWS_SENTIMENT', tickers: symbol, limit: 50 }, apiKey);
    if (newsData.feed && Array.isArray(newsData.feed)) {
      const scores = [];
      for (const article of newsData.feed) {
        if (article.ticker_sentiment && Array.isArray(article.ticker_sentiment)) {
          for (const ts of article.ticker_sentiment) {
            if (ts.ticker === symbol && ts.ticker_sentiment_score) {
              const s = parseFloatSafe(ts.ticker_sentiment_score);
              if (s != null) scores.push(s);
            }
          }
        } else if (article.overall_sentiment_score) {
          const s = parseFloatSafe(article.overall_sentiment_score);
          if (s != null) scores.push(s);
        }
      }
      if (scores.length > 0) {
        sentimentScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        if (sentimentScore > 0.35) {
          marketSentiment = 'Bullish';
          score += (sentimentScore - 0.35) / 0.65;
        } else if (sentimentScore < -0.35) {
          marketSentiment = 'Bearish';
          score += (sentimentScore + 0.35) / 0.65;
        } else {
          marketSentiment = 'Neutral';
        }
      }
    }
  } catch {
    /* news optional */
  }

  const rawMin = -7;
  const rawMax = 7;
  const scoreNormalized = Math.round(Math.max(0, Math.min(100, ((score - rawMin) / (rawMax - rawMin)) * 100)) * 100) / 100;

  let signal = 'STRONG SELL';
  if (scoreNormalized >= 75) signal = 'STRONG BUY';
  else if (scoreNormalized >= 55) signal = 'BUY';
  else if (scoreNormalized >= 40) signal = 'HOLD';
  else if (scoreNormalized >= 25) signal = 'SELL';

  const rsiHealth = rsi == null ? 'neutral' : rsi < 30 ? 'good' : rsi > 70 ? 'bad' : 'neutral';
  const sma50Health =
    currentPrice != null && sma50 != null ? (currentPrice > sma50 ? 'good' : 'bad') : 'neutral';
  const sma200Health =
    currentPrice != null && sma200 != null ? (currentPrice > sma200 ? 'good' : 'bad') : 'neutral';
  const trendHealth = trend === 'Bullish' ? 'good' : trend === 'Bearish' ? 'bad' : 'neutral';
  let analystHealth = 'neutral';
  if (analystRating) {
    if (analystRating === 'Strong Buy' || analystRating === 'Buy') analystHealth = 'good';
    else if (analystRating === 'Sell' || analystRating === 'Strong Sell') analystHealth = 'bad';
  }
  const sentimentHealth =
    marketSentiment === 'Bullish' ? 'good' : marketSentiment === 'Bearish' ? 'bad' : 'neutral';

  let peratioHealth = 'neutral';
  if (peRatio != null) {
    if (peRatio < 0) peratioHealth = 'bad';
    else if (peRatio <= 15) peratioHealth = 'good';
    else if (peRatio <= 25) peratioHealth = 'neutral';
    else peratioHealth = 'bad';
  }

  let epsHealth = 'neutral';
  if (eps != null) epsHealth = eps > 0 ? 'good' : eps < 0 ? 'bad' : 'neutral';

  let supportHealth = 'neutral';
  if (currentPrice != null && supportLevel != null && supportLevel > 0) {
    supportHealth = currentPrice >= supportLevel * 1.02 ? 'good' : 'bad';
  }

  let resistanceHealth = 'neutral';
  if (currentPrice != null && resistanceLevel != null && resistanceLevel > 0) {
    resistanceHealth = currentPrice <= resistanceLevel * 0.98 ? 'good' : 'neutral';
  }

  const volumeHealth = tradingVolume == null ? 'neutral' : tradingVolume > 0 ? 'good' : 'bad';

  return {
    Ticker: String(ticker).trim().toUpperCase(),
    Price: currentPrice != null ? Math.round(currentPrice * 100) / 100 : null,
    RSI: rsi != null ? Math.round(rsi * 100) / 100 : null,
    RSIHealth: rsiHealth,
    SMA50: sma50 != null ? Math.round(sma50 * 100) / 100 : null,
    SMA50Health: sma50Health,
    SMA200: sma200 != null ? Math.round(sma200 * 100) / 100 : null,
    SMA200Health: sma200Health,
    Score: scoreNormalized,
    Signal: signal,
    Trend: trend,
    TrendSignal: trendSignal,
    TrendHealth: trendHealth,
    MarketSentiment: marketSentiment,
    SentimentScore: sentimentScore != null ? Math.round(sentimentScore * 10000) / 10000 : null,
    SentimentHealth: sentimentHealth,
    AnalystRating: analystRating,
    AnalystHealth: analystHealth,
    PERatio: peRatio != null ? Math.round(peRatio * 100) / 100 : null,
    PERatioHealth: peratioHealth,
    EPS: eps != null ? Math.round(eps * 100) / 100 : null,
    EPSHealth: epsHealth,
    SupportLevel: supportLevel != null ? Math.round(supportLevel * 100) / 100 : null,
    SupportHealth: supportHealth,
    ResistanceLevel: resistanceLevel != null ? Math.round(resistanceLevel * 100) / 100 : null,
    ResistanceHealth: resistanceHealth,
    TradingVolume: tradingVolume != null ? Math.trunc(tradingVolume) : null,
    TradingVolumeHealth: volumeHealth,
    CompanyName: companyName,
  };
}

/** The data each provider fetches, in order; onProgress(i) fires as step i starts. */
export const ANALYSIS_STEPS = {
  massive: ['Momentum (RSI)', '50-day average', '200-day average', 'Price history', 'Company profile', 'Fundamentals', 'Analyst targets', 'News sentiment'],
  alphavantage: ['Momentum (RSI)', '50-day average', '200-day average', 'Price history', 'Company profile & fundamentals', 'News sentiment'],
};

/**
 * @param {string} ticker
 * @param {string} exchange
 * @param {'massive'|'alphavantage'} provider
 * @param {string} apiKey  The user's key for the chosen provider.
 * @param {(step: number) => void} [onProgress]  Called with the index of each step in ANALYSIS_STEPS as it starts.
 */
export async function runPlaygroundAnalysis(ticker, exchange, provider, apiKey, onProgress) {
  const p = (provider || 'massive').toLowerCase();
  if (p === 'alphavantage') return getAlphavantageCombinedSignals(ticker, exchange, apiKey, onProgress);
  return getMassiveCombinedSignals(ticker, exchange, apiKey, onProgress);
}

export function parseTickerFromInput(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  const beforeEm = s.split(/\s*[—–]\s*/)[0].split(/\s*-\s*/)[0];
  const token = beforeEm.trim().split(/\s+/)[0] || '';
  return token.replace(/[^A-Za-z0-9.]/g, '').toUpperCase();
}
