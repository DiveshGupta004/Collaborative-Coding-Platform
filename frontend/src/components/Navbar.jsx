import { useState, useContext, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiMenu, FiX } from "react-icons/fi";
import { AuthContext } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdown, setDropdown] = useState(false);

  const { user, logout } = useContext(AuthContext);

  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getInitial = (name) => {
    if (!name) return "U";
    return name.charAt(0).toUpperCase();
  };

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-gray-900/90 backdrop-blur-md border-b border-gray-800 shadow-md">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          to="/"
          className="text-2xl font-extrabold text-indigo-400 tracking-wide"
        >
          CodeMate.
        </Link>

        <div className="hidden md:flex items-center space-x-4">
          {!user && (
            <>
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-gray-200 hover:text-indigo-400 transition"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-semibold shadow-md transition-all duration-300"
              >
                Sign Up
              </Link>
            </>
          )}

          {user && (
            <div className="relative" ref={dropdownRef}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                onClick={() => setDropdown(!dropdown)}
                className="w-10 h-10 bg-indigo-500 text-white flex items-center justify-center rounded-full cursor-pointer font-bold select-none"
              >
                {getInitial(user.username)}
              </motion.div>

              <AnimatePresence>
                {dropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-44 bg-gray-800 border border-gray-700 rounded-md shadow-lg py-2"
                  >
                    <div className="px-4 py-2 border-b border-gray-700 text-gray-300">
                      Logged in as <br />
                      <span className="font-semibold text-white">
                        {user.username}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        logout();
                        setDropdown(false);
                        toast.success("Logged out successfully");
                      }}
                      className="w-full text-left px-4 py-2 text-gray-200 hover:bg-gray-700 transition"
                    >
                      Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        <button
          className="md:hidden text-gray-300 text-2xl"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <FiX /> : <FiMenu />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-gray-900 border-t border-gray-800 py-6"
          >
            <div className="flex flex-col items-center space-y-4">
              {!user && (
                <>
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className="text-gray-300 hover:text-indigo-400 transition text-lg"
                  >
                    Login
                  </Link>

                  <Link
                    to="/signup"
                    onClick={() => setIsOpen(false)}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded-md font-medium shadow-md transition-all duration-300"
                  >
                    Sign Up
                  </Link>
                </>
              )}

              {user && (
                <>
                  <div className="text-center text-gray-300">
                    Logged in as <br />
                    <span className="text-white font-bold text-lg">
                      {user.username}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      logout();
                      setIsOpen(false);
                      toast.success("Logged out successfully");
                    }}
                    className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-md font-medium shadow-md transition-all duration-300"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
