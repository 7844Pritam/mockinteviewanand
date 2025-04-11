// src/pages/InterviewHome.js
import React, { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Navbar from "../../components/Navbar";

export default function InterviewHome() {
  const [interviewer, setInterviewer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const q = query(collection(db, "users"), where("uid", "==", user.uid));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const userData = snapshot.docs[0].data();
          if (userData.isInterviewer === true){
            setInterviewer(userData);
          }
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!interviewer) return <div className="p-6">Access Denied</div>;

  return (
    <div className="p-6">
      <Navbar/>
      <h1 className="text-2xl font-bold">Welcome, {interviewer.name}</h1>
      <p className="mt-2 text-gray-600">You are logged in as an Interviewer.</p>
    </div>
  );
}
