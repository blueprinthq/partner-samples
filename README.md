# Blueprint Partner API Samples

This repository includes a sample application that demonstrates how to use the 
Blueprint Partner API v2 to integrate Blueprint into your application.

## Getting Started

1. Clone the repository.
2. Make sure you have `node` and `npm` installed. This sample application has been built and tested with Node.js v24.18.0 (see `.nvmrc`).
3. Run `npm install` to install the dependencies.
4. Configure your environment settings in a new `.env-cmdrc.json` file based on the sample with your Blueprint Partner API v2 credentials: `cp .env-cmdrc.json.sample .env-cmdrc.json`
5. Set up the environment-specific configuration (see Environment Configuration below).
6. Run `npm run start:staging` to start the application using the Blueprint Partner API v2 sandbox environment (or see "Running the Application" section below to see setups for local/staging/prod).

## Running the Application

### Local Development (without Docker)

**Local Environment (default):**
```bash
npm run start
```
- Uses `local` environment configuration
- Loads patient data from `data/patients.local.json`
- Runs on port 3333

**Staging Environment:**
```bash
npm run start:staging
```
- Uses `staging` environment configuration  
- Loads patient data from `data/patients.staging.json`
- Runs on port 3333

**Production Environment:**
```bash
npm run start:production
```
- Uses `production` environment configuration
- Loads patient data from `data/patients.production.json`
- Runs on port 3333

## Application Access

Once running, access the application at: http://localhost:3333

The application will redirect you to the login page where you can authenticate with the configured clinician credentials.

## Environment Configuration

The application uses environment-specific configurations stored in `.env-cmdrc.json`:

- `local` - Local development environment
- `staging` - Blueprint Partner API v2 sandbox environment  
- `production` - Blueprint Partner API v2 production environment

Each environment loads patient data from corresponding JSON files in the `data` directory:
- `data/patients.local.json`
- `data/patients.staging.json`
- `data/patients.production.json`

You can update these files with patients that match the clients in the Blueprint clinic that you are connecting your partner application to.

## Content Security Policy

If your application sends a CSP header, the Blueprint widget needs two
allowances or it silently fails to appear — the loader script or its iframe is
blocked, and the only sign is a console error.

This sample sets a CSP in `app.js` from two environment variables, so you can
see a working configuration rather than having to derive one:

| Variable | Purpose |
|---|---|
| `CSP_SCRIPT_ORIGINS` | Host serving `index.min.js` |
| `CSP_FRAME_ORIGINS` | Widget iframe origins |

Values per environment are in `.env-cmdrc.json.sample`:

```
# staging
CSP_SCRIPT_ORIGINS  https://embed.staging.blueprint.ai
CSP_FRAME_ORIGINS   https://clinician.staging.blueprint.ai https://mini-widget.staging.blueprint.ai

# production
CSP_SCRIPT_ORIGINS  https://embed.blueprint.ai
CSP_FRAME_ORIGINS   https://clinician.blueprint.ai https://mini-widget.blueprint.ai
```

**Allow both `frame-src` origins.** Which one the widget uses depends on your
`isMinifiedView` and `isMiniWidgetV2` settings, and the default changed for most
partners in early 2026. Allowing only the one you expect today is a latent
break.

### Inline scripts need a nonce

The chart pages configure the widget from an inline `<script>` — that is how
`window.blueprintSettings` gets set. A strict `script-src` blocks inline scripts,
which means **the widget silently never initializes**: no error on the page, just
a CSP violation in the console and nothing rendered.

Rather than opening that up with `'unsafe-inline'`, `app.js` generates a fresh
nonce per request, adds it to `script-src`, and exposes it to the templates:

```js
const nonce = crypto.randomBytes(16).toString('base64');
res.locals.cspNonce = nonce;
// script-src 'self' 'nonce-<nonce>' <your embed origin>
```

Each inline script then carries it:

```html
<script nonce="<%= cspNonce %>">
  window.blueprintSettings = { /* ... */ }
</script>
```

The `<script src="...">` that loads the widget does **not** need a nonce — it is
allowed by the origin in `script-src`.

### Why `style-src` still has `'unsafe-inline'`

Because the widget injects its own stylesheet into your page. This sample keeps
`'unsafe-inline'` rather than threading a nonce through to it.

The stricter option is to drop `'unsafe-inline'` from `style-src` and pass the
same per-request nonce to the widget, so the stylesheet it injects carries your
nonce:

```javascript
window.blueprintSettings = {
  containerId: 'blueprint-container',
  cspNonce: 'YOUR_PER_REQUEST_NONCE'
}
```

It has to be one or the other. This is a CSP subtlety worth knowing: **if you add
a nonce to a directive, the browser ignores `'unsafe-inline'` for that
directive**. So if your page still relies on inline `style="..."` attributes
anywhere, adding a nonce to `style-src` will break them.

## Receiving Webhooks

`POST /webhook-listener` in `app.js` is a worked example of receiving Blueprint
webhooks. It is the most instructive route in this sample and is worth reading
before you write your own handler.

### Pointing Blueprint at your listener

Blueprint delivers to a single `callbackUrl` per partner organization per
environment. Set it once:

```bash
curl -X PATCH "$BLUEPRINT_API_URL/partners/$PARTNER_ID" \
  -H 'Content-Type: application/json' \
  -H "Access-Token: $ACCESS_TOKEN" \
  -H "X-API-Key: $BLUEPRINT_API_KEY" \
  -d '{"callbackUrl":"https://your-tunnel.example.com/webhook-listener"}'
```

Read the current value with `GET /partners`.

Blueprint has to reach the URL, so `localhost` will not work while developing.
Use a tunnel and point the sandbox `callbackUrl` at it:

```bash
ngrok http 3333        # or: cloudflared tunnel --url http://localhost:3333
```

Remember to set `callbackUrl` back when you are done.

### Two things the example is careful about

**Verify against the raw body.** Blueprint signs the exact bytes it transmits.
The listener keeps a copy via body-parser's `verify` hook and HMACs that, rather
than re-serializing the parsed body with `JSON.stringify()` — which only matches
by luck and breaks if anything reformats the payload in transit. Comparison is
constant-time via `crypto.timingSafeEqual`.

The signing key is your **`clientSecret`**, not your API key.

**Return 2xx for events you do not recognize.** Blueprint retries only on 5xx,
408 and 429. Any other non-2xx drops the event permanently with no notification,
so a 4xx on an unfamiliar `eventType` silently loses it. Use 5xx for genuinely
transient failures so the delivery is retried.

### Event types

All seven are delivered to the same URL. Note that the payloads differ — only
the progress note events carry `progressNoteUrl`.

| Event | Resource URL in payload |
|---|---|
| `progress_note_generated` | `progressNoteUrl` |
| `progress_note_regenerated` | `progressNoteUrl` |
| `progress_note_finalized` | `progressNoteUrl` |
| `transcript_ready` | `transcriptUrl` |
| `mdm_elements_identified` | `mdmUrl` |
| `session_transcript_error` | none — carries `error` |
| `assessment_completed` | `assessmentScoreUrl` per score |

## Developer Notes

This sample application demonstrates typical integration scenarios:

1. Host the embedded UI in your application and let Blueprint take care of the rest ("drop-in UI Only").
2. Host the embedded UI in your application customize how the UI integrates with your application front end ("UI Only").
3. Host the embedded UI in your application and deepen the integration by using the API ("UI + API").
4. Build your own UI and completely customize the integration via the API ("API Only").

### Switching between the chart styles

Each style is a separate template, selected with the `chartStyle` query
parameter on the patient chart route. The tabs at the top of the chart page set
it for you.

| URL | Template | Shows |
|---|---|---|
| `/patients/:id` | `views/chart.ejs` | Embedded UI driven by the backend APIs (UI + API) |
| `/patients/:id?chartStyle=uiOnly` | `views/chart-ui-only.ejs` | Embedded UI with no backend API calls |
| `/patients/:id?chartStyle=miniWidget` | `views/chart-mini-widget.ejs` | Compact embedded UI with custom styling |

Earlier versions of this sample shipped a fourth template that hand-rolled the
iframe and spoke the `BP_*` postMessage protocol directly. That approach is no
longer supported and has been removed. Load the embed script from
`BLUEPRINT_WIDGET_URL` and drive it through the `window.Blueprint` API, as all
three templates above do.

### Supply chain

`.npmrc` sets `min-release-age=21`, which refuses npm packages published in the
last 21 days, with `min-release-age-exclude=@blueprinthq/*` so Blueprint's own
packages are exempt. This narrows the window in which a compromised release can
be pulled into a build. Worth copying into your own project.

Review Blueprint Partner API v2 documentation at
[https://developer.blueprint.ai](https://developer.blueprint.ai) for more information
and API reference.
