const express = require("express");
const cors = require("cors");
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const credentials = require('./key.json');
const functions = require("firebase-functions")

const app = express();

// app.use(cors());
app.use(
  cors({
    origin: "https://node-firebase-7qjp.onrender.com", // Allows requests from any origin
    methods: ["GET", "POST", "PUT", "DELETE"], // Specify allowed HTTP methods
  })
);
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

const dnr_collection = "DNR";

app.post("/DNR", authenticateUser, async (req, res) => {
  try {
    const { Address, City, NFC, Name, PhoneNo, State, Zipcode } = req.body;

    // Validate the input
    if (!Address || !City || !NFC || !Name || !PhoneNo || !State || !Zipcode) {
      return res.status(400).json({ status: 'error', message: "All fields are required." });
    }

    // Create a new user document in Firestore
    const newUser = await db.collection(dnr_collection).add({ 
      Address, 
      City, 
      NFC, 
      Name, 
      PhoneNo, 
      State, 
      Zipcode 
    });

    // Respond with the newly created user data
    res.status(201).json({ status: 'success', id: newUser.id, Address, City, NFC, Name, PhoneNo, State, Zipcode });
  } catch (error) {
    console.error("Error creating user:", error); // Log the error for debug purposes
    res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
});

// Get all users (Only allowed for authenticated users)
app.get("/DNR", authenticateUser, async (req, res) => {
  try {
    const snapshot = await db.collection(dnr_collection).get();
    const DNR = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    
    // Respond with the list of users
    res.status(200).json({ status: 'success', users: DNR });
  } catch (error) {
    console.error("Error fetching users:", error); // Log the error for debug purposes
    res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
});

// Get a user by ID (Only allowed for authenticated users)
app.get("/DNR/:id", authenticateUser, async (req, res) => {
  try {
    const ndrId = req.params.id; // Extract 'id' from the route parameter
    const userDoc = await db.collection(dnr_collection).doc(ndrId).get();

    if (!userDoc.exists) {
      return res.status(404).send("User not found.");
    }

    res.status(200).send({ id: userDoc.id, ...userDoc.data() }); // Use 'id' in the response
  } catch (error) {
    res.status(500).send({
      error: true,
      message: "An error occurred while retrieving the user by ID.",
      details: error.message,
    });
  }
});

// Update a user by ID (Only allowed for authenticated users)
app.put("/DNR/:id", authenticateUser, async (req, res) => {
  try {
    const { id: ndrId } = req.params; // Extract 'id' from the route parameter
    const { Address, City, NFC, Name, PhoneNo, State, Zipcode } = req.body;

    // Validate the request body
    if (!Address && !City && !NFC && !Name && !PhoneNo && !State && !Zipcode) {
      return res.status(400).send("At least one field (Address, City, NFC, Name, PhoneNo, State, or Zipcode) must be provided.");
    }

    // Get the user document from Firestore
    const userRef = db.collection(dnr_collection).doc(ndrId);
    const userDoc = await userRef.get();

    // Check if the user exists
    if (!userDoc.exists) {
      return res.status(404).send("User not found.");
    }

    // Prepare the updated data object with the provided fields
    const updatedData = {};
    if (Address) updatedData.Address = Address;
    if (City) updatedData.City = City;
    if (NFC) updatedData.NFC = NFC;
    if (Name) updatedData.Name = Name;
    if (PhoneNo) updatedData.PhoneNo = PhoneNo;
    if (State) updatedData.State = State;
    if (Zipcode) updatedData.Zipcode = Zipcode;

    // Update the user document in Firestore
    await userRef.update(updatedData);

    // Send a success response
    res.status(200).send({
      message: "Record updated successfully.",
      data: { id: ndrId, ...updatedData },
    });
  } catch (error) {
    // Send an error response
    res.status(500).send({
      error: true,
      message: "An error occurred while updating the record.",
      details: error.message,
    });
  }
});


// Delete a user by ID (Only allowed for authenticated users)
app.delete("/DNR/:id", authenticateUser, async (req, res) => {
  try {
    const ndrId = req.params.id;
    const userRef = db.collection(dnr_collection).doc(ndrId);

    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).send("Record not found.");
    }

    await userRef.delete();
    res.status(200).send("Record deleted successfully.");
  } catch (error) {
    res.status(500).send(error.message);
  }
});


// Run the Express app on port 4500
const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// exports.api = functions.https.onRequest(app); 
