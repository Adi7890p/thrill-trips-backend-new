import {initializeApp} from 'firebase/app'
const firebaseConfig = {
  apiKey: "AIzaSyCDJo1nQ431FFEyKMEIte6V2ja8gOzTEtE",
  authDomain: "thrill-trips-parkowners.firebaseapp.com",
  projectId: "thrill-trips-parkowners",
  storageBucket: "thrill-trips-parkowners.firebasestorage.app",
  messagingSenderId: "1075183737972",
  appId: "1:1075183737972:web:d4bf5ab530b8db07254521"
};

export const fireapp = initializeApp(firebaseConfig);