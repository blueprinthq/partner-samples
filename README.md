# Blueprint Partner API Samples

This repository includes a sample application that demonstrates how to use the 
Blueprint Partner API v2 to integrate Blueprint into your application.

## Getting Started

1. Clone the repository.
2. Make sure you have `node` and `npm` installed. This sample application has been built and tested with Node.js v20.
3. Run `npm install` to install the dependencies.
4. Create an `.env-cmdrc.json` file based on the sample. `cp .env-cmdrc.json.sample .env-cmdrc.json`
5. Update the API secret values in the `.env-cmdrc.json` file with your Blueprint Partner API v2 credentials.
7. Run `npm run start:staging` to start the application using the Blueprint Partner API v2 sandbox environment.
8. Run `npm run start:production` to start the application using the Blueprint Partner API v2 production environment.

This application will load sample EHR from JSON files in the `data` directory, in the format
`data/patients.[staging|production].json`. You can update these files with patients that match the
clients in the Blueprint clinic that you are connecting your partner application to.

Review Blueprint Partner API v2 documentation at
[https://developer.blueprint.ai](https://developer.blueprint.ai) for more information
and API reference.

## Developer Notes

This sample application demonstrates typical integration scenarios:

1. Host the embedded UI in your application and let Blueprint take care of the rest ("drop-in UI Only").
2. Host the embedded UI in your application customize how the UI integrates with your application front end ("UI Only").
3. Host the embedded UI in your application and deepen the integration by using the API ("UI + API").
4. Build your own UI and completely customize the integration via the API ("API Only").
