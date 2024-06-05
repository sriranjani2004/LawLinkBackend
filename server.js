const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql2');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const port = 5000;

app.use(cors());
app.use(bodyParser.json());

const db = mysql.createConnection({
  host: 'library-project-sriranjania2004-0677.a.aivencloud.com',
  user: 'avnadmin',
  password: 'AVNS_MFT-ZoJunIZRKw_BG8c', // Enter your MySQL password if any
  database: 'lawlink',
  port: '16947'
});

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

db.connect(err => {
  if (err) {
    throw err;
  }
  console.log('MySQL connected...');
});

db.query(`CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  firstName VARCHAR(255) NOT NULL,
  lastName VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL
)`, (err) => {
  if (err) {
    console.error('Error creating users table:', err);
  } else {
    console.log('Users table created or already exists');
  }
});

db.query(`CREATE TABLE IF NOT EXISTS appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  dob DATE NOT NULL,
  place VARCHAR(255) NOT NULL,
  caseDescription TEXT NOT NULL,
  dateOfAppointment DATE NOT NULL
)`, (err) => {
  if (err) {
    console.error('Error creating appointments table:', err);
  } else {
    console.log('Appointments table created or already exists');
  }
});

app.post('/register', async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  try {
    const hashedPassword = await bcryptjs.hash(password, 10);

    const sql = 'INSERT INTO users (firstName, lastName, email, password) VALUES (?, ?, ?, ?)';
    db.query(sql, [firstName, lastName, email, hashedPassword], (err, result) => {
      if (err) {
        console.error('Error registering user:', err);
        res.status(500).send('Error registering user');
      } else {
        res.status(201).send('User registered successfully');
      }
    });
  } catch (error) {
    console.error('Error hashing password:', error);
    res.status(500).send('Error registering user');
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log(`Received login request for email: ${email}`);

  const sql = 'SELECT * FROM users WHERE email = ?';
  db.query(sql, [email], async (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send({ message: 'Error on the server.' });
    }
    if (results.length === 0) {
      console.log('User not found');
      return res.status(404).send({ message: 'No user found.' });
    }

    const user = results[0];
    const passwordIsValid = await bcryptjs.compare(password, user.password);

    if (!passwordIsValid) {
      console.log('Invalid password');
      return res.status(401).send({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, role: 'admin' }, 'your_jwt_secret_key', { expiresIn: 86400 }); // Assume role is admin for demo
    res.status(200).send({ token });
  });
});

app.post('/bookappointment', (req, res) => {
  const { name, dob, place, caseDescription, dateOfAppointment } = req.body;
  console.log(`Received booking request from ${name} for ${dateOfAppointment}`);

  const sql = 'INSERT INTO bookings(name, dob, place, caseDescription, dateOfAppointment) VALUES (?, ?, ?, ?, ?)';
  db.query(sql, [name, dob, place, caseDescription, dateOfAppointment], (err, result) => {
    if (err) {
      console.error('Error saving booking:', err);
      res.status(500).send('Error saving booking');
    } else {
      console.log('Booking saved');
      sendEmailNotification(name, dateOfAppointment, res); // Send email notification
    }
  });
});
app.get('/bookings', (req, res) => {
  const sql = 'SELECT * FROM bookings';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching bookings:', err);
      res.status(500).send('Error fetching bookings');
    } else {
      res.status(200).json(results);
    }
  });
});

const sendEmailNotification = (name, dateOfAppointment, res) => {
  const mailOptions = {
    from: process.env.EMAIL_USER, // Replace with your email
    to: 'sriranjania.cse2021@citchennai.net', // Email to send notification
    subject: 'Appointment Booked',
    text: `Hello Sriranjani,\n\n${name} has booked an appointment for ${dateOfAppointment}.\n\nBest regards,\nYour App Team`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
      res.status(500).send('Error sending email');
    } else {
      console.log('Email sent:', info.response);
      res.status(200).send('Booking saved and email sent');
    }
  });
};

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
