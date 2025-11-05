import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Login data:", form);
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gray-900 px-4 sm:px-6 md:px-8 pt-[80px] overflow-hidden">
      {/* Fix horizontal scroll issues */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-[80vw] sm:w-[60vw] md:w-[40vw] aspect-square bg-indigo-600 opacity-20 blur-[200px] rounded-full top-[-100px] left-1/2 -translate-x-1/2"></div>
      </div>

      {/* Card */}
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
          Login to your CodeMate. account
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
              className="w-full px-4 py-3 bg-gray-900/70 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
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
              className="w-full px-4 py-3 bg-gray-900/70 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>

          <motion.button
            whileHover={{
              scale: 1.03,
              boxShadow: "0px 0px 15px rgba(99,102,241,0.5)",
            }}
            whileTap={{ scale: 0.97 }}
            type="submit"
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-3 rounded-lg font-semibold transition-all duration-300"
          >
            Login
          </motion.button>
        </form>

        <div className="text-center mt-6 text-gray-400 text-sm sm:text-base">
          Don’t have an account?{" "}
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
