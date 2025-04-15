import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { ref, onValue, set, push, remove } from 'firebase/database';
import { db as realtimeDB } from '../../firebase';
import { generateChatId } from '../../utils/GenerateChatId';
import ChatBox from './ChatBox'; // Reuse your existing ChatBox component

const servers = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

const VideoChatBox = () => {
    const [remoteStream, setRemoteStream] = useState(null);
    const [chatOpen, setChatOpen] = useState(false);
    const [handRaised, setHandRaised] = useState(false);
    const [micOn, setMicOn] = useState(true);
    const [camOn, setCamOn] = useState(true);
    const [callStarted, setCallStarted] = useState(false);

    const localVideoRef = useRef();
    const remoteVideoRef = useRef();
    const peerConnection = useRef(null);
    const localStream = useRef(null);

    const { id: interviewId } = useParams();
    const navigate = useNavigate();
    const auth = getAuth();
    const currentUser = auth.currentUser;

    const chatId =
        currentUser && interviewId
            ? generateChatId(currentUser.uid, interviewId)
            : null;

    useEffect(() => {
        const init = async () => {
            localStream.current = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = localStream.current;
            }

            peerConnection.current = new RTCPeerConnection(servers);

            localStream.current.getTracks().forEach((track) => {
                peerConnection.current.addTrack(track, localStream.current);
            });

            peerConnection.current.ontrack = (event) => {
                const [stream] = event.streams;
                remoteVideoRef.current.srcObject = stream;
                setRemoteStream(stream);
            };

            peerConnection.current.onicecandidate = (event) => {
                if (event.candidate) {
                    const iceRef = ref(
                        realtimeDB,
                        `videoChats/${chatId}/iceCandidates/${currentUser.uid}`
                    );
                    push(iceRef, event.candidate.toJSON());
                }
            };

            const otherIceRef = ref(
                realtimeDB,
                `videoChats/${chatId}/iceCandidates/${interviewId}`
            );
            onValue(otherIceRef, (snapshot) => {
                snapshot.forEach((child) => {
                    const candidate = new RTCIceCandidate(child.val());
                    peerConnection.current.addIceCandidate(candidate);
                });
            });

            const signalRef = ref(realtimeDB, `videoChats/${chatId}/signals`);
            onValue(signalRef, async (snapshot) => {
                const data = snapshot.val();
                if (!data) return;

                if (data.offer && data.offer.sender !== currentUser.uid) {
                    await peerConnection.current.setRemoteDescription(
                        new RTCSessionDescription(data.offer)
                    );
                    const answer = await peerConnection.current.createAnswer();
                    await peerConnection.current.setLocalDescription(answer);
                    await set(signalRef, {
                        ...data,
                        answer: { ...answer, sender: currentUser.uid },
                    });
                    setCallStarted(true);
                } else if (
                    data.answer &&
                    data.answer.sender !== currentUser.uid
                ) {
                    await peerConnection.current.setRemoteDescription(
                        new RTCSessionDescription(data.answer)
                    );
                    setCallStarted(true);
                }
            });
        };

        if (currentUser && interviewId) {
            init();
        }

        return () => {
            endCall(); // Cleanup when component unmounts
        };

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser, interviewId]);

    const startCall = async () => {
        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);
        const signalRef = ref(realtimeDB, `videoChats/${chatId}/signals`);
        await set(signalRef, {
            offer: { ...offer, sender: currentUser.uid },
        });
        setCallStarted(true);
    };

    const endCall = async () => {
        try {
            // ✅ Stop all local tracks (camera + mic)
            if (localStream.current) {
                localStream.current.getTracks().forEach((track) => track.stop());
                localStream.current = null;
            }

            // ✅ Close peer connection
            if (peerConnection.current) {
                peerConnection.current.close();
                peerConnection.current = null;
            }

            // ✅ Clear video refs
            if (localVideoRef.current) localVideoRef.current.srcObject = null;
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

            // ✅ Remove signaling data from Firebase
            if (chatId) {
                await remove(ref(realtimeDB, `videoChats/${chatId}/signals`));
                await remove(ref(realtimeDB, `videoChats/${chatId}/iceCandidates`));
            }

            // ✅ Reset all UI-related states
            setCallStarted(false);
            setMicOn(true);
            setCamOn(true);
            setHandRaised(false);
            setRemoteStream(null);
            setChatOpen(false);

            // ✅ Navigate home
            navigate('/interviewers');
        } catch (err) {
            console.error('Error ending call:', err);
        }
    };




    const toggleMic = () => {
        const audioTrack = localStream.current
            ?.getTracks()
            .find((track) => track.kind === 'audio');
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            setMicOn(audioTrack.enabled);
        }
    };

    const toggleCam = () => {
        const videoTrack = localStream.current
            ?.getTracks()
            .find((track) => track.kind === 'video');
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            setCamOn(videoTrack.enabled);
        }
    };

    const toggleHand = () => {
        setHandRaised((prev) => !prev);
        alert(`You ${handRaised ? 'lowered' : 'raised'} your hand ✋`);
    };

/////////////////////////screen share//////////////////////
    const toggleScreenShare = async () => {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
            });

            const screenTrack = screenStream.getVideoTracks()[0];

            // Replace the current video track with screen share
            const sender = peerConnection.current
                ?.getSenders()
                .find((s) => s.track?.kind === 'video');
            if (sender) {
                sender.replaceTrack(screenTrack);
            }

            // Display the shared screen locally too
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = screenStream;
            }

            // When the screen is stopped, revert back to webcam
            screenTrack.onended = async () => {
                const videoTrack = localStream.current
                    ?.getTracks()
                    .find((track) => track.kind === 'video');

                if (videoTrack && sender) {
                    sender.replaceTrack(videoTrack);
                    if (localVideoRef.current) {
                        localVideoRef.current.srcObject = localStream.current;
                    }
                }
            };
        } catch (err) {
            console.error('Error sharing screen:', err);
        }
    };


    return (
        <div className="relative flex flex-col items-center justify-center min-h-screen bg-gray-100">
            {/* Video Feed */}
            <div className="flex gap-6 mb-4">
                <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-64 h-48 bg-black rounded-lg"
                />
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-64 h-48 bg-black rounded-lg"
                />
            </div>

            {/* Call Controls */}
            <div className="flex flex-wrap gap-4 mb-4">
                {!callStarted && (
                    <button
                        onClick={startCall}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                        Start Call
                    </button>
                )}
                <button
                    onClick={endCall}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                    End Call
                </button>
                <button
                    onClick={toggleMic}
                    className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800"
                >
                    {micOn ? 'Mute Mic 🔇' : 'Unmute Mic 🎙️'}
                </button>
                <button
                    onClick={toggleCam}
                    className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800"
                >
                    {camOn ? 'Turn Off Cam 📷' : 'Turn On Cam 🎥'}
                </button>
                <button
                    onClick={toggleHand}
                    className="px-4 py-2 bg-yellow-500 text-black rounded hover:bg-yellow-600"
                >
                    {handRaised ? 'Lower Hand ✋' : 'Raise Hand ✋'}
                </button>
                <button
                    onClick={toggleScreenShare}
                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                    Share Screen 🖥️
                </button>

                <button
                    onClick={() => setChatOpen((prev) => !prev)}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    {chatOpen ? 'Close Chat 💬' : 'Open Chat 💬'}
                </button>
            </div>

            {/* Chat Box */}
            {chatOpen && (
                <div className="absolute top-6 right-6 z-20 w-[350px] h-[600px]">
                    <ChatBox interviewId={interviewId} />
                </div>
            )}
        </div>
    );
};

export default VideoChatBox;
