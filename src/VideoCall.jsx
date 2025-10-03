import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const serverUrl = "http://localhost:5000";

export default function VideoCall() {
    const [joined, setJoined] = useState(false);
    const socketRef = useRef();
    const pcRef = useRef();
    const localVideoRef = useRef();
    const remoteVideoRef = useRef();

    useEffect(() => {
        socketRef.current = io(serverUrl);

        // When another user joins
        socketRef.current.on("user-joined", async (id) => {
            console.log("User joined:", id);
            await createOffer(id);
        });

        // When receiving offer/answer/ice
        socketRef.current.on("signal", async ({ from, signal }) => {
            if (signal.type === "offer") {
                await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal));
                const answer = await pcRef.current.createAnswer();
                await pcRef.current.setLocalDescription(answer);
                socketRef.current.emit("signal", { to: from, signal: answer });
            } else if (signal.type === "answer") {
                await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal));
            } else if (signal.candidate) {
                try {
                    await pcRef.current.addIceCandidate(new RTCIceCandidate(signal));
                } catch (e) {
                    console.error("Error adding ice:", e);
                }
            }
        });

        return () => socketRef.current.disconnect();
    }, []);

    const joinRoom = async () => {
        setJoined(true);

        // Setup peer connection
        pcRef.current = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });

        // Local media
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideoRef.current.srcObject = stream;
        stream.getTracks().forEach(track => pcRef.current.addTrack(track, stream));

        // Remote media
        pcRef.current.ontrack = (event) => {
            remoteVideoRef.current.srcObject = event.streams[0];
        };

        // ICE candidates
        pcRef.current.onicecandidate = (event) => {
            if (event.candidate) {
                socketRef.current.emit("signal", {
                    to: "all",  // Will be replaced with correct target in signaling
                    signal: event.candidate
                });
            }
        };

        socketRef.current.emit("join", "my-room");
    };

    const createOffer = async (id) => {
        const offer = await pcRef.current.createOffer();
        await pcRef.current.setLocalDescription(offer);
        socketRef.current.emit("signal", { to: id, signal: offer });
    };

    return (
        <div className="p-6 flex flex-col items-center">
            {!joined ? (
                <button
                    onClick={joinRoom}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                >
                    Join Call
                </button>
            ) : (
                <div className="flex gap-4 mt-4">
                    <video ref={localVideoRef} autoPlay playsInline muted className="w-64 h-48 bg-black" />
                    <video ref={remoteVideoRef} autoPlay playsInline className="w-64 h-48 bg-black" />
                </div>
            )}
        </div>
    );
}
