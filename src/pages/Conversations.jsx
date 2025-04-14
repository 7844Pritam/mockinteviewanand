import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getDatabase, ref, push, onValue } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

const Conversations = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [interviewer, setInterviewer] = useState(null);

  const realtimeDB = getDatabase();
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const { id: interviewId } = useParams(); // interviewer ID from URL

  console.log('👤 Current User:', currentUser);
  console.log('🆔 Interviewer ID from URL:', interviewId);
  

  // Fetch interviewer data
  const fetchInterviewer = async () => {
    console.log('📥 Fetching interviewer info...');
    

    if (!interviewId) {
      console.warn('❗ Interviewer ID is missing');
      return;
    }

    try {
      const q = query(
        collection(db, 'users'),
        where('isInterviewer', '==', true),
        where('uid', '==', interviewId)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      console.log('✅ Interviewer Data:', data);
      setInterviewer(data[0] || null);
      
    } catch (error) {
      console.error('❌ Error fetching interviewer:', error);
    }
  };

  // Load messages between current user and interviewer
  useEffect(() => {
    console.log('🟡 Setting up message listener...');
    

    if (!currentUser || !interviewId) return;

    const messagesRef = ref(realtimeDB, 'messages');

    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      console.log('📬 Raw messages snapshot:', data);
      

      if (!data) {
        setMessages([]);
        return;
      }

      const filtered = Object.values(data)
        .filter(
          (msg) =>
            (msg.senderId === currentUser.uid && msg.receiverId === interviewId) ||
            (msg.senderId === interviewId && msg.receiverId === currentUser.uid)
        )
        .sort((a, b) => a.timestamp - b.timestamp);

      console.log('✅ Filtered Messages:', filtered);
      setMessages(filtered);
      
    });

    return () => {
      console.log('🔁 Cleanup message listener (Realtime DB has no native unsubscribe)');
    };
  }, [realtimeDB, currentUser, interviewId]);

  // Fetch interviewer info on mount
  useEffect(() => {
    console.log('🟢 Running useEffect to fetch interviewer');
    fetchInterviewer();
  }, [interviewId]);

  // Send message function
  const sendMessage = async () => {
    console.log('🟢 Sending message...', auth.currentUser.uid);
    console.log('🟢 Interviewer ID:', interviewId);
    console.log('📤 Sending message...');
    

    if (!input.trim() || !currentUser || !interviewer) {
      console.warn('❗ Message not sent. Missing input or user or interviewer');
      return;
    }

    const messagesRef = ref(realtimeDB, 'messages');

    const messageData = {
      text: input,
      senderId: currentUser.uid,
      senderName: currentUser.displayName || currentUser.email || 'You',
      receiverId: interviewId,
      receiverName: interviewer?.name || 'Interviewer',
      timestamp: Date.now(),
    };

    try {
      await push(messagesRef, messageData);
      console.log('✅ Message pushed:', messageData);
      
      setInput('');
    } catch (error) {
      console.error('❌ Error sending message:', error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      console.log('⏎ Enter key pressed');
      sendMessage();
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="flex flex-col w-full max-w-md h-[600px] bg-white rounded shadow-lg overflow-hidden">
        <div className="px-4 py-3 bg-blue-600 text-white text-lg font-semibold">
          Chat with {interviewer?.name || 'Interviewer'}
        </div>
        <div className="flex-1 p-4 overflow-y-auto space-y-2">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`p-2 rounded max-w-xs ${
                msg.senderId === currentUser?.uid
                  ? 'bg-blue-500 text-white self-end ml-auto'
                  : 'bg-gray-200 text-black self-start mr-auto'
              }`}
            >
              <div className="text-xs font-semibold mb-1">{msg.senderName}</div>
              <div>{msg.text}</div>
            </div>
          ))}
        </div>
        <div className="p-3 border-t flex items-center gap-2">
          <input
            type="text"
            placeholder={`Message ${interviewer?.name || ''}`}
            className="flex-1 px-4 py-2 border rounded focus:outline-none focus:ring focus:border-blue-300"
            value={input}
            onChange={(e) => {
              console.log('⌨️ Typing:', e.target.value);
              setInput(e.target.value);
            }}
            onKeyDown={handleKeyDown}
          />
          <button
            onClick={sendMessage}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default Conversations;
