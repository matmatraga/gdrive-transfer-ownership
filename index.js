const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

// Load credentials
const CREDENTIALS_PATH = 'credentials.json';
const TOKEN_PATH = 'token.json';

// Scopes required for transferring file ownership
const SCOPES = ['https://www.googleapis.com/auth/drive'];

function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  // Load previously saved token
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

// First-time token generation
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this URL:', authUrl);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code).then(({ tokens }) => {
      oAuth2Client.setCredentials(tokens);
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
      callback(oAuth2Client);
    }).catch(err => console.error('Error retrieving access token', err));
  });
}

function transferOwnership(auth) {
  const drive = google.drive({ version: 'v3', auth });

  const fileId = 'YOUR_FILE_ID'; // <-- Replace with the actual file ID
  const newOwnerEmail = 'newowner@example.com'; // <-- Replace with recipient email

  const permission = {
    type: 'user',
    role: 'owner',
    emailAddress: newOwnerEmail
  };

  drive.permissions.create({
    fileId: fileId,
    transferOwnership: true,
    resource: permission,
    fields: 'id'
  }, (err, res) => {
    if (err) return console.error('Error transferring ownership:', err);
    console.log(`Ownership transferred successfully to ${newOwnerEmail}`);
  });
}

// Load credentials and authorize
fs.readFile(CREDENTIALS_PATH, (err, content) => {
  if (err) return console.error('Error loading credentials.json', err);
  authorize(JSON.parse(content), transferOwnership);
});
