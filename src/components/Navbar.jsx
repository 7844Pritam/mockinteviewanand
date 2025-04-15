import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { UserCircle } from "lucide-react"; // You can replace this with any icon library
import React from 'react';  // Add this line to resolve the error

export default function Navbar() {
  const [userInfo, setUserInfo] = useState({});
  const [isInterviewer, setIsInterviewer] = useState(false); // Track if the user is an interviewer
  const navigate = useNavigate();

  useEffect(() => {
   console.log(userInfo);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const q = query(collection(db, "users"), where("uid", "==", user.uid));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          console.log("jhgf",userData);
          setUserInfo(userData);

          // Check if the user is an interviewer
          if (userData.isInterviewer === true) {
            
            setIsInterviewer(true);
          } else {
            setIsInterviewer(false);
          }
        }
      } else {
        setUserInfo(null); // Clear user info on logout
        setIsInterviewer(false); // Reset interviewer state
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setUserInfo(null);
    setIsInterviewer(false); // Reset interviewer state
    navigate("/auth/signin");
  };

  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-white shadow-md">
      <h1
        className="text-xl font-bold cursor-pointer"
        onClick={() => navigate("/")}
      >
        InterviewApp
      </h1>
      

      {userInfo ? (
        <div className="flex items-center space-x-4">
          {/* Show Become Interviewer button only if the user is NOT an interviewer */}
          {isInterviewer ? <div></div>:  <button
              onClick={() => navigate("/become-interviewer")}
              className="px-4 py-2 text-sm text-white bg-green-600 rounded hover:bg-green-700"
            >
              Become Interviewer
            </button>}

            
      

          <span className="text-sm font-medium text-gray-700">
            {userInfo.name || userInfo.email}
          </span>
          <UserCircle
            className="w-8 h-8 text-gray-600 cursor-pointer"
            onClick={() => navigate("/profile")}
          />
          <button
            onClick={handleLogout}
            className="px-3 py-1 text-sm text-white bg-red-500 rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      ) : (
        <div className="space-x-4">
          <button
            onClick={() => navigate("/signin")}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            Login
          </button>
          <button
            onClick={() => navigate("/signup")}
            className="px-4 py-2 text-sm text-white bg-green-600 rounded hover:bg-green-700"
          >
            Sign Up
          </button>
        </div>
      )}
    </nav>
  );
}
