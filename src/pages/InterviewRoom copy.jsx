import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  doc,
  onSnapshot,
  updateDoc,
  setDoc
} from "firebase/firestore";
import Peer from "simple-peer";

export default function InterviewRoom() {
  const { id } = useParams(); // interview room ID
  const myVideo = useRef();
  const userVideo = useRef();
  const peerRef = useRef();
  const [chat, setChat] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    const init = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      myVideo.current.srcObject = stream;

      const callDoc = doc(db, "interviews", id);
      const callSnap = await onSnapshot(callDoc, async (snap) => {
        const data = snap.data();

        if (data && data.offer && !peerRef.current) {
          // Answer incoming call
          const peer = new Peer({ initiator: false, trickle: false, stream });

          peer.on("signal", async (answer) => {
            await updateDoc(callDoc, { answer });
          });

          peer.on("stream", (remoteStream) => {
            userVideo.current.srcObject = remoteStream;
          });

          peer.signal(data.offer);
          peerRef.current = peer;
        }
      });

      // If first user to join
      if (!(await (await callSnap).exists())) {
        const peer = new Peer({ initiator: true, trickle: false, stream });

        peer.on("signal", async (offer) => {
          await setDoc(callDoc, { offer });
        });

        peer.on("stream", (remoteStream) => {
          userVideo.current.srcObject = remoteStream;
        });

        peerRef.current = peer;
      }
    };

    init();
  }, [id]);

  const sendMessage = async () => {
    const messageRef = doc(db, "interviews", id);
    await updateDoc(messageRef, {
      messages: [...chat, { text: newMessage, sender: auth.currentUser.uid, time: new Date().toISOString() }]
    });
    setNewMessage("");
  };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "interviews", id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setChat(data.messages || []);
      }
    });

    return () => unsub();
  }, [id]);

  return (
    <div className="p-4 flex flex-col items-center">
      <h2 className="text-xl font-bold mb-4">Interview Room</h2>

      <div className="flex gap-4">
        <video ref={myVideo} autoPlay muted playsInline className="w-64 h-48 bg-black rounded" />
        <video ref={userVideo} autoPlay playsInline className="w-64 h-48 bg-black rounded" />
      </div>

      <div className="mt-6 w-full max-w-md">
        <div className="h-40 overflow-y-auto border p-2 rounded bg-gray-100">
          {chat.map((msg, index) => (
            <p key={index} className="text-sm">
              <strong>{msg.sender === auth.currentUser.uid ? "You" : "Other"}:</strong> {msg.text}
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
