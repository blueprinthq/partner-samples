# Blueprint Partner API Samples

This repository includes a sample application that demonstrates how to use the 
Blueprint Partner API v2 to integrate Blueprint into your application.

## Getting Started

1. Clone the repository.
2. Run `npm install` to install the dependencies.
3. Create an `.env` file based on the sample. `cp .env.sample .env`
4. Update the values in the `.env` file with your Blueprint Partner API v2 credentials.
5. Run `npm start` to start the application.

Review Blueprint Partner API v2 documentation at
[https://api-v2-docs.blueprint-health.com](https://api-v2-docs.blueprint-health.com) for more information
and API reference.

This sample application has been built and tested with Node.js v20.

## Developer Notes

This sample application demonstrates typical integration scenarios:

1. Host the embedded UI in your application and let Blueprint take care of the rest ("drop-in UI Only").
2. Host the embedded UI in your application customize how the UI integrates with your application front end ("UI Only").
3. Host the embedded UI in your application and deepen the integration by using the API ("UI + API").
4. Build your own UI and completely customize the integration via the API ("API Only").
