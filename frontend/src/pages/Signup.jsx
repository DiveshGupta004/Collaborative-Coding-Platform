import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axios";
import toast from "react-hot-toast";

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }
    try {
      const res = await api.post("/auth/signup", {
        username: form.username,
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      toast.success(res.data.message || "Signup successful!");
      navigate("/login");
    } catch (error) {
      toast.error(error.response.data.message || "Signup failed. Please try again.");
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gray-900 px-4 sm:px-6 md:px-8 pt-[80px] overflow-hidden">
      {/* Responsive Glow Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-[80vw] sm:w-[60vw] md:w-[40vw] aspect-square bg-indigo-600 opacity-20 blur-[200px] rounded-full top-[-100px] left-1/2 -translate-x-1/2"></div>
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-sm sm:max-w-md bg-gray-800/50 border border-gray-700 rounded-2xl shadow-xl backdrop-blur-lg p-6 sm:p-8"
      >
        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-indigo-400 mb-2">
          Create Account
        </h2>
        <p className="text-gray-400 text-center mb-6 sm:mb-8 text-sm sm:text-base">
          Join CodeMate. and start coding together
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">Name</label>
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              required
              placeholder="John Doe"
              className="w-full px-4 py-3 bg-gray-900/70 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>

          {/* Email */}
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

          {/* Password */}
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

          {/* Confirm Password */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-gray-900/70 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>

          {/* Submit Button */}
          <motion.button
            whileHover={{
              scale: 1.03,
              boxShadow: "0px 0px 15px rgba(99,102,241,0.5)",
            }}
            whileTap={{ scale: 0.97 }}
            type="submit"
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-3 rounded-lg font-semibold transition-all duration-300"
          >
            Sign Up
          </motion.button>
        </form>

        {/* Footer Links */}
        <div className="text-center mt-6 text-gray-400 text-sm sm:text-base">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-indigo-400 hover:text-indigo-300 transition"
          >
            Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
