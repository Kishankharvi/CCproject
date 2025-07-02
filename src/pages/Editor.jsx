import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import toast from "react-hot-toast";

import Client from "../componets/Client";
import Sharebin from "../componets/Sharebin";

// Socket connection (adjust backend URL as needed)
const socket = io("http://52.66.195.105:3001", {
  transports: ["websocket", "polling"],
  timeout: 20000,
  forceNew: true,
});

const Editor = () => {
  const { roomId: paramRoomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [username, setUsername] = useState("");

  useEffect(() => {
    // Try to retrieve username from location state
    let nameFromState = location.state?.currentUser;

    // If no username, prompt user
    if (!nameFromState) {
      nameFromState = prompt("Enter your name to join the room:");
      if (!nameFromState) {
        toast.error("Username is required. Redirecting...");
        navigate("/");
        return;
      }
    }

    setUsername(nameFromState);

    // Join room
    socket.emit("join", {
      roomId: paramRoomId,
      username: nameFromState,
    });

    // Socket events
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
      navigator.clipboard.writeText(`${shareData.title}\n${shareData.text} ${shareData.url}`);
    }
  };

  return (
    <div className="min-h-[100vh] bg-primary flex">
      {/* Sidebar */}
      <div className="w-80 bg-secondary border-r border-primary shadow-themed-lg">
        <div className="flex items-center justify-between p-6 border-b border-primary">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-brand rounded-lg flex items-center justify-center shadow-themed-sm">
              <i className="fi fi-br-code text-white text-lg">{username?.charAt(0).toUpperCase() || "U"}</i>
            </div>
            <div>
              <h1 className="text-lg font-bold text-primary">{username}</h1>
              <p className="text-xs text-secondary">Room: {paramRoomId}</p>
            </div>
          </div>
        </div>

        {/* Connected Users */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-tertiary rounded-xl p-4 border border-accent">
            <div className="flex justify-between mb-3">
              <h3 className="text-sm font-semibold text-primary">Room Info</h3>
              <button onClick={CopyLink} className="text-secondary hover:text-primary">
                <i className="fi fi-br-copy text-xs" />
              </button>
            </div>
            <div className="text-xs text-secondary space-y-2">
              <div className="flex items-center">
                <i className="fi fi-br-key text-brand mr-2" />
                ID: {paramRoomId}
              </div>
              <div className="flex items-center">
                <i className="fi fi-br-clock text-brand mr-2" />
                Joined on {new Date().toLocaleString()}
              </div>
            </div>
          </div>

          {/* Clients */}
          <div>
            <h3 className="text-sm font-semibold text-primary mb-4 flex items-center">
              <i className="fi fi-br-users text-brand mr-2" />
              Connected Users
              <span className="ml-auto bg-brand text-white text-xs px-2 py-1 rounded-full font-medium">
                {clients.length}
              </span>
            </h3>

            <div className="space-y-3">
              {clients.map((client, index) => (
                <Client
                  key={client.socketId + index}
                  username={client.username}
                  userState={client.userState || "idle"}
                  initial={client.username?.charAt(0).toUpperCase() || "U"}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div>
            <h3 className="text-sm font-semibold text-primary mb-4 flex items-center">
              <i className="fi fi-br-bolt text-brand mr-2"></i>
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={Sharebtn}
                className="bg-tertiary hover:bg-hover border border-primary rounded-lg p-3 text-center transition-all duration-200"
              >
                <i className="fi fi-br-share text-brand text-lg mb-2 block" />
                <span className="text-xs text-primary font-medium">Share</span>
              </button>
              <button
                onClick={() => navigate("/")}
                className="bg-tertiary hover:bg-hover border border-primary rounded-lg p-3 text-center transition-all duration-200"
              >
                <i className="fi fi-br-sign-out-alt text-error text-lg mb-2 block" />
                <span className="text-xs text-error font-medium">Leave</span>
              </button>
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
