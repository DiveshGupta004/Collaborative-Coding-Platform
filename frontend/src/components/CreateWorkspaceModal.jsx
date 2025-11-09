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
  emails,          // array of strings
  setEmails,       // setter for array
}) {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const addEmailsFromString = (raw) => {
    if (!raw) return;
    const parts = raw
      .split(/[,\s]+/)           // split on comma or whitespace
      .map((e) => e.trim())
      .filter(Boolean);

    if (parts.length === 0) return;

    const newEmails = [...emails];
    let invalidFound = false;

    for (const e of parts) {
      if (!isValidEmail(e)) {
        invalidFound = true;
        continue;
      }
      if (!newEmails.includes(e)) newEmails.push(e); // de-dup
    }

    setEmails(newEmails);
    setInputValue("");
    setError(invalidFound ? "Some entries were invalid or duplicates were ignored." : "");
  };

  const handleKeyDown = (e) => {
    // Enter / Comma adds chip
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addEmailsFromString(inputValue);
      return;
    }
    // Backspace removes last chip if input empty
    if (e.key === "Backspace" && inputValue.length === 0 && emails.length > 0) {
      e.preventDefault();
      const copy = [...emails];
      copy.pop();
      setEmails(copy);
    }
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData("text");
    if (text.includes(",") || text.includes(" ")) {
      e.preventDefault();
      addEmailsFromString(text);
    }
  };

  const removeEmail = (target) => {
    setEmails(emails.filter((e) => e !== target));
    setError("");
    inputRef.current?.focus();
  };

  const submitWrapper = (ev) => {
    ev.preventDefault();
    // If there’s leftover text in the input, try to add it first
    if (inputValue.trim()) addEmailsFromString(inputValue.trim());

    // Validate all current emails once again
    const bad = emails.filter((e) => !isValidEmail(e));
    if (bad.length > 0) {
      setError("Please remove invalid emails before continuing.");
      return;
    }
    setError("");
    onCreate(ev); // calls the parent handler (will navigate)
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
            transition={{ duration: 0.3 }}
            className="fixed z-50 top-1/2 left-1/2 w-[90%] max-w-md -translate-x-1/2 -translate-y-1/2 bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-6 sm:p-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-project-title"
          >
            <h2
              id="create-project-title"
              className="text-2xl font-bold text-indigo-400 mb-2 text-center"
            >
              Create New Project
            </h2>
            <p className="text-gray-400 text-sm text-center mb-6">
              Name your project and invite collaborators via email.
            </p>

            <form onSubmit={submitWrapper} className="space-y-5">
              {/* Project Name */}
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  required
                  placeholder="e.g. AI Chatbot Platform"
                  className="w-full px-4 py-3 bg-gray-900/70 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>

              {/* Email Chips Input */}
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Add People (emails)
                </label>

                <div
                  className={`w-full min-h-[52px] px-3 py-2 flex flex-wrap gap-2 items-center rounded-lg bg-gray-900/70 border ${
                    error ? "border-red-500" : "border-gray-700"
                  } focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition`}
                  onClick={() => inputRef.current?.focus()}
                >
                  {/* Chips */}
                  {emails.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-gray-800 text-gray-200 border border-gray-700 text-sm"
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() => removeEmail(email)}
                        className="text-gray-400 hover:text-red-400 focus:outline-none"
                        aria-label={`Remove ${email}`}
                        title="Remove"
                      >
                        ✕
                      </button>
                    </span>
                  ))}

                  {/* Text input for new emails */}
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      if (error) setError("");
                    }}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    placeholder={
                      emails.length ? "Type email and press Enter…" : "alice@gmail.com, bob@yahoo.com"
                    }
                    className="flex-1 min-w-[160px] bg-transparent outline-none text-gray-200 placeholder-gray-500 py-1"
                  />
                </div>

                {/* Helper / Error */}
                <div className="mt-1 text-xs">
                  {error ? (
                    <span className="text-red-400">{error}</span>
                  ) : (
                    <span className="text-gray-500">
                      Press <kbd className="px-1 bg-gray-800 rounded">Enter</kbd> or <kbd className="px-1 bg-gray-800 rounded">,</kbd> to add. Paste multiple emails at once.
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-200 transition text-sm"
                >
                  Cancel
                </button>

                <motion.button
                  whileHover={{
                    scale: 1.05,
                    boxShadow: "0px 0px 12px rgba(99,102,241,0.5)",
                  }}
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-300"
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
