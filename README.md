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

Review Blueprint Partner API v2 documentation at
[https://developer.blueprint.ai](https://developer.blueprint.ai) for more information
and API reference.
