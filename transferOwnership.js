require('dotenv').config();
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);
oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

const drive = google.drive({ version: 'v3', auth: oauth2Client });

async function transferOwnership(fileId, newOwnerEmail) {
  try {
    // List current permissions
    const permissionsList = await drive.permissions.list({
        fileId,
        fields: 'permissions(id,emailAddress,role,type)'
    });
    console.log('Current permissions:');
    permissionsList.data.permissions.forEach(p => {
      console.log(`- ID: ${p.id}, Email: ${p.emailAddress || '[none]'}, Role: ${p.role}, Type: ${p.type}`);
    });

    const existing = permissionsList.data.permissions.find(p => p.emailAddress === newOwnerEmail);
    console.log('Existing permission for new owner:', existing);

    if (!existing) {
      console.log(`Adding new writer permission for: ${newOwnerEmail}`);
      await drive.permissions.create({
        fileId,
        supportsAllDrives: true,
        requestBody: {
          type: 'user',
          role: 'writer',
          pendingOwner: true,
          emailAddress: newOwnerEmail
        }
      });
      console.log('Writer permission added. Waiting 3 seconds for propagation...');
      await new Promise(resolve => setTimeout(resolve, 3000)); // wait for permissions to update
    }

    // List updated permissions
    const updatedPermissions = await drive.permissions.list({
        fileId,
        fields: 'permissions(id,emailAddress,role,type)'
    });

    console.log('Updated permissions:');
    updatedPermissions.data.permissions.forEach(p => {
      console.log(`- ID: ${p.id}, Email: ${p.emailAddress || '[none]'}, Role: ${p.role}, Type: ${p.type}`);
    });

    const target = updatedPermissions.data.permissions.find(p => p.emailAddress === newOwnerEmail);
    console.log('Target permission object for new owner:', target);
    if (!target) throw new Error("Failed to retrieve permission ID for new owner");

    // Transfer ownership
    console.log(`Transferring ownership to ${newOwnerEmail} (permission ID: ${target.id})...`);
    await drive.permissions.update({
      fileId,
      permissionId: target.id,
      //transferOwnership: true,
      requestBody: {
        role: 'writer',
        pendingOwner: true,
      }
    });

    console.log(`✅ Ownership transfer initiated to ${newOwnerEmail}. The new owner must accept the transfer.`);
  } catch (err) {
        if (err.response?.status === 403 &&
        err.response.data?.error?.message.includes('Consent is required')) {
            console.log('⚠️ Ownership transfer initiated but requires new owner consent. Please ask them to accept the transfer.');
        } else {
            console.error('❌ Error transferring ownership:', err.response?.data || err.message);
        }
    }
}

transferOwnership('1yIsH1YgFKMepsKNtB_Q8_kt2y0XSZtcq', 'matthewmondoy.raga@gmail.com');