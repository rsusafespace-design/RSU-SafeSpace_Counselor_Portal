// Simple Express API server for 2FA send/verify
// Usage: set SMTP settings in env or leave unset for "test mode" which returns code in response

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(bodyParser.json());
// Serve static files from this directory so the HTML page can call the API on the same origin.
app.use(express.static(__dirname));

// Simple request logger for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} -> ${req.method} ${req.url}`);
  if (req.method !== 'GET') {
    // only attempt to log small bodies to avoid flooding
    try { console.log('Body:', JSON.stringify(req.body)); } catch (e) { /* ignore */ }
  }
  next();
});

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// In-memory store: email -> { code, expiry }
const codes = new Map();

function genCode(){
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Create transporter if SMTP settings provided
let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS || ''
    }
  });
}

app.post('/api/send-2fa', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      console.warn('send-2fa missing email in request body');
      return res.status(400).json({ ok:false, error:'missing-email', received: req.body });
    }
    const code = genCode();
    const expiry = Date.now() + 5*60*1000; // 5 min
    codes.set(String(email).toLowerCase(), { code, expiry });

    // If transporter available, attempt to send email
    if (transporter) {
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Your SafeSpace verification code',
        text: `Your verification code is: ${code}. It expires in 5 minutes.`,
      };
      await transporter.sendMail(mailOptions);
      return res.json({ ok:true, sent:true });
    }

    // Otherwise return code for testing (do NOT use in production)
    return res.json({ ok:true, sent:false, code });
  } catch (err) {
    console.error('send-2fa error', err);
    return res.status(500).json({ ok:false, error:'server-error', details: String(err && err.message) });
  }
});

app.post('/api/verify-2fa', (req, res) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !code) return res.status(400).json({ ok:false, error:'missing-params' });
    const entry = codes.get(String(email).toLowerCase());
    if (!entry) return res.status(400).json({ ok:false, error:'no-code' });
    if (Date.now() > entry.expiry) { codes.delete(String(email).toLowerCase()); return res.status(400).json({ ok:false, error:'expired' }); }
    if (String(code).trim() !== entry.code) return res.status(400).json({ ok:false, error:'mismatch' });
    // success: remove code
    codes.delete(String(email).toLowerCase());
    return res.json({ ok:true });
  } catch (err) {
    console.error('verify-2fa error', err);
    return res.status(500).json({ ok:false, error:'server-error' });
  }
});

const port = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(port, () => console.log(`2FA API server listening on http://localhost:${port}`));
