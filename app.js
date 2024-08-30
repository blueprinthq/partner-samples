const express = require('express');
const path = require('path');

const app = express();
const port = 3333;

// Set up sample data that represents what is in the EHR database.
// In this example, the EHR is also storing the blueprintId for each patient.
const patients = [
  { id: 1, name: 'John Appleseed', age: 35, diagnosis: 'Adjustment Disorder', blueprintId: '94669402-55c3-11ef-84f1-0ad8416d752d' },
  { id: 2, name: 'Roger Client', age: 48, diagnosis: 'Generalized Anxiety Disorder', blueprintId: '21cbbe44-5691-11ef-8ce3-0ad8416d752d' }
];

// Note that this sample password does not match the Blueprint password for this clinician.
// This is intended to be the EHR password for this user.
const providerUsername = 'roger+staging+partner@blueprint-health.com'
const providerPassword = 'password'

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === providerUsername && password === providerPassword) {
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
app.get('/patients/:id', (req, res) => {
  const patientId = parseInt(req.params.id);
  const patient = patients.find(p => p.id === patientId);

  if (patient) {
      res.send(`
          <script>
            window.blueprintSettings = {
              containerId: 'blueprint-container'
            }
          </script>
          <script src="https://embed.stagingprint.com/index.min.js"></script>
          <script>Blueprint.selectClient(${patient.id})</script>
          <h2>Patient Profile</h2>
          <p><strong>Name:</strong> ${patient.name}</p>
          <p><strong>Age:</strong> ${patient.age}</p>
          <p><strong>Diagnosis:</strong> ${patient.diagnosis}</p>
          <a href="/patients">Back to Patient List</a>
          <div id="blueprint-container"></div>
      `);
  } else {
      res.status(404).send('Patient not found');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Sample EHR is running on http://localhost:${port}`);
});
