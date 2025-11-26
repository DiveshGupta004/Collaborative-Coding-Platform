import { useState, useEffect, useRef, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { editor as monacoEditor } from "monaco-editor";
import io from "socket.io-client";
import { FiCopy, FiCheck, FiX, FiPlay, FiMaximize, FiMinimize } from "react-icons/fi";

import Sidebar from "../components/Sidebar";
import ActivityBar from "../components/ActivityBar";
import StatusBar from "../components/StatusBar";
import CreateItemModal from "../components/CreateItemModal";
import { getLanguage } from "../utils/fileUtils";
import { saveWorkspace, loadWorkspace } from "../utils/storage";
import { AuthContext } from "../context/AuthContext";
import toast from "react-hot-toast";

const SERVER_URL = "http://localhost:4000";
const makeId = () =>
  `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

/* ---------- Soft Fullscreen ---------- */
function requestFullscreenSoft() {
  const el = document.documentElement;
  if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => {});
}

/* ---------- Utils ---------- */
const filesFlatList = (tree) => {
  const list = [];
  (function walk(nodes, prefix = "") {
    for (const n of nodes) {
      if (n.type === "file") list.push({ name: prefix + n.name, content: n.content || "" });
      else walk(n.children || [], prefix + n.name + "/");
    }
  })(tree);
  return list;
};

const findFileById = (tree, id) => {
  for (const node of tree) {
    if (node.id === id) return node;
    if (node.type === "folder") {
      const found = findFileById(node.children || [], id);
      if (found) return found;
    }
  }
  return null;
};

const getFullPathById = (id, tree, prefix = "") => {
  for (const node of tree) {
    if (node.id === id) return prefix + node.name;
    if (node.type === "folder") {
      const r = getFullPathById(id, node.children || [], prefix + node.name + "/");
      if (r) return r;
    }
  }
  return null;
};

const updateFileContent = (tree, id, value) =>
  tree.map((n) =>
    n.id === id
      ? { ...n, content: value }
      : n.type === "folder"
      ? { ...n, children: updateFileContent(n.children, id, value) }
      : n
  );

export default function EditorPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, accessToken } = useContext(AuthContext);

  const [files, setFiles] = useState([]);
  const [openTabs, setOpenTabs] = useState([]);
  const [activeFile, setActiveFile] = useState(null);

  const [language, setLanguage] = useState("");
  const [output, setOutput] = useState([]);
  const [showTerminal, setShowTerminal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState("dark-mode");
  const [terminalHeight, setTerminalHeight] = useState(200);
  const [fadeKey, setFadeKey] = useState(0);

  const [isFullscreen, setIsFullscreen] = useState(false);

  const socketRef = useRef(null);
  const editorRef = useRef(null);
  const terminalRef = useRef(null);
  const debounceRef = useRef(null);
  const activeFileRef = useRef(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState("file");
  const [createParent, setCreateParent] = useState(null);

  const [locked, setLocked] = useState(true);

  useEffect(() => {
    activeFileRef.current = activeFile;
  }, [activeFile]);

  /* ---------- Socket ---------- */
  useEffect(() => {
    if (!roomId) return;

    const socket = io(SERVER_URL, { transports: ["websocket"], auth: { token: accessToken } });
    socketRef.current = socket;

    socket.on("connect", () =>
      socket.emit("join-room", {
        roomId,
        user: user
          ? { id: user.id || user._id, email: user.email, username: user.username }
          : null,
      })
    );

    socket.on("load-code", () => {
      const saved = loadWorkspace(roomId) || { files: [], openTabs: [], activeFileId: null };

      const assignIds = (arr) =>
        arr.map((n) => ({
          ...n,
          id: n.id || makeId(),
          ...(n.type === "folder" && { children: assignIds(n.children || []) }),
        }));

      const lf = assignIds(saved.files);
      const lt = assignIds(saved.openTabs);

      setFiles(lf);
      setOpenTabs(lt);

      if (saved.activeFileId) {
        const match = findFileById(lf, saved.activeFileId);
        if (match) {
          setActiveFile(match);
          setLanguage(getLanguage(match.name));
        }
      }
    });

    socket.on("joined-authorized", () => setLocked(false));

    socket.on("receive-changes", (code) => {
      const file = activeFileRef.current;
      if (!file) return;

      setActiveFile({ ...file, content: code });
      setFiles((prev) => updateFileContent(prev, file.id, code));
      setOpenTabs((prev) => prev.map((t) => (t.id === file.id ? { ...t, content: code } : t)));
    });

    socket.on("run-started", ({ runId }) => {
      setOutput((prev) => [...prev, { text: `🔵 Run started: ${runId}`, type: "info" }]);
      setShowTerminal(true);
    });

    socket.on("run-output", ({ text, isErr }) => {
      setOutput((prev) => [...prev, { text, type: isErr ? "error" : "stream" }]);
      setTimeout(
        () =>
          terminalRef.current?.scrollTo({
            top: terminalRef.current.scrollHeight,
            behavior: "smooth",
          }),
        30
      );
    });

    socket.on("run-finished", ({ code }) => {
      setOutput((prev) => [...prev, { text: `🟢 Run finished. Exit: ${code}`, type: "info" }]);
    });

    socket.on("access-denied", () => {
      toast.error("Access Denied");
      navigate("/");
    });

    return () => socket.disconnect();
  }, [roomId, accessToken, navigate, user]);

  /* ---------- Theme ---------- */
  useEffect(() => {
    monacoEditor.defineTheme("dark-mode", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: { "editor.background": "#111827" },
    });

    monacoEditor.setTheme(localStorage.getItem("editor-theme") || "dark-mode");
    setTheme(localStorage.getItem("editor-theme") || "dark-mode");
  }, []);

  useEffect(() => {
    monacoEditor.setTheme(theme);
    localStorage.setItem("editor-theme", theme);
    setFadeKey((x) => x + 1);
  }, [theme]);

  /* ---------- Auto Save ---------- */
  useEffect(() => {
    saveWorkspace(roomId, {
      files,
      openTabs,
      activeFileId: activeFile?.id || null,
    });
  }, [files, openTabs, activeFile, roomId]);

  /* ---------- File Actions ---------- */
  const handleCreateFile = (parent, name) => {
    requestFullscreenSoft();
    const file = { id: makeId(), name, type: "file", content: "" };

    if (parent?.type === "folder") {
      setFiles((prev) =>
        prev.map((n) =>
          n.id === parent.id
            ? { ...n, children: [...n.children, file] }
            : n.type === "folder"
            ? { ...n, children: [...n.children] }
            : n
        )
      );
    } else {
      setFiles((prev) => [...prev, file]);
    }

    setOpenTabs((prev) => [...prev, file]);
    setActiveFile(file);
    setLanguage(getLanguage(name));
  };

  const handleCreateFolder = (parent, name) => {
    requestFullscreenSoft();
    const folder = { id: makeId(), name, type: "folder", children: [] };

    if (parent?.type === "folder") {
      setFiles((prev) =>
        prev.map((n) =>
          n.id === parent.id ? { ...n, children: [...n.children, folder] } : n
        )
      );
    } else {
      setFiles((prev) => [...prev, folder]);
    }
  };

  const handleDelete = (node) => {
    setFiles((list) =>
      list
        .filter((i) => i.id !== node.id)
        .map((n) => (n.type === "folder" ? { ...n, children: n.children } : n))
    );

    setOpenTabs((prev) => prev.filter((t) => t.id !== node.id));
    if (activeFile?.id === node.id) setActiveFile(null);
  };

  const openFile = (file) => {
    requestFullscreenSoft();
    const match = findFileById(files, file.id);
    setActiveFile(match);
    setLanguage(getLanguage(match.name));

    if (!openTabs.find((t) => t.id === match.id)) setOpenTabs([...openTabs, match]);
  };

  const closeTab = (tab) => {
    setOpenTabs(openTabs.filter((t) => t.id !== tab.id));
    if (activeFile?.id === tab.id) setActiveFile(null);
  };

  const handleRun = () => {
    if (!activeFile) return;
    requestFullscreenSoft();

    socketRef.current.emit("run-project", {
      roomId,
      files: filesFlatList(files),
      entry: getFullPathById(activeFile.id, files),
      language: getLanguage(activeFile.name),
      timeout: 15000,
    });

    setOutput([]);
    setShowTerminal(true);
  };

  const handleEditorChange = (value) => {
    requestFullscreenSoft();
    setFiles(updateFileContent(files, activeFile.id, value));
    setActiveFile({ ...activeFile, content: value });

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(
      () => socketRef.current.emit("code-change", { roomId, code: value }),
      200
    );
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      requestFullscreenSoft();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const getLogColor = (type) =>
    type === "error"
      ? "text-red-400"
      : type === "info"
      ? "text-blue-400"
      : "text-gray-300";

  return (
    <div className={`h-screen flex flex-col ${theme === "dark-mode" ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
      
      {/* 🔹 TOP RIGHT BUTTONS */}
      <div className="absolute top-3 right-4 z-50 flex gap-3 items-center">
        
        {/* Run */}
        <button onClick={handleRun} className="p-2 bg-indigo-600 hover:bg-indigo-700 rounded-md" title="Run">
          <FiPlay size={18} />
        </button>

        {/* Share */}
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md"
          title="Share"
        >
          {copied ? <FiCheck size={18} /> : <FiCopy size={18} />}
        </button>

        {/* Fullscreen */}
        <button onClick={toggleFullscreen} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-md" title="Fullscreen">
          {isFullscreen ? <FiMinimize size={18} /> : <FiMaximize size={18} />}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <ActivityBar theme={theme} setTheme={setTheme} />

        <Sidebar
          files={files}
          onSelectFile={openFile}
          onCreateFile={(p) => {
            setCreateParent(p || null);
            setCreateType("file");
            setShowCreateModal(true);
          }}
          onCreateFolder={(p) => {
            setCreateParent(p || null);
            setCreateType("folder");
            setShowCreateModal(true);
          }}
          onRename={(node, newName) => {
            const rename = (arr) =>
              arr.map((n) =>
                n.id === node.id
                  ? { ...n, name: newName }
                  : n.type === "folder"
                  ? { ...n, children: rename(n.children) }
                  : n
              );

            setFiles((prev) => rename(prev));
            setOpenTabs((prev) => prev.map((t) => (t.id === node.id ? { ...t, name: newName } : t)));

            if (activeFile?.id === node.id)
              setActiveFile((a) => ({ ...a, name: newName }));
          }}
          onDelete={handleDelete}
          activeFile={activeFile}
          theme={theme}
        />

        {/* Workspace */}
        <div key={fadeKey} className="flex-1 flex flex-col">

          {/* Tabs - smaller UI */}
          <div className={`flex items-center border-b text-xs ${
            theme === "dark-mode" ? "border-gray-800" : "border-gray-300"
          }`}>
            {openTabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => openFile(tab)}
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${
                  activeFile?.id === tab.id
                    ? "bg-indigo-500 text-white"
                    : "text-gray-400 hover:bg-gray-800"
                }`}
              >
                {tab.name}
                <FiX onClick={(e) => { e.stopPropagation(); closeTab(tab); }} className="cursor-pointer" />
              </div>
            ))}
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-hidden">
            {activeFile ? (
              <Editor
                height="100%"
                theme={theme}
                language={language}
                value={activeFile.content}
                onChange={handleEditorChange}
                onMount={(editor) => {
                  editorRef.current = editor;
                  monacoEditor.setTheme(theme);
                }}
                options={{
                  minimap: { enabled: true },
                  fontSize: 14,
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                Open or create a file to start coding.
              </div>
            )}
          </div>

          {/* Terminal */}
          {showTerminal && (
            <div className="border-t border-gray-700" style={{ height: terminalHeight }}>
              <div className="flex justify-between p-2 bg-gray-800 text-sm">
                <span className="text-gray-300">Terminal</span>
                <FiX className="cursor-pointer hover:text-red-400" onClick={() => setShowTerminal(false)} />
              </div>

              <div ref={terminalRef} className="p-3 text-sm overflow-y-auto font-mono">
                {output.map((line, i) => (
                  <p key={i} className={`${getLogColor(line.type)} whitespace-pre-wrap`}>
                    {">"} {line.text}
                  </p>
                ))}
              </div>
            </div>
          )}

          <StatusBar theme={theme} />
        </div>
      </div>

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
