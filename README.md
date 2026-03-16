# Wash-Zone-CMS

## Project Description
A customer management system for The Wash Zone car wash, located on 1907 E Isaac Ave in Walla Walla Washington. This project will streamline company management by providing a single digital location for customer management. The development team will include Zachary Kim, Josh Bielas, Andrew Gutierrez, and Careney Mchau.

## Local Setup

To run the application locally, you will need the following prerequisites:

- Java JDK v21+
- Node and NPM v20+

Install Firebase tools:

```
npm install -g firebase-tools
```

Next, login with Firebase:

```
cms-app$ firebase login
```

Then, initialize Firebase:

```
cms-app$ firebase init
```

After "firebase init" is run an option box will appear. Use space bar to select options and enter to confirm. Most things will be left as default except a few options

- For Features:
  - Firestore
  - Emulators
  - Hosting (not app hosting)
- For project setup:
  - use existing project and then choose Washzone-cms.
- for firestore setup
  - location: us-west1
  - everything else should be default
- for emulator setup
  - Authentication Emulator select:
    - Firestore
    - Emulator
    - Hosting
  - Leave everything else as default or Y.

- For hosting setup, make sure you select all the defaults but set the build directory to dist/ instead of the default Public/. Otherwise, Firebase will look in Public/ for the build files, when Vite builds to dist/
  - Additionally, input Y for Single Page Firebase Hosting and N for automatic Github deploys

Before running the app locally you will need to add a .env file in the cms-app containing the actual values of the following:

cms-app/.env

```env
VITE_FIREBASE_API_KEY = "Your Key",
VITE_FIREBASE_AUTH_DOMAIN = "Your Domain",
VITE_FIREBASE_PROJECT_ID = "Your ProjectID",
VITE_FIREBASE_STORAGE_BUCKET = "Your Bucket" ,
VITE_FIREBASE_MESSAGING_SENDER_ID = "Your Sender ID",
VITE_FIREBASE_APP_ID = "Your APP ID",
VITE_FIREBASE_MEASUREMENT_ID = "Your Measurement ID"
```

Now start the Firebase emulators:

```
cms-app$ firebase emulators:start
```

In a new terminal, while the Firebase emulator is still running:

```
cd cms-app/
npm install
npm run dev
```

## Testing

To run tests locally, start the emulator and run "npm run test". Alternatively, you can run the tests in 1 line by using:

```
cms-app$ firebase emulators:exec "npm run test"
```

## Deployment

Build and Deploy app to Firebase Hosting:
```
cms-app$ npm run build
cms-app$ firebase deploy --only hosting
```

Push Firestore Access Rules in firestore.rules to Firebase:
```
firebase deploy --only firestore:rules
```