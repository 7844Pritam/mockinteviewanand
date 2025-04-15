import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  Timestamp
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function ProfileDetail() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const q = query(collection(db, "mockUsers"), where("uid", "==", user.uid));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            setProfile({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    const interval = setInterval(() => setNow(Date.now()), 1000); // for countdown
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleAcceptInterview = async () => {
    // const interviewTime = Timestamp.fromDate(new Date(Date.now() + 2 * 60 * 60 * 1000)); // 2 hours
    const interviewTime = Timestamp.fromDate(new Date(Date.now() + 2 * 60 * 1000)); // 2 minutes

    // const interviewTime = Timestamp.fromDate(new Date(Date.now() + 2 * 60 * 60 * 1000)); // 2 hours
    await updateDoc(doc(db, "mockUsers", profile.id), {
      isAccepted: true,
      interviewTime
    });
    alert("Interview accepted and countdown started!");
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!profile) return <div className="p-6">No profile data found.</div>;

  const isInterviewer = profile.isInterviewer;
  const interviewScheduled =
    profile.isBooked && profile.bookedBy && !isInterviewer;
  const interviewerViewHasRequest =
    isInterviewer && profile.isBooked && !profile.isAccepted;

  const showCountdown =
    profile.isAccepted &&
    profile.interviewTime &&
    new Date(profile.interviewTime.toDate()).getTime() > now;

  const remaining =
    showCountdown &&
    Math.floor((new Date(profile.interviewTime.toDate()).getTime() - now) / 1000);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{profile.name}</h1>
      <p className="mt-2 text-gray-600">{profile.bio || "No bio provided."}</p>
      <p className="mt-2">Experience: {profile.experience || "N/A"}</p>
      <p>Skills: {profile.skills ? profile.skills.join(", ") : "N/A"}</p>
      <p className="mt-4 text-xl font-semibold">
        Price: ₹{profile.price || "Not set"}
      </p>

      {interviewScheduled && (
        <p className="mt-4 text-green-600 font-semibold">
          You have an upcoming interview!
        </p>
      )}

      {showCountdown && (
        <p className="mt-4 text-blue-600 font-bold">
          Interview starts in: {formatTime(remaining)}
        </p>
      )}

      {isInterviewer && interviewerViewHasRequest && (
        <button
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded"
          onClick={handleAcceptInterview}
        >
          Accept Interview Request
        </button>
      )}

      {profile.isAccepted &&
        profile.interviewTime &&
        new Date(profile.interviewTime.toDate()).getTime() <= now && (
          <button
            className="mt-6 px-6 py-2 bg-purple-700 text-white rounded"
            onClick={() =>navigate(`/interview-room/${profile.bookedBy}`)}
          >
            Join Interview
          </button>
        )}
    </div>
  );
}
