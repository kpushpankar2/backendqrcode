const express = require('express');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
require('dotenv').config();
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 6000;
app.use(express.json());



const corsOptions = {
  origin: ["https://frontendqrcode-theta.vercel.app"],
  methods: ["POST", "GET", "PUT", "DELETE"],
  credentials: true,
};

app.use(cors(corsOptions));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    hashed_password: { type: String, required: true }
});


const User = mongoose.model('User', userSchema);


const qrCodeSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    data: { type: String, required: true }
});
  const QRCode = mongoose.model('QRCode', qrCodeSchema);

app.get('/', (req, res) => {
  res.send("QR Code Api");
});

// Sign up a new user
app.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).send('Email already exists');
    }

    const hashed_password = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, hashed_password });

    await newUser.save();
    res.json({ id: newUser._id, name });

  } catch (error) {
    console.error(error);
    res.status(500).send('Error creating user');
  }
});




// Login with existing user
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find the user by email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).send('User not found');
        }

        // Compare the provided password with the hashed password in the database
        const passwordMatch = await bcrypt.compare(password, user.hashed_password);

        if (passwordMatch) {
            // Create a JWT token
            const token = jwt.sign({ id: user._id, name: user.name, email: user.email }, process.env.JWT_SECRET);

            res.json({ message: 'Login successful', token });
        } else {
            res.status(401).send('Incorrect password');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Error during login');
    }
});




// Create a QR code
app.post('/qrcodes', async (req, res) => {
    try {
        const { user_id, data } = req.body;

        const newQRCode = new QRCode({ user_id, data });

        await newQRCode.save();

        res.json({ id: newQRCode._id });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error creating QR code');
    }
});


// Fetch all QR codes related to a user
app.get('/qrcodes/:user_id', async (req, res) => {
    try {
        const user_id = req.params.user_id;
        const page = parseInt(req.query.page) || 1;
        const perPage = parseInt(req.query.perPage) || 10;
        const offset = (page - 1) * perPage;

        // Find QR codes for the user with pagination
        const qrCodes = await QRCode.find({ user_id })
                                    .sort({ _id: -1 })
                                    .skip(offset)
                                    .limit(perPage);

        // Count total QR codes for the user
        const totalCount = await QRCode.countDocuments({ user_id });

        const totalPages = Math.ceil(totalCount / perPage);

        res.json({ qrCodes, totalPages });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching QR codes');
    }
});

  

// Delete a QR code entry
app.delete('/qrcodes/:id', async (req, res) => {
    try {
        const id = req.params.id;

        // Find the document by ID
        const qrCode = await QRCode.findById(id);

        // Check if the document exists
        if (!qrCode) {
            return res.status(404).send('QR code not found');
        }

        // Delete the document
        const result = await qrCode.deleteOne();

        // Check if the document was successfully deleted
        if (result.deletedCount === 0) {
            return res.status(500).send('Error deleting QR code');
        }

        res.send('QR code deleted successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error deleting QR code');
    }
});




app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
