import { useState, useEffect, useRef, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { editor as monacoEditor } from "monaco-editor";
import io from "socket.io-client";
import { FiCopy, FiCheck, FiX, FiPlay } from "react-icons/fi";

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

/* Flatten files for runner: returns [{ name: 'src/index.js', content: '...' }, ...] */
function filesFlatList(tree) {
  const out = [];
  function walk(nodes, prefix = "") {
    for (const n of nodes) {
      if (!n) continue;
      if (n.type === "file") out.push({ name: prefix + n.name, content: n.content || "" });
      else if (n.type === "folder") walk(n.children || [], prefix + n.name + "/");
    }
  }
  walk(tree, "");
  return out;
}

/* find file in tree by id */
function findFileById(tree, id) {
  for (const n of tree) {
    if (!n) continue;
    if (n.id === id) return n;
    if (n.type === "folder") {
      const r = findFileById(n.children || [], id);
      if (r) return r;
    }
  }
  return null;
}

/* compute full relative path for a file id (e.g. "src/utils/index.js") */
function getFullPathById(targetId, tree, prefix = "") {
  for (const node of tree) {
    if (!node) continue;
    if (node.id === targetId) return prefix + node.name;
    if (node.type === "folder") {
      const res = getFullPathById(targetId, node.children || [], prefix + node.name + "/");
      if (res) return res;
    }
  }
  return null;
}

/* update file content in the tree (immutable) */
function updateFileContent(tree, targetId, newContent) {
  return tree.map((node) => {
    if (!node) return node;
    if (node.id === targetId && node.type === "file") {
      return { ...node, content: newContent };
    }
    if (node.type === "folder") {
      return { ...node, children: updateFileContent(node.children || [], targetId, newContent) };
    }
    return node;
  });
}

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
  const [isResizing, setIsResizing] = useState(false);
  const [fadeKey, setFadeKey] = useState(0);

  const terminalRef = useRef(null);
  const editorRef = useRef(null);
  const socketRef = useRef(null);
  const debounceRef = useRef(null);

  const activeFileRef = useRef(null); // keep current activeFile for socket callbacks
  useEffect(() => { activeFileRef.current = activeFile; }, [activeFile]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState("file");
  const [createParent, setCreateParent] = useState(null);

  const [locked, setLocked] = useState(true);
  const [connecting, setConnecting] = useState(true);

  // ─────────────────────────────────────────────
  // SOCKET SETUP (create once per room/user)
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;

    const socket = io(SERVER_URL, {
      transports: ["websocket"],
      auth: { token: accessToken },
    });
    socketRef.current = socket;

    const onConnect = () => {
      const payloadUser = user ? { id: user.id || user._id, email: user.email, username: user.username } : null;
      socket.emit("join-room", { roomId, user: payloadUser });
    };

    const onLoadCode = () => {
      const saved = loadWorkspace(roomId) || { files: [], openTabs: [], activeFileId: null };

      // ensure ids exist
      const ensureIds = (nodes) =>
        (nodes || []).map((n) => {
          if (!n.id) n.id = makeId();
          if (n.type === "folder") n.children = ensureIds(n.children || []);
          return n;
        });

      const loadedFiles = ensureIds(saved.files || []);
      const loadedTabs = ensureIds(saved.openTabs || []);

      setFiles(loadedFiles);
      setOpenTabs(loadedTabs);

      // restore active file by id -> find the actual object inside loadedTabs or files
      if (saved.activeFileId) {
        const foundInTabs = findFileById(loadedTabs, saved.activeFileId);
        const foundInFiles = findFileById(loadedFiles, saved.activeFileId);
        const fileObj = foundInTabs || foundInFiles;
        if (fileObj) {
          setActiveFile(fileObj);
          setLanguage(getLanguage(fileObj.name));
        }
      }
    };

    const onJoined = () => { setLocked(false); setConnecting(false); };
    const onAccessDenied = (msg) => { toast.error(msg || "Access denied"); setLocked(true); setTimeout(() => navigate("/"), 1000); };

    const onReceiveChanges = (code) => {
      // update activeFile content safely using ref to avoid stale closure
      const current = activeFileRef.current;
      if (!current) return;
      // update activeFile and files tree & openTabs
      setActiveFile((prev) => (prev ? { ...prev, content: code } : prev));
      setOpenTabs((prev) => prev.map((t) => (t.id === current.id ? { ...t, content: code } : t)));
      setFiles((prev) => updateFileContent(prev, current.id, code));
    };

    const onRunStarted = ({ runId }) => {
      setOutput((prev) => {
        // avoid duplicate run-start messages if any
        if (prev.length && String(prev[prev.length - 1].text || "").includes(String(runId))) return prev;
        return [...prev, { text: `🔵 Run started: ${runId}\n`, type: "info" }];
      });
      setShowTerminal(true);
    };

    const onRunOutput = ({ text, isErr }) => {
      setOutput((prev) => [...prev, { text: String(text), type: isErr ? "error" : "stream" }]);
      // scroll
      setTimeout(() => terminalRef.current?.scrollTo({ top: terminalRef.current.scrollHeight, behavior: "smooth" }), 30);
    };

    const onRunFinished = ({ code, timedOut }) => {
      setOutput((prev) => [...prev, { text: `\n🟢 Run finished. Exit code: ${code}${timedOut ? " (Timed out)" : ""}\n`, type: "info" }]);
    };

    // register
    socket.on("connect", onConnect);
    socket.on("load-code", onLoadCode);
    socket.on("joined-authorized", onJoined);
    socket.on("access-denied", onAccessDenied);
    socket.on("receive-changes", onReceiveChanges);
    socket.on("run-started", onRunStarted);
    socket.on("run-output", onRunOutput);
    socket.on("run-finished", onRunFinished);

    // cleanup
    return () => {
      try {
        socket.off("connect", onConnect);
        socket.off("load-code", onLoadCode);
        socket.off("joined-authorized", onJoined);
        socket.off("access-denied", onAccessDenied);
        socket.off("receive-changes", onReceiveChanges);
        socket.off("run-started", onRunStarted);
        socket.off("run-output", onRunOutput);
        socket.off("run-finished", onRunFinished);
        socket.disconnect();
      } catch (e) {
        // ignore
      }
    };
    // intentionally DO NOT include activeFile in deps to avoid reconnect on typing
  }, [roomId, accessToken, user, navigate]);

  // ─────────────────────────────────────────────
  // THEME
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!monacoEditor) return;
    monacoEditor.defineTheme("dark-mode", { base: "vs-dark", inherit: true, rules: [], colors: { "editor.background": "#111827" } });
    monacoEditor.defineTheme("light-mode", { base: "vs", inherit: true, rules: [], colors: { "editor.background": "#f9fafb" } });
    setTheme(localStorage.getItem("editor-theme") || "dark-mode");
  }, []);

  useEffect(() => {
    try { monacoEditor.setTheme(theme); localStorage.setItem("editor-theme", theme); setFadeKey((p) => p + 1); } catch (e) {}
  }, [theme]);

  // ─────────────────────────────────────────────
  // AUTO-SAVE workspace
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;
    saveWorkspace(roomId, { files, openTabs, activeFileId: activeFile?.id || null });
  }, [files, openTabs, activeFile, roomId]);

  // ─────────────────────────────────────────────
  // FILE OPERATIONS
  // ─────────────────────────────────────────────
  const handleCreateFile = (parent, name) => {
    const file = { id: makeId(), name, type: "file", content: "" };
    if (parent?.type === "folder") {
      const add = (nodes) => nodes.map((n) => {
        if (n.id === parent.id) return { ...n, children: [...(n.children || []), file] };
        if (n.type === "folder") return { ...n, children: add(n.children || []) };
        return n;
      });
      setFiles((prev) => add(prev));
    } else setFiles((prev) => [...prev, file]);

    setOpenTabs((prev) => [...prev, file]);
    setActiveFile(file);
    setLanguage(getLanguage(name));
  };

  const handleCreateFolder = (parent, name) => {
    const folder = { id: makeId(), name, type: "folder", children: [] };
    if (parent?.type === "folder") {
      const add = (nodes) => nodes.map((n) => {
        if (n.id === parent.id) return { ...n, children: [...(n.children || []), folder] };
        if (n.type === "folder") return { ...n, children: add(n.children || []) };
        return n;
      });
      setFiles((prev) => add(prev));
    } else setFiles((prev) => [...prev, folder]);
  };

  const handleDelete = (target) => {
    const remove = (nodes) =>
      nodes
        .filter((n) => n.id !== target.id)
        .map((n) => (n.type === "folder" ? { ...n, children: remove(n.children || []) } : n));
    setFiles((prev) => remove(prev));
    setOpenTabs((prev) => prev.filter((t) => t.id !== target.id));
    if (activeFile?.id === target.id) setActiveFile(null);
  };

  const openFile = (file) => {
    // ensure the object used for activeFile is the one in files tree (keeps updates consistent)
    const fromTree = findFileById(files, file.id) || file;
    setActiveFile(fromTree);
    setLanguage(getLanguage(file.name));

    setOpenTabs((prev) => (prev.some((t) => t.id === file.id) ? prev : [...prev, fromTree]));
  };

  const closeTab = (f) => {
    setOpenTabs((prev) => prev.filter((t) => t.id !== f.id));
    if (activeFile?.id === f.id) setActiveFile(null);
  };

  // ─────────────────────────────────────────────
  // RUN CODE: use full path resolution
  // ─────────────────────────────────────────────
  const handleRun = () => {
    if (!activeFile) return;
    if (!socketRef.current?.connected) {
      setOutput((p) => [...p, { text: "Not connected\n", type: "error" }]);
      setShowTerminal(true);
      return;
    }

    const allFiles = filesFlatList(files);
    const entry = getFullPathById(activeFile.id, files);
    const lang = getLanguage(activeFile.name);

    if (!entry) {
      setOutput((p) => [...p, { text: "Entry file path not found\n", type: "error" }]);
      setShowTerminal(true);
      return;
    }

    setOutput([]);
    setShowTerminal(true);

    socketRef.current.emit("run-project", { roomId, files: allFiles, entry, language: lang, timeout: 15000 });
  };

  // ─────────────────────────────────────────────
  // EDITOR CHANGE: update activeFile, openTabs and files tree
  // ─────────────────────────────────────────────
  const handleEditorChange = (val) => {
    if (locked || !activeFile) return;

    // update files tree content
    setFiles((prev) => updateFileContent(prev, activeFile.id, val));

    // update activeFile and openTabs
    setActiveFile((prev) => (prev ? { ...prev, content: val } : prev));
    setOpenTabs((prev) => prev.map((t) => (t.id === activeFile.id ? { ...t, content: val } : t)));

    // send changes
    if (socketRef.current?.connected) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        socketRef.current.emit("code-change", { roomId, code: val });
      }, 200);
    }
  };

  // ─────────────────────────────────────────────
  // Helpers for UI
  // ─────────────────────────────────────────────
  const getLogColor = (type) => (type === "error" ? "text-red-400" : type === "info" ? "text-blue-400" : "text-gray-300");

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className={`h-screen flex flex-col ${theme === "dark-mode" ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
      <div className="flex flex-1 overflow-hidden">
        <ActivityBar theme={theme} setTheme={setTheme} />

        <Sidebar
          files={files}
          onCreateFile={(p) => { setCreateParent(p || null); setCreateType("file"); setShowCreateModal(true); }}
          onCreateFolder={(p) => { setCreateParent(p || null); setCreateType("folder"); setShowCreateModal(true); }}
          onSelectFile={openFile}
          onRename={(node, newName) => {
            // rename in tree
            const rename = (nodes) => nodes.map((n) => {
              if (n.id === node.id) return { ...n, name: newName };
              if (n.type === "folder") return { ...n, children: rename(n.children || []) };
              return n;
            });
            setFiles((prev) => rename(prev));
            // update openTabs and activeFile names if needed
            setOpenTabs((prev) => prev.map((t) => (t.id === node.id ? { ...t, name: newName } : t)));
            if (activeFile?.id === node.id) setActiveFile((a) => ({ ...a, name: newName }));
          }}
          onDelete={handleDelete}
          activeFile={activeFile}
          theme={theme}
        />

        <div key={fadeKey} className="flex-1 flex flex-col">
          {/* Tabs */}
          <div className={`flex items-center border-b ${theme === "dark-mode" ? "border-gray-800" : "border-gray-300"}`}>
            {openTabs.map((tab) => (
              <div key={tab.id} onClick={() => openFile(tab)} className={`flex items-center gap-2 px-3 py-2 border-r cursor-pointer ${activeFile?.id === tab.id ? "bg-indigo-500 text-white" : theme === "dark-mode" ? "text-gray-400 hover:bg-gray-800" : "text-gray-700 hover:bg-gray-200"}`}>
                <span>{tab.name}</span>
                <FiX size={14} onClick={(e) => { e.stopPropagation(); closeTab(tab); }} />
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
                value={activeFile.content || ""}
                onMount={(editor, monaco) => { editorRef.current = editor; monaco.editor.setTheme(theme); setTimeout(() => editor.layout(), 100); }}
                onChange={handleEditorChange}
                options={{ minimap: { enabled: true }, fontSize: 14, automaticLayout: true, smoothScrolling: true, scrollBeyondLastLine: false, readOnly: locked }}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                {locked ? "You are not authorized to view this workspace." : "Open or create a file to start coding."}
              </div>
            )}
          </div>

          {/* Bottom Bar */}
          <div className={`flex items-center justify-between px-4 py-2 border-t ${theme === "dark-mode" ? "border-gray-800" : "border-gray-300"}`}>
            <button onClick={handleRun} className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-1.5 rounded">
              <FiPlay /> Run
            </button>

            <button onClick={() => { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="flex items-center gap-2 text-gray-400 hover:text-indigo-400">
              {copied ? <FiCheck /> : <FiCopy />} Share
            </button>
          </div>

          {/* Terminal */}
          {showTerminal && (
            <>
              <div onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); document.body.style.cursor = "row-resize"; }} className="h-2 bg-gray-700 cursor-row-resize" />

              <div style={{ height: terminalHeight }} className={`border-t ${theme === "dark-mode" ? "border-gray-800 bg-gray-900" : "border-gray-300 bg-gray-50"}`}>
                <div className="flex justify-between items-center px-3 py-1 border-b border-gray-700 bg-gray-800/70 text-sm">
                  <span className="text-gray-400 select-none">TERMINAL</span>
                  <button onClick={() => setShowTerminal(false)} className="text-gray-400 hover:text-red-400"><FiX size={16} /></button>
                </div>

                <div ref={terminalRef} className="p-3 text-sm font-mono overflow-y-auto h-full">
                  {output.length === 0 ? <p className="text-gray-400">Terminal ready...</p> : output.map((line, i) => (
                    <p key={i} className={`${getLogColor(line.type)} whitespace-pre-wrap`}>{">"} {line.text}</p>
                  ))}
                </div>
              </div>
            </>
          )}

          <StatusBar theme={theme} setTheme={setTheme} />
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
