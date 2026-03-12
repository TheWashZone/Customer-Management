# Firebase Setup

This doc describes the process to get local firebase tools for development specifically the emulator.

## Prerequisites

### Java 21

You will need java jdk-21 or greater (yes 25 will work) to run firebase.

[Install java development kit 21](https://https://www.oracle.com/java/technologies/downloads/#java21)

To verify the installation run:

```bash
java --version
```

### npm and nodejs

You will need nodejs between version 20 and 22. Which can be found on the [nodejs website.](https://nodejs.org/en/download/) I believe npm is packaged with nodejs.

To verify the installation run:

```bash
node -v
npm -v
```

## Firebase firetime setup

Before running the init you will need add a .env file in the cms-app containing the actual values of the following:

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

Because firebase charges based on read/write it is necessary to use the firebase emulator for both the authentication and storage.
These are the bash commands you will need to run to initialize the project. Open a terminal in the root of the project and run:

```bash
cd cms-app
npm install

# This will take you to a new page to login with firebase
firebase login
firebase init
```

After "firebase init" is run an option box will appear. Use space bar to select options and enter to confirm. Most things will be left as default except a few options

- For Features:
  - Firestone
  - Emulators
- For project setup:
  - use existing project and then choose Washzone-cms.
- for firestone setup
  - location: us-west1
  - everything else should be default
- for emulator setup
  - Authentication Emulator select:
    - FireStone
    - Emulator
  - Leave everything else as default or Y.

To start the emulator simply run:

```bash
firebase emulators:start
```

make sure you are in the cms-app director when you run this.

## Post Setup Configuration

firestore.rules determines which users can access which Firebase endpoints. Take the following example from the file:

```
// Users collection
match /users/{userId} {
  // Allow read/write only if the user is authenticated
  allow read, write: if request.auth != null;
}
```

This configuration allows and user to read and write and user in the doc /users if they are authenticated. Changes to permissions, such as role based access where authenticated users are subdivided into roles with different rights, will need to have the appropriate rules set in the .rules file.

Updates to Rules
