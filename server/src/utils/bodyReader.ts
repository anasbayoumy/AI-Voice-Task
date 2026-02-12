import { IncomingMessage } from 'http';

export const MAX_JSON_BODY = 65536;
export const MAX_FORM_BODY = 131072;

// reads http request body with size limit to prevent dos attacks
export function readRequestBody(req: IncomingMessage, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    let totalBytes = 0;

    const contentLength = req.headers['content-length'];
    if (contentLength && parseInt(contentLength, 10) > maxBytes) {
      reject(new Error(`Request body exceeds ${maxBytes} bytes`));
      req.destroy();
      return;
    }

    req.on('data', (chunk: Buffer) => {
      totalBytes += chunk.length;
      
      if (totalBytes > maxBytes) {
        reject(new Error(`Request body exceeds ${maxBytes} bytes`));
        req.destroy();
        return;
      }
      
      body += chunk.toString();
    });

    req.on('end', () => {
      resolve(body);
    });

    req.on('error', (err) => {
      reject(err);
    });
  });
}
