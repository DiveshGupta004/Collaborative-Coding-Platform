import { motion } from "framer-motion";
import { FiX } from "react-icons/fi";

export default function FileModal({ isOpen, onClose, onSubmit }) {
  if (!isOpen) return null;
  let inputVal = "";

  const handleSubmit = () => {
    if (inputVal.trim()) onSubmit(inputVal.trim());
    onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-gray-900 border border-gray-700 p-6 rounded-xl shadow-xl w-[90%] max-w-md"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-indigo-400 text-lg font-semibold">
            Create New File
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <FiX size={18} />
          </button>
        </div>

        <input
          type="text"
          placeholder="e.g., app.js"
          className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500"
          onChange={(e) => (inputVal = e.target.value)}
        />

        <div className="flex justify-end mt-4">
          <button
            onClick={handleSubmit}
            className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium transition"
          >
            Create
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
