require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;

// Content Security Policy.
//
// A restrictive CSP is the single most common reason the Blueprint widget
// appears to do nothing: the loader script or its iframe gets blocked and the
// only sign is a console error. Your application needs to allow:
//
//   script-src  the embed host, which serves index.min.js
//   frame-src   BOTH widget origins -- which one is used depends on your
//               isMinifiedView / isMiniWidgetV2 settings, and that changed for
//               most partners in early 2026, so allow both
//
// The chart pages configure the widget from an inline <script>, which a strict
// script-src blocks. Rather than opening that up with 'unsafe-inline', each
// request gets a fresh nonce that the templates stamp onto their inline
// scripts. That is the pattern a production application should use.
//
// Note style-src deliberately keeps 'unsafe-inline': these templates use inline
// style="..." attributes, which a nonce cannot cover. Adding a nonce to
// style-src would make the browser *ignore* 'unsafe-inline' for that directive
// and break them. An application without inline styles should drop
// 'unsafe-inline' here and pass `cspNonce` in window.blueprintSettings so the
// stylesheet the widget injects is allowed -- see the README.
//
// Blueprint also loads fonts inside its own iframe, which is governed by
// Blueprint's CSP rather than yours. You only need font origins here if you
// pass your own via the `fontHref` setting.
//
// This runs before express.static so the policy covers static assets too.
//
// See https://developer.blueprint.ai for the current origins per environment.
app.use((_req, res, next) => {
  const scriptOrigins = process.env.CSP_SCRIPT_ORIGINS ?? '';
  const frameOrigins = process.env.CSP_FRAME_ORIGINS ?? '';

  const nonce = crypto.randomBytes(16).toString('base64');
  // Templates read this as `cspNonce` -- Express merges res.locals into the
  // render locals.
  res.locals.cspNonce = nonce;

  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' ${scriptOrigins}`.trim(),
      `frame-src ${frameOrigins}`.trim(),
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
    ].join('; ')
  );

  next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Blueprint signs the exact bytes it sends, so verifying a webhook signature
// requires the raw request body. Re-serializing the parsed body with
// JSON.stringify() only produces a matching string by luck -- it breaks on
// non-ASCII content, or if a proxy or parser normalizes anything.
//
// body-parser's `verify` hook is the standard way to keep a copy. It has to go
// here rather than as route middleware on /webhook-listener, because by the
// time a route runs this parser has already consumed the stream.
app.use(
  bodyParser.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


// Exchange the partner credentials for a server-to-server access token.
//
// A production integration should cache this token and reuse it until shortly
// before it expires (the response includes `expiresIn`, currently 3600
// seconds). This sample re-authenticates on every call to keep the flow
// obvious.
async function getPartnerAccessToken() {
  const response = await fetch(
    `${process.env.BLUEPRINT_API_URL}/partners/authenticate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': `${process.env.BLUEPRINT_API_KEY}`,
      },
      body: JSON.stringify({
        clientId: process.env.BLUEPRINT_API_CLIENT_ID,
        clientSecret: process.env.BLUEPRINT_API_CLIENT_SECRET,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to get partner access token: ${response.status} ${await response.text()}`
    );
  }

  const { accessToken } = await response.json();
  return accessToken;
}

// Root route - redirect to login
app.get('/', (_, res) => {
  res.redirect('/login');
});

// Set up sample data that represents what is in the EHR database.
// In this example, the EHR is also storing the Blueprint id for each patient.
// In a real application this patient data would come from the EHR database.
const patients = JSON.parse(fs.readFileSync(`data/patients.${process.env.ENVIRONMENT}.json`));

app.get('/health', (_, res) => {
  res.send('OK');
});

// Login page
app.get('/login', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Note that this sample password does not match the Blueprint password for this clinician.
  // This is intended to be the EHR password for this user.
  if (username === process.env.EHR_CLINICIAN_EMAIL && password === process.env.EHR_CLINICIAN_PASSWORD) {
    res.redirect('/patients');
  } else {
    res.status(401).send('Invalid credentials, please try again.');
  }
});

// Patients list
app.get('/patients', (_, res) => {
  res.render('patients', { items: patients });
});

// Patient chart
app.get('/patients/:id', async (req, res) => {
  const patientId = req.params.id; // This is the alphanumeric id of the patient in the EHR.
  const patient = patients.find(p => p.id === patientId);
  const chartStyle = req.query.chartStyle;

  // Authenticate with the Blueprint server-to-server API using your partner API credentials.
  let accessToken;
  try {
    accessToken = await getPartnerAccessToken();
  } catch (error) {
    console.error('Error getting partner access token: ', error);
    return res.status(500).send('Error getting partner access token');
  }

  // Automatically authenticate the clinician.
  // In this example the EHR is storing the Blueprint id for the clinician.
  // As long as this clinician id is part of a clinic and organization that
  // these partner credentials have access to, this is all that is required.
  // In a real application, you would look up the clincian id via API and
  // then likely cache it in the EHR database.
  const clinicianId = process.env.BLUEPRINT_CLINICIAN_ID;

  const authResponse = await fetch(
    `${process.env.BLUEPRINT_API_URL}/clinicians/${clinicianId}/authenticate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': accessToken,
        'X-Api-Key': `${process.env.BLUEPRINT_API_KEY}`,
      },
      // This endpoint takes no request body.
    }
  );

  if (!authResponse.ok) {
    console.error('Error authenticating: ', await authResponse.text());
    return res.status(500).send('Error authenticating clinician');
  }

  const clinicianTokens = await authResponse.json();

  // Render the patient chart with the selected patient and clinician information.
  if (patient) {
    let pageTemplate = 'chart';

    switch (chartStyle) {
      case 'uiOnly':
        pageTemplate = 'chart-ui-only';
        break;
      case 'miniWidget':
        pageTemplate = 'chart-mini-widget';
        break;
      case 'iframe':
        pageTemplate = 'chart-with-iframe';
        break;
      default:
        break;
    }

    // The patient object in this example is expected to have the Blueprint id.
    // The clinicianTokens and clinicianId values are not used by the chart-ui-only template.
    res.render(pageTemplate, { item: patient, clinicianTokens: clinicianTokens, clinicianId: clinicianId });
  } else {
    res.status(404).send('Patient not found');
  }
});

// Verify the X-Blueprint-Signature header against the raw request body.
//
// The signature is an HMAC-SHA256 hex digest keyed with your partner
// clientSecret -- not your API key. Compare in constant time: a plain !==
// leaks timing information about how much of the digest matched.
function hasValidSignature(req) {
  const expected = crypto
    .createHmac('sha256', process.env.BLUEPRINT_API_CLIENT_SECRET)
    .update(req.rawBody)
    .digest('hex');

  const received = Buffer.from(String(req.headers['x-blueprint-signature'] ?? ''), 'utf8');
  const computed = Buffer.from(expected, 'utf8');

  // timingSafeEqual throws on a length mismatch, so check length first.
  return received.length === computed.length && crypto.timingSafeEqual(received, computed);
}

// Fetch one of the resource URLs supplied in a webhook payload.
async function fetchBlueprintResource(url) {
  const accessToken = await getPartnerAccessToken();

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Access-Token': accessToken,
      'X-Api-Key': `${process.env.BLUEPRINT_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// This is an example implementation of a webhook listener for events fired from
// the Blueprint API. All event types are delivered to the single callbackUrl
// configured for your partner organization, so branch on eventType.
app.post('/webhook-listener', async (req, res) => {
  try {
    if (!hasValidSignature(req)) {
      // A bad signature will never become valid, so a non-retryable 401 is the
      // right answer here.
      return res.status(401).send('Invalid signature');
    }

    const { eventType, payload } = req.body;

    // Note the payloads differ by event: only the progress note events carry
    // progressNoteUrl. Reading it unconditionally would fetch `undefined` on
    // half of these.
    switch (eventType) {
      case 'progress_note_generated':
      case 'progress_note_regenerated':
      case 'progress_note_finalized': {
        // `organization` is also present on these payloads but is a deprecated
        // duplicate of organizationId -- use organizationId.
        const { progressNoteId, sessionId, sessionExternalId, clientId, clinicianId, clinicId, organizationId, progressNoteUrl } = payload;

        const {
          id,
          note, // Ordered array of sections, each with key, title and content.
          template, // Describes the note type and the sections it should contain.
          preferences, // The preferences used to generate the note.
        } = await fetchBlueprintResource(progressNoteUrl);

        console.log(`${eventType}: stored note ${id} for session ${sessionId}`);
        break;
      }

      case 'transcript_ready': {
        const { sessionId, transcriptUrl } = payload;
        const { transcriptItems } = await fetchBlueprintResource(transcriptUrl);

        console.log(`transcript_ready: ${transcriptItems.length} items for session ${sessionId}`);
        break;
      }

      case 'mdm_elements_identified': {
        // Prescriber note types only.
        const { sessionId, mdmUrl } = payload;
        const mdm = await fetchBlueprintResource(mdmUrl);

        console.log(`mdm_elements_identified: session ${sessionId}`, mdm.problemsAddressed);
        break;
      }

      case 'session_transcript_error': {
        // No resource URL on this one -- transcription failed, so no transcript
        // or progress note will be produced for this session.
        const { sessionId, error } = payload;

        console.error(`session_transcript_error: session ${sessionId}: ${error}`);
        break;
      }

      case 'assessment_completed': {
        // This payload is client-scoped rather than session-scoped, and uses
        // patientId where every other event uses clientId.
        const { patientId, assessmentScores } = payload;

        for (const { assessmentScoreUrl } of assessmentScores) {
          const { assessmentId, score } = await fetchBlueprintResource(assessmentScoreUrl);
          console.log(`assessment_completed: ${assessmentId} scored ${score} for client ${patientId}`);
        }
        break;
      }

      default:
        // Acknowledge anything unrecognized. Blueprint retries only on 5xx, 408
        // and 429 -- any other non-2xx drops the event permanently, so
        // returning an error for a new event type would lose it.
        console.warn(`Unrecognized Blueprint event type: ${eventType}`);
        break;
    }

    res.status(200).send('ok');
  } catch (error) {
    // A 5xx tells Blueprint to retry. Use it for anything transient, and never
    // return a 4xx just because processing failed on our side.
    console.error('Webhook processing error:', error);
    res.status(500).send('Error processing webhook');
  }
});

// Start the sample EHR application.
app.listen(port, () => {
  console.log(`Sample EHR is running on http://localhost:${port}`);
});
