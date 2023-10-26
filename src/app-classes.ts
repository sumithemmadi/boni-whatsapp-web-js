import sqlite3 from 'sqlite3';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

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

// jwt secret
const secretKey = 'sumithemmadi';
interface JwtDecoded {
   sessionId: string;
}

class AppClasses {
   public sock: any;

   // Create a session with JWT token
   public start(req: Request, res: Response): void {
      try {
         const { userId } = req.body;
         if (!userId) {
            res.status(400).json({
               success: false,
               message: 'Missing userId in the request body',
            });
            return;
         }

         // Check if the user already exists in the database
         db.get(
            'SELECT * FROM sessions WHERE user_id = ?',
            [userId],
            (dbErr, existingUser: any) => {
               if (dbErr) {
                  console.error('Error checking user existence in the database:', dbErr);
                  res.status(500).json({ success: false, message: 'Internal server error' });
               } else {
                  if (existingUser) {
                     const sessionId = existingUser.session_id;
                     const user = {
                        sessionId,
                        username: userId,
                     };
                     const tokenExpireTime = 3600;
                     const token = jwt.sign(user, secretKey, { expiresIn: tokenExpireTime });

                     // Update the users token in the database
                     db.run(
                        'UPDATE sessions SET token = ? WHERE user_id = ?',
                        [token, userId],
                        (updateErr) => {
                           if (updateErr) {
                              console.error('Error updating session in the database:', updateErr);
                              res.status(500).json({
                                 success: false,
                                 message: 'Internal server error',
                              });
                           } else {
                              res.json({
                                 success: true,
                                 userId,
                                 sessionId,
                                 token,
                                 expiresIn: tokenExpireTime,
                              });
                           }
                        },
                     );
                  } else {
                     // User doesn't exist, perform an insert
                     const sessionId = uuidv4();
                     const user = {
                        sessionId,
                        username: userId,
                     };
                     const tokenExpireTime = 3600;
                     const token = jwt.sign(user, secretKey, { expiresIn: tokenExpireTime });

                     // Save a new session in the database
                     db.run(
                        'INSERT INTO sessions (user_id, session_id, token,is_logged_in) VALUES (?, ?, ?, ?)',
                        [userId, sessionId, token, false],
                        (insertErr) => {
                           if (insertErr) {
                              console.error('Error saving session to the database:', insertErr);
                              res.status(500).json({
                                 success: false,
                                 message: 'Internal server error',
                              });
                           } else {
                              res.json({
                                 success: true,
                                 userId,
                                 sessionId,
                                 token,
                                 expiresIn: tokenExpireTime,
                              });
                           }
                        },
                     );
                  }
               }
            },
         );
      } catch (error) {
         console.error('An error occurred:', error);
         res.status(500).json({ success: false, message: 'Internal server error' });
      }
   }

   public verifyAuthToken(req: Request, res: Response, next: any) {
      const authorizationHeader = req.headers.authorization;
      const { userId } = req.body;
      const sessionId = req.params.sessionId;
      if (!userId) {
         res.status(400).json({
            success: false,
            message: 'Missing userId in the request body',
         });
         return;
      }

      if (!authorizationHeader) {
         return res.status(401).json({ success: false, message: 'Token not provided' });
      }

      const token = authorizationHeader.split(' ')[1];

      jwt.verify(token, secretKey, (err, decoded: any) => {
         if (err) {
            console.log(err);
            return res.status(403).json({ success: false, message: 'Invalid token' });
         }

         if (decoded) {
            db.get('SELECT * FROM sessions WHERE user_id = ?', [userId], (dbErr, row: any) => {
               if (dbErr) {
                  console.error('Error retrieving session from the database:', dbErr);
                  return res.status(500).json({ success: false, message: 'Internal server error' });
               }
               // console.log(row)
               // console.log(decoded)
               if (!row) {
                  return res.status(403).json({ success: false, message: 'Session not found' });
               }
               if (row?.session_id != sessionId) {
                  return res
                     .status(403)
                     .json({ success: false, message: 'Session expired or not valid' });
               }
               if (row?.token != token) {
                  return res
                     .status(403)
                     .json({ success: false, message: 'Invalid token or expired' });
               }
               next();
            });
         } else {
            return res.status(403).json({ success: false, message: 'Invalid token' });
         }
      });
   }
}

export { AppClasses };
