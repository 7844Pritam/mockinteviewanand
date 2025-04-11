import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  doc,
  onSnapshot,
  updateDoc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  arrayUnion,
} from "firebase/firestore";
import Peer from "simple-peer";

export default function InterviewRoom() {
  const { id } = useParams();
  const myVideo = useRef();
  const userVideo = useRef();
  const peerRef = useRef();

  const [chat, setChat] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [userProfiles, setUserProfiles] = useState({});
  const [currentUserData, setCurrentUserData] = useState({});
  const [otherUserId, setOtherUserId] = useState("");
  const [error, setError] = useState("");

  // Setup video and WebRTC
  useEffect(() => {
    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        myVideo.current.srcObject = stream;

        const callDoc = doc(db, "interviews", id);

        const unsubscribe = onSnapshot(callDoc, async (snap) => {
          const data = snap.data();

          if (data && data.offer && !peerRef.current) {
            const peer = new Peer({ initiator: false, trickle: false, stream });

            peer.on("signal", async (answer) => {
              await updateDoc(callDoc, { answer });
            });

            peer.on("stream", (remoteStream) => {
              userVideo.current.srcObject = remoteStream;
            });

            if (data.offerUserId) {
              setOtherUserId(data.offerUserId);
            }

            peer.signal(data.offer);
            peerRef.current = peer;
          }
        });

        const docSnap = await getDoc(callDoc);
        if (!docSnap.exists()) {
          const peer = new Peer({ initiator: true, trickle: false, stream });

          peer.on("signal", async (offer) => {
            await setDoc(callDoc, {
              offer,
              offerUserId: auth.currentUser.uid,
              messages: [],
            });
          });

          peer.on("stream", (remoteStream) => {
            userVideo.current.srcObject = remoteStream;
          });

          peerRef.current = peer;
        } else {
          const data = docSnap.data();
          if (data.offerUserId && data.offerUserId !== auth.currentUser.uid) {
            setOtherUserId(data.offerUserId);
          }
        }
      } catch (err) {
        console.error("Media error:", err);
        setError(
          "Camera or microphone is already in use or blocked. Please close other apps or check permissions."
        );
      }
    };

    init();
  }, [id]);

  // Send chat message
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageRef = doc(db, "interviews", id);
    const docSnap = await getDoc(messageRef);

    if (!docSnap.exists()) {
      await setDoc(messageRef, {
        messages: [],
        offer: null,
      });
    }

    await updateDoc(messageRef, {
      messages: arrayUnion({
        text: newMessage,
        sender: auth.currentUser.uid,
        time: new Date().toISOString(),
      }),
    });

    setNewMessage("");
  };

  // Load messages
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "interviews", id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setChat(data.messages || []);
      }
    });

    return () => unsub();
  }, [id]);

  // Load user profiles
  useEffect(() => {
    const fetchUsers = async () => {
      const usersSnapshot = await getDocs(collection(db, "users"));
      const users = {};
      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        users[data.uid] = data;
      });

      setUserProfiles(users);
      const currentUser = auth.currentUser.uid;
      setCurrentUserData(users[currentUser] || {});
    };

    fetchUsers();
  }, []);

  const otherUserName =
    userProfiles[otherUserId]?.name || "Other Participant";
  const currentUserName = currentUserData?.name || "You";

  return (
    <div className="p-4 flex flex-col items-center">
      <h2 className="text-xl font-bold mb-4">Interview Room</h2>

      {error && (
        <div className="text-red-600 bg-red-100 p-2 rounded w-full max-w-md text-center mb-4">
          {error}
        </div>
      )}

      <div className="flex gap-6 flex-wrap justify-center items-start">
        <div className="flex flex-col items-center">
          <video
            ref={myVideo}
            autoPlay
            muted
            playsInline
            className="w-64 h-48 bg-black rounded"
          />
          <div className="mt-1 text-sm font-medium text-gray-700">
            {currentUserName}
          </div>
        </div>

        <div className="flex flex-col items-center">
          <video
            ref={userVideo}
            autoPlay
            playsInline
            className="w-64 h-48 bg-black rounded"
          />
          <div className="mt-1 text-sm font-medium text-gray-700">
            {otherUserName}
          </div>
        </div>
      </div>

      <div className="mt-6 w-full max-w-md">
        <div className="h-40 overflow-y-auto border p-2 rounded bg-gray-100">
          {chat.map((msg, index) => (
            <p key={index} className="text-sm mb-1">
              <strong>
                {userProfiles[msg.sender]?.name ||
                  (msg.sender === auth.currentUser.uid ? "You" : "Other")}
              </strong>
              : {msg.text}
              <span className="text-xs text-gray-500 ml-2">
                {new Date(msg.time).toLocaleTimeString()}
              </span>
            </p>
          ))}
        </div>

        <div className="flex mt-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 border p-2 rounded-l"
            placeholder="Type a message"
          />
          <button onClick={sendMessage} className="bg-blue-600 text-white px-4 rounded-r">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
