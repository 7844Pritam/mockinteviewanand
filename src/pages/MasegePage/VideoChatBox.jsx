import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { ref, onValue, set, push, remove } from 'firebase/database';
import { realtimeDB } from '../../firebase';
import { generateChatId } from '../../utils/GenerateChatId';

const servers = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

const SimpleVideoChat = () => {
    const localVideoRef = useRef();
    const remoteVideoRef = useRef();
    const peerConnection = useRef(null);
    const localStream = useRef(null);

    const [connected, setConnected] = useState(false);

    const { id: otherId } = useParams();
    const navigate = useNavigate();
    const auth = getAuth();
    const currentUser = auth.currentUser;

    const myId = currentUser?.uid;
    const chatId = myId && otherId ? generateChatId(myId, otherId) : null;

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (!user) navigate('/');
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const setupConnection = async () => {
            if (!myId || !otherId) return;

            try {
                console.log('Initializing screen sharing...');
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });

                screenStream.addTrack(audioStream.getAudioTracks()[0]);

                localStream.current = screenStream;
                localVideoRef.current.srcObject = screenStream;

                // Handle screen sharing stop
                screenStream.getVideoTracks()[0].addEventListener('ended', () => {
                    console.log('Screen sharing stopped');
                    endCall();
                });

                peerConnection.current = new RTCPeerConnection(servers);
                console.log('RTCPeerConnection created.');

                localStream.current.getTracks().forEach((track) => {
                    peerConnection.current.addTrack(track, localStream.current);
                });

                peerConnection.current.ontrack = (event) => {
                    console.log('Received remote track.');
                    remoteVideoRef.current.srcObject = event.streams[0];
                };

                peerConnection.current.onicecandidate = (event) => {
                    if (event.candidate) {
                        console.log('Sending ICE candidate.');
                        const iceRef = ref(realtimeDB, `videoChats/${chatId}/iceCandidates/${myId}`);
                        push(iceRef, event.candidate.toJSON());
                    }
                };

                const iceRef = ref(realtimeDB, `videoChats/${chatId}/iceCandidates/${otherId}`);
                onValue(iceRef, (snapshot) => {
                    snapshot.forEach((child) => {
                        const candidate = new RTCIceCandidate(child.val());
                        console.log('Adding remote ICE candidate.');
                        peerConnection.current.addIceCandidate(candidate);
                    });
                });

                const signalRef = ref(realtimeDB, `videoChats/${chatId}/signals`);
                onValue(signalRef, async (snapshot) => {
                    const data = snapshot.val();
                    if (!data) return;

                    if (data.offer && data.offer.sender !== myId) {
                        console.log('Received offer. Creating answer...');
                        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.offer));
                        const answer = await peerConnection.current.createAnswer();
                        await peerConnection.current.setLocalDescription(answer);
                        await set(signalRef, {
                            ...data,
                            answer: { ...answer, sender: myId },
                        });
                        setConnected(true);
                    } else if (data.answer && data.answer.sender !== myId) {
                        console.log('Received answer.');
                        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
                        setConnected(true);
                    }
                });

            } catch (err) {
                console.error('Error during screen sharing setup:', err);
                alert('Error accessing screen or audio. Please check permissions.');
            }
        };

        setupConnection();
    }, [myId, otherId]);

    const startCall = async () => {
        console.log('Starting call...');
        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);
        const signalRef = ref(realtimeDB, `videoChats/${chatId}/signals`);
        await set(signalRef, {
            offer: { ...offer, sender: myId },
        });
    };

    const endCall = async () => {
        console.log('Ending call...');
        if (localStream.current) {
            localStream.current.getTracks().forEach((track) => track.stop());
        }

        if (peerConnection.current) {
            peerConnection.current.close();
        }

        if (chatId) {
            await remove(ref(realtimeDB, `videoChats/${chatId}`));
        }

        localVideoRef.current.srcObject = null;
        remoteVideoRef.current.srcObject = null;

        setConnected(false);
        navigate('/interviewers');
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
            <div className="flex gap-4">
                <video ref={localVideoRef} autoPlay muted playsInline className="w-64 h-48 bg-black rounded" />
                <video ref={remoteVideoRef} autoPlay playsInline className="w-64 h-48 bg-black rounded" />
            </div>

            <div className="mt-4 space-x-4">
                {!connected && (
                    <button onClick={startCall} className="px-4 py-2 bg-green-500 text-white rounded">
                        Start Call
                    </button>
                )}
                <button onClick={endCall} className="px-4 py-2 bg-red-500 text-white rounded">
                    End Call
                </button>
            </div>
        </div>
    );
};

export default SimpleVideoChat;
