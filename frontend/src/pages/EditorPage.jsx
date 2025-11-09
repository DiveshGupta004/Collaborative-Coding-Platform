import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { editor as monacoEditor } from "monaco-editor";
import io from "socket.io-client";
import { FiCopy, FiCheck, FiX, FiPlay } from "react-icons/fi";

import Sidebar from "../components/Sidebar";
import ActivityBar from "../components/ActivityBar";
import StatusBar from "../components/StatusBar";
import CreateItemModal from "../components/CreateItemModal";
import { getLanguage } from "../utils/fileUtils";
import { loadWorkspace } from "../utils/storage";

const SERVER_URL = "http://localhost:4000";
const makeId = () =>
  `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export default function EditorPage() {
  const { roomId } = useParams();

  // States
  const [files, setFiles] = useState([]);
  const [openTabs, setOpenTabs] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [language, setLanguage] = useState("");
  const [output, setOutput] = useState([]);
  const [showTerminal, setShowTerminal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState("dark-mode");
  const [terminalHeight, setTerminalHeight] = useState(200);
  const [isResizing, setIsResizing] = useState(false);
  const [fadeKey, setFadeKey] = useState(0);
  const terminalRef = useRef(null);
  const editorRef = useRef(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState("file");
  const [createParent, setCreateParent] = useState(null);

  // Socket.io (for collaboration readiness)
  const socketRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const socket = io(SERVER_URL, { transports: ["websocket"] });
    socketRef.current = socket;
    socket.emit("join-room", { roomId });

    return () => socket.disconnect();
  }, [roomId]);

  // --- THEME DEFINITIONS ---
  useEffect(() => {
    if (!monacoEditor) return;

    monacoEditor.defineTheme("dark-mode", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "", foreground: "D4D4D4", background: "111827" },
        { token: "comment", foreground: "6A9955", fontStyle: "italic" },
        { token: "keyword", foreground: "C586C0" },
        { token: "number", foreground: "B5CEA8" },
        { token: "string", foreground: "CE9178" },
      ],
      colors: {
        "editor.background": "#111827",
        "editorLineNumber.foreground": "#6b7280",
        "editorCursor.foreground": "#93c5fd",
        "editor.lineHighlightBackground": "#1f2937",
      },
    });

    monacoEditor.defineTheme("light-mode", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "", foreground: "000000", background: "f9fafb" },
        { token: "comment", foreground: "008000", fontStyle: "italic" },
        { token: "keyword", foreground: "0000FF" },
        { token: "number", foreground: "098658" },
        { token: "string", foreground: "A31515" },
      ],
      colors: {
        "editor.background": "#f9fafb",
        "editorLineNumber.foreground": "#9ca3af",
        "editorCursor.foreground": "#2563eb",
        "editor.lineHighlightBackground": "#E5E7EB",
      },
    });

    const savedTheme = localStorage.getItem("editor-theme");
    setTheme(savedTheme || "dark-mode");
  }, []);

  // --- APPLY THEME ---
  useEffect(() => {
    if (!theme) return;
    const applyTheme = () => {
      monacoEditor.setTheme(theme);
      if (editorRef.current) {
        editorRef.current.updateOptions({ theme });
        editorRef.current.layout();
      }
    };
    setTimeout(applyTheme, 50);
    localStorage.setItem("editor-theme", theme);
    setFadeKey((prev) => prev + 1);
  }, [theme]);

  // --- LOAD WORKSPACE ---
  useEffect(() => {
    const saved = loadWorkspace(roomId) || { files: [], openTabs: [] };
    const ensureIds = (nodes) =>
      nodes.map((n) => {
        if (!n.id) n.id = makeId();
        if (n.type === "folder") n.children = ensureIds(n.children || []);
        return n;
      });
    setFiles(ensureIds(saved.files || []));
  }, [roomId]);

  // --- TERMINAL RESIZE ---
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newHeight = Math.max(100, window.innerHeight - e.clientY);
      setTerminalHeight(newHeight);
    };
    const handleMouseUp = () => {
      if (isResizing) setIsResizing(false);
      document.body.style.cursor = "default";
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = "row-resize";
  };

  // --- FILE OPERATIONS ---
  const handleCreateFileClick = (parent = null) => {
    setCreateParent(parent);
    setCreateType("file");
    setShowCreateModal(true);
  };

  const handleCreateFolderClick = (parent = null) => {
    setCreateParent(parent);
    setCreateType("folder");
    setShowCreateModal(true);
  };

  const handleCreateFile = (parent = null, fileName) => {
    const newFile = { id: makeId(), name: fileName, type: "file", content: "" };
    if (parent && parent.type === "folder") {
      const addTo = (nodes) =>
        nodes.map((n) =>
          n.id === parent.id
            ? { ...n, children: [...(n.children || []), newFile] }
            : n.type === "folder"
            ? { ...n, children: addTo(n.children || []) }
            : n
        );
      setFiles((prev) => addTo(prev));
    } else {
      setFiles((prev) => [...prev, newFile]);
    }
    setOpenTabs((prev) => [...prev, newFile]);
    setActiveFile(newFile);
    setLanguage(getLanguage(fileName));
  };

  const handleCreateFolder = (parent = null, folderName) => {
    const newFolder = {
      id: makeId(),
      name: folderName,
      type: "folder",
      children: [],
    };
    if (parent && parent.type === "folder") {
      const addTo = (nodes) =>
        nodes.map((n) =>
          n.id === parent.id
            ? { ...n, children: [...(n.children || []), newFolder] }
            : n.type === "folder"
            ? { ...n, children: addTo(n.children || []) }
            : n
        );
      setFiles((prev) => addTo(prev));
    } else {
      setFiles((prev) => [...prev, newFolder]);
    }
  };

  const handleDelete = (target) => {
    const deleteRecursively = (nodes) =>
      nodes
        .filter((n) => n.id !== target.id)
        .map((n) =>
          n.type === "folder"
            ? { ...n, children: deleteRecursively(n.children || []) }
            : n
        );
    setFiles((prev) => deleteRecursively(prev));
    setOpenTabs((prev) => prev.filter((t) => t.id !== target.id));
    if (activeFile?.id === target.id) setActiveFile(null);
  };

  const openFile = (file) => {
    setActiveFile(file);
    setLanguage(getLanguage(file.name));
    setOpenTabs((prev) =>
      prev.some((t) => t.id === file.id) ? prev : [...prev, file]
    );
  };

  const closeTab = (file) => {
    setOpenTabs((prev) => prev.filter((t) => t.id !== file.id));
    if (activeFile?.id === file.id) setActiveFile(null);
  };

  // --- RUN / TERMINAL ---
  const handleRun = () => {
    if (!activeFile) return;
    setShowTerminal(true);
    try {
      // eslint-disable-next-line no-eval
      const result = eval(activeFile.content);
      setOutput((prev) => [
        ...prev,
        { text: String(result ?? "Executed successfully."), type: "success" },
      ]);
    } catch (err) {
      setOutput((prev) => [
        ...prev,
        { text: String(err), type: "error" },
      ]);
    }
    setTimeout(() => {
      terminalRef.current?.scrollTo({
        top: terminalRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 100);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const getLogColor = (type) =>
    type === "error"
      ? "text-red-400"
      : type === "success"
      ? "text-green-400"
      : "text-gray-300";

  return (
    <div
      className={`h-screen flex flex-col ${
        theme === "dark-mode"
          ? "bg-gray-900 text-white"
          : "bg-gray-50 text-gray-900"
      }`}
    >
      <div className="flex flex-1 overflow-hidden">
        <ActivityBar theme={theme} setTheme={setTheme} />
        <Sidebar
          files={files}
          onCreateFile={handleCreateFileClick}
          onCreateFolder={handleCreateFolderClick}
          onSelectFile={openFile}
          onDelete={handleDelete}
          activeFile={activeFile}
          theme={theme}
        />

        {/* Main Editor */}
        <div key={fadeKey} className="flex-1 flex flex-col transition-opacity duration-500">
          {/* Tabs */}
          <div
            className={`flex items-center border-b ${
              theme === "dark-mode" ? "border-gray-800" : "border-gray-300"
            }`}
          >
            {openTabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => openFile(tab)}
                className={`flex items-center gap-2 px-3 py-2 text-sm border-r cursor-pointer ${
                  activeFile?.id === tab.id
                    ? "bg-indigo-500 text-white"
                    : theme === "dark-mode"
                    ? "text-gray-400 hover:bg-gray-800"
                    : "text-gray-700 hover:bg-gray-200"
                }`}
              >
                <span>{tab.name}</span>
                <FiX
                  size={14}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab);
                  }}
                />
              </div>
            ))}
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 overflow-hidden">
            {activeFile ? (
              <Editor
                height="100%"
                theme={theme}
                language={language}
                value={activeFile.content}
                onMount={(editor, monaco) => {
                  editorRef.current = editor;
                  monaco.editor.setTheme(theme);
                  setTimeout(() => editor.layout(), 100);
                }}
                onChange={(value) => {
                  setActiveFile({ ...activeFile, content: value });
                  setOpenTabs((prev) =>
                    prev.map((t) =>
                      t.id === activeFile.id ? { ...t, content: value } : t
                    )
                  );
                }}
                options={{
                  minimap: { enabled: true },
                  fontSize: 14,
                  automaticLayout: true,
                  smoothScrolling: true,
                  scrollBeyondLastLine: false,
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 select-none">
                Select or create a file to start coding.
              </div>
            )}
          </div>

          {/* Toolbar */}
          <div
            className={`flex items-center justify-between px-4 py-2 border-t ${
              theme === "dark-mode" ? "border-gray-800" : "border-gray-300"
            }`}
          >
            <button
              onClick={handleRun}
              className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-1.5 rounded-md text-sm"
            >
              <FiPlay /> Run
            </button>

            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 text-gray-400 hover:text-indigo-400"
            >
              {copied ? <FiCheck /> : <FiCopy />} Share
            </button>
          </div>

          {/* Terminal */}
          {showTerminal && (
            <>
              <div
                onMouseDown={handleMouseDown}
                className="h-2 cursor-row-resize bg-gray-700"
              ></div>
              <div
                style={{ height: terminalHeight }}
                className={`border-t ${
                  theme === "dark-mode"
                    ? "border-gray-800 bg-gray-900"
                    : "border-gray-300 bg-gray-50"
                }`}
              >
                <div className="flex justify-between items-center px-3 py-1 border-b border-gray-700 bg-gray-800/70 text-sm">
                  <span className="text-gray-400 select-none">TERMINAL</span>
                  <button
                    onClick={() => setShowTerminal(false)}
                    className="text-gray-400 hover:text-red-400 transition"
                    title="Close Terminal"
                  >
                    <FiX size={16} />
                  </button>
                </div>
                <div
                  ref={terminalRef}
                  className="p-3 text-sm font-mono overflow-y-auto h-full space-y-1 pr-4"
                  style={{ scrollbarGutter: "stable" }}
                >
                  {output.length === 0 ? (
                    <p className="text-gray-400">Terminal ready...</p>
                  ) : (
                    output.map((line, i) => (
                      <p key={i} className={`${getLogColor(line.type)} whitespace-pre-wrap`}>
                        {">"} {line.text}
                      </p>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          <StatusBar theme={theme} setTheme={setTheme} />
        </div>
      </div>

      {/* Modal */}
      <CreateItemModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        type={createType}
        onCreate={(name) => {
          if (createType === "file") handleCreateFile(createParent, name);
          else handleCreateFolder(createParent, name);
        }}
      />
    </div>
  );
}
