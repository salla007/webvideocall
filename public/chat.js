let socket = io.connect("http://localhost:4000");
let divVideoChatLobby = document.getElementById("video-chat-lobby");
let divVideoChat = document.getElementById("video-chat-room");
let joinButton = document.getElementById("join");
let entbitrate = document.getElementById("change-bitrate");
let userVideo = document.getElementById("user-video");
let peerVideo = document.getElementById("peer-video");
let roomInput = document.getElementById("roomName");
let roombitrate = document.getElementById("bitrate");
let roomName;
let bitrate;
let creator = false;
let rtcPeerConnection;
let userStream;
// Contains the stun server URL we will be using.
function handle_offer_sdp(offer) {
  let sdp = offer.sdp.split('\r\n');//convert to an concatenable array
  let new_sdp = '';
  let position = null;
  sdp = sdp.slice(0, -1); //remove the last comma ','
  for(let i = 0; i < sdp.length; i++) {//look if exists already a b=AS:XXX line
      if(sdp[i].match(/b=AS:/)) {
          position = i; //mark the position
      }
  }
  if(position) {
      sdp.splice(position, 1);//remove if exists
  }

  // Get the bitrate from the input field
  let bitrate = document.getElementById("bitrate").value;
  
  for(let i = 0; i < sdp.length; i++) {
      if(sdp[i].match(/m=video/)) {//modify and add the new lines for video
          new_sdp += sdp[i] + '\r\n' + 'b=AS:' + bitrate + '\r\n';
      }
      else {
          if(sdp[i].match(/m=audio/)) { //modify and add the new lines for audio
              new_sdp += sdp[i] + '\r\n' + 'b=AS:' + 64 + '\r\n';
          }
          else {
              new_sdp += sdp[i] + '\r\n';
          }
      }
  }
  return new_sdp; //return the new sdp
}
let iceServers = {
  iceServers: [
    { urls: "stun:stun.services.mozilla.com" },
    { urls: "stun:stun.l.google.com:19302" },
  ],
};

joinButton.addEventListener("click", function () {
  if (roomInput.value == "") {
    alert("Please enter a room name");                             
  } else {
    roomName = roomInput.value;
    socket.emit("join", roomName);
  }
});
entbitrate.addEventListener("click", function () {
  if (roombitrate.value == "") {
    alert("Please enter bitrate");
  } else {
   // bitrate = roombitrate.value;
  // alert("Please  do not enter bitrate");
    roomName = roomInput.value;
    socket.emit("ready", roomName);
  }
});
// Triggered when a room is succesfully created.

socket.on("created", function () {
  creator = true;
 // console.log("created successfullys");
  navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: { width: 1280, height: 1280 },
    })
    .then(function (stream) {
      /* use the stream */
      userStream = stream;
   //   divVideoChatLobby.style = "display:none";
      userVideo.srcObject = stream;
      userVideo.onloadedmetadata = function (e) {
        userVideo.play();
      };
    })
    .catch(function (err) {
      /* handle the error */
      alert("Couldn't Access User Media");
    });
});

// Triggered when a room is succesfully joined.

socket.on("joined", function () {
  creator = false;

  navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: { width: 1280, height: 1280 },
    })
    .then(function (stream) {
      /* use the stream */
      userStream = stream;
      divVideoChatLobby.style = "display:none";
      userVideo.srcObject = stream;
      userVideo.onloadedmetadata = function (e) {
        userVideo.play();
      };
      socket.emit("ready", roomName);
    })
    .catch(function (err) {
      /* handle the error */
      alert("Couldn't Access User Media");
    });
});

// Triggered when a room is full (meaning has 2 people).

socket.on("full", function () {
  alert("Room is Full, Can't Join");
});

// Triggered when a peer has joined the room and ready to communicate.

socket.on("ready", function () {
  if (creator) {
    rtcPeerConnection = new RTCPeerConnection(iceServers);
    rtcPeerConnection.onicecandidate = OnIceCandidateFunction;
    rtcPeerConnection.ontrack = OnTrackFunction;
    rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream);
    rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream);
    rtcPeerConnection.createOffer()
    .then((offer) => {
   
      offer.sdp = handle_offer_sdp(offer); //invoke function saving the new sdp
      rtcPeerConnection.setLocalDescription(offer);
      socket.emit("offer", offer, roomName);
    })
    .catch((error) => {
      console.log(error);
    });
  }
});

// Triggered on receiving an ice candidate from the peer.

socket.on("candidate", function (candidate) {
  let icecandidate = new RTCIceCandidate(candidate);
  rtcPeerConnection.addIceCandidate(icecandidate);
});

// Triggered on receiving an offer from the person who created the room.

socket.on("offer", function (offer) {
  let salla=50;

  socket.emit("salla",salla);
  if (!creator) {
    rtcPeerConnection = new RTCPeerConnection(iceServers);
    rtcPeerConnection.onicecandidate = OnIceCandidateFunction;
    rtcPeerConnection.ontrack = OnTrackFunction;
    rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream);
    rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream);
    rtcPeerConnection.setRemoteDescription(offer);
    rtcPeerConnection
      .createAnswer()
      .then((answer) => {
        rtcPeerConnection.setLocalDescription(answer);
        socket.emit("answer", answer, roomName);
      })
      .catch((error) => {
        console.log(error);
      });
  }
});

// Triggered on receiving an answer from the person who joined the room.

socket.on("answer", function (answer) {
  rtcPeerConnection.setRemoteDescription(answer);
});

// Implementing the OnIceCandidateFunction which is part of the RTCPeerConnection Interface.

function OnIceCandidateFunction(event) {
  console.log("Candidate");
  if (event.candidate) {
    socket.emit("candidate", event.candidate, roomName);
  }
}

// Implementing the OnTrackFunction which is part of the RTCPeerConnection Interface.

function OnTrackFunction(event) {
  peerVideo.srcObject = event.streams[0];
  peerVideo.onloadedmetadata = function (e) {
    peerVideo.play();
  };
}