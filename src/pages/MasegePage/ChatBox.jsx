import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getDatabase, ref, push, onValue, update, remove } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { db } from '../../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { generateChatId } from '../../utils/GenerateChatId';

const ChatBox = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [interviewer, setInterviewer] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState('');
  const [showOptionsId, setShowOptionsId] = useState(null);
  const [deletingMessageId, setDeletingMessageId] = useState(null); // For delete confirmation
  const [deleteMode, setDeleteMode] = useState(false); // Toggle delete mode
  const longPressTimer = useRef(null);

  const realtimeDB = getDatabase();
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const { id: interviewId } = useParams();
  const chatId = currentUser && interviewId ? generateChatId(currentUser.uid, interviewId) : null;

  const fetchInterviewer = async () => {
    if (!interviewId) return;

    try {
      const q = query(collection(db, 'mockUsers'), where('uid', '==', interviewId));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setInterviewer(data[0] || null);
    } catch (error) {
      console.error('❌ Error fetching user:', error);
    }
  };

  useEffect(() => {
    if (!currentUser || !interviewId) return;

    const chatRef = ref(realtimeDB, `chats/${chatId}/messages`);
    onValue(chatRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setMessages([]);
        return;
      }

      const formatted = Object.entries(data).map(([id, msg]) => ({ id, ...msg }));
      const sorted = formatted.sort((a, b) => a.timestamp - b.timestamp);
      setMessages(sorted);
    });
  }, [currentUser, interviewId]);

  useEffect(() => {
    fetchInterviewer();
  }, [interviewId]);

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
      edited: false,
    };

    try {
      await push(chatRef, messageData);
      setInput('');
    } catch (error) {
      console.error('❌ Error sending message:', error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  const handleLongPressStart = (msgId) => {
    longPressTimer.current = setTimeout(() => {
      setShowOptionsId(msgId);
    }, 500);
  };

  const handleLongPressEnd = () => {
    clearTimeout(longPressTimer.current);
  };

  const handleEdit = (msg) => {
    setEditingMessageId(msg.id);
    setEditText(msg.text);
    setShowOptionsId(null);
  };

  const handleDelete = (msgId) => {
    setDeletingMessageId(msgId);
    setDeleteMode(true); // Prompt the user for confirmation
    setShowOptionsId(null);
  };

  const confirmDelete = async (deleteFromBothSides) => {
    const messageRef = ref(realtimeDB, `chats/${chatId}/messages/${deletingMessageId}`);

    if (deleteFromBothSides) {
      // Delete from both sides (Firebase)
      try {
        await remove(messageRef);
        setMessages((prevMessages) =>
          prevMessages.filter((msg) => msg.id !== deletingMessageId)
        );
      } catch (error) {
        console.error('❌ Error deleting message:', error);
      }
    } else {
      // Delete message from current user's side only
      try {
        await update(messageRef, {
          text: "[Message deleted]",
          senderName: "You",
          timestamp: Date.now(),
          edited: true, // Mark it as edited to prevent confusion
        });
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === deletingMessageId ? { ...msg, text: "[Message deleted]" } : msg
          )
        );
      } catch (error) {
        console.error('❌ Error updating message for deletion:', error);
      }
    }
    setDeleteMode(false); // Close delete confirmation mode
    setDeletingMessageId(null); // Reset deleting state
  };

  const cancelDelete = () => {
    setDeleteMode(false); // Close delete confirmation mode
    setDeletingMessageId(null); // Reset deleting state
  };

  ///////////////////////////////////////////////////////save edited message////////////////////
  const saveEditedMessage = async (msgId) => {
    if (!editText.trim()) return; // Ensure text is not empty

    const messageRef = ref(realtimeDB, `chats/${chatId}/messages/${msgId}`);

    const updatedMessage = {
      ...messages.find((msg) => msg.id === msgId), // Keep other properties like senderId, receiverId, etc.
      text: editText, // Set the new text
      edited: true, // Mark the message as edited
      timestamp: Date.now(), // Update the timestamp to reflect when the edit occurred
    };

    try {
      await update(messageRef, updatedMessage); // Update the message in Firebase
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === msgId ? { ...msg, text: editText, edited: true } : msg // Update the message in local state
        )
      );
      setEditingMessageId(null); // Reset editing state
      setEditText(''); // Clear the edit text
    } catch (error) {
      console.error('❌ Error saving edited message:', error);
    }
  };


  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="flex flex-col w-full max-w-md h-[600px] bg-white rounded shadow-lg overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-blue-600 text-white text-lg font-semibold">
          Chat with {interviewer?.name || 'Receiver'}
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-2 relative">
          {messages.map((msg) => {
            const isMe = msg.senderId === currentUser?.uid;

            return (
              <div
                key={msg.id}
                className={`p-2 rounded max-w-xs relative ${isMe ? 'bg-blue-500 text-white self-end ml-auto' : 'bg-gray-200 text-black self-start mr-auto'
                  }`}
                onMouseDown={() => isMe && handleLongPressStart(msg.id)}
                onMouseUp={handleLongPressEnd}
                onMouseLeave={handleLongPressEnd}
                onContextMenu={(e) => {
                  e.preventDefault();
                  isMe && setShowOptionsId(msg.id);
                }}
              >
                <div className="text-xs font-semibold mb-1">{msg.senderName}</div>
                {editingMessageId === msg.id ? (
                  <>
                    <input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="text-black p-1 w-full rounded"
                    />
                    <button
                      className="text-xs mt-1 bg-white text-blue-600 border rounded px-2 py-1"
                      onClick={() => saveEditedMessage(msg.id)}
                    >
                      Save
                    </button>
                  </>
                ) : (
                  <div>
                    {msg.text}
                    {msg.edited && (
                      <span className="text-xs text-gray-500 ml-1">(Edited)</span>
                    )}
                  </div>
                )}
                <div className="text-[10px] mt-1 text-right opacity-70">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>

                {/* 💬 Action Menu */}
                {showOptionsId === msg.id && (
                  <div
                    className="absolute top-0 right-0 mt-[-10px] mr-[-10px] z-10 bg-white text-black border rounded shadow-lg text-sm"
                  >
                    <button
                      className="block px-3 py-1 hover:bg-gray-200 w-full text-left"
                      onClick={() => handleEdit(msg)}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="block px-3 py-1 hover:bg-gray-200 w-full text-left"
                      onClick={() => handleDelete(msg.id)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Delete Confirmation */}
        {deleteMode && (
          <div className="absolute top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-5 rounded shadow-lg">
              <h3 className="text-lg font-semibold">Delete Message?</h3>
              <p className="mt-2">Do you want to delete the message from:</p>
              <div className="mt-4 space-x-4">
                <button
                  className="px-4 py-2 bg-red-600 text-white rounded"
                  onClick={() => confirmDelete(true)}
                >
                  Both sides
                </button>
                <button
                  className="px-4 py-2 bg-yellow-600 text-white rounded"
                  onClick={() => confirmDelete(false)}
                >
                  My side only
                </button>
                <button
                  className="px-4 py-2 bg-gray-300 text-black rounded"
                  onClick={cancelDelete}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Input */}
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
