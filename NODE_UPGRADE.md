# Node.js v22 Upgrade Notes

This project has been upgraded to use Node.js v22. The following changes were made:

## Changes Implemented

1. **Updated Node Version**
   - Set `.nvmrc` to v22.14.0
   - Updated `package.json` engines field to require Node.js v22+

2. **Removed External Dependencies**
   - Removed `node-fetch` in favor of Node.js v22's native fetch API

3. **Improved Error Handling**
   - Enhanced error handling in the webhook listener
   - Added proper try/catch blocks for better error management
   - Fixed header case sensitivity issues (X-Blueprint-Signature vs x-blueprint-signature)

4. **Added Testing Support**
   - Created a basic test file using Node.js v22's built-in test runner
   - Added a test script to package.json: `npm test`

5. **Updated Crypto Usage**
   - Improved the crypto implementation in the webhook listener
   - Added proper body stringification

## Benefits of Node.js v22

- **Performance**: Significant performance improvements over previous versions
- **Security**: Latest security patches and improvements
- **Native API Support**: Built-in fetch, WebSocket client, and improved test runner
- **ECMAScript Modules**: Better support for ESM
- **Web Standards**: Better alignment with web standards

## Running the Application

```bash
# Use nvm to select the correct Node.js version
nvm use

# Install dependencies
npm install

# Start the application
npm start

# Run tests
npm test
``` 