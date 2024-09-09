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
// In this example, the EHR is also storing the blueprintId for each patient.
const patients = JSON.parse(fs.readFileSync('data/patients.json'));

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

// Patients page
app.get('/patients', (req, res) => {
  res.render('patients', { items: patients });
});

// Patient chart
app.get('/patients/:id', async (req, res) => {
  const patientId = parseInt(req.params.id);
  const patient = patients.find(p => p.id === patientId);

  // Authenticate with the Blueprint server-to-server API.
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
  const clinicianId = process.env.BLUEPRINT_CLINICIAN_ID;
  const clinicianEmail = process.env.EHR_CLINICIAN_EMAIL;

  const authResponse = await fetch(
    `${process.env.BLUEPRINT_API_URL}/clinicians/${clinicianId}/authenticate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': accessToken,
        'X-Api-Key': `${process.env.BLUEPRINT_API_KEY}`,
      },
      body: JSON.stringify({ email: clinicianEmail }),
    }
  )

  const clinicianTokens = await authResponse.json();

  if (patient) {
    // render chart-with-iframe for an example on embedding the iframe without the Blueprint script
    res.render('chart', { item: patient, clinicianTokens: clinicianTokens, clinicianId: clinicianId });
  } else {
    res.status(404).send('Patient not found');
  }
});

// Note Generated webhook
app.post('/note', async (req, res) => {
  // Verify X-Blueprint-Signature
  const hmac = crypto.createHmac('sha256', process.env.BLUEPRINT_API_CLIENT_SECRET);
  hmac.update(req.body);
  const signature = hmac.digest('hex');

  if (req.headers['X-Blueprint-Signature'] !== signature)
    return res.status(401).send('Invalid signature');

  const {
    // progressNoteId,
    // sessionId,
    // clientId,
    // clinicianId,
    // clinicId,
    // organization,
    progressNoteUrl,
  } = req.body;

  const noteResponse = await fetch(progressNoteUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Access-Token': accessToken,
      'X-Api-Key': `${process.env.BLUEPRINT_API_KEY}`,
    },
  })

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

// Start the application.
app.listen(port, () => {
  console.log(`Sample EHR is running on http://localhost:${port}`);
});
