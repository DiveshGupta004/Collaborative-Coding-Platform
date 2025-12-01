import { FiFileText, FiSettings, FiUsers, FiFolder } from "react-icons/fi";
import { motion } from "framer-motion";

export default function ActivityBar({ activeTab, setActiveTab, theme }) {
  const isDark = theme === "dark-mode";

  const tabs = [
    { id: "explorer", icon: <FiFolder />, label: "Explorer" },
    { id: "users", icon: <FiUsers />, label: "Collaborators" },
    { id: "settings", icon: <FiSettings />, label: "Settings" },
  ];

  return (
    <motion.div
      layout
      className={`flex flex-col justify-between h-full transition-all duration-300 ${isDark ? "bg-gray-950 border-r border-gray-800" : "bg-gray-200 border-r border-gray-300"
        } w-14`}
    >
      <div className="flex flex-col items-center mt-4 gap-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            title={tab.label}
            className={`p-2 rounded-lg text-xl transition-all ${activeTab === tab.id
                ? isDark
                  ? "bg-gray-800 text-indigo-400"
                  : "bg-white text-indigo-600 shadow"
                : isDark
                  ? "text-gray-500 hover:text-indigo-400 hover:bg-gray-800/40"
                  : "text-gray-600 hover:text-indigo-600 hover:bg-gray-300/60"
              }`}
          >
            {tab.icon}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
