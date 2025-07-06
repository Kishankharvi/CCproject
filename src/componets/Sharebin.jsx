import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const Sharebin = ({ socket, roomId, username }) => {
  const [textContent, setTextContent] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const chatEndRef = useRef(null);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Listen for file shares from other users
    socket.on("file-shared", (data) => {
      console.log("File shared:", data);
      setSharedFiles(prev => [...prev, {
        id: `shared-${Date.now()}-${Math.random()}`,
        ...data.fileData,
        sharedBy: data.username,
        timestamp: data.timestamp,
        isShared: true
      }]);
    });

    // Listen for chat messages
    socket.on("chat-message", (data) => {
      console.log("Chat message received:", data);
      setChatMessages(prev => [...prev, data]);
      
      // Increment unread count if chat is not visible
      if (!showChat) {
        setUnreadCount(prev => prev + 1);
      }
    });

    // Listen for text content changes
    socket.on("text-content-changed", (data) => {
      if (data.username !== username) {
        setTextContent(data.content);
      }
    });

    // Cleanup listeners
    return () => {
      socket.off("file-shared");
      socket.off("chat-message");
      socket.off("text-content-changed");
    };
  }, [socket, username, showChat]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  // Clear unread count when chat becomes visible
  useEffect(() => {
    if (showChat) {
      setUnreadCount(0);
    }
  }, [showChat]);

  const uploadToS3 = async (file) => {
    try {
      console.log("Uploading file:", file.name, "Type:", file.type);
      setIsUploading(true);
      
      const res = await axios.get(`/get-presigned-url?filename=${encodeURIComponent(file.name)}&filetype=${encodeURIComponent(file.type || 'application/octet-stream')}`);
      console.log("Presigned URL response:", res.data);
      
      const uploadUrl = res.data.url;
      
      if (!uploadUrl) {
        throw new Error("No upload URL received from server");
      }

      // Upload to S3
      const uploadResponse = await axios.put(uploadUrl, file, {
        headers: { 
          "Content-Type": file.type || "application/octet-stream"
        },
      });
      
      console.log("Upload successful:", uploadResponse.status);
      return res.data.publicUrl || uploadUrl.split("?")[0];
    } catch (err) {
      console.error("Error details:", err.response?.data || err.message);
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  const handleTextChange = (e) => {
    const newContent = e.target.value;
    setTextContent(newContent);
    
    // Emit text change to other users
    if (socket && roomId) {
      socket.emit("text-content-change", {
        roomId,
        content: newContent,
        username
      });
    }
  };

  const handleFileUpload = async (files) => {
    const fileArray = Array.from(files);
    console.log("Files to upload:", fileArray.map(f => f.name));

    const uploaded = await Promise.all(
      fileArray.map(async (file) => {
        try {
          const fileUrl = await uploadToS3(file);
          const fileData = {
            id: `${Date.now()}-${Math.random()}`,
            name: file.name,
            size: file.size,
            type: file.type,
            url: fileUrl,
            uploadedBy: username,
            timestamp: new Date().toISOString()
          };
          return fileData;
        } catch (error) {
          console.error("Upload failed for:", file.name, error);
          return null;
        }
      })
    );

    const validFiles = uploaded.filter(Boolean);
    setUploadedFiles((prev) => [...prev, ...validFiles]);
    
    // Share files with other users in the room
    validFiles.forEach(fileData => {
      if (socket && roomId) {
        socket.emit("file-share", {
          roomId,
          fileData,
          username
        });
      }
    });
  };

  const handleFileInputChange = (e) => {
    if (e.target.files.length > 0) {
      handleFileUpload(e.target.files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const removeFile = (fileId) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId));
    setSharedFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  const downloadFile = (fileUrl, fileName) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !socket || !roomId) return;
    
    socket.emit("chat-message", {
      roomId,
      message: newMessage.trim(),
      username
    });
    
    setNewMessage("");
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (fileType = "") => {
    if (fileType.startsWith("image/")) return "fi fi-br-picture";
    if (fileType.startsWith("video/")) return "fi fi-br-video-camera";
    if (fileType.startsWith("audio/")) return "fi fi-br-music-alt";
    if (fileType.includes("pdf")) return "fi fi-br-file-pdf";
    if (fileType.includes("text")) return "fi fi-br-document";
    if (fileType.includes("zip") || fileType.includes("rar")) return "fi fi-br-folder-download";
    return "fi fi-br-file";
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const allFiles = [...uploadedFiles, ...sharedFiles].sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );

  return (
    <div className="flex-1 bg-primary flex">
      {/* Main Content */}
      <div className="flex-1 p-6 h-full flex flex-col gap-6">
        {/* Text Editor Section */}
        <div className="flex-1 min-h-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-primary text-lg">Collaborative Text Editor</h3>
            <div className="text-tertiary text-sm">{textContent.length} characters</div>
          </div>
          <textarea
            value={textContent}
            onChange={handleTextChange}
            placeholder="Start typing your content here... Changes sync in real-time!"
            className="w-full h-full min-h-[300px] p-4 bg-secondary border border-primary rounded-lg text-primary placeholder:text-tertiary resize-none focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all duration-200"
            style={{
              fontFamily:
                'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
            }}
          />
        </div>

        {/* File Upload Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-primary text-lg">File Sharing</h3>
            {isUploading && (
              <div className="text-brand text-sm flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand mr-2"></div>
                Uploading...
              </div>
            )}
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
              isDragOver
                ? "border-brand bg-accent text-accent"
                : "border-primary bg-secondary text-tertiary hover:border-brand hover:bg-accent hover:text-accent"
            } ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
          >
            <input
              type="file"
              multiple
              onChange={handleFileInputChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              id="file-upload"
              disabled={isUploading}
            />
            <div className="pointer-events-none">
              <div className="text-3xl mb-2">📁</div>
              <p className="text-lg font-medium mb-1">
                {isDragOver ? "Drop files here" : "Drag & drop files to share"}
              </p>
              <p className="text-sm">
                or <span className="text-brand font-medium">click to browse</span>
              </p>
              <p className="text-xs text-tertiary mt-2">Files will be shared with all room members</p>
            </div>
          </div>

          {/* Files List */}
          {allFiles.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-secondary mb-3">
                Shared Files ({allFiles.length})
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {allFiles.map((file) => (
                  <div
                    key={file.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors duration-200 ${
                      file.isShared 
                        ? "bg-accent border-brand" 
                        : "bg-secondary border-primary hover:bg-tertiary"
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-xl flex-shrink-0">
                        <i className={`${getFileIcon(file.type)} text-accent`}></i>
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-primary font-medium truncate">{file.name}</p>
                          {file.isShared && (
                            <span className="text-xs bg-brand text-white px-2 py-1 rounded-full">
                              Shared by {file.sharedBy}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-tertiary text-sm">
                          <span>{formatFileSize(file.size)}</span>
                          <span>•</span>
                          <span>{formatTimestamp(file.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <button
                        onClick={() => downloadFile(file.url, file.name)}
                        className="p-2 text-brand hover:bg-brand hover:text-white rounded transition-colors duration-200"
                        title="Download file"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                      {(file.uploadedBy === username || file.sharedBy === username) && (
                        <button
                          onClick={() => removeFile(file.id)}
                          className="p-2 text-tertiary hover:text-error hover:bg-error hover:bg-opacity-20 rounded transition-colors duration-200"
                          title="Remove file"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Sidebar */}
      <div className={`bg-secondary border-l border-primary transition-all duration-300 ${
        showChat ? "w-80" : "w-0"
      } overflow-hidden`}>
        {showChat && (
          <div className="h-full flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b border-primary bg-tertiary">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-primary">Room Chat</h3>
                <button
                  onClick={() => setShowChat(false)}
                  className="text-tertiary hover:text-primary"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 ? (
                <div className="text-center text-tertiary text-sm">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.username === username ? "items-end" : "items-start"
                    }`}
                  >
                    <div className="text-xs text-tertiary mb-1">
                      {msg.username} • {formatTimestamp(msg.timestamp)}
                    </div>
                    <div
                      className={`max-w-xs p-3 rounded-lg ${
                        msg.username === username
                          ? "bg-brand text-white"
                          : "bg-primary text-primary"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-primary bg-tertiary">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 p-2 bg-secondary border border-primary rounded text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand text-sm"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="px-4 py-2 bg-brand text-white rounded hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Toggle Button */}
      <div className="absolute bottom-6 right-6">
        <button
          onClick={() => setShowChat(!showChat)}
          className="relative bg-brand text-white p-4 rounded-full shadow-lg hover:bg-brand-dark transition-colors duration-200"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-error text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default Sharebin;