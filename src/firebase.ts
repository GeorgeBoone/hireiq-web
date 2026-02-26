import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyDmhnSdQqIdJXuVihG2tggRSnRV6w45juM",
    authDomain: "project-2981aba9-dd7d-465a-887.firebaseapp.com",
    projectId: "project-2981aba9-dd7d-465a-887",
    storageBucket: "project-2981aba9-dd7d-465a-887.firebasestorage.app",
    messagingSenderId: "159211451981",
    appId: "1:159211451981:web:df03e76ec96d4cd5848e04",
    measurementId: "G-YW8YMYBLB5"
  };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
