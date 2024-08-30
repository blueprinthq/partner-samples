require('dotenv').config()
const express = require('express');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

// Set up sample data that represents what is in the EHR database.
// In this example, the EHR is also storing the blueprintId for each patient.
const patients = [
  { id: 1, name: 'Ernie Banks', age: 35, diagnosis: 'Adjustment Disorder', blueprintId: '4480a2ec-66e5-11ef-9314-0ad8416d752d' },
  { id: 2, name: 'Pepper Potts', age: 48, diagnosis: 'Generalized Anxiety Disorder', blueprintId: '59e6ab22-66e5-11ef-93ae-0ad8416d752d' }
];

// Note that this sample password does not match the Blueprint password for this clinician.
// This is intended to be the EHR password for this user.
const providerUsername = 'sample.provider@example.com'
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
