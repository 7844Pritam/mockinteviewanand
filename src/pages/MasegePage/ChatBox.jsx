import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getDatabase, ref, push, onValue } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { db } from '../../firebase'; // Firestore import
import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { generateChatId } from '../../utils/GenerateChatId';

const ChatBox = () => {
  const [messages, setMessages] = useState([]);     // Store messages
  const [input, setInput] = useState('');           // Message input
  const [interviewer, setInterviewer] = useState(null); // Info about the person you're chatting with

  const realtimeDB = getDatabase(); // Firebase Realtime DB
  const auth = getAuth();           // Firebase Auth
  const currentUser = auth.currentUser; // Logged-in user
  const { id: interviewId } = useParams(); // The other user's UID from URL (interviewer or student)

  // Generate unique chatId using both UIDs (sorted to ensure consistency)
  const chatId = currentUser && interviewId ? generateChatId(currentUser.uid, interviewId) : null;

  // Fetch interviewer or chat partner's profile from Firestore
  const fetchInterviewer = async () => {
    if (!interviewId) return;

    try {
      const q = query(
        collection(db, 'mockUsers'),
        where('uid', '==', interviewId)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setInterviewer(data[0] || null); // Set chat partner info
    } catch (error) {
      console.error('❌ Error fetching user:', error);
    }
  };

  // Real-time listener for messages
  useEffect(() => {
    if (!currentUser || !interviewId) return;

    const chatRef = ref(realtimeDB, `chats/${chatId}/messages`);

    // Listen for new data in Realtime DB
    onValue(chatRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setMessages([]);
        return;
      }

      // Convert object to array and sort by timestamp
      const formatted = Object.entries(data).map(([id, msg]) => ({
        id,
        ...msg,
      }));

      const sorted = formatted.sort((a, b) => a.timestamp - b.timestamp);
      setMessages(sorted);
    });
  }, [currentUser, interviewId]);

  // Fetch the user you're chatting with when component loads
  useEffect(() => {
    fetchInterviewer();
  }, [interviewId]);

  // Send a new message to Realtime Database
  const sendMessage = async () => {
    if (!input.trim() || !currentUser || !interviewer) return;

    const chatRef = ref(realtimeDB, `chats/${chatId}/messages`);

    const messageData = {
      text: input,
      senderId: currentUser.uid,
      senderName: currentUser.displayName || currentUser.email || 'You',
      receiverId: interviewId,
      receiverName: interviewer?.name || 'Receiver',
      timestamp: Date.now(),
    };

    try {
      await push(chatRef, messageData); // Push message to Firebase
      setInput(''); // Clear input
    } catch (error) {
      console.error('❌ Error sending message:', error);
    }
  };

  // Allow sending message by pressing Enter
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="flex flex-col w-full max-w-md h-[600px] bg-white rounded shadow-lg overflow-hidden">
        {/* Chat Header */}
        <div className="px-4 py-3 bg-blue-600 text-white text-lg font-semibold">
          Chat with {interviewer?.name || 'Receiver'}
        </div>

        {/* Message List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-2 rounded max-w-xs ${
                msg.senderId === currentUser?.uid
                  ? 'bg-blue-500 text-white self-end ml-auto'
                  : 'bg-gray-200 text-black self-start mr-auto'
              }`}
            >
              <div className="text-xs font-semibold mb-1">{msg.senderName}</div>
              <div>{msg.text}</div>
              <div className="text-[10px] mt-1 text-right opacity-70">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>

        {/* Input Box */}
        <div className="p-3 border-t flex items-center gap-2">
          <input
            type="text"
            placeholder={`Message ${interviewer?.name || ''}`}
            className="flex-1 px-4 py-2 border rounded focus:outline-none focus:ring focus:border-blue-300"
            value={input}
            onChange={(e) => setInput(e.target.value)}
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

export default ChatBox;
