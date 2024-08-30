require('dotenv').config()
const express = require('express');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const port = 3333;

// Sample patient data
const patients = [
  { id: process.env.BLUEPRINT_CLIENT_ID, name: 'John Doe', age: 35, condition: 'Flu' },
  { id: process.env.BLUEPRINT_CLIENT_ID, name: 'Jane Smith', age: 28, condition: 'Asthma' },
  { id: process.env.BLUEPRINT_CLIENT_ID, name: 'Michael Johnson', age: 42, condition: 'Diabetes' }
];

const clinicianId = process.env.BLUEPRINT_CLINICIAN_ID;

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Parse form data
app.use(express.urlencoded({ extended: true }));

// Serve the login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Handle form submission
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // Basic validation and response
  if (username === 'admin' && password === 'password') {
    res.redirect('/patients');
  } else {
    res.send('Invalid credentials, please try again.');
  }
});

// Route for the patient list page
app.get('/patients', (req, res) => {
  let patientList = '<h2>Patient List</h2><ul>';
  patients.forEach(patient => {
      patientList += `<li><a href="/patients/${patient.id}">${patient.name}</a></li>`;
  });
  patientList += '</ul>';
  res.send(patientList);
});

// Route for individual patient profiles
app.get('/patients/:id', async (req, res) => {
  const patientId = req.params.id;
  const patient = patients.find(p => p.id === patientId);

  // Retrieve an api access token from Blueprint
  const tokenResponse = await fetch(
    `${process.env.BLUEPRINT_API_URL}/partners/authenticate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': `${process.env.BLUEPRINT_API_KEY}`,
      },
      body: JSON.stringify({
        clientId: process.env.BLUEPRINT_CLIENT_ID,
        clientSecret: process.env.BLUEPRINT_CLIENT_SECRET,
      }),
    }
  )

  const { accessToken } = await tokenResponse.json();

  // authenticate the clinician with Blueprint
  const authResponse = await fetch(
    `${process.env.BLUEPRINT_API_URL}/clinicians/${clinicianId}/authenticate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': accessToken,
        'X-Api-Key': `${process.env.BLUEPRINT_API_KEY}`,
      },
      body: JSON.stringify({ email: 'clinician+email@email.com' }),
    }
  )

  const clinicianTokens = await authResponse.json();

  if (patient) {
      res.send(`
        <script>
          window.blueprintSettings = {
            containerId: 'blueprint-container'
          }
        </script>
        <script src="https://embed.stagingprint.com/index.min.js"></script>
        <script>Blueprint.authenticate(${JSON.stringify(clinicianTokens)}, ${JSON.stringify(clinicianId)})</script>
        <script>Blueprint.selectClient(${JSON.stringify(patient.id)})</script>
        <h2>Patient Profile</h2>
        <p><strong>Name:</strong> ${patient.name}</p>
        <p><strong>Age:</strong> ${patient.age}</p>
        <p><strong>Condition:</strong> ${patient.condition}</p>
        <a href="/patients">Back to Patient List</a>
        <div id="blueprint-container"></div>
      `);
  } else {
      res.status(404).send('Patient not found');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
