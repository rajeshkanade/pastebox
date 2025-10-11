import React, { useRef, useState } from "react";
import "./GuestFileUpload.css";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import axiosInstance from "../../config/axiosInstance";


const GuestFileUpload = ({guestFiles, updateFiles}) => {
  const fileInputRef = useRef(null);
  const dispatch = useDispatch();
  const [loading ,setLoading] = useState(false);

  const [files, setFiles] = useState(guestFiles || []);
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [enableExpiry, setEnableExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState("");

  const handleBrowseClick = () => {
    fileInputRef.current.click();
  };

  console.log("files", files);

  const handleFiles = (fileList) => {
    const newFiles = Array.from(fileList).filter(
      (file) => file.size <= 10 * 1024 * 1024
    );
    setFiles((prev) => [...prev, ...newFiles]);
    toast.success("File(s) added!");
  };

  const handleFileInputChange = (e) => {
    handleFiles(e.target.files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("dragover");
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add("dragover");
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("dragover");
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    toast.info("File removed");
  };

  const totalSize = files.reduce((acc, file) => acc + file.size, 0);

 const handleUpload = async () => {
  if (files.length === 0) {
    toast.error("Please upload at least one file.");
    return;
  }

  setLoading(true);

  try {
    const formData = new FormData();

    // Append all files
    files.forEach((file) => {
      formData.append("files", file); // key must match backend
    });


    console.log("formData : " , ...formData.entries())

    // Append optional password
    if (enablePassword && password.trim()) {
      formData.append("isPassword", "true");
      formData.append("password", password.trim());
    } else {
      formData.append("isPassword", "false");
    }

    // Append optional expiry
    if (enableExpiry && expiryDate) {
      const hours = Math.ceil(
        (new Date(expiryDate) - new Date()) / (1000 * 60 * 60)
      );
      formData.append("hasExpiry", "true");
      formData.append("expiresAt", hours);
    } else {
      formData.append("hasExpiry", "false");
    }

    // Debug: log FormData content
    for (let pair of formData.entries()) {
      console.log(pair[0], ":", pair[1]);
    }

    // Axios POST request (do NOT set Content-Type manually)
    const response = await axiosInstance.post("/files/upload-guest", formData);

    if (response.data.message === "Files uploaded successfully") {
      toast.success("Files uploaded successfully!");

      // Update parent state
      const updatedFiles = [...guestFiles, ...response.data.files];
      console.log("updated files", updatedFiles);
      updateFiles(updatedFiles);

      // Save to localStorage for persistence
      localStorage.setItem("guestFiles", JSON.stringify(updatedFiles));

      console.log("Updated files:", updatedFiles);
      // Reset local files
      setFiles([]);
    } else {
      toast.error(response.data.message || "Upload failed");
    }
  } catch (err) {
    toast.error(err.response?.data?.message || err.message || "Upload failed");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="container bg-[var(--bg-color)] text-[var(--text-color)] p-6 rounded-lg shadow-md">
      <div className="header bg-[var(--bg-color)] text-[var(--text-color)] text-center mb-6">
        <h1 className="text-2xl font-bold text-[var(--primary-text)] mb-4">File Upload</h1>
        <p className="font-bold text-[var(--primary-text)] mb-4">Drag & drop files or click to browse</p>
      </div>

      <div
        className="dropbox"
        onClick={handleBrowseClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="dropbox-icon">📁</div>
        <div className="dropbox-text">Drop files here</div>
        <div className="dropbox-subtext">
          Supported formats: JPG, PNG, PDF, MP4, MOV, AVI, MKV (Max 10MB)
        </div>
        <button
          className="browse-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleBrowseClick();
          }}
        >
          Browse Files
        </button>
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept=".jpg,.jpeg,.webp,.png,.mp4,.avi,.mov,.mkv,.mk3d,.mks,.mka,.pdf"
          onChange={handleFileInputChange}
        />
      </div>

      <div className="extra-options bg-[var(--bg-color)] text-[var(--text-color)] mt-6">
        <div className="switch-container">
          <label className="switch-label">
            <span className="label-text">Set Password</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={enablePassword}
                onChange={(e) => setEnablePassword(e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </label>
          {enablePassword && (
            <input
              type="password"
              className="password-input"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </div>

        <div className="switch-container">
          <label className="switch-label">
            <span className="label-text">Set Expiry Date</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={enableExpiry}
                onChange={(e) => setEnableExpiry(e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </label>
          {enableExpiry && (
            <input
              type="datetime-local"
              className="expiry-input"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          )}
        </div>
      </div>

      {files.length > 0 && (
        <div className="upload-stats">
          <div className="stats-header">
            <div className="stats-title">Upload Summary</div>
          </div>
          <div className="stats-info">
            <div className="stat-item">
              <div className="stat-value">{files.length}</div>
              <div className="stat-label">Files</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">
                {(totalSize / 1024).toFixed(2)} KB
              </div>
              <div className="stat-label">Total Size</div>
            </div>
          </div>
          <div className="progress-bar" style={{ marginTop: "15px" }}>
            <div
              className="progress-fill"
              style={{
                width: `${Math.min(
                  (totalSize / (5 * 1024 * 1024)) * 100,
                  100
                )}%`,
              }}
            />
          </div>
        </div>
      )}

      {files.length === 0 ? (
        <div className="empty-state">No files uploaded yet</div>
      ) : (
        <div className="file-previews">
          {files.map((file, index) => (
            <div className="file-preview" key={index}>
              <div className="preview-img-container">
                {file.type.startsWith("image") ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="preview-img"
                  />
                ) : file.type.startsWith("video") ? (
                  <video
                    src={URL.createObjectURL(file)}
                    className="preview-video"
                    controls
                    muted
                    width="100"
                    height="80"
                  />
                ) : (
                  <div className="file-icon">📄</div>
                )}
              </div>
              <div className="file-info">
                <div className="file-name" title={file.name}>
                  {(() => {
                    const dotIndex = file.name.lastIndexOf(".");
                    const name = file.name.slice(0, dotIndex);
                    const ext = file.name.slice(dotIndex);
                    return name.length > 30
                      ? `${name.slice(0, 27)}...${ext}`
                      : file.name;
                  })()}
                </div>
                <div className="file-size">
                  {file.size > 1024 * 1024
                    ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
                    : `${(file.size / 1024).toFixed(2)} KB`}
                </div>
                <div className="file-actions">
                  <button
                    className="remove-btn"
                    onClick={() => removeFile(index)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="upload-action">
        <button
          className="upload-btn"
          onClick={handleUpload}
          disabled={loading || files.length === 0}
        >
          {loading ? "Uploading..." : "Upload"}
        </button>
      </div>
    </div>
  );
};

export default GuestFileUpload;
