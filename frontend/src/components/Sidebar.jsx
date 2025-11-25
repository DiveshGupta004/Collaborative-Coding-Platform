import { useState, useRef, useEffect, useCallback } from "react";
import {
  FiFile,
  FiFileText,
  FiTrash2,
  FiChevronDown,
  FiChevronRight,
  FiFolder,
  FiFolderPlus,
  FiFilePlus,
  FiEdit2,
  FiCode,
} from "react-icons/fi";

export default function Sidebar({
  files,
  onCreateFile,
  onCreateFolder,
  onSelectFile,
  onRename,
  onDelete,
  activeFile,
  theme,
}) {
  const isDark = theme === "dark-mode";
  const [expanded, setExpanded] = useState({});
  const [renaming, setRenaming] = useState(null);
  const [newName, setNewName] = useState("");
  const sidebarRef = useRef(null);

  // Auto-scroll when new files/folders appear
  useEffect(() => {
    sidebarRef.current?.scrollTo({
      top: sidebarRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [files]);

  const toggleExpand = useCallback(
    (id) => {
      setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
    },
    [setExpanded]
  );

  const startRename = (node) => {
    setRenaming(node.id);
    setNewName(node.name);
  };

  const finishRename = (node) => {
    if (newName.trim() && newName !== node.name) onRename(node, newName.trim());
    setRenaming(null);
    setNewName("");
  };

  const getFileIcon = (name) => {
    if (name.endsWith(".js")) return <FiCode className="text-yellow-400" />;
    if (name.endsWith(".html")) return <FiFileText className="text-orange-400" />;
    if (name.endsWith(".css")) return <FiFile className="text-blue-400" />;
    return <FiFile className={isDark ? "text-gray-400" : "text-gray-600"} />;
  };

  // ──────────────────────────────────────────────
  // RENDER FILE TREE  (Recursive)
  // ──────────────────────────────────────────────
  const renderNode = (node, depth) => {
    const pad = { paddingLeft: depth * 16 };

    // ░░░░░ FOLDER ░░░░░
    if (node.type === "folder") {
      const open = expanded[node.id];
      const ren = renaming === node.id;

      return (
        <div key={node.id} className="select-none">
          <div
            className={`group flex items-center justify-between px-2 py-1.5 rounded cursor-pointer
              ${open ? "text-indigo-400" : isDark ? "text-gray-300 hover:text-indigo-400" : "text-gray-700 hover:text-indigo-600"}`}
            style={pad}
            onClick={() => toggleExpand(node.id)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              startRename(node);
            }}
          >
            <div className="flex items-center gap-2">
              {open ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
              <FiFolder size={14} className={open ? "text-indigo-400" : "text-yellow-400"} />

              {ren ? (
                <input
                  value={newName}
                  autoFocus
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") finishRename(node);
                    if (e.key === "Escape") setRenaming(null);
                  }}
                  onBlur={() => finishRename(node)}
                  className="bg-transparent border-b border-indigo-400 text-sm outline-none w-36"
                />
              ) : (
                <span className="text-sm font-medium">{node.name}</span>
              )}
            </div>

            <div className="opacity-0 group-hover:opacity-100 flex gap-2">
              <IconBtn icon={FiFilePlus} onClick={(e) => { e.stopPropagation(); onCreateFile(node); }} />
              <IconBtn icon={FiFolderPlus} onClick={(e) => { e.stopPropagation(); onCreateFolder(node); }} />
              <IconBtn icon={FiEdit2} onClick={(e) => { e.stopPropagation(); startRename(node); }} />
              <IconBtn icon={FiTrash2} red onClick={(e) => { e.stopPropagation(); onDelete(node); }} />
            </div>
          </div>

          {open && node.children?.map((c) => renderNode(c, depth + 1))}
        </div>
      );
    }

    // ░░░░░ FILE ░░░░░
    const active = activeFile?.id === node.id;
    const ren = renaming === node.id;

    return (
      <div
        key={node.id}
        onClick={() => onSelectFile(node)}
        onDoubleClick={(e) => {
          e.stopPropagation();
          startRename(node);
        }}
        className={`group flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-all
          ${active
            ? isDark
              ? "bg-gray-800 text-indigo-400"
              : "bg-white text-indigo-600"
            : isDark
            ? "hover:bg-gray-800/50 text-gray-300"
            : "hover:bg-gray-200 text-gray-700"
          }`}
        style={pad}
      >
        <div className="flex items-center gap-2">
          {getFileIcon(node.name)}

          {ren ? (
            <input
              value={newName}
              autoFocus
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") finishRename(node);
                if (e.key === "Escape") setRenaming(null);
              }}
              onBlur={() => finishRename(node)}
              className="bg-transparent border-b border-indigo-400 text-sm outline-none w-36"
            />
          ) : (
            <span className="text-sm truncate">{node.name}</span>
          )}
        </div>

        <div className="opacity-0 group-hover:opacity-100 flex gap-2">
          <IconBtn icon={FiEdit2} onClick={(e) => { e.stopPropagation(); startRename(node); }} />
          <IconBtn icon={FiTrash2} red onClick={(e) => { e.stopPropagation(); onDelete(node); }} />
        </div>
      </div>
    );
  };

  return (
    <div
      className={`w-64 border-r flex flex-col transition-all ${
        isDark ? "bg-gray-900 border-gray-800 text-gray-300" : "bg-gray-100 border-gray-300 text-gray-700"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700/40">
        <span className="text-sm font-semibold text-indigo-400">EXPLORER</span>

        <div className="flex gap-2">
          <IconBtn icon={FiFilePlus} onClick={() => onCreateFile(null)} />
          <IconBtn icon={FiFolderPlus} onClick={() => onCreateFolder(null)} />
        </div>
      </div>

      <div ref={sidebarRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {files.map((f) => renderNode(f, 0))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Small, reusable icon button component
────────────────────────────────────────────── */
function IconBtn({ icon: Icon, onClick, red }) {
  return (
    <button
      onClick={onClick}
      className={`p-1 rounded transition ${
        red ? "hover:text-red-400" : "hover:text-indigo-400"
      }`}
    >
      <Icon size={13} />
    </button>
  );
}
