import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef } from "react";

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.toLowerCase());

export default function CreateWorkspaceModal({
  isOpen,
  onClose,
  onCreate,
  projectName,
  setProjectName,
  emails,
  setEmails,
}) {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const addEmails = (raw) => {
    const list = raw
      .split(/[,\s]+/)
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean);

    let invalidFound = false;
    const updated = [...emails];

    list.forEach((email) => {
      if (!isValidEmail(email)) {
        invalidFound = true;
      } else if (!updated.includes(email)) {
        updated.push(email);
      }
    });

    setEmails(updated);
    setInputValue("");
    setError(invalidFound ? "Some emails were invalid or duplicates." : "");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addEmails(inputValue);
    } else if (e.key === "Backspace" && inputValue === "" && emails.length) {
      e.preventDefault();
      setEmails(emails.slice(0, -1));
    }
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData("text");
    if (text.includes(",") || text.includes(" ")) {
      e.preventDefault();
      addEmails(text);
    }
  };

  const submit = (e) => {
    e.preventDefault();

    if (inputValue.trim()) addEmails(inputValue.trim());

    const invalid = emails.filter((e) => !isValidEmail(e));
    if (invalid.length) {
      setError("Please remove invalid emails before submitting.");
      return;
    }

    onCreate(e);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ duration: 0.25 }}
            className="fixed top-1/2 left-1/2 w-[90%] max-w-md -translate-x-1/2 -translate-y-1/2 z-50 
                       bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-6"
          >
            <h2 className="text-2xl font-bold text-indigo-400 text-center mb-3">
              Create Workspace
            </h2>
            <p className="text-gray-400 text-center text-sm mb-6">
              Add collaborators and start coding together.
            </p>

            <form className="space-y-6" onSubmit={submit}>
              <div>
                <label className="text-sm text-gray-300 mb-2 block">Project Name</label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="My Awesome Project"
                  className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-gray-200 
                             focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-300 mb-2 block">
                  Collaborators (Email)
                </label>

                <div
                  className={`w-full min-h-[52px] px-3 py-2 flex flex-wrap gap-2 items-center rounded-lg 
                              bg-gray-900 border ${
                                error ? "border-red-500" : "border-gray-700"
                              } focus-within:border-indigo-500`}
                  onClick={() => inputRef.current?.focus()}
                >
                  {emails.map((email) => (
                    <span
                      key={email}
                      className="px-2.5 py-1 bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-md flex items-center gap-2"
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() => setEmails(emails.filter((e) => e !== email))}
                        className="text-gray-400 hover:text-red-400"
                      >
                        ✕
                      </button>
                    </span>
                  ))}

                  <input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      if (error) setError("");
                    }}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    placeholder="Add emails…"
                    className="flex-1 min-w-[100px] bg-transparent text-gray-200 outline-none"
                  />
                </div>

                {error ? (
                  <p className="text-red-400 text-xs mt-1">{error}</p>
                ) : (
                  <p className="text-gray-500 text-xs mt-1">
                    Press Enter or comma to add multiple emails.
                  </p>
                )}
              </div>

              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-200"
                >
                  Cancel
                </button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold"
                >
                  Create Workspace
                </motion.button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
