const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || '0.0.0.0';
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Origin not allowed by CORS'));
    }
  })
);
app.use(express.json());

const responseSchema = new mongoose.Schema(
  {
    inspector: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      required: true,
      trim: true
    },
    items: [
      {
        label: { type: String, required: true },
        status: {
          type: String,
          enum: ['OK', 'NOT OK'],
          default: 'OK'
        },
        remarks: {
          type: String,
          default: ''
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

const Response = mongoose.model('Response', responseSchema);

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/submit', async (req, res) => {
  try {
    const { inspector, type, items } = req.body;

    if (!inspector || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Inspector name and checklist items are required.' });
    }

    const saved = await Response.create({
      inspector,
      type: type || 'A-Type Ladder',
      items
    });

    res.status(201).json({
      message: 'Checklist submitted successfully',
      data: saved
    });
  } catch (error) {
    res.status(500).json({ message: 'Save failed', error: error.message });
  }
});

app.get('/api/responses', async (req, res) => {
  try {
    const responses = await Response.find().sort({ createdAt: -1 });
    res.json(responses);
  } catch (error) {
    res.status(500).json({ message: 'Fetch failed', error: error.message });
  }
});

async function start() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
    app.listen(PORT, HOST, () => {
      console.log(`Server running on http://${HOST}:${PORT}`);
    });
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
  }
}

start();
