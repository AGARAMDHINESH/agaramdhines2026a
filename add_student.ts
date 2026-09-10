import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB_IFx9D75KnocfGLGH9sBDIaa3T0pTRn0",
  authDomain: "agaram-dhines-online-academy.firebaseapp.com",
  projectId: "agaram-dhines-online-academy",
  storageBucket: "agaram-dhines-online-academy.firebasestorage.app",
  messagingSenderId: "825909851431",
  appId: "1:825909851431:web:b68b641adcff92a2096502"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function addStudent() {
  try {
    const email = "kavi@agaram.com";
    const password = "password123";
    
    console.log("Creating user in Firebase Auth...");
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      console.log("User created in Auth.");
    } catch (e: any) {
      if (e.code === 'auth/email-already-in-use') {
        console.log("User already exists in Auth, proceeding to add to Firestore...");
      } else {
        throw e;
      }
    }

    const newStudent = {
      id: "STU" + Math.floor(Math.random() * 100000),
      grade: "தரம் 06",
      name: "kavi",
      username: "kavi",
      password: password,
      rollNo: "",
      subjects: ["Tamil"]
    };

    console.log("Fetching existing students...");
    const querySnapshot = await getDocs(collection(db, "students"));
    const students = querySnapshot.docs.map(doc => doc.data());
    
    students.push(newStudent);
    
    console.log("Saving student to Firestore...");
    const docRef = doc(collection(db, "students"), newStudent.id);
    await setDoc(docRef, newStudent);
    
    console.log("Student added successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error adding student:", error);
    process.exit(1);
  }
}

addStudent();
