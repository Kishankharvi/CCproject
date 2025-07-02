import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import Client from "../componets/Client";
import toast from "react-hot-toast";
import Sharebin from "../componets/Sharebin";

import { io } from "socket.io-client";

// Replace with deployed backend URL in production
// Update this line if your backend is running on a different port or host
const socket = io("http://52.66.195.105:3001  ", {
  transports: ["websocket", "polling"], // Add polling as fallback
  timeout: 20000,
  forceNew: true
});
const Editor = () => {
  const [clients, setClients] = useState([]);

  const { roomId: paramRoomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const roomId = location.state?.roomId;
  const currentUser = location.state?.currentUser;
  const timestamp = location.state?.timestamp;

useEffect(() => {
  let user = currentUser;

  // If state is not passed, prompt for username
  if (!location.state || !roomId) {
    user = prompt("Enter your name to join the room");
    if (!user) {
      toast.error("Username is required. Redirecting...");
      navigate("/");
      return;
    }
  }

  const joinedUser = user || currentUser;

  socket.emit("join", {
    roomId: paramRoomId,
    username: joinedUser,
  });

  socket.on("joined", ({ clients }) => {
    setClients(clients);
  });

  socket.on("user-joined", ({ clients }) => {
    setClients(clients);
    toast.success("A new user joined the room!");
  });

  socket.on("user-left", ({ clients }) => {
    setClients(clients);
    toast("A user left the room");
  });

  return () => {
    socket.disconnect();
  };
}, [location.state, navigate, paramRoomId]);

  const CopyLink = () => {
    const fullUrl = `${window.location.origin}/editor/${paramRoomId}`;
    navigator.clipboard
      .writeText(fullUrl)
      .then(() => toast.success("Copied to clipboard"))
      .catch((err) => toast.error("Failed to copy:", err));
  };

  const Sharebtn = () => {
    const shareData = {
      title: "Join my session",
      text: "Join me in this room:",
      url: window.location.href,
    };

    if (navigator.share) {
      navigator.share(shareData).catch((err) => toast.error("Share failed:", err));
    } else {
      toast.error("Sharing not supported. Copying link instead.");
      navigator.clipboard.writeText(`${shareData.title}\n ${shareData.text}${shareData.url}`);
    }
  };

  return (
    <div className="min-h-[100vh] bg-primary flex">
      {/* Sidebar */}
      <div className="w-80 bg-secondary border-r border-primary shadow-themed-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-primary">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-brand aspect-square rounded-lg flex items-center justify-center shadow-themed-sm">
              <i className="fi fi-br-code text-white text-lg">
                {currentUser?.charAt(0).toUpperCase() || "K"}
              </i>
            </div>
            <div>
              <h1 className="text-lg font-bold text-primary">{currentUser}</h1>
              <p className="text-xs text-secondary">Room: {roomId}</p>
            </div>
          </div>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto h-full">
          <div className="p-6 space-y-6">
            {/* Room Info */}
            <div className="bg-tertiary rounded-xl p-4 border border-accent">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-primary">Room Info</h3>
                <button className="p-1 text-secondary hover:text-primary transition-colors duration-200">
                  <i className="fi fi-br-copy text-xs" onClick={CopyLink}></i>
                </button>
              </div>
              <div className="space-y-2 text-xs text-secondary">
                <div className="flex items-center">
                  <i className="fi fi-br-key text-brand mr-2"></i>
                  ID: {roomId}
                </div>
                <div className="flex items-center">
                  <i className="fi fi-br-clock text-brand mr-2"></i>
                  Joined on {timestamp}
                </div>
              </div>
            </div>

            {/* Connected Users */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-primary flex items-center">
                  <i className="fi fi-br-users text-brand mr-2"></i>
                  Connected Users
                </h3>
                <span className="bg-brand text-white text-xs px-2 py-1 rounded-full font-medium">
                  {clients.length}
                </span>
              </div>

              <div className="space-y-3">
                {clients.map((client, index) => (
                  <Client
                    key={client.socketId + index}
                    username={client.username}
                    userState={client.userState || "idle"}
                    initial={client.username?.charAt(0).toUpperCase() || "K"}
                  />
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="text-sm font-semibold text-primary mb-4 flex items-center">
                <i className="fi fi-br-bolt text-brand mr-2"></i>
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={Sharebtn}
                  className="bg-tertiary hover:bg-hover border border-primary rounded-lg p-3 text-center transition-all duration-200 hover:shadow-themed-sm"
                >
                  <i className="fi fi-br-share text-brand text-lg mb-2 block"></i>
                  <span className="text-xs text-primary font-medium">Share</span>
                </button>
                <button
                  onClick={() => navigate(-1)}
                  className="bg-tertiary hover:bg-hover border border-primary rounded-lg p-3 text-center transition-all duration-200 hover:shadow-themed-sm"
                >
                  <i className="fi fi-br-sign-out-alt text-error text-lg mb-2 block"></i>
                  <span className="text-xs text-error font-medium">Leave</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-primary">
        <div className="p-6">
          <Sharebin />
        </div>
      </div>
    </div>
  );
};

export default Editor;
