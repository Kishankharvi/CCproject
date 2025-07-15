// Updated socket configuration with better stability
const getSocketConnection = () => {
  const serverUrl = process.env.NODE_ENV === 'production' 
    ? 'http://13.127.253.123:3001'  // Your production server
    : 'http://13.127.253.123:3001';     // Local development server
  
  return io(serverUrl, {
    // Transport configuration
    transports: ["polling", "websocket"], // Try polling first, then websocket
    upgrade: true,
    rememberUpgrade: true,
    
    // Connection timeouts
    timeout: 30000,        // Increased timeout
    pingTimeout: 25000,    // Ping timeout
    pingInterval: 10000,   // Ping interval
    
    // Reconnection settings  

    
    reconnection: true,
    reconnectionAttempts: 10,      // More attempts
    reconnectionDelay: 2000,       // Increased delay
    reconnectionDelayMax: 10000,   // Max delay
    randomizationFactor: 0.5,
    
    // Connection settings
    forceNew: false,       // Don't force new connection
    autoConnect: true,
    
    // Additional stability options
    withCredentials: false,
    extraHeaders: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });
};

// Enhanced Editor component with better connection handling
import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import toast from "react-hot-toast";

import Client from "../componets/Client";
import Sharebin from "../componets/Sharebin";

const Editor = () => {
  const { roomId: paramRoomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [username, setUsername] = useState("");
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

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

    // Initialize socket connection
    const initSocket = () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      const socketConnection = getSocketConnection();
      socketRef.current = socketConnection;
      setSocket(socketConnection);

      // Connection status handlers
      socketConnection.on("connect", () => {
        console.log("Socket connected:", socketConnection.id);
        setConnectionStatus("connected");
        setReconnectAttempts(0);
        toast.success("Connected to server!");
        
        // Join room after connection
        socketConnection.emit("join", {
          roomId: paramRoomId,
          username: nameFromState,
        });
      });

      socketConnection.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);
        setConnectionStatus("disconnected");
        
        if (reason === "io server disconnect") {
          // Server disconnected, try to reconnect
          setTimeout(() => {
            socketConnection.connect();
          }, 2000);
        }
      });

      socketConnection.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
        setConnectionStatus("error");
        setReconnectAttempts(prev => prev + 1);
        
        if (reconnectAttempts < 5) {
          toast.error(`Connection failed. Retrying... (${reconnectAttempts + 1}/5)`);
        } else {
          toast.error("Connection failed. Please check your internet connection.");
        }
      });

      socketConnection.on("reconnect", (attemptNumber) => {
        console.log("Socket reconnected after", attemptNumber, "attempts");
        setConnectionStatus("connected");
        setReconnectAttempts(0);
        toast.success("Reconnected to server!");
      });

      socketConnection.on("reconnect_attempt", (attemptNumber) => {
        console.log("Reconnection attempt:", attemptNumber);
        setConnectionStatus("reconnecting");
        setReconnectAttempts(attemptNumber);
      });

      socketConnection.on("reconnect_error", (error) => {
        console.error("Reconnection error:", error);
        setConnectionStatus("error");
      });

      socketConnection.on("reconnect_failed", () => {
        console.error("Reconnection failed");
        setConnectionStatus("failed");
        toast.error("Failed to reconnect. Please refresh the page.");
      });

      // Room event handlers
      socketConnection.on("joined", ({ clients }) => {
        setClients(clients);
        console.log("Successfully joined room with", clients.length, "clients");
      });

      socketConnection.on("user-joined", ({ clients, username: joinedUsername }) => {
        setClients(clients);
        toast.success(`${joinedUsername} joined the room!`);
      });

      socketConnection.on("user-left", ({ clients, username: leftUsername }) => {
        setClients(clients);
        toast(`${leftUsername} left the room`);
      });

      socketConnection.on("error", ({ message }) => {
        toast.error(message || "An error occurred");
      });
    };

    initSocket();

    // Cleanup function
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [location.state, navigate, paramRoomId]);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected": return "text-green-500";
      case "connecting": 
      case "reconnecting": return "text-yellow-500";
      case "disconnected":
      case "error":
      case "failed": return "text-red-500";
      default: return "text-gray-500";
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case "connected": return "Connected";
      case "connecting": return "Connecting...";
      case "reconnecting": return `Reconnecting... (${reconnectAttempts})`;
      case "disconnected": return "Disconnected";
      case "error": return "Connection Error";
      case "failed": return "Connection Failed";
      default: return "Unknown";
    }
  };

  const handleRetryConnection = () => {
    if (socketRef.current) {
      setConnectionStatus("connecting");
      socketRef.current.connect();
    }
  };

  const CopyLink = () => {
    const fullUrl = `${window.location.origin}/editor/${paramRoomId}`;
    navigator.clipboard
      .writeText(fullUrl)
      .then(() => toast.success("Room link copied to clipboard!"))
      .catch((err) => {
        console.error("Failed to copy:", err);
        toast.error("Failed to copy link");
      });
  };

  const Sharebtn = () => {
    const shareData = {
      title: "Join my coding session",
      text: "Join me in this collaborative coding room:",
      url: window.location.href,
    };

    if (navigator.share) {
      navigator.share(shareData).catch((err) => {
        console.error("Share failed:", err);
        toast.error("Share failed. Copying link instead.");
        CopyLink();
      });
    } else {
      toast.error("Sharing not supported. Copying link instead.");
      CopyLink();
    }
  };

  const handleLeaveRoom = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    navigate("/");
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
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <i className="fi fi-br-signal text-brand mr-2" />
                  Status: <span className={`ml-1 font-medium ${getStatusColor()}`}>{getStatusText()}</span>
                </div>
                {(connectionStatus === "error" || connectionStatus === "failed") && (
                  <button 
                    onClick={handleRetryConnection}
                    className="text-xs bg-brand text-white px-2 py-1 rounded hover:bg-brand-dark"
                  >
                    Retry
                  </button>
                )}
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
                onClick={handleLeaveRoom}
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
          <Sharebin socket={socket} roomId={paramRoomId} username={username} />
        </div>
      </div>
    </div>
  );
};

export default Editor;