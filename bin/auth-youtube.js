#!/usr/bin/env node
// Interactive YouTube OAuth2 Helper
// Launches local callback listener to obtain and store YOUTUBE_REFRESH_TOKEN in .env
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { loadEnv } from '../src/config.js';

// Ensure .env file is loaded into process.env
loadEnv();

const PORT = 8089;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

function printInstructions() {
  console.log(`
=== YouTube OAuth2 Authorization Setup ===

1. Ensure you have created an OAuth 2.0 Client ID in Google Cloud Console:
   - Application Type: Web Application
   - Authorized redirect URI: ${REDIRECT_URI}
2. Add your credentials to .env:
   YOUTUBE_CLIENT_ID=your_client_id
   YOUTUBE_CLIENT_SECRET=your_client_secret
`);
}

async function main() {
  const clientId = process.env.YOUTUBE_CLIENT_ID ? process.env.YOUTUBE_CLIENT_ID.trim().replace(/^['"](.*)['"]$/, '$1') : '';
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET ? process.env.YOUTUBE_CLIENT_SECRET.trim().replace(/^['"](.*)['"]$/, '$1') : '';

  if (!clientId || !clientSecret) {
    printInstructions();
    console.error('Error: YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET must be set in .env');
    process.exit(1);
  }

  const scope = encodeURIComponent('https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube');
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;

  console.log('\nStarting local OAuth authentication listener...');
  console.log(`Please open the following link in your browser to authorize your YouTube channel:\n`);
  console.log(authUrl);
  console.log(`\nWaiting for authorization callback on ${REDIRECT_URI}...\n`);

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://localhost:${PORT}`);
      if (url.pathname !== '/callback') {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const code = url.searchParams.get('code');
      if (!code) {
        res.writeHead(400);
        res.end('Authorization code missing');
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>Authentication successful!</h1><p>You can close this window now. The refresh token has been stored in your .env file.</p>');
      server.close();

      console.log('Authorization code received! Exchanging for refresh token...');

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code'
        }).toString()
      });

      const tokenData = await tokenRes.json();
      if (!tokenData.refresh_token) {
        console.error('Error: Google OAuth did not return a refresh_token. Response:', tokenData);
        process.exit(1);
      }

      const refreshToken = tokenData.refresh_token;
      console.log('Refresh token obtained successfully!');

      // Append or replace YOUTUBE_REFRESH_TOKEN in .env
      const envPath = path.resolve(process.cwd(), '.env');
      let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

      if (envContent.includes('YOUTUBE_REFRESH_TOKEN=')) {
        envContent = envContent.replace(/YOUTUBE_REFRESH_TOKEN=.*/g, `YOUTUBE_REFRESH_TOKEN=${refreshToken}`);
      } else {
        envContent += `\nYOUTUBE_REFRESH_TOKEN=${refreshToken}\n`;
      }

      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log('Successfully saved YOUTUBE_REFRESH_TOKEN to .env!');
      console.log('YouTube automated publishing is now ready.');
    } catch (err) {
      console.error('Failed to exchange code:', err.message);
      process.exit(1);
    }
  });

  server.listen(PORT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
