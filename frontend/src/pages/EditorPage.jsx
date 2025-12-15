import { useState, useEffect, useRef, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { editor as monacoEditor } from "monaco-editor";
import io from "socket.io-client";
import {
  FiCopy,
  FiCheck,
  FiX,
  FiPlay,
  FiMaximize,
  FiMinimize,
} from "react-icons/fi";

import Sidebar from "../components/Sidebar";
import ActivityBar from "../components/ActivityBar";
import StatusBar from "../components/StatusBar";
import CreateItemModal from "../components/CreateItemModal";
import CollaboratorsPanel from "../components/CollaboratorsPanel";

import { getLanguage } from "../utils/fileUtils";
import { saveWorkspace, loadWorkspace } from "../utils/storage";
import { AuthContext } from "../context/AuthContext";
import toast from "react-hot-toast";
import axios from "axios";

/* -------- SERVER DETECTION -------- */
const SERVER_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:4000"
    : window.location.origin;

const makeId = () =>
  `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

/* --------- UTILS --------- */
function requestFullscreenSoft() {
  const el = document.documentElement;
  if (!document.fullscreenElement && el.requestFullscreen) {
    el.requestFullscreen().catch(() => {});
  }
}

const filesFlatList = (tree) => {
  const result = [];
  (function walk(nodes, prefix = "") {
    for (const n of nodes) {
      if (n.type === "file")
        result.push({ name: prefix + n.name, content: n.content || "" });
      else walk(n.children || [], prefix + n.name + "/");
    }
  })(tree);
  return result;
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

/* ---------------- COMPONENT ---------------- */
export default function EditorPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, accessToken } = useContext(AuthContext);

  const [files, setFiles] = useState([]);
  const [openTabs, setOpenTabs] = useState([]);
  const [activeFile, setActiveFile] = useState(null);

  const [theme, setTheme] = useState("dark-mode");
  const [language, setLanguage] = useState("");
  const [output, setOutput] = useState([]);
  const [showTerminal, setShowTerminal] = useState(false);
  const [fadeKey, setFadeKey] = useState(0);
  const [copied, setCopied] = useState(false);

  const [activeTab, setActiveTab] = useState("explorer");
  const [collaborators, setCollaborators] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const editorRef = useRef(null);
  const socketRef = useRef(null);
  const terminalRef = useRef(null);
  const activeFileRef = useRef(null);
  const debounceRef = useRef(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState("file");
  const [createParent, setCreateParent] = useState(null);

  const [autoSave, setAutoSave] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    activeFileRef.current = activeFile;
  }, [activeFile]);

  /* -------- Fetch Workspace Members ------- */
  const fetchMembers = async () => {
    try {
      const res = await axios.get(`/api/workspace/${roomId}/members`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const { owner, collaborators } = res.data;
      const formatted = [
        { ...owner, role: "Owner" },
        ...collaborators.map((c) => ({ ...c, role: "Collaborator" })),
      ];

      setCollaborators(formatted);
    } catch {
      setCollaborators([]);
    }
  };

  /* -------- Kick Collaborator ------- */
  const handleKickCollaborator = (email) => {
    if (!socketRef.current) return;
    
    socketRef.current.emit("kick-collaborator", {
      roomId,
      email
    });
    
    toast.success(`Removed ${email} from workspace`);
    fetchMembers();
  };

  /* -------- SAVE TO DB -------- */
  const saveToDB = async () => {
    try {
      await axios.put(
        `/api/workspace/${roomId}/save`,
        { files, openTabs, activeFileId: activeFile?.id || null },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
    } catch (err) {
      console.log("❌ DB Save Failed", err);
    }
  };

  /* -------- SOCKET CONNECTION -------- */
  useEffect(() => {
    if (!roomId) return;

    const socket = io(SERVER_URL, {
      transports: ["websocket"],
      auth: { token: accessToken },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-room", {
        roomId,
        user: {
          id: user.id,
          email: user.email,
          username: user.username || user.name
        }
      });
      fetchMembers();
    });

    socket.on("run-started", () => {
      setShowTerminal(true);
      setOutput((prev) => [...prev, { type: "info", text: "🚀 Running...\n" }]);
    });

    socket.on("run-output", ({ text, isErr }) => {
      setOutput((prev) => [...prev, { type: isErr ? "error" : "stream", text }]);
      setTimeout(() => {
        terminalRef.current?.scrollTo({ 
          top: terminalRef.current.scrollHeight, 
          behavior: "smooth" 
        });
      }, 50);
    });

    socket.on("run-finished", ({ code }) => {
      setOutput((prev) => [
        ...prev, 
        { type: "info", text: `\n🟢 Finished (exit: ${code})\n` }
      ]);
    });

    socket.on("load-code", async () => {
      let saved = loadWorkspace(roomId);

      if (!saved || !saved.files?.length) {
        const res = await axios.get(`/api/workspace/${roomId}/load`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        saved = res.data;
        saveWorkspace(roomId, saved);
      }

      const assign = (arr) =>
        arr.map((n) => ({
          ...n,
          id: n.id || makeId(),
          ...(n.type === "folder" && { children: assign(n.children || []) }),
        }));

      const f = assign(saved.files);
      const t = assign(saved.openTabs);

      setFiles(f);
      setOpenTabs(t);

      if (saved.activeFileId) {
        const match = findFileById(f, saved.activeFileId);
        if (match) {
          setActiveFile(match);
          setLanguage(getLanguage(match.name));
        }
      }
    });

    socket.on("receive-changes", (code) => {
      if (!activeFileRef.current) return;

      setFiles((prev) => updateFileContent(prev, activeFileRef.current.id, code));
      setActiveFile({ ...activeFileRef.current, content: code });
    });

    socket.on("access-denied", () => {
      toast.error("Access Denied");
      navigate("/");
    });

    socket.on("user-kicked", () => {
      toast.error("You have been removed from this workspace");
      navigate("/");
    });

    socket.on("user-joined", ({ email }) => {
      setCollaborators((prev) =>
        prev.some((u) => u.email === email)
          ? prev
          : [...prev, { email, role: "Collaborator" }]
      );
      toast.success(`${email} joined the workspace`);
    });

    socket.on("collaborator-removed", ({ email }) => {
      setCollaborators((prev) =>
        prev.filter((u) => u.email !== email)
      );
    });

    socket.on("user-left", ({ email }) => {
      setCollaborators((prev) =>
        prev.filter((u) => u.email !== email)
      );
    });

    return () => {
      socket.off("user-joined");
      socket.off("collaborator-removed");
      socket.off("user-left");
      socket.off("user-kicked");
      socket.off("access-denied");
      socket.off("receive-changes");
      socket.off("load-code");
      socket.off("run-finished");
      socket.off("run-output");
      socket.off("run-started");
      socket.disconnect();
    };
  }, [roomId, accessToken, navigate, user]);

  /* -------- Setup Theme -------- */
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
    setFadeKey((key) => key + 1);
  }, [theme]);

  /* -------- AUTO SAVE: DB + LOCAL ------- */
  useEffect(() => {
    saveWorkspace(roomId, { files, openTabs, activeFileId: activeFile?.id || null });

    if (autoSave) {
      const timer = setTimeout(() => {
        saveToDB();
        setIsSaving(false);
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, [files, openTabs, activeFile, autoSave, roomId]);

  /* -------- File Actions -------- */
  const handleCreateFile = (parent, name) => {
    requestFullscreenSoft();
    const file = { id: makeId(), name, content: "", type: "file" };

    if (parent?.type === "folder")
      setFiles((prev) =>
        prev.map((n) =>
          n.id === parent.id ? { ...n, children: [...n.children, file] } : n
        )
      );
    else setFiles((prev) => [...prev, file]);

    setActiveFile(file);
    setOpenTabs((prev) => [...prev, file]);
    setLanguage(getLanguage(name));
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

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      socketRef.current.emit("code-change", { roomId, code: value });
    }, 200);

    if (autoSave) setIsSaving(true);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) requestFullscreenSoft();
    else document.exitFullscreen?.();
    setIsFullscreen((s) => !s);
  };

  const getLogColor = (type) =>
    type === "error"
      ? "text-red-400"
      : type === "info"
        ? "text-blue-400"
        : "text-gray-300";

  return (
    <div
      className={`h-screen flex flex-col ${
        theme === "dark-mode" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"
      }`}
    >
      {/* ==== Top Right Controls ==== */}
      <div className="absolute right-4 top-3 z-50 flex gap-3">
        <button 
          onClick={handleRun} 
          className="p-2 bg-indigo-600 rounded-md hover:bg-indigo-700"
        >
          <FiPlay size={18} />
        </button>

        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          className="p-2 bg-gray-700 rounded-md hover:bg-gray-600"
        >
          {copied ? <FiCheck size={18} /> : <FiCopy size={18} />}
        </button>

        <button 
          onClick={toggleFullscreen} 
          className="p-2 bg-gray-800 rounded-md hover:bg-gray-700"
        >
          {isFullscreen ? <FiMinimize size={18} /> : <FiMaximize size={18} />}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <ActivityBar
          theme={theme}
          setTheme={setTheme}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          collaborators={collaborators}
        />

        {activeTab === "users" ? (
          <CollaboratorsPanel 
            roomId={roomId} 
            accessToken={accessToken}
            onMembersChange={setCollaborators}
            onKickCollaborator={handleKickCollaborator}
          />
        ) : (
          <Sidebar
            files={files}
            activeFile={activeFile}
            theme={theme}
            onSelectFile={(file) => {
              setActiveFile(file);
              setLanguage(getLanguage(file.name));
              if (!openTabs.find((t) => t.id === file.id)) 
                setOpenTabs([...openTabs, file]);
            }}
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
            onDelete={(node) => {
              setFiles((prev) => prev.filter((f) => f.id !== node.id));
              setOpenTabs((prev) => prev.filter((t) => t.id !== node.id));
              if (activeFile?.id === node.id) setActiveFile(null);
            }}
          />
        )}

        {/* ===== Editor View ===== */}
        <div key={fadeKey} className="flex flex-col flex-1 overflow-hidden">
          <div
            className={`flex items-center border-b flex-none ${
              theme === "dark-mode" ? "border-gray-800" : "border-gray-300"
            }`}
          >
            {openTabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => setActiveFile(tab)}
                className={`px-3 py-2 flex items-center gap-2 text-xs cursor-pointer ${
                  tab.id === activeFile?.id
                    ? "bg-indigo-500 text-white"
                    : "text-gray-400 hover:bg-gray-800"
                }`}
              >
                {tab.name}
                <FiX
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenTabs((prev) => prev.filter((t) => t.id !== tab.id));
                  }}
                />
              </div>
            ))}
          </div>

          <div className={`flex-1 overflow-hidden ${showTerminal ? 'h-0' : ''}`}>
            {activeFile ? (
              <Editor
                height="100%"
                theme={theme}
                language={language}
                value={activeFile.content}
                onChange={handleEditorChange}
                onMount={(ed) => {
                  editorRef.current = ed;
                  monacoEditor.setTheme(theme);
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                Create or open a file
              </div>
            )}
          </div>

          {/* Terminal */}
          {showTerminal && (
            <div 
              className={`border-t flex-none h-64 min-h-[200px] max-h-[400px] overflow-hidden animate-slideUp ${
                theme === "dark-mode" 
                  ? "bg-gray-900 border-gray-800" 
                  : "bg-gray-100 border-gray-300"
              }`}
              style={{
                animation: "slideUp 0.3s ease-out"
              }}
            >
              <style>{`
                @keyframes slideUp {
                  from {
                    transform: translateY(100%);
                    opacity: 0;
                  }
                  to {
                    transform: translateY(0);
                    opacity: 1;
                  }
                }
              `}</style>
              
              <div 
                className={`flex justify-between px-3 py-2 text-sm select-none border-b h-10 ${
                  theme === "dark-mode"
                    ? "bg-gray-800 border-gray-700"
                    : "bg-gray-200 border-gray-300"
                }`}
              >
                <span className={theme === "dark-mode" ? "text-gray-300" : "text-gray-700"}>
                  Terminal
                </span>
                <FiX
                  className="cursor-pointer hover:text-red-400 transition-colors"
                  onClick={() => setShowTerminal(false)}
                />
              </div>

              <div
                ref={terminalRef}
                className={`p-3 overflow-y-auto font-mono text-sm ${
                  theme === "dark-mode" ? "bg-gray-900" : "bg-gray-100"
                }`}
                style={{ height: "calc(100% - 40px)" }}
              >
                {output.map((line, i) => (
                  <p
                    key={i}
                    className={`${getLogColor(line.type)} whitespace-pre-wrap leading-relaxed`}
                  >
                    {">"} {line.text}
                  </p>
                ))}
              </div>
            </div>
          )}

          <StatusBar
            theme={theme}
            setTheme={setTheme}
            language={language}
            autoSave={autoSave}
            setAutoSave={setAutoSave}
            isSaving={isSaving}
            hasFileOpen={!!activeFile}
          />
        </div>
      </div>

      <CreateItemModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        type={createType}
        onCreate={(name) =>
          createType === "file"
            ? handleCreateFile(createParent, name)
            : setFiles((prev) => [
                ...prev,
                { id: makeId(), type: "folder", name, children: [] },
              ])
        }
      />
    </div>
  );
}