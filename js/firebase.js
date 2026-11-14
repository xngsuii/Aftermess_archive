// Firebase 연결 설정 (공개용 값이라 저장소에 올려도 됩니다. 보호는 Firestore 보안 규칙으로 합니다.)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDwavj3FBxgFCA98IHVMN0Jk-Wyi-uur-k",
  authDomain: "afms-892ac.firebaseapp.com",
  projectId: "afms-892ac",
  storageBucket: "afms-892ac.firebasestorage.app",
  messagingSenderId: "1078615260950",
  appId: "1:1078615260950:web:f4119b27df5c344e24da37"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
