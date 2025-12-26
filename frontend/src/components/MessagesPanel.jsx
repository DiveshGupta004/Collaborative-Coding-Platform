import { useState, useEffect, useRef } from "react";
import { FiSend, FiTrash2 } from "react-icons/fi";
import io from "socket.io-client";
import axios from "axios";

export default function MessagesPanel({
  roomId,
  currentUserEmail,
  theme = "dark-mode",
  accessToken,
}) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const isDark = theme === "dark-mode";

  /* ---------- CHECK OWNER ---------- */
  useEffect(() => {
    const checkOwnership = async () => {
      try {
        const res = await axios.get(`/api/workspace/${roomId}/members`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        setIsOwner(res.data.owner.email === currentUserEmail);
      } catch (err) {
        console.error("Error checking ownership:", err);
      }
    };

    checkOwnership();
  }, [roomId, currentUserEmail, accessToken]);

  /* ---------- SOCKET CONNECTION ---------- */
  useEffect(() => {
    const SERVER_URL =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
        ? "http://localhost:4000"
        : window.location.origin;

    const socket = io(SERVER_URL, {
      transports: ["websocket"],
      auth: { token: accessToken },
    });

    socketRef.current = socket;

    socket.emit("join-messages", { roomId });

    socket.emit("load-messages", { roomId });

    socket.on("messages-loaded", (loadedMessages) => {
      setMessages(loadedMessages || []);
    });

    socket.on("receive-message", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on("messages-cleared", () => {
      setMessages([]);
      setConfirmClear(false);
    });

    socket.on("user-typing", ({ email, username }) => {
      if (email && email !== currentUserEmail) {
        setTypingUsers((prev) => {
          const filtered = prev.filter((u) => u && u.email !== email);
          const newUser = { email, username: username || email.split("@")[0] };
          return [...filtered, newUser];
        });
      }
    });

    socket.on("user-stopped-typing", ({ email }) => {
      if (email) {
        setTypingUsers((prev) => prev.filter((u) => u && u.email !== email));
      }
    });

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        socketRef.current?.emit("stop-typing", { roomId });
      }

      socket.off("messages-loaded");
      socket.off("receive-message");
      socket.off("messages-cleared");
      socket.off("user-typing");
      socket.off("user-stopped-typing");
      socket.disconnect();
    };
  }, [roomId, accessToken, currentUserEmail]);

  /* ---------- AUTO SCROLL ---------- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  /* ---------- TYPING INDICATOR ---------- */
  const handleTyping = () => {
    if (!typingTimeoutRef.current) {
      socketRef.current?.emit("typing", { roomId });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("stop-typing", { roomId });
      typingTimeoutRef.current = null;
    }, 3000);
  };

  /* ---------- SEND MESSAGE ---------- */
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    socketRef.current?.emit("stop-typing", { roomId });

    socketRef.current?.emit("send-message", {
      roomId,
      email: currentUserEmail,
      text: newMessage,
      timestamp: new Date().toISOString(),
    });

    setNewMessage("");
  };

  /* ---------- CLEAR CHAT ---------- */
  const requestClear = () => setConfirmClear(true);
  const cancelClear = () => setConfirmClear(false);

  const confirmClearMessages = () => {
    socketRef.current?.emit("clear-messages", { roomId });
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitials = (email) => {
    return email.charAt(0).toUpperCase();
  };

  const getTypingText = () => {
    const count = typingUsers.length;

    if (count === 0) return null;

    const getUserName = (user) => {
      if (!user) return "Someone";
      return user.username || (user.email ? user.email.split("@")[0] : "Someone");
    };

    if (count === 1) {
      return `${getUserName(typingUsers[0])} is typing...`;
    }
    if (count === 2) {
      const names = typingUsers.map(getUserName);
      return `${names[0]} and ${names[1]} are typing...`;
    }
    if (count === 3) {
      const names = typingUsers.map(getUserName);
      return `${names[0]}, ${names[1]}, and ${names[2]} are typing...`;
    }
    return `${count} people are typing...`;
  };

  return (
    <div
      className={`w-64 h-full flex flex-col ${
        isDark
          ? "bg-gray-900 border-r border-gray-800"
          : "bg-gray-100 border-r border-gray-300"
      }`}
    >
      <div
        className={`px-4 py-3 border-b flex items-center justify-between ${
          isDark ? "border-gray-800" : "border-gray-300"
        }`}
      >
        <h2
          className={`text-sm font-semibold ${
            isDark ? "text-gray-200" : "text-gray-800"
          }`}
        >
          MESSAGES
        </h2>

        {isOwner && messages.length > 0 && !confirmClear && (
          <button
            onClick={requestClear}
            title="Clear all messages"
            className={`p-1.5 rounded hover:bg-red-500/10 transition-colors ${
              isDark
                ? "text-gray-400 hover:text-red-400"
                : "text-gray-600 hover:text-red-500"
            }`}
          >
            <FiTrash2 size={14} />
          </button>
        )}
      </div>

      {confirmClear && (
        <div
          className={`px-3 py-2 text-xs flex justify-between items-center border-b ${
            isDark
              ? "bg-gray-800 border-gray-700 text-gray-300"
              : "bg-gray-200 border-gray-300 text-gray-700"
          }`}
        >
          <span className="font-medium">Clear all messages permanently?</span>
          <div className="flex gap-2">
            <button
              onClick={cancelClear}
              className={`px-2 py-1 rounded hover:bg-gray-500/10 transition-colors ${
                isDark
                  ? "text-gray-400 hover:text-gray-200"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Cancel
            </button>
            <button
              onClick={confirmClearMessages}
              className="px-2 py-1 rounded bg-red-600 text-white hover:bg-red-500 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div
            className={`text-center text-sm mt-8 ${
              isDark ? "text-gray-500" : "text-gray-600"
            }`}
          >
            No messages yet. Start a conversation!
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isOwn = msg.email === currentUserEmail;
            return (
              <div
                key={msg.id || idx}
                className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                    isOwn
                      ? "bg-indigo-500 text-white"
                      : isDark
                      ? "bg-gray-700 text-gray-300"
                      : "bg-gray-300 text-gray-700"
                  }`}
                >
                  {getInitials(msg.email)}
                </div>

                <div className={`flex flex-col ${isOwn ? "items-end" : ""}`}>
                  <div
                    className={`px-3 py-2 rounded-lg max-w-[180px] break-words ${
                      isOwn
                        ? "bg-indigo-600 text-white"
                        : isDark
                        ? "bg-gray-800 text-gray-200"
                        : "bg-white text-gray-800"
                    }`}
                  >
                    {!isOwn && (
                      <div
                        className={`text-xs font-semibold mb-1 ${
                          isDark ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {msg.username || msg.email.split("@")[0]}
                      </div>
                    )}
                    <p className="text-sm">{msg.text}</p>
                  </div>
                  <span
                    className={`text-[10px] mt-1 ${
                      isDark ? "text-gray-500" : "text-gray-600"
                    }`}
                  >
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              </div>
            );
          })
        )}

        {typingUsers.length > 0 && (
          <div className="flex gap-2 items-center">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                isDark ? "bg-gray-700" : "bg-gray-300"
              }`}
            >
              <div className="flex gap-0.5">
                <span
                  className={`w-1 h-1 rounded-full animate-bounce ${
                    isDark ? "bg-gray-400" : "bg-gray-600"
                  }`}
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className={`w-1 h-1 rounded-full animate-bounce ${
                    isDark ? "bg-gray-400" : "bg-gray-600"
                  }`}
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className={`w-1 h-1 rounded-full animate-bounce ${
                    isDark ? "bg-gray-400" : "bg-gray-600"
                  }`}
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
            <span
              className={`text-xs italic ${
                isDark ? "text-gray-500" : "text-gray-600"
              }`}
            >
              {getTypingText()}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSendMessage}
        className={`p-3 border-t ${
          isDark ? "border-gray-800" : "border-gray-300"
        }`}
      >
        <div
          className={`flex gap-2 items-center px-3 py-2 rounded-lg ${
            isDark ? "bg-gray-800" : "bg-white"
          }`}
        >
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            placeholder="Type a message..."
            className={`flex-1 bg-transparent outline-none text-sm ${
              isDark
                ? "text-gray-200 placeholder-gray-500"
                : "text-gray-800 placeholder-gray-400"
            }`}
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className={`p-1.5 rounded transition-colors ${
              newMessage.trim()
                ? "text-indigo-500 hover:bg-indigo-500/10"
                : isDark
                ? "text-gray-600"
                : "text-gray-400"
            }`}
          >
            <FiSend size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}