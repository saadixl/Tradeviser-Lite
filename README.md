# Tradeviser Lite

A small web app that turns market data for a US stock into one **Tradeviser Score** (0–100) and a
signal from **STRONG BUY** to **STRONG SELL**. Everything runs in your browser with your own API
key for [Massive](https://massive.com) or [Alpha Vantage](https://www.alphavantage.co).

> For information and education only. This is not financial advice.

## What it looks at

| Metric | How it affects the score |
|---|---|
| **RSI (14-day)** | Below 30 (oversold) adds to the score; above 70 (overbought) subtracts |
| **Price vs SMA50 / SMA200** | Trading above the 50- and 200-day averages adds; below subtracts |
| **Trend** | Price > SMA50 > SMA200 is bullish (+1); the reverse is bearish (−1) |
| **Analyst price target** | Upside to the consensus target adds; downside subtracts |
| **News sentiment** | Clearly positive news adds; clearly negative news subtracts |

The parts are summed and scaled to 0–100:

| Score | Signal |
|---|---|
| 75 and above | STRONG BUY |
| 55–75 | BUY |
| 40–55 | HOLD |
| 25–40 | SELL |
| below 25 | STRONG SELL |

The result also shows price, P/E, EPS, support and resistance (20-day low and high) and volume,
each marked good, neutral or bad. The logic lives in
[`src/utils/playgroundSignals.js`](src/utils/playgroundSignals.js).

## Your API key

Tradeviser Lite has no server. Add your key under **Settings**; it's saved only in your
browser's local storage and sent only to that provider. Once saved, a key is only ever shown as
its last 4 characters (`•••• WXYZ`), and you can replace or remove it there. Keys never go into
the code or the build, so the app is safe to host publicly.

- **Massive:** sign up at [massive.com](https://massive.com). Analyst targets and news sentiment
  need a plan that includes those datasets.
- **Alpha Vantage:** get a free key at
  [alphavantage.co](https://www.alphavantage.co/support/#api-key). The free tier has a low daily
  request limit, and one analysis makes about 6 requests.

## Run it locally

Requires Node.js 20 or later.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve the production build
```

`dist/` is a static site, so it can be hosted anywhere that serves static files (GitHub Pages,
Netlify, Vercel, Firebase Hosting, and so on).

## Built with

[React](https://react.dev), [Vite](https://vite.dev) and [React Icons](https://react-icons.github.io/react-icons/).
