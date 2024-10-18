require('dotenv').config()
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
const fetch = require('node-fetch');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Set up sample data that represents what is in the EHR database.
// In this example, the EHR is also storing the Blueprint id for each patient.
// In a real naturally this patient data would come from the EHR database.
const patients = JSON.parse(fs.readFileSync(`data/patients.${process.env.ENVIRONMENT}.json`));

// Login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // Note that this sample password does not match the Blueprint password for this clinician.
  // This is intended to be the EHR password for this user.
  if (username === process.env.EHR_CLINICIAN_EMAIL && password === process.env.EHR_CLINICIAN_PASSWORD) {
    res.redirect('/patients');
  } else {
    res.send('Invalid credentials, please try again.');
  }
});

// Patients list
app.get('/patients', (req, res) => {
  res.render('patients', { items: patients });
});

// Patient chart
app.get('/patients/:id', async (req, res) => {
  const patientId = parseInt(req.params.id);
  const patient = patients.find(p => p.id === patientId);

  // Authenticate with the Blueprint server-to-server API using your partner API credentials.
  const tokenResponse = await fetch(
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

  const { accessToken } = await tokenResponse.json();

  // Automatically authenticate the clinician.
  // In this example the EHR is storing the Blueprint id for the clinician.
  // As long as this clinician id is part of a clinic and organization that
  // these partner credentials have access to, this is all that is required.
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
      body: JSON.stringify(),
    }
  )

  const clinicianTokens = await authResponse.json();

  if (patient) {
    // Render "chart-with-iframe" instead for an example of embedding as an IFRAME without the Blueprint script.
    res.render('chart', { item: patient, clinicianTokens: clinicianTokens, clinicianId: clinicianId });
  } else {
    res.status(404).send('Patient not found');
  }
});

// This is an example implementation of a webhook listener for events fired from the Blueprint API.
app.post('/note', async (req, res) => {
  // Verify X-Blueprint-Signature.
  const hmac = crypto.createHmac('sha256', process.env.BLUEPRINT_API_CLIENT_SECRET);
  hmac.update(req.body);
  const signature = hmac.digest('hex');

  if (req.headers['X-Blueprint-Signature'] !== signature)
    return res.status(401).send('Invalid signature');

  // Commented out below are other fields in the webhook payload that may be useful.
  const {
    // progressNoteId,
    // sessionId,
    // clientId,
    // clinicianId,
    // clinicId,
    // organization,
    progressNoteUrl,
  } = req.body;

  // Given the progressNoteUrl, fetch the note content.
  const noteResponse = await fetch(progressNoteUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Access-Token': accessToken,
      'X-Api-Key': `${process.env.BLUEPRINT_API_KEY}`,
    },
  })

  // Commented out below are other fields in the note response that may be useful.
  const {
    // id,
    // sessionId,
    note,
    // template: {
    //   noteType,
    //   sessionType,
    //   title,
    //   sections,
    // },
    // preferences,
  } = await noteResponse.json();

  res.send();
});

// Start the sample EHR application.
app.listen(port, () => {
  console.log(`Sample EHR is running on http://localhost:${port}`);
});
