import { useState, useContext, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import CreateWorkspaceModal from "../components/CreateWorkspaceModal";
import { AuthContext } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function Home() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [emails, setEmails] = useState([]);

  const featureVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.2, duration: 0.6, ease: "easeOut" },
    }),
  };

  // 🔥 Auto-open workspace modal after redirect from login
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("openWorkspaceModal") === "true" && user) {
      setIsModalOpen(true);
    }
  }, [user]);

  // 🔥 Get Started logic (requires login)
  const handleGetStarted = () => {
    if (!user) {
      toast.error("Please login to create a workspace.");
      navigate("/login?redirect=create-workspace");
      return;
    }
    setIsModalOpen(true);
  };

  // 🔥 Create workspace handler
  const handleCreateWorkspace = (e) => {
    e.preventDefault();

    const roomId = Math.random().toString(36).substring(2, 8);

    console.log({
      projectName,
      collaborators: emails,
    });

    setIsModalOpen(false);
    setProjectName("");
    setEmails([]);

    navigate(`/room/${roomId}`);
  };

  return (
    <div className="relative bg-gray-900 text-white overflow-hidden px-6 pt-[80px]">

      {/* Background Glow */}
      <div className="absolute top-[-100px] left-1/2 transform -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600 opacity-20 blur-[180px] rounded-full"></div>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center py-24 px-6 text-center">
        <motion.h1
          className="text-5xl md:text-6xl font-extrabold mb-6 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          Collaborate. Code. Create.
        </motion.h1>

        <motion.p
          className="text-lg text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          Experience real-time collaborative coding — where innovation meets teamwork.
          Create your workspace, invite your team, and code together instantly.
        </motion.p>

        {/* Get Started */}
        <motion.button
          onClick={handleGetStarted}
          whileHover={{
            scale: 1.07,
            boxShadow: "0px 0px 15px rgba(99,102,241,0.6)",
          }}
          whileTap={{ scale: 0.97 }}
          className="bg-indigo-500 hover:bg-indigo-600 px-8 py-3 rounded-lg font-semibold text-white shadow-lg transition-all duration-300"
        >
          Get Started
        </motion.button>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-gray-900 text-center relative z-10">
        <motion.h2
          className="text-3xl font-bold text-indigo-400 mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Why Developers Love CodeMate.
        </motion.h2>

        <div className="grid md:grid-cols-3 gap-10 max-w-6xl mx-auto">
          {[
            {
              title: "⚡ Real-time Editor",
              desc: "Edit and sync code instantly with your team, in any browser.",
            },
            {
              title: "🌐 Multi-Language Support",
              desc: "Seamlessly switch between JavaScript, Python, and more.",
            },
            {
              title: "🔒 Secure Collaboration",
              desc: "Your sessions are end-to-end encrypted for total privacy.",
            },
          ].map((f, i) => (
            <motion.div
              key={i}
              custom={i}
              variants={featureVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="p-6 bg-gray-800/60 border border-gray-700 rounded-2xl hover:border-indigo-400 shadow-md hover:shadow-indigo-500/20 hover:-translate-y-1 transition-all duration-300"
            >
              <h3 className="text-xl font-semibold text-indigo-400 mb-3">
                {f.title}
              </h3>
              <p className="text-gray-300">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateWorkspace}
        projectName={projectName}
        setProjectName={setProjectName}
        emails={emails}
        setEmails={setEmails}
      />
    </div>
  );
}
