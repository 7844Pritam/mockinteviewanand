import React, { useEffect, useState } from "react";
import { db, auth } from "../../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  Timestamp
} from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";

export default function InterviewerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      const user = auth.currentUser;
      if (user) setCurrentUserId(user.uid);

      const ref = doc(db, "mockUsers", id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setProfile(data);
      }
    };
    fetchUserAndProfile();
  }, [id]);

  useEffect(() => {
    let interval;
  
    if (profile?.interviewTime && profile.isAccepted) {
      interval = setInterval(() => {
        const now = Date.now();
        const target = profile.interviewTime.toDate().getTime();
        const remaining = Math.floor((target - now) / 1000);
        if (remaining > 0) {
          setCountdown(remaining);
        } else {
          clearInterval(interval);
          navigate(`/interview-room/${profile.id}`); // Redirect when time is up
        }
      }, 1000);
    }
  
    return () => clearInterval(interval);
  }, [profile]);
  

  const formatTime = (seconds) => {
    const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const handleDummyPayment = async () => {
    const user = auth.currentUser;
    if (!user) return alert("Please log in first.");
    setLoading(true);
    try {
      const ref = doc(db, "users", profile.id);
      await updateDoc(ref, {
        isBooked: true,
        bookedBy: user.uid,
        isAccepted: false,
      });
      alert("Payment simulated. Waiting for interviewer to accept.");
      navigate("/my-interview");
    } catch (error) {
      console.error("Booking error:", error);
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInterview = async () => {
    const ref = doc(db, "users", profile.id);
    const interviewTime = Timestamp.fromDate(new Date(Date.now() + 2 * 60 * 1000)); // 2 hours
    await updateDoc(ref, {
      isAccepted: true,
      interviewTime
    });
    alert("Interview accepted! Countdown started.");
    setProfile((prev) => ({ ...prev, isAccepted: true, interviewTime }));
  };

  if (!profile) return <div className="p-6">Loading...</div>;

  const isInterviewer = profile.uid === currentUserId;
  const isBookedByUser = profile.bookedBy === currentUserId;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{profile.name}</h1>
      <p className="mt-2">{profile.bio}</p>
      <p className="mt-1">Experience: {profile.experience}</p>
      <p>Skills: {profile.skills.join(", ")}</p>
      <p className="mt-4 text-xl font-semibold">Price: ₹{profile.price}</p>

      {countdown !== null && (
        <p className="mt-4 text-blue-600 font-bold">
          Interview starts in: {formatTime(countdown)}
        </p>
      )}

      {isInterviewer && profile.isBooked && !profile.isAccepted && (
        <button
          onClick={handleAcceptInterview}
          className="mt-6 px-6 py-2 bg-blue-600 text-white rounded"
        >
          Accept Interview
        </button>
      )}

      {!isInterviewer && !profile.isBooked && (
        <button
          onClick={handleDummyPayment}
          className="mt-6 px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          disabled={loading}
        >
          {loading ? "Processing..." : "Buy Interview"}
        </button>
      )}

      {!isInterviewer && profile.isBooked && !isBookedByUser && (
        <p className="mt-4 text-red-600 font-semibold">Already Booked by someone else.</p>
      )}

      {!isInterviewer && profile.isBooked && isBookedByUser && !profile.isAccepted && (
        <p className="mt-4 text-yellow-500 font-semibold">Waiting for interviewer to accept.</p>
      )}

      {!isInterviewer && profile.isBooked && isBookedByUser && profile.isAccepted && (
        <p className="mt-4 text-green-600 font-semibold">
          Interview scheduled! You’ll be redirected when it's time.
        </p>
      )}
    </div>
  );
}
