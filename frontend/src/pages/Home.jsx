import { useState, useContext, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import CreateWorkspaceModal from "../components/CreateWorkspaceModal";
import { AuthContext } from "../context/AuthContext";
import api from "../api/axios";
import toast from "react-hot-toast";

export default function Home() {
  const navigate = useNavigate();
  const { user, accessToken } = useContext(AuthContext);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [emails, setEmails] = useState([]);

  const featureVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.2, duration: 0.6 },
    }),
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("openWorkspaceModal") === "true" && user) {
      setIsModalOpen(true);
    }
  }, [user]);

  const handleGetStarted = () => {
    if (!user) {
      toast.error("Please login to create a workspace.");
      navigate("/login?redirect=create-workspace");
      return;
    }
    setIsModalOpen(true);
  };

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();

    try {
      const res = await api.post(
        "/workspace/create",
        {
          projectName,
          collaborators: emails,
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const roomId = res.data.workspace.roomId;

      setIsModalOpen(false);
      setProjectName("");
      setEmails([]);

      navigate(`/room/${roomId}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create workspace");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white">

      <div className="flex-1 px-6 pt-28 md:pt-32 relative max-w-6xl mx-auto w-full">

        <div className="absolute top-[-120px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600 opacity-20 blur-[180px] rounded-full"></div>

        <section className="relative z-10 text-center py-12 md:py-16">
          <motion.h1
            className="text-4xl md:text-6xl font-extrabold mb-4 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            Collaborate. Code. Create.
          </motion.h1>

          <motion.p
            className="text-base md:text-lg text-gray-300 max-w-2xl mx-auto mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            Experience real-time collaborative coding. Create your workspace,
            invite your team, and build together instantly.
          </motion.p>

          <motion.button
            onClick={handleGetStarted}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="bg-indigo-500 hover:bg-indigo-600 px-8 py-3 rounded-lg font-semibold shadow-lg"
          >
            Get Started
          </motion.button>
        </section>
        
        <section className="relative z-10 py-10 md:py-14">
          <motion.h2
            className="text-center text-2xl md:text-3xl font-bold text-indigo-400 mb-10"

            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            Why Developers Love CodeMate.
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-6 md:gap-10">
            {[
              {
                title: "⚡ Real-time Editor",
                desc: "Work together instantly with real-time code sync.",
              },
              {
                title: "🌐 Multi-Language",
                desc: "Code in JavaScript, Python, C++, and more.",
              },
              {
                title: "🔒 Private Workspaces",
                desc: "Invite only the collaborators you trust.",
              },
            ].map((f, i) => (
              <motion.div
                key={i}
                custom={i}
                variants={featureVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="p-6 bg-gray-800/60 border border-gray-700 rounded-2xl hover:border-indigo-400 shadow-md text-left"
              >
                <h3 className="text-lg md:text-xl font-semibold text-indigo-400 mb-3">
                  {f.title}
                </h3>
                <p className="text-gray-300 text-sm md:text-base">
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

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
    </div>
  );
}
