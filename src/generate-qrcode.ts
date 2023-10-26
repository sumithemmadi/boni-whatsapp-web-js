import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { Request, Response } from 'express';
import sqlite3 from 'sqlite3';
import { toDataURL } from 'qrcode';

const db = new sqlite3.Database('databases/sessions.db');
db.run(
   `
  CREATE TABLE IF NOT EXISTS sessions (
    user_id TEXT,
    session_id TEXT PRIMARY KEY,
    token TEXT,
    is_logged_in BOOLEAN
  )
`,
   (err) => {
      if (err) {
         console.error('Error creating sessions table:', err);
      } else {
         console.log('Sessions table created or already exists.');
      }
   },
);

class GenerateQrcode {
   public async getQrcode(req: Request, res: Response): Promise<void> {
      const sessionId = req.params.sessionId;
      const { userId } = req.body;

      if (!userId) {
         res.status(400).json({
            success: false,
            message: 'Missing userId in the request body',
         });
         return;
      }

      let qrGenFlag = true;

      const client = new Client({
         authStrategy: new LocalAuth({ clientId: userId }),
         puppeteer: {
            args: ['--no-sandbox'],
         },
      });

      client.on('qr', async (qr) => {
         // Generate and display the QR code
         qrcode.generate(qr, { small: true });
         try {
            let base64_qr = await toDataURL(qr);

            if (qrGenFlag) {
               qrGenFlag = false;
               res.status(200).json({
                  success: true,
                  userId,
                  sessionId,
                  qr: base64_qr,
               });
            }
         } catch (error) {
            console.error('An error occurred:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
            return;
         }
      });

      client.on('authenticated', (session) => {
         console.log('Authenticated successfully!');
      });

      client.on('ready', async () => {
         console.log('Login Successful!');
         db.run(
            'UPDATE sessions SET is_logged_in = ? WHERE user_id = ?',
            [true, userId],
            (updateErr) => {
               if (updateErr) {
                  console.error('Error updating session in the database:', updateErr);
                  res.status(500).json({
                     success: false,
                     message: 'Internal server error',
                  });
               }
            },
         );
         client.destroy();
      });

      client.initialize();
   }

   public checkWhatsappLogin(req: Request, res: Response) {
      const sessionId = req.params.sessionId;
      const { userId } = req.body;

      if (!userId) {
         res.status(400).json({
            success: false,
            message: 'Missing userId in the request body',
         });
         return;
      }

      db.get('SELECT * FROM sessions WHERE user_id = ?', [userId], (dbErr, existingUser: any) => {
         if (dbErr) {
            console.error('Error checking user existence in the database:', dbErr);
            res.status(500).json({ success: false, message: 'Internal server error' });
         } else {
            if (existingUser) {
               if (existingUser.is_logged_in) {
                  res.status(200).json({
                     success: true,
                     loginStatus: true,
                     message: 'Login Successful!',
                     userId,
                  });
               } else {
                  res.status(200).json({
                     success: true,
                     loginStatus: false,
                     message: 'Not logged In',
                     userId,
                  });
               }
            } else {
               res.status(400).json({
                  success: false,
                  loginStatus: false,
                  message: 'No user exist or no session created',
               });
            }
         }
      });
   }
}

export { GenerateQrcode };
