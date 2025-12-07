import { motion } from "framer-motion";
import { FiSun, FiMoon, FiSave } from "react-icons/fi";

export default function StatusBar({
  language = "",
  isSaving = false,
  autoSave = false,
  setAutoSave = () => {},
  theme = "dark-mode",
  setTheme = () => {},
  hasFileOpen = false,
}) {
  return (
    <motion.div
      layout
      className="h-7 bg-gray-950 border-t border-gray-800 flex items-center justify-between px-3 text-xs font-mono text-gray-400"
    >
      {/* Left */}
      <div className="flex items-center gap-4">
        <span className="text-indigo-400 font-semibold tracking-tight">
          CodeMate v1.0
        </span>

        <span
          className="cursor-pointer hover:text-indigo-400 transition"
          title="Toggle Auto Save"
          onClick={() => setAutoSave(!autoSave)}
        >
          {autoSave ? "Auto Save: On" : "Auto Save: Off"}
        </span>

        <span className="flex items-center gap-1">
          {isSaving && (
            <motion.span
              className="text-indigo-400"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <FiSave size={12} />
            </motion.span>
          )}
          {isSaving ? "Saving..." : "Saved"}
        </span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        {hasFileOpen && <span className="text-gray-400">{language?.toUpperCase()}</span>}

        <button
          onClick={() => setTheme((prev) => (prev === "dark-mode" ? "light-mode" : "dark-mode"))}
          title={theme === "dark-mode" ? "Switch to Light Theme" : "Switch to Dark Theme"}
          className="text-gray-400 hover:text-indigo-400 transition"
        >
          {theme === "dark-mode" ? <FiSun size={14} /> : <FiMoon size={14} />}
        </button>
      </div>
    </motion.div>
  );
}
