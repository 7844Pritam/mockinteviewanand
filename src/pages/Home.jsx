import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  query,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function InterviewerList() {
  const [userInfo, setUserInfo] = useState(null);
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const q = query(collection(db, "mockUsers"));
        const snapshot = await getDocs(q);
        const allUsers = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Set current user info
        const currentUser = allUsers.find((u) => u.uid === user.uid);
        setUserInfo(currentUser);

        // Show all users (you can filter if needed)
        setUsers(allUsers);
      } else {
        setUserInfo(null);
        setUsers([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    const auth = getAuth();
    await signOut(auth);
    setUserInfo(null);
    navigate("/auth/signin");
  };

  return (
    <div className="p-6">
      <Navbar />
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">All Users</h2>

        {/* Logout Button */}
        {userInfo && (
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-white bg-red-500 rounded hover:bg-red-600"
          >
            Logout
          </button>
        )}
      </div>

      {userInfo && (
        <p className="mb-4 text-gray-600">Welcome, {userInfo.name}</p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {users.map((user) => (
          <div
            key={user.id}
            className="p-4 border rounded cursor-pointer hover:shadow transition"
          >
            <h3 className="text-lg font-semibold">{user.name}</h3>
            <p>{user.bio}</p>
            <p>Skills: {user.skills?.join(", ")}</p>
            <p className="text-sm text-gray-600">Price: ₹{user.price}</p>

            {/* Action Buttons */}
            <div className="mt-4 flex gap-2">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                onClick={() => navigate(`/chatbox/${user.uid}`)}
              >
                Chat
              </button>
              <button
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                onClick={() => navigate(`/videochat/${user.uid}`)}
              >
                Video Chat
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
