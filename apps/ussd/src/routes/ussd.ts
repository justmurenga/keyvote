import { Router, Request, Response } from 'express';
import { UssdHandler } from '../handlers/ussd-handler';

export const ussdRouter: Router = Router();

const handler = new UssdHandler();

/**
 * Africa's Talking USSD Callback
 * 
 * Request body contains:
 * - sessionId: Unique session ID
 * - serviceCode: The USSD code dialed (e.g., *123#)
 * - phoneNumber: User's phone number in +254 format
 * - text: User's input (empty on first request, then each response separated by *)
 */
ussdRouter.post('/callback', async (req: Request, res: Response) => {
  try {
    const { sessionId, serviceCode, phoneNumber, text } = req.body;

    console.log(`USSD Request - Session: ${sessionId}, Phone: ${phoneNumber}, Text: "${text}"`);

    // Process the USSD request
    const response = await handler.processRequest({
      sessionId,
      serviceCode,
      phoneNumber,
      text: text || '',
    });

    // Send response with correct content type
    res.set('Content-Type', 'text/plain');
    res.send(response);
  } catch (error) {
    console.error('USSD Callback Error:', error);
    res.set('Content-Type', 'text/plain');
    res.send('END An error occurred. Please try again later.');
  }
});
