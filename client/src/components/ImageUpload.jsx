import React, { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ImageUpload = ({ onImageUpload }) => {
  const [uploadStatus, setUploadStatus] = useState("idle");
  const [previews, setPreviews] = useState([]);
  const [isDraggingOnPage, setIsDraggingOnPage] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);

  useEffect(() => {
    onImageUpload(previews);
  }, [previews, onImageUpload]);

  const onDrop = useCallback((acceptedFiles) => {
    setUploadStatus("uploading");

    const processFile = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target.result;
          const [header, base64Data] = result.split(",");
          const mediaType = file.type || header.split(":")[1].split(";")[0];

          resolve({
            file: base64Data,
            caption: "",
            mediaType: mediaType,
            preview: URL.createObjectURL(file),
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    };

    Promise.all(acceptedFiles.map(processFile))
      .then((processedFiles) => {
        setPreviews((prev) => [...prev, ...processedFiles].slice(0, 5));
        setUploadStatus("success");
      })
      .catch(() => {
        setUploadStatus("error");
      });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [],
      "image/jpg": [],
      "image/png": [],
      "image/gif": [],
      "image/webp": [],
    },
    maxFiles: 5,
    maxSize: 5 * 1024 * 1024,
  });

  const handleImageClick = (e, index) => {
    e.stopPropagation(); // Prevent the click from bubbling up to the dropzone
    setSelectedImageIndex(index);
  };

  const closeImagePreview = () => {
    setSelectedImageIndex(null);
  };

  const handleCaptionChange = (index, newCaption) => {
    setPreviews((prev) => {
      const newPreviews = prev.map((p, i) =>
        i === index ? { ...p, caption: newCaption } : p
      );
      onImageUpload(newPreviews);
      return newPreviews;
    });
  };

  const removeImage = (e, index) => {
    e.stopPropagation(); // Prevent the click from bubbling up to the dropzone
    setPreviews((prev) => {
      const newPreviews = prev.filter((_, i) => i !== index);
      onImageUpload(newPreviews);
      return newPreviews;
    });
    setUploadStatus(previews.length === 1 ? "idle" : "success");
  };

  useEffect(() => {
    const handleDragEnter = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOnPage(true);
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.target === document || e.target === document.documentElement) {
        setIsDraggingOnPage(false);
      }
    };

    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOnPage(false);
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        closeImagePreview();
      }
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="w-full">
      <motion.div {...getRootProps()} transition={{ duration: 0.3 }}>
        <div
          className="w-full mb-4 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer bg-gray-50 relative"
          style={{
            minHeight: "200px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <input {...getInputProps()} />

          <AnimatePresence>
            {(isDragActive || isDraggingOnPage) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 bg-gray-100 flex flex-col items-center justify-center"
                style={{ zIndex: 1000 }}
              >
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="text-center"
                >
                  <h2 className="text-gray-700 text-xl font-medium mb-2">
                    Drop your images here
                  </h2>
                  <p className="text-gray-500 text-sm">
                    Release to upload up to 5 images
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {previews.length > 0 ? (
            <div className="relative flex flex-wrap justify-center gap-4 w-full">
              {previews.map((preview, index) => (
                <motion.div
                  key={preview.preview}
                  className="relative bg-white rounded-lg shadow-sm overflow-hidden"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  onClick={(e) => handleImageClick(e, index)}
                >
                  <div className="relative h-32">
                    <img
                      src={preview.preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <motion.button
                      onClick={(e) => removeImage(e, index)}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full shadow-sm"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <X size={12} />
                    </motion.button>
                  </div>
                  <div className="p-2">
                    <input
                      type="text"
                      value={preview.caption || ""}
                      onChange={(e) =>
                        handleCaptionChange(index, e.target.value)
                      }
                      placeholder="Caption"
                      className="w-full text-xs p-1 border-b focus:outline-none focus:border-gray-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </motion.div>
              ))}
              {previews.length < 5 && (
                <motion.div
                  className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center"
                  whileHover={{ scale: 1.05, borderColor: "#4B5563" }}
                  transition={{ duration: 0.2 }}
                >
                  <Upload className="text-gray-400" size={24} />
                </motion.div>
              )}
            </div>
          ) : (
            <div className="relative w-full">
              {uploadStatus === "uploading" ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                >
                  <Upload className="mx-auto mb-4 text-gray-400" size={36} />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <ImageIcon className="mx-auto mb-4 text-gray-400" size={36} />
                </motion.div>
              )}
              <motion.p
                className="text-base font-medium mb-2 text-gray-600"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.5 }}
              >
                {uploadStatus === "uploading"
                  ? "Uploading..."
                  : uploadStatus === "error"
                  ? "Error uploading. Please try again."
                  : "Drag & drop images here, or click to select"}
              </motion.p>
              <motion.p
                className="text-xs text-gray-400"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                Max 5 images, 5MB each
              </motion.p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Image Preview Modal */}
      {selectedImageIndex !== null && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={closeImagePreview}
        >
          <div
            className="bg-white p-4 rounded-lg max-w-3xl max-h-[90vh] overflow-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previews[selectedImageIndex].preview}
              alt={`Preview ${selectedImageIndex + 1}`}
              className="max-w-full max-h-[80vh] object-contain"
              style={{ outline: "none" }}
            />
            <p className="mt-2 text-center text-gray-700">
              {previews[selectedImageIndex].caption || "No caption"}
            </p>
            <motion.button
              onClick={closeImagePreview}
              className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-md"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X size={20} />
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
