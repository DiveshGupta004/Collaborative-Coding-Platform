import { useState, useContext } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useContext(AuthContext);

  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post("/auth/login", form, {
        withCredentials: true,
      });

      login({
        accessToken: res.data.accessToken,
        user: res.data.user,
      });

      toast.success("Login successful!");

      const params = new URLSearchParams(location.search);
      if (params.get("redirect") === "create-workspace") {
        navigate("/?openWorkspaceModal=true");
      } else {
        navigate("/");
      }
    } catch (error) {
      const msg =
        error?.response?.data?.message || "Login failed. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gray-900 px-4 sm:px-6 md:px-8 pt-[80px] overflow-hidden">

      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-[80vw] sm:w-[60vw] md:w-[40vw] aspect-square bg-indigo-600 opacity-20 blur-[200px] rounded-full top-[-100px] left-1/2 -translate-x-1/2"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full max-w-sm sm:max-w-md bg-gray-800/50 border border-gray-700 rounded-2xl shadow-xl backdrop-blur-lg p-6 sm:p-8"
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-indigo-400 mb-2">
          Welcome Back
        </h2>
        <p className="text-gray-400 text-center mb-6 sm:mb-8 text-sm sm:text-base">
          Login to your CodeMate account
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div>
            <label className="block text-sm text-gray-300 mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="example@email.com"
              className="w-full px-4 py-3 bg-gray-900/70 border border-gray-700 
              rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500 
              focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-gray-900/70 border border-gray-700 
              rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500 
              focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>

          <motion.button
            whileHover={!loading ? { scale: 1.03 } : {}}
            whileTap={!loading ? { scale: 0.97 } : {}}
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg font-semibold text-white transition-all duration-300
              ${
                loading
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-indigo-500 hover:bg-indigo-600"
              }`}
          >
            {loading ? "Logging in..." : "Login"}
          </motion.button>
        </form>

        <div className="text-center mt-6 text-gray-400 text-sm sm:text-base">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="text-indigo-400 hover:text-indigo-300 transition"
          >
            Sign up
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
