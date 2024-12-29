const express = require("express");
const cors = require("cors");
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const credentials = require('./key.json');
const functions = require("firebase-functions")

const app = express();

app.use(cors());
admin.initializeApp({
  credential: admin.credential.cert(credentials),
});

const db = admin.firestore();
app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password
    });

    // Optionally, create a JWT token for the user
    const token = jwt.sign({ uid: userRecord.uid, email }, JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({ token });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});



app.post("/login", async (req, res) => {
    const { email, password } = req.body;
  
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }
  
    try {
      const user = await admin.auth().getUserByEmail(email);
      
      const token = await admin.auth().createCustomToken(user.uid);
  
      res.status(200).json({
        token,
        user: {
          email: user.email,
          uid: user.uid,
        },
      });
    } catch (error) {
      console.error("Error during login:", error);
      if (error.code === "auth/user-not-found") {
        return res.status(401).json({ message: "Invalid email or password." });
      }
      res.status(500).json({ message: "Internal server error." });
    }
  });
  
  const authenticateUser = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error("Missing or invalid Authorization header.");
        return res.status(401).json({ message: 'Unauthorized. Missing or invalid token.' });
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        console.log("User authenticated:", decodedToken);
        next();
    } catch (error) {
        console.error("Token verification failed:", error.message);
        return res.status(401).json({ message: 'Unauthorized. Invalid or expired token.' });
    }
};

const USERS_COLLECTION = "users";

app.post("/users", authenticateUser, async (req, res) => {
  try {
    const { firstname, lastname, email } = req.body;

    if (!firstname || !lastname || !email) {
      return res.status(400).send("firstname, lastname, and email are required.");
    }

    const newUser = await db.collection(USERS_COLLECTION).add({ firstname, lastname, email });
    res.status(201).send({ id: newUser.id, firstname, lastname, email });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Get all users (Only allowed for authenticated users)
app.get("/users", authenticateUser, async (req, res) => {
  try {
    const snapshot = await db.collection(USERS_COLLECTION).get();
    const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.status(200).send(users);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Get a user by ID (Only allowed for authenticated users)
app.get("/users/:id", authenticateUser, async (req, res) => {
  try {
    const userId = req.params.id;
    const userDoc = await db.collection(USERS_COLLECTION).doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).send("User not found.");
    }

    res.status(200).send({ id: userDoc.id, ...userDoc.data() });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Update a user by ID (Only allowed for authenticated users)
app.put("/users/:id", authenticateUser, async (req, res) => {
  try {
    const { id: userId } = req.params;
    const { firstname, lastname, email } = req.body;

    // Validate the request body
    if (!firstname && !lastname && !email) {
      return res.status(400).send("At least one field (firstname, lastname, or email) must be provided.");
    }

    // Get the user document from Firestore
    const userRef = db.collection(USERS_COLLECTION).doc(userId);
    const userDoc = await userRef.get();

    // Check if the user exists
    if (!userDoc.exists) {
      return res.status(404).send("User not found.");
    }

    // Update the user document with the provided fields
    const updatedData = {};
    if (firstname) updatedData.firstname = firstname;
    if (lastname) updatedData.lastname = lastname;
    if (email) updatedData.email = email;

    await userRef.update(updatedData);

    // Send a success response
    res.status(200).send({
      message: "User updated successfully.",
      data: { id: userId, ...updatedData },
    });
  } catch (error) {
    res.status(500).send({
      error: true,
      message: "An error occurred while updating the user.",
      details: error.message,
    });
  }
});

// Delete a user by ID (Only allowed for authenticated users)
app.delete("/users/:id", authenticateUser, async (req, res) => {
  try {
    const userId = req.params.id;
    const userRef = db.collection(USERS_COLLECTION).doc(userId);

    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).send("User not found.");
    }

    await userRef.delete();
    res.status(200).send("User deleted successfully.");
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Run the Express app on port 4500
const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

exports.app = functions.https.onRequest(app);