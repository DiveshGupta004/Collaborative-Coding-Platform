import { useState, useRef, useEffect } from "react";
import {
  FiFile,
  FiFileText,
  FiTrash2,
  FiCode,
  FiChevronDown,
  FiChevronRight,
  FiFolder,
  FiFolderPlus,
  FiFilePlus,
  FiEdit2,
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

  // Auto-scroll when structure changes
  useEffect(() => {
    if (sidebarRef.current) {
      sidebarRef.current.scrollTo({
        top: sidebarRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [files]);

  const toggleExpand = (folderId) => {
    setExpanded((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const expandFolder = (folderId) => {
    setExpanded((prev) => ({ ...prev, [folderId]: true }));
  };

  const handleRename = (node) => {
    if (newName.trim() && newName !== node.name) {
      onRename(node, newName.trim());
    }
    setRenaming(null);
    setNewName("");
  };

  // Recursive tree rendering
  const renderTree = (nodes, depth = 0) =>
    nodes.map((node, i) => {
      const padding = `${depth * 16}px`;

      if (node.type === "folder") {
        const isOpen = expanded[node.id];
        const isRenaming = renaming === node.id;

        return (
          <div key={node.id} className="select-none">
            {/* Folder */}
            <div
              className={`group flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-all ${
                isOpen
                  ? "text-indigo-400"
                  : isDark
                  ? "text-gray-300 hover:text-indigo-400"
                  : "text-gray-700 hover:text-indigo-600"
              }`}
              style={{ paddingLeft: padding }}
              onClick={() => toggleExpand(node.id)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setRenaming(node.id);
                setNewName(node.name);
              }}
            >
              <div className="flex items-center gap-2">
                {isOpen ? (
                  <FiChevronDown className="text-gray-400" size={14} />
                ) : (
                  <FiChevronRight className="text-gray-400" size={14} />
                )}
                <FiFolder
                  className={isOpen ? "text-indigo-400" : "text-yellow-400"}
                  size={14}
                />

                {isRenaming ? (
                  <input
                    type="text"
                    value={newName}
                    autoFocus
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(node);
                      if (e.key === "Escape") setRenaming(null);
                    }}
                    onBlur={() => handleRename(node)}
                    className="bg-transparent border-b border-indigo-400 text-sm outline-none w-36"
                  />
                ) : (
                  <span className="text-sm font-medium">{node.name}</span>
                )}
              </div>

              {/* Folder actions */}
              <div className="opacity-0 group-hover:opacity-100 flex gap-2">
                <button
                  title="New File"
                  onClick={(e) => {
                    e.stopPropagation();
                    expandFolder(node.id);
                    onCreateFile(node);
                  }}
                >
                  <FiFilePlus size={13} className="hover:text-indigo-400" />
                </button>
                <button
                  title="New Folder"
                  onClick={(e) => {
                    e.stopPropagation();
                    expandFolder(node.id);
                    onCreateFolder(node);
                  }}
                >
                  <FiFolderPlus size={13} className="hover:text-indigo-400" />
                </button>
                <button
                  title="Rename"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenaming(node.id);
                    setNewName(node.name);
                  }}
                >
                  <FiEdit2 size={13} className="hover:text-indigo-400" />
                </button>
                <button
                  title="Delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(node);
                  }}
                >
                  <FiTrash2 size={13} className="hover:text-red-400" />
                </button>
              </div>
            </div>

            {/* Folder children */}
            {isOpen && node.children?.length > 0 && (
              <div>{renderTree(node.children, depth + 1)}</div>
            )}
          </div>
        );
      }

      // File Node
      const isRenamingFile = renaming === node.id;
      const getFileIcon = (name) => {
        if (name.endsWith(".js")) return <FiCode className="text-yellow-400" />;
        if (name.endsWith(".html"))
          return <FiFileText className="text-orange-400" />;
        if (name.endsWith(".css")) return <FiFile className="text-blue-400" />;
        return <FiFile className={isDark ? "text-gray-400" : "text-gray-600"} />;
      };

      return (
        <div
          key={node.id}
          className={`group flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-all ${
            activeFile?.id === node.id
              ? isDark
                ? "bg-gray-800 text-indigo-400"
                : "bg-white text-indigo-600"
              : isDark
              ? "hover:bg-gray-800/50 text-gray-300"
              : "hover:bg-gray-200 text-gray-700"
          }`}
          style={{ paddingLeft: padding }}
          onClick={() => onSelectFile(node)}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setRenaming(node.id);
            setNewName(node.name);
          }}
        >
          <div className="flex items-center gap-2">
            {getFileIcon(node.name)}
            {isRenamingFile ? (
              <input
                type="text"
                value={newName}
                autoFocus
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename(node);
                  if (e.key === "Escape") setRenaming(null);
                }}
                onBlur={() => handleRename(node)}
                className="bg-transparent border-b border-indigo-400 text-sm outline-none w-36"
              />
            ) : (
              <span className="text-sm truncate">{node.name}</span>
            )}
          </div>

          <div className="opacity-0 group-hover:opacity-100 flex gap-2">
            <button
              title="Rename"
              onClick={(e) => {
                e.stopPropagation();
                setRenaming(node.id);
                setNewName(node.name);
              }}
            >
              <FiEdit2 size={13} className="hover:text-indigo-400" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node);
              }}
              className="transition text-xs text-gray-500 hover:text-red-400"
            >
              <FiTrash2 />
            </button>
          </div>
        </div>
      );
    });

  return (
    <div
      className={`w-64 transition-all duration-300 border-r ${
        isDark
          ? "bg-gray-900 border-gray-800 text-gray-300"
          : "bg-gray-100 border-gray-300 text-gray-700"
      } flex flex-col`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700/40">
        <span className="text-sm font-semibold text-indigo-400">EXPLORER</span>
        <div className="flex gap-2 text-sm">
          <button
            onClick={() => onCreateFile(null)}
            className={`px-2 py-1 rounded hover:text-indigo-400 ${
              isDark ? "hover:bg-gray-800" : "hover:bg-gray-200"
            }`}
            title="New File"
          >
            <FiFilePlus />
          </button>
          <button
            onClick={() => onCreateFolder(null)}
            className={`px-2 py-1 rounded hover:text-indigo-400 ${
              isDark ? "hover:bg-gray-800" : "hover:bg-gray-200"
            }`}
            title="New Folder"
          >
            <FiFolderPlus />
          </button>
        </div>
      </div>

      <div ref={sidebarRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {renderTree(files)}
      </div>
    </div>
  );
}
