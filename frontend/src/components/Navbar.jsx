import { useState, useContext, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiMenu, FiX, FiTrash2, FiFolderPlus } from "react-icons/fi";
import axios from "axios";
import toast from "react-hot-toast";
import { AuthContext } from "../context/AuthContext";
import CreateWorkspaceModal from "./CreateWorkspaceModal";

const API_URL = "http://localhost:4000/api/workspace";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarDropdown, setAvatarDropdown] = useState(false);
  const [workspacePanel, setWorkspacePanel] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);

  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [emails, setEmails] = useState([]);

  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { user, accessToken, logout } = useContext(AuthContext);

  /* ---------------- FETCH WORKSPACES ---------------- */
  const fetchWorkspaces = async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      const res = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      setWorkspaces(res.data.workspaces || []);
    } catch (err) {
      console.log("Workspace Fetch Error:", err.response?.data || err.message);
      toast.error(err.response?.data?.message || "Failed to load workspaces");
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && accessToken) fetchWorkspaces();
  }, [user, accessToken]);

  /* ---------------- CREATE WORKSPACE ---------------- */
  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) return toast.error("Workspace name required");

    try {
      const res = await axios.post(
        `${API_URL}/create`,
        { projectName, collaborators: emails },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      toast.success("Workspace created 🎉");
      setShowCreateModal(false);
      setProjectName("");
      setEmails([]);

      fetchWorkspaces();
    } catch (err) {
      console.log("Create workspace error:", err.response?.data || err.message);
      toast.error(err.response?.data?.message || "Error creating workspace");
    }
  };

  /* ---------------- DELETE WORKSPACE ---------------- */
  const deleteWorkspace = async () => {
    if (!selectedWorkspace) return;

    try {
      await axios.delete(`${API_URL}/${selectedWorkspace}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      toast.success("Workspace deleted");
      setDeleteConfirm(false);
      setSelectedWorkspace(null);

      setWorkspaces((prev) => prev.filter((w) => w._id !== selectedWorkspace));
    } catch (err) {
      console.log("Delete workspace error:", err.response?.data || err.message);
      toast.error("Failed to delete workspace");
    }
  };

  /* ---------------- OUTSIDE CLICK FOR AVATAR ---------------- */
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setAvatarDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const getInitial = (name) => name?.charAt(0).toUpperCase() || "U";

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 bg-gray-900/90 backdrop-blur-md border-b border-gray-800 shadow-md">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="text-2xl font-extrabold text-indigo-400 tracking-wide"
          >
            CodeMate.
          </Link>

          <div className="hidden md:flex items-center gap-5">
            {!user ? (
              <>
                <Link
                  className="text-gray-300 hover:text-indigo-400"
                  to="/login"
                >
                  Login
                </Link>
                <Link
                  className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-md font-medium shadow-md"
                  to="/signup"
                >
                  Sign Up
                </Link>
              </>
            ) : (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setWorkspacePanel(true)}
                  className="bg-indigo-500 text-white px-4 py-2 rounded-md shadow hover:bg-indigo-600 transition"
                >
                  Workspaces
                </motion.button>

                <div className="relative" ref={dropdownRef}>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setAvatarDropdown((prev) => !prev)}
                    className="w-10 h-10 bg-indigo-500 text-white flex items-center justify-center rounded-full cursor-pointer font-bold"
                  >
                    {getInitial(user.username)}
                  </motion.div>

                  <AnimatePresence>
                    {avatarDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-2"
                      >
                        <div className="px-4 py-2 text-gray-300 border-b border-gray-700">
                          {user.username}
                        </div>

                        <button
                          onClick={() => {
                            logout();
                            toast.success("Logged out");
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-700 text-red-400"
                        >
                          Logout
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}
          </div>

          <button
            className="md:hidden text-gray-300 text-2xl"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            {menuOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden bg-gray-900 border-t border-gray-800 py-6"
          >
            <div className="flex flex-col items-center gap-4 text-gray-300">
              {!user ? (
                <>
                  <Link to="/login" onClick={() => setMenuOpen(false)}>
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMenuOpen(false)}
                    className="bg-indigo-500 px-6 py-2 rounded-md text-white"
                  >
                    Sign Up
                  </Link>
                </>
              ) : (
                <>
                  <span className="font-semibold text-white">
                    {user.username}
                  </span>

                  <button
                    onClick={() => {
                      setWorkspacePanel(true);
                      setMenuOpen(false);
                    }}
                    className="bg-indigo-500 px-6 py-2 rounded-md text-white shadow"
                  >
                    Workspaces
                  </button>

                  <button
                    onClick={() => {
                      logout();
                      setMenuOpen(false);
                      toast.success("Logged out");
                    }}
                    className="bg-red-500 px-6 py-2 rounded-md text-white shadow"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {workspacePanel && (
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed right-4 top-20 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-xl p-4 z-50"
          >
            <div className="flex justify-between items-center text-white text-lg font-semibold">
              Your Workspaces
              <FiX
                onClick={() => setWorkspacePanel(false)}
                className="cursor-pointer hover:text-red-400"
              />
            </div>

            <div className="mt-4 max-h-60 overflow-y-auto space-y-2">
              {loading ? (
                <p className="text-gray-500 text-sm">Loading...</p>
              ) : workspaces.length === 0 ? (
                <p className="text-gray-500 text-sm">No workspaces yet.</p>
              ) : (
                workspaces.map((ws) => (
                  <motion.div
                    key={ws._id}
                    onClick={() => {
                      console.log("Navigate:", ws._id);
                      navigate(`/room/${ws.roomId}`);
                      setWorkspacePanel(false);
                    }}
                    className="flex justify-between items-center bg-gray-800 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-700 text-gray-200"
                  >
                    <span>{ws.projectName}</span>

                    <FiTrash2
                      className="hover:text-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedWorkspace(ws._id);
                        setDeleteConfirm(true);
                      }}
                    />
                  </motion.div>

                ))
              )}
            </div>

            <button
              className="w-full flex items-center justify-center gap-2 mt-4 py-2 rounded-lg border border-indigo-500 text-indigo-400 hover:bg-indigo-600 hover:text-white transition"
              onClick={() => setShowCreateModal(true)}
            >
              <FiFolderPlus /> Create Workspace
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex justify-center items-center bg-black/50 backdrop-blur-sm z-50"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-gray-800 p-6 rounded-lg text-center w-80"
            >
              <p className="text-gray-200 text-lg font-semibold">
                Delete Workspace?
              </p>
              <p className="text-gray-400 text-sm mt-2">
                This action cannot be undone.
              </p>

              <div className="flex justify-between mt-5">
                <button
                  className="bg-gray-600 px-4 py-2 rounded-lg"
                  onClick={() => {
                    setDeleteConfirm(false);
                    setSelectedWorkspace(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="bg-red-500 px-4 py-2 rounded-lg"
                  onClick={deleteWorkspace}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CreateWorkspaceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateWorkspace}
        projectName={projectName}
        setProjectName={setProjectName}
        emails={emails}
        setEmails={setEmails}
      />
    </>
  );
}
