# Tradeviser Lite

A small web app that turns market data for a US stock into one **Tradeviser Score** (0–100) and a
signal from **STRONG BUY** to **STRONG SELL**. Everything runs in your browser with your own API
key for [Massive](https://massive.com) or [Alpha Vantage](https://www.alphavantage.co).

> For information and education only. This is not financial advice.

## Features

- **One score, one signal:** an animated 0–100 gauge and a STRONG SELL → STRONG BUY scale.
- **Live progress:** see each data point being fetched (RSI, moving averages, price history,
  fundamentals, analyst targets, news sentiment) while the analysis runs.
- **Readable results:** metrics grouped into technicals, price levels and fundamentals, each marked
  positive, neutral or negative, with RSI zones and the price's place in its 20-day range.
- **Shared results:** analyses are shared through a Firebase Realtime Database. If anyone analyzed a
  ticker in the last 30 minutes, you get that result instantly, without an API key.
- **Recent analyses:** the 20 latest analyses from everyone, live. Open any of them instantly. (Without
  a database configured, the list is this browser's own history instead.) On phones the list
  becomes a swipeable strip.
- **Keyboard friendly:** press `/` to jump to the search, Enter to analyze, Esc to clear.

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

## Shared analysis cache (optional)

With a Firebase Realtime Database configured, every analysis is saved at
`Tradeviser-Lite/Analysis/<ticker>` (a `.` in a ticker is stored as `-`) with the server's
timestamp. Before analyzing, the app checks that entry and reuses it if it's 30 minutes old or
less; otherwise it runs a fresh analysis and saves it. The Recent list shows the 20 latest
entries.

To enable it, copy `.env.example` to `.env.local` and fill in your Firebase web app config, then
add rules like these to your database. They allow public reads, and public writes only of
well-formed analyses: no deletes, server timestamps only, and each ticker refreshable once its
result is 30 minutes old.

```json
"Tradeviser-Lite": {
  ".read": true,
  "Analysis": {
    ".indexOn": ["analyzedAt"],
    "$ticker": {
      ".write": "newData.exists() && (!data.exists() || now >= data.child('analyzedAt').val() + 1800000)",
      ".validate": "$ticker.matches(/^[A-Z0-9-]{1,12}$/) && newData.hasChildren(['ticker', 'provider', 'analyzedAt', 'result'])",
      "ticker": { ".validate": "newData.isString() && newData.val().matches(/^[A-Z0-9.]{1,12}$/)" },
      "provider": { ".validate": "newData.val() === 'massive' || newData.val() === 'alphavantage'" },
      "analyzedAt": { ".validate": "newData.val() === now" },
      "result": {
        ".validate": "newData.hasChildren(['Ticker', 'Score', 'Signal'])",
        "Score": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 100" },
        "Signal": { ".validate": "newData.isString() && newData.val().matches(/^(STRONG BUY|BUY|HOLD|SELL|STRONG SELL)$/)" },
        "CompanyName": { ".validate": "newData.isString() && newData.val().length <= 200" },
        "$field": { ".validate": "$field.matches(/^[A-Za-z0-9]{1,30}$/) && (newData.isNumber() || newData.isBoolean() || (newData.isString() && newData.val().length <= 40))" }
      },
      "$other": { ".validate": false }
    }
  },
  "$other": { ".validate": false }
}
```

Because writes are public, anyone could save a made-up result for a ticker; the rules limit the
shape and frequency of writes, not their truth. Without the database settings the app works the
same, keeping its history in the browser.

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

### Deploy to Firebase Hosting

`firebase.json` deploys `dist/` to a Hosting site named `tradeviser-lite`. To deploy your own
copy, change `site` in `firebase.json` to a site in your Firebase project, pick the project with
`firebase use --add` (this writes `.firebaserc`, which is git-ignored), then run:

```bash
npm run deploy     # build + firebase deploy --only hosting
```

## Built with

[React](https://react.dev), [Vite](https://vite.dev), [Firebase](https://firebase.google.com) (optional shared cache) and [React Icons](https://react-icons.github.io/react-icons/).
