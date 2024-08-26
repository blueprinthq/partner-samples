const express = require('express');
const path = require('path');

const app = express();
const port = 3000;

// Sample patient data
const patients = [
  { id: 1, name: 'John Doe', age: 35, condition: 'Flu' },
  { id: 2, name: 'Jane Smith', age: 28, condition: 'Asthma' },
  { id: 3, name: 'Michael Johnson', age: 42, condition: 'Diabetes' }
];

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
app.get('/patients/:id', (req, res) => {
  const patientId = parseInt(req.params.id);
  const patient = patients.find(p => p.id === patientId);

  if (patient) {
      res.send(`
          <h2>Patient Profile</h2>
          <p><strong>Name:</strong> ${patient.name}</p>
          <p><strong>Age:</strong> ${patient.age}</p>
          <p><strong>Condition:</strong> ${patient.condition}</p>
          <a href="/patients">Back to Patient List</a>
      `);
  } else {
      res.status(404).send('Patient not found');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
