import express from 'express';
import { Application } from 'express';
import { AppClasses } from './app-classes';
import { GenerateQrcode } from './generate-qrcode';
import { InitializeWhatsapp, sendMessage } from './whatsapp';

const app: Application = express();
app.use(express.json());

const port = 3000;
const appClasses = new AppClasses();
const getQrcode = new GenerateQrcode();
// const whatsappClient = new WhatsApp();

app.get('/api/start', appClasses.start);

app.post('/api/get-qrcode/:sessionId', appClasses.verifyAuthToken, getQrcode.getQrcode);
app.post(
   '/api/check-whatsapp-login/:sessionId',
   appClasses.verifyAuthToken,
   getQrcode.checkWhatsappLogin,
);

app.post('/api/initialize-whatsapp/:sessionId', appClasses.verifyAuthToken, InitializeWhatsapp);
app.post('/api/send-message/:sessionId', appClasses.verifyAuthToken, sendMessage);
app.listen(port, () => {
   console.log(`Server is running on http://localhost:${port}`);
});
