import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

export default function CreateItemModal({
  isOpen,
  onClose,
  onCreate,
  type = "file", // "file" or "folder"
}) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (isOpen) setName("");
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim());
    setName("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ duration: 0.25 }}
            className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                       w-[90%] max-w-sm bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-6"
          >
            <h2 className="text-xl font-semibold text-indigo-400 text-center mb-4">
              Create New {type === "file" ? "File" : "Folder"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  {type === "file" ? "File Name" : "Folder Name"}
                </label>
                <input
                  autoFocus
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    type === "file" ? "e.g. index.js" : "e.g. utils"
                  }
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200
                             focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-200 transition text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition-all"
                >
                  Create
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
