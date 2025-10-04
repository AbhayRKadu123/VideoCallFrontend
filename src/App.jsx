// import { useRef, useEffect, useState } from "react";
// import io from "socket.io-client";

// const socket = io("http://localhost:5000");

// export default function App() {
//   const localVideoRef = useRef();
//   const remoteVideoRef = useRef();
//   const pcRef = useRef();
//   const [started, setStarted] = useState(false);


//   useEffect(() => {
//     socket.on("offer", async ({ sdp, from }) => {
//       if (!pcRef.current) createPeerConnection();
//       await pcRef.current.setRemoteDescription(sdp);
//       const answer = await pcRef.current.createAnswer();
//       await pcRef.current.setLocalDescription(answer);
//       socket.emit("answer", { sdp: answer });
//     });

//     socket.on("answer", async ({ sdp }) => {
//       await pcRef.current?.setRemoteDescription(sdp);
//     });

//     socket.on("ice-candidate", ({ candidate }) => {
//       if (candidate) pcRef.current?.addIceCandidate(candidate);
//     });
//   }, []);

//   const createPeerConnection = () => {
//     const pc = new RTCPeerConnection();
//     pcRef.current = pc;

//     pc.onicecandidate = (e) => {
//       if (e.candidate) socket.emit("ice-candidate", { candidate: e.candidate });
//     };

//     pc.ontrack = (e) => {
//       remoteVideoRef.current.srcObject = e.streams[0];
//     };
//   };

//   const startCall = async () => {
//     setStarted(true);
//     createPeerConnection();
//     const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//     localVideoRef.current.srcObject = stream;

//     stream.getTracks().forEach(track => pcRef.current.addTrack(track, stream));

//     const offer = await pcRef.current.createOffer();
//     await pcRef.current.setLocalDescription(offer);
//     socket.emit("offer", { sdp: offer });
//   };

//   return (
//     <div style={{ padding: 20 }}>
//       {!started ? (
//         <button onClick={startCall}>Start 1-to-1 Call</button>
//       ) : (
//         <div style={{ display: "flex", gap: 20 }}>
//           <div>
//             <h3>Local</h3>
//             <video ref={localVideoRef} autoPlay muted style={{ width: 300 }} />
//           </div>
//           <div>
//             <h3>Remote</h3>
//             <video ref={remoteVideoRef} autoPlay style={{ width: 300 }} />
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }


import { useRef, useEffect, useState } from "react";
import io from "socket.io-client";

const socket = io("https://videocallappbackend-f87x.onrender.com");
// const socket = io("http://localhost:5000");

export default function App() {
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const pcRef = useRef();
  const [started, setStarted] = useState(false);
  const [username, setusername] = useState("")
  const [reciver, setreciver] = useState("")
  const [Disabled, setDisabled] = useState(false)
  const [Lst, setList] = useState({})
  const [LstLength, setListLength] = useState({})

  const pendingCandidates = useRef([]);


  // useEffect(() => {
  //   setList(Lst)
  // }, [reciver])


  useEffect(() => {
    socket.on("offer", async ({ sdp, from }) => {
      console.log('from =', from)
      if (!pcRef.current) createPeerConnection(from);
      await pcRef.current.setRemoteDescription(sdp);
      // clear the queue
      // if (pcRef.signalingState === 'have-remote-offer') {


      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      pendingCandidates.current.forEach(c =>
        pcRef.current.addIceCandidate(c)
      );
      pendingCandidates.current = [];
      console.log('reciver=reciver', reciver)
      socket.emit("answer", { sdp: answer, Target: from, sender: username });
      // }
    });

    socket.on("answer", async ({ sdp }) => {
      await pcRef.current?.setRemoteDescription(sdp);
      pendingCandidates.current.forEach(c =>
        pcRef.current.addIceCandidate(c)
      );
      pendingCandidates.current = []; // clear the queue
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      // if (candidate) await pcRef.current?.addIceCandidate(candidate);
      if (!candidate) return;

      if (pcRef.current.remoteDescription) {
        pcRef.current.addIceCandidate(candidate);
      } else {
        // queue it for later
        pendingCandidates.current.push(candidate);
      }
    });
  }, []);
  socket.on("user-registered", (msg) => {
    console.log('user registered ', msg?.lst)
    // setList(msg?.lst)
    if (msg.lstlength) {
      setListLength(msg.lstlength)
    }
    if (msg.lst) {
      setList(msg.lst)
    }
    if (msg?.msg == true&& msg.ID==socket.id) {


      setDisabled(true)
    }

  })

  const createPeerConnection = (reciver) => {
    const pc = new RTCPeerConnection();
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit("ice-candidate", { candidate: e.candidate, Target: reciver });
    };

    pc.ontrack = (e) => {
      remoteVideoRef.current.srcObject = e.streams[0];
    };
  };

  function RegisterUser(username) {
    console.log('username=', username)
    socket.emit("register-user", { username })

  }
  const startCall = async (reciver) => {
    console.log('reciver=', reciver)
    setStarted(true);
    createPeerConnection(reciver);
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideoRef.current.srcObject = stream;

    stream.getTracks().forEach(track => pcRef.current.addTrack(track, stream));

    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer);
    socket.emit("offer", { sdp: offer, Target: reciver });
  };

  return (
    <div
      style={{
        padding: 20,
        maxWidth: 600,
        margin: "0 auto",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {!started ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 15,
          }}
        >

{LstLength>0&&<ul>
  <li><h4>Online Users</h4></li>
  {Object.keys(Lst).map((key) => (
    <li key={key}>{key==username?"You":key}</li>
  ))}
</ul>}

          {Disabled && <span style={{
            padding: 10,
            fontSize: 16,
            borderRadius: 8,
            border: "1px solid green",
          }}>User Register as username {username}</span>}
          <input
            placeholder="Enter Username"
            value={username}
            onChange={(event) => setusername(event.target.value.trim().toLocaleLowerCase())}
            style={{
              padding: 10,
              fontSize: 16,
              borderRadius: 8,
              border: "1px solid #ccc",
            }}
          />
          <button
            onClick={() => RegisterUser(username)}
            style={{
              padding: 10,
              fontSize: 16,
              borderRadius: 8,
              backgroundColor: Disabled ? "gray" : "#4CAF50",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
            disabled={Disabled}
          >
            Register User
          </button>

          <input
            placeholder="Enter Receiver"
            value={reciver}
            onChange={(event) => setreciver(event.target.value.trim().toLocaleLowerCase())}
            style={{
              padding: 10,
              fontSize: 16,
              borderRadius: 8,
              border: "1px solid #ccc",
            }}
          />
          <button
            onClick={() => startCall(reciver)}
            style={{
              padding: 10,
              fontSize: 16,
              borderRadius: 8,
              backgroundColor: LstLength == 2 && reciver.length !== 0 ? "#2196F3" : 'gray',
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
            disabled={LstLength !== 2 && reciver.length !== 0}
          >
            Start 1-to-2 Call
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: 20,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <div style={{ flex: "1 1 300px", textAlign: "center" }}>
            <h3>You</h3>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              style={{
                width: "100%",
                maxWidth: 300,
                borderRadius: 8,
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              }}
            />
          </div>
          <div style={{ flex: "1 1 300px", textAlign: "center" }}>
            <h3>{reciver}</h3>
            <video
              ref={remoteVideoRef}
              autoPlay
              style={{
                width: "100%",
                maxWidth: 300,
                borderRadius: 8,
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              }}
            />
          </div>
           <div style={{ flex: "1 1 300px", textAlign: "center" }}>
            <button  style={{
              padding: 10,
              fontSize: 16,
              borderRadius: 8,
              backgroundColor: LstLength == 2 && reciver.length !== 0 ? "red" : 'gray',
              color: "white",
              border: "none",
              cursor: "pointer",
            }} onClick={()=>{remoteVideoRef.current.srcObject=null;localVideoRef.current.srcObject=null;socket.disconnect(),setStarted(false)}}>End Call</button>
          </div>
        </div>
      )}
    </div>

  );
}