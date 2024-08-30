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
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

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

// Patients page
app.get('/patients', (req, res) => {
  res.render('patients', { items: patients });
});

// Patient chart
app.get('/patients/:id', (req, res) => {
  const patientId = parseInt(req.params.id);
  const patient = patients.find(p => p.id === patientId);

  if (patient) {
    res.render('chart', { item: patient });
  } else {
    res.status(404).send('Patient not found');
  }
});

// Start the application.
app.listen(port, () => {
  console.log(`Sample EHR is running on http://localhost:${port}`);
});
