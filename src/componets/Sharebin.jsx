import React, { useState } from "react";
// Add this import at the top of Sharebin.js
import axios from 'axios';
const Sharebin = () => {

  const [textContent, setTextContent] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);

const uploadToS3 = async (file) => {
  const { data: url } = await axios.get(`/get-presigned-url?filename=${file.name}`);
  await axios.put(url, file, {
    headers: { "Content-Type": file.type },
  });
  return url.split("?")[0]; // Return public URL (without query params)
};




  const handleTextChange = (e) => {
    setTextContent(e.target.value);
  };
const handleFileUpload = async (files) => {
  const fileArray = Array.from(files);

  const uploaded = await Promise.all(
    fileArray.map(async (file) => {
      try {
        const fileUrl = await uploadToS3(file);

        return {
          id: Date.now() + Math.random(),
          name: file.name,
          size: file.size,
          type: file.type,
          file: file,
          url: fileUrl, // Store uploaded S3 URL
        };
      } catch (error) {
        console.error("Upload failed:", file.name, error);
        return null;
      }
    })
  );

  const validUploads = uploaded.filter((f) => f !== null);
  setUploadedFiles((prev) => [...prev, ...validUploads]);
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
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (fileType) => {
    if (!fileType) return "fi fi-br-file"; // default

    if (fileType.startsWith("image/")) return "fi fi-br-picture";
    if (fileType.startsWith("video/")) return "fi fi-br-video-camera";
    if (fileType.startsWith("audio/")) return "fi fi-br-music-alt";
    if (fileType.includes("pdf")) return "fi fi-br-file-pdf";
    if (fileType.includes("text")) return "fi fi-br-document";
    if (fileType.includes("zip") || fileType.includes("rar"))
      return "fi fi-br-folder-download";

    return "fi fi-br-file"; // fallback
  };

  return (
    <div className="flex-1 bg-primary">
      <div className="p-6 h-full flex flex-col gap-6">
        {/* Text Area Section */}
        <div className="flex-1 min-h-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-primary text-lg">Text Editor</h3>
            <div className="text-tertiary text-sm">
              {textContent.length} characters
            </div>
          </div>
          <textarea
            value={textContent}
            onChange={handleTextChange}
            placeholder="Start typing your content here..."
            className="w-full h-full min-h-[300px] p-4 bg-secondary border border-primary rounded-lg text-primary placeholder:text-tertiary resize-none focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all duration-200"
            style={{
              fontFamily:
                'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
            }}
          />
        </div>

        {/* File Upload Section */}
        <div>
          <h3 className="font-medium text-primary text-lg mb-3">File Upload</h3>

          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
              isDragOver
                ? "border-brand bg-accent text-accent"
                : "border-primary bg-secondary text-tertiary hover:border-brand hover:bg-accent hover:text-accent"
            }`}
          >
            <input
              type="file"
              multiple
              onChange={handleFileInputChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              id="file-upload"
            />
            <div className="pointer-events-none">
              <div className="text-3xl mb-2">📁</div>
              <p className="text-lg font-medium mb-1">
                {isDragOver ? "Drop files here" : "Drag & drop files here"}
              </p>
              <p className="text-sm">
                or{" "}
                <span className="text-brand font-medium">click to browse</span>
              </p>
            </div>
          </div>

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div className="mt-4 h-auto">
              <h4 className="font-medium text-secondary mb-3">
                Uploaded Files ({uploadedFiles.length})
              </h4>
              <div className="space-y-2 h-auto overflow-y-auto">
                {uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-secondary border border-primary rounded-lg hover:bg-tertiary transition-colors duration-200"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-xl aspect-square flex-shrink-0">
                        <i
                          className={`${getFileIcon(file.type)} text-accent`}
                        ></i>
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="text-primary font-medium truncate">
                          {file.name}
                        </p>
                        <p className="text-tertiary text-sm">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(file.id)}
                      className="flex-shrink-0 ml-3 p-1 text-tertiary hover:text-error hover:bg-error hover:bg-opacity-20 rounded transition-colors duration-200"
                      aria-label={`Remove ${file.name}`}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sharebin;
