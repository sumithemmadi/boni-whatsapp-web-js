import { Client, LocalAuth } from 'whatsapp-web.js';
import { Request, Response } from 'express';
import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('databases/sessions.db');

// Create the sessions table if it doesn't exist
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

const allClients: { [key: string]: Client } = {};
const allUsersLoginState: { [key: string]: string } = {};

async function whatsappConnector(userId: string) {
   allClients[userId] = new Client({
      authStrategy: new LocalAuth({ clientId: userId }),
      puppeteer: {
         args: ['--no-sandbox'],
      },
   });

   allClients[userId].on('qr', () => {
      allUsersLoginState[userId] = 'FAILED';
      allClients[userId].destroy();
   });

   allClients[userId].on('authenticated', async (session) => {
      console.log('Authenticated successfully!');
      // Check if the WhatsApp account is still logged in here
      const state = await allClients[userId].getState();
      allUsersLoginState[userId] = state;
   });

   allClients[userId].on('ready', async () => {
      console.log('Login Successful!');
   });

   allClients[userId].initialize();
}

async function InitializeWhatsapp(req: Request, res: Response) {
   const sessionId = req.params.sessionId;
   const { userId } = req.body;

   if (!userId) {
      res.status(400).json({
         success: false,
         message: 'Missing userId in the request body',
      });
      return;
   }
   await whatsappConnector(userId);

   setTimeout(async () => {
      db.get(
         'SELECT * FROM sessions WHERE user_id = ?',
         [userId],
         async (dbErr, existingUser: any) => {
            if (dbErr) {
               console.error('Error checking user existence in the database:', dbErr);
               res.status(500).json({ success: false, message: 'Internal server error' });
            } else {
               if (existingUser) {
                  if (existingUser.is_logged_in) {
                     res.status(200).json({
                        success: true,
                        loginStatus: true,
                        state: allUsersLoginState[userId],
                        message: 'Check State',
                        userId,
                     });
                     console.log(allUsersLoginState[userId]);
                  } else {
                     res.status(200).json({
                        success: true,
                        loginStatus: true,
                        state: 'FAILED',
                        message: 'Not Logged In',
                        userId,
                     });
                  }
               } else {
                  res.status(400).json({
                     success: false,
                     loginStatus: false,
                     state: 'FAILED',
                     message: 'No user exists or no session created',
                  });
               }
            }
         },
      );
   }, 40000);
}

async function sendMessage(req: Request, res: Response): Promise<void> {
   const { userId } = req.body;
   const { message, phoneNumber } = req.body;
   try {
      allClients[userId].sendMessage(phoneNumber + '@c.us', message).then(() => {
         res.status(400).json({
            success: true,
            MessageSentStatus: true,
            message: 'Message sent successfully',
         });
      });
   } catch (error) {
      console.log(error);
      res.status(400).json({
         success: false,
         MessageSentStatus: false,
         message: 'Message not sent',
      });
   }
}

export { InitializeWhatsapp, sendMessage };
