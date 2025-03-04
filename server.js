const express = require("express");
const path = require("path");
const app = express();
const bodyParser = require("body-parser");
const QRCode = require("qrcode");
const nodemailer = require("nodemailer");
const axios = require("axios");
const crypto = require("crypto");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

const viewsDir = path.join(__dirname, "views");
app.use(express.static(viewsDir));

app.use(express.static(path.join(__dirname, "./public")));
app.use(express.static(path.join(__dirname, "./images")));

const PORT = 4000;

// Replace 'your-secret-key' with a strong, secure key
const secretKey = "your-secret-key";

app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*"); // Replace with the actual origin
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.send();
});

app.listen(PORT, () => console.log(`server is running on ${PORT}`));

// Set up the Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "rucha.nandgirikar9@gmail.com",
    pass: "cerq toup vbnc xiva",
  },
});

app.get("/", (req, res) => {
  res.sendFile(path.join(viewsDir, "resQR_registration.html"));
});

app.post("/generate_qr", (req, res) => {
  try {
    const data = req.body.resQR_user.resQRText;
    if (!data) {
      return res
        .status(400)
        .json({ error: "Invalid or missing data in the request body." });
    }

    // Construct the URL using the received data
    const url = `http://localhost:4000/emergency?key=${data}`;

    QRCode.toFile(path.join(__dirname, "qrcode.png"), url, (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      const qrCodePath = path.join(__dirname, "qrcode.png");
      res.sendFile(qrCodePath);
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Your API endpoint for Google Places API
app.get("/hospitals", async (req, res) => {
  const { location, radius, key } = req.query;
  const apiUrlHospitals = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=${radius}&types=hospital&key=${key}`;
  // get Hospitals list
  try {
    const response = await axios.get(apiUrlHospitals);
    const hospitals = response.data.results;
    // Send the hospitals data in the response
    res.json({ hospitals });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/policeStations", async (req, res) => {
  const { location, radius, key } = req.query;
  // get Police Stations list
  const apiUrlPolice = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=${radius}&types=police&key=${key}`;
  try {
    const response = await axios.get(apiUrlPolice);
    const policeStations = response.data.results;
    // Send the  Police Stations data in the response
    res.json({ policeStations });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

function encrypt(text) {
  const cipher = crypto.createCipher("aes-256-cbc", secretKey);
  let encrypted = cipher.update(text, "utf-8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

app.get("/encrypt", async (req, res) => {
  // console.log(req);
  const originalText = req.query.key;

  if (!originalText) {
    return res.status(400).json({ error: "Text parameter is required." });
  }

  const encryptedText = encrypt(originalText);
  const decryptedText = decrypt(encryptedText);

  console.log(decryptedText);
  res.json({ encryptedText });
});

function decrypt(encryptedText) {
  const decipher = crypto.createDecipher("aes-256-cbc", secretKey);
  let decrypted = decipher.update(encryptedText, "hex", "utf-8");
  decrypted += decipher.final("utf-8");
  return decrypted;
}

const user = "John Doe"; // Replace with the actual user's name
const geoLocation = "Latitude: 40.7128, Longitude: -74.0060"; // Replace with the actual geo location

// Define the email body
const emailBody = `
Dear [Recipient's Name],

We regret to inform you that a ResQR user, ${user}, has met with an accident at the following location: ${geoLocation}.

Immediate action has been taken, and nearby hospitals and police stations have been notified about the incident. We request your urgent assistance in reaching the accident location at ${geoLocation} as soon as possible.

Updates regarding the passenger's health and details will be emailed to you shortly.

Your prompt attention to this matter is crucial. If you have any questions or require additional information, please contact us immediately.

Thank you for your cooperation.

Sincerely,
[Your Name]
[Your Contact Information]
`;

// Define the email options
const mailOptions = {
  from: "rucha.nandgirikar9@gmail.com",
  to: "ar.triaksha@gmail.com",
  subject: "'Emergency: resQR User Accident Notification',",
  text: emailBody,
};

// Define a route to handle the POST request
app.post("/send-email", (req, res) => {
  // const { to, subject, text } = req.body;

  // Define the email options
  // const mailOptions = {
  //   from: "rucha.nandgirikar9@gmail.com",
  //   to: "ruchaa.nandgirikar0998@gmail.com",
  //   subject: "Subject of the email",
  //   text: "Body of the email",
  // };
  console.log(mailOptions);

  // Send the email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    } else {
      console.log("Email sent: " + info.response);
      res.status(200).send("Email sent successfully");
    }
  });
});

// Page to handle the redirection
app.get("/emergency", (req, res) => {
  // Extract the 'key' parameter from the query string
  const key = req.query.key;

  // Perform any actions with the key, for example, log it
  res.sendFile(path.join(viewsDir, "emergency_form.html"), (err) => {
    if (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  });
});
