import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { toDataURL } from 'qrcode';

const sessionId = 'sdfsdfsdfsdfsdfbsdfb';
const userId = 'sumithemmadi';
let qrGenFlag = true;

const client = new Client({
   authStrategy: new LocalAuth({ clientId: userId }),
   puppeteer: {
      args: ['--no-sandbox'],
   },
});

client.on('qr', async (qr) => {
   client.destroy();
});

client.on('authenticated', (session: any) => {
   console.log('Authenticated successfully!');
   client.getState().then((state: any) => {
      console.log('a', state);
      // if (state === 'CONFLICT') {
      //     console.log('WhatsApp account logged in elsewhere. Disconnecting.');
      //     client.destroy();
      // } else {
      //     console.log('WhatsApp account is still logged in.');
      // }
   });
});

client.on('disconnected', (session: any) => {
   console.log('Not Authenticated successfully!');
   client.getState().then((state: any) => {
      console.log('d', state);
      // if (state === 'CONFLICT') {
      //     console.log('WhatsApp account logged in elsewhere. Disconnecting.');
      //     client.destroy();
      // } else {
      //     console.log('WhatsApp account is still logged in.');
      // }
   });
});

client.on('ready', async () => {
   console.log('Login Successful!');
   client.destroy();
});

client.initialize();
