// import React, { useEffect, useRef, useState } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { getAuth } from 'firebase/auth';
// import { ref, onValue, set, push, remove } from 'firebase/database';
// import { getFirestore, doc, getDoc } from 'firebase/firestore';
// import { realtimeDB } from '../../firebase'; // Make sure this exports your Realtime DB
// import { generateChatId } from '../../utils/GenerateChatId';
// import ChatBox from './ChatBox';

// // ICE server config for WebRTC
// const servers = {
//     iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
// };

// const VideoChatBox = () => {
//     const [remoteStream, setRemoteStream] = useState(null);
//     const [chatOpen, setChatOpen] = useState(false);
//     const [handRaised, setHandRaised] = useState(false);
//     const [micOn, setMicOn] = useState(true);
//     const [camOn, setCamOn] = useState(true);
//     const [callStarted, setCallStarted] = useState(false);

//     const localVideoRef = useRef();
//     const remoteVideoRef = useRef();
//     const peerConnection = useRef(null);
//     const localStream = useRef(null);

//     const { id: otherId } = useParams();
//     const navigate = useNavigate();
//     const auth = getAuth();
//     const currentUser = auth.currentUser;

//     const myId = currentUser?.uid;
//     const chatId = myId && otherId ? generateChatId(myId, otherId) : null;

//     useEffect(() => {
//         const unsubscribe = auth.onAuthStateChanged((user) => {
//             if (!user) navigate('/');
//         });
//         return () => unsubscribe();
//     }, []);

//     useEffect(() => {
//         const init = async () => {
//             if (!myId || !otherId) return;

//             try {
//                 localStream.current = await navigator.mediaDevices.getUserMedia({
//                     video: true,
//                     audio: true,
//                 });

//                 if (localVideoRef.current) {
//                     localVideoRef.current.srcObject = localStream.current;
//                 }

//                 peerConnection.current = new RTCPeerConnection(servers);

//                 localStream.current.getTracks().forEach((track) => {
//                     peerConnection.current.addTrack(track, localStream.current);
//                 });

//                 peerConnection.current.ontrack = (event) => {
//                     const [stream] = event.streams;
//                     if (remoteVideoRef.current && !remoteVideoRef.current.srcObject) {
//                         remoteVideoRef.current.srcObject = stream;
//                         setRemoteStream(stream);
//                     }
//                 };

//                 peerConnection.current.onicecandidate = (event) => {
//                     if (event.candidate) {
//                         const myIceRef = ref(realtimeDB, `videoChats/${chatId}/iceCandidates/${myId}`);
//                         push(myIceRef, event.candidate.toJSON());
//                     }
//                 };

//                 const otherIceRef = ref(realtimeDB, `videoChats/${chatId}/iceCandidates/${otherId}`);
//                 onValue(otherIceRef, (snapshot) => {
//                     snapshot.forEach((child) => {
//                         const candidate = new RTCIceCandidate(child.val());
//                         peerConnection.current.addIceCandidate(candidate);
//                     });
//                 });

//                 const signalRef = ref(realtimeDB, `videoChats/${chatId}/signals`);
//                 onValue(signalRef, async (snapshot) => {
//                     const data = snapshot.val();
//                     if (!data) return;

//                     if (data.offer && data.offer.sender !== myId) {
//                         await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.offer));
//                         const answer = await peerConnection.current.createAnswer();
//                         await peerConnection.current.setLocalDescription(answer);
//                         await set(signalRef, {
//                             ...data,
//                             answer: { ...answer, sender: myId, receiver: otherId },
//                         });
//                         setCallStarted(true);
//                     } else if (data.answer && data.answer.sender !== myId) {
//                         await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
//                         setCallStarted(true);
//                     }
//                 });
//             } catch (err) {
//                 console.error('Error initializing video chat:', err);
//             }
//         };

//         init();

//         const handRef = ref(realtimeDB, `videoChats/${chatId}/handRaise/${otherId}`);
//         onValue(handRef, async (snapshot) => {
//             const data = snapshot.val();
//             if (data?.raised) {
//                 const userName = await fetchUserName(otherId);
//                 alert(`${userName} has raised their hand ✋`);
//             }
//         });

//         return () => {
//             if (callStarted) {
//                 endCall();
//             }
//         };
//     }, [myId, otherId]);

//     // Helper to fetch user name from Firestore using UID
//     const fetchUserName = async (uid) => {
//         const db = getFirestore();
//         const userDoc = doc(db, 'mockUsers', uid);
//         const userSnapshot = await getDoc(userDoc);

//         if (userSnapshot.exists()) {
//             return userSnapshot.data().name|| 'Unknown User';
//         } else {
//             return 'Unknown User';
//         }
//     };

    
//     const startCall = async () => {
//         const offer = await peerConnection.current.createOffer();
//         await peerConnection.current.setLocalDescription(offer);
//         const signalRef = ref(realtimeDB, `videoChats/${chatId}/signals`);
//         await set(signalRef, {
//             offer: { ...offer, sender: myId, receiver: otherId },
//         });
//         setCallStarted(true);
//     };

//     const endCall = async () => {
//         try {
//             if (localStream.current) {
//                 localStream.current.getTracks().forEach((track) => track.stop());
//                 localStream.current = null;
//             }

//             if (peerConnection.current) {
//                 peerConnection.current.close();
//                 peerConnection.current = null;
//             }

//             if (localVideoRef.current) localVideoRef.current.srcObject = null;
//             if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

//             if (chatId) {
//                 await remove(ref(realtimeDB, `videoChats/${chatId}/signals`));
//                 await remove(ref(realtimeDB, `videoChats/${chatId}/iceCandidates`));
//                 await remove(ref(realtimeDB, `videoChats/${chatId}/handRaise`));
//             }

//             setCallStarted(false);
//             setMicOn(true);
//             setCamOn(true);
//             setHandRaised(false);
//             setRemoteStream(null);
//             setChatOpen(false);

//             navigate('/interviewers');
//         } catch (err) {
//             console.error('Error ending call:', err);
//         }
//     };

//     const toggleMic = () => {
//         const audioTrack = localStream.current?.getTracks().find((t) => t.kind === 'audio');
//         if (audioTrack) {
//             audioTrack.enabled = !audioTrack.enabled;
//             setMicOn(audioTrack.enabled);
//         }
//     };

//     const toggleCam = () => {
//         const videoTrack = localStream.current?.getTracks().find((t) => t.kind === 'video');
//         if (videoTrack) {
//             videoTrack.enabled = !videoTrack.enabled;
//             setCamOn(videoTrack.enabled);
//         }
//     };

//     // Toggle hand raise
//     const toggleHand = async () => {
//         const uid = currentUser?.uid; // ✅ define uid explicitly

//         if (!uid) return;

//         const handRef = ref(realtimeDB, `videoChats/${chatId}/handRaise/${uid}`);
//         const newStatus = !handRaised;
//         setHandRaised(newStatus);

//         const userName = await fetchUserName(uid); // ✅ fetch from Firestore using uid

//         await set(handRef, {
//             userId: uid,
//             name: userName,
//             raised: newStatus,
//         });
//     };


//     const toggleScreenShare = async () => {
//         try {
//             const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
//             const screenTrack = screenStream.getVideoTracks()[0];
//             const sender = peerConnection.current?.getSenders().find((s) => s.track?.kind === 'video');

//             if (sender) {
//                 sender.replaceTrack(screenTrack);
//             }

//             if (localVideoRef.current) {
//                 localVideoRef.current.srcObject = screenStream;
//             }

//             screenTrack.onended = async () => {
//                 const videoTrack = localStream.current?.getTracks().find((track) => track.kind === 'video');
//                 if (videoTrack && sender) {
//                     sender.replaceTrack(videoTrack);
//                     localVideoRef.current.srcObject = localStream.current;
//                 }
//             };
//         } catch (err) {
//             console.error('Error sharing screen:', err);
//         }
//     };

//     return (
//         <div className="relative flex flex-col items-center justify-center min-h-screen bg-gray-100">
//             <div className="flex gap-6 mb-4">
//                 <video
//                     ref={localVideoRef}
//                     autoPlay
//                     muted
//                     playsInline
//                     className="w-64 h-48 bg-black rounded-lg"
//                 />
//                 <video
//                     ref={remoteVideoRef}
//                     autoPlay
//                     playsInline
//                     className="w-64 h-48 bg-black rounded-lg"
//                 />
//             </div>

//             <div className="flex flex-wrap gap-4 mb-4">
//                 {!callStarted && (
//                     <button onClick={startCall} className="px-4 py-2 bg-green-500 text-white rounded">
//                         Start Call
//                     </button>
//                 )}
//                 <button onClick={endCall} className="px-4 py-2 bg-red-500 text-white rounded">
//                     End Call
//                 </button>
//                 <button onClick={toggleMic} className="px-4 py-2 bg-gray-700 text-white rounded">
//                     {micOn ? 'Mute Mic 🔇' : 'Unmute Mic 🎙️'}
//                 </button>
//                 <button onClick={toggleCam} className="px-4 py-2 bg-gray-700 text-white rounded">
//                     {camOn ? 'Turn Off Cam 📷' : 'Turn On Cam 🎥'}
//                 </button>
//                 <button onClick={toggleHand} className="px-4 py-2 bg-yellow-500 text-black rounded">
//                     {handRaised ? 'Lower Hand ✋' : 'Raise Hand ✋'}
//                 </button>
//                 <button onClick={toggleScreenShare} className="px-4 py-2 bg-purple-600 text-white rounded">
//                     Share Screen 🖥️
//                 </button>
//                 <button onClick={() => setChatOpen((prev) => !prev)} className="px-4 py-2 bg-blue-500 text-white rounded">
//                     {chatOpen ? 'Close Chat 💬' : 'Open Chat 💬'}
//                 </button>
//             </div>

//             {chatOpen && (
//                 <div className="absolute top-6 right-6 z-20 w-[350px] h-[600px]">
//                     <ChatBox interviewId={otherId} />
//                 </div>
//             )}
//         </div>
//     );
// };

// export default VideoChatBox;
