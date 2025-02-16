import express from 'express';
import { WhatsAppService } from './whatsapp';
import { errorHandler } from './middleware/error-handler';
import { validateInput } from './middleware/validate-input';
import dotenv from 'dotenv';
import cors from "cors";
import { checkOrigin } from './middleware/check-origin';

dotenv.config();

const app = express();
const whatsappService = new WhatsAppService();

app.use(cors());
app.use(express.json());
app.use(checkOrigin);

app.get('/', (req, res) => {
  res.json({ message: 'Application running', status: 200 });
});

// app.post('/send_message', validateInput(['phone', 'text']), async (req, res, next) => {
app.post('/send_message', async (req, res, next) => {
  try {
    const { phone, text } = req.body;
    const formattedPhone = phone.length === 13 ? phone.slice(0, 4) + phone.slice(5) : phone;
    const msg = await whatsappService.sendMessage(formattedPhone, text);
    res.json({ contact: formattedPhone, text, msg });
  } catch (error) {
    next(error);
  }
});

// app.post('/send_image', validateInput(['phone', 'file', 'text']), async (req, res, next) => {
app.post('/send_image', async (req, res, next) => {
  try {
    const { phone, file, text } = req.body;
    await whatsappService.sendImage(phone, file, text);
    res.json({ contact: phone, text });
  } catch (error) {
    next(error);
  }
});

// app.post('/send_file', validateInput(['phone', 'file', 'text']), async (req, res, next) => {
app.post('/send_file', async (req, res, next) => {
  try {
    const { phone, file, text } = req.body;
    await whatsappService.sendFile(phone, file, text);
    res.json({ contact: phone, text });
  } catch (error) {
    next(error);
  }
});

// app.post('/send_link', validateInput(['phone', 'link', 'text']), async (req, res, next) => {
app.post('/send_link', async (req, res, next) => {
  try {
    const { phone, link, text } = req.body;
    await whatsappService.sendLink(phone, link, text);
    res.json({ contact: phone, text });
  } catch (error) {
    next(error);
  }
});

app.get('/auth_status', (req, res) => {
  res.json({ authenticated: whatsappService.isAuthenticated() });
});

app.get('/logout', async (req, res) => {
  const status = await whatsappService.logout()
  res.json({ status });
});

app.get('/qr_code', (req, res) => {
  const qrCode = whatsappService.getQRCode();
  if (qrCode) {
    res.json({ qrCode });
  } else {
    res.status(400).json({ error: 'QR code not available. WhatsApp is already authenticated.' });
  }
});

app.use(errorHandler);

const PORT = process.env.PORT || 3002;

async function start() {
  try {
    await whatsappService.initialize();
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();