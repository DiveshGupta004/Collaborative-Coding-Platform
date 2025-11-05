import { FaGithub } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-6 text-center border-t border-gray-800">
      <div className="flex flex-col items-center justify-center space-y-2">
        <p>
          © {new Date().getFullYear()}{" "}
          <span className="text-indigo-400 font-semibold">CodeMate</span>. All rights reserved.
        </p>

        <a
          href="https://github.com/DiveshGupta004/Collaborative-Coding-Platform/tree/main"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-2 text-gray-400 hover:text-indigo-400 transition duration-300"
        >
          <FaGithub className="text-lg" />
          <span className="text-sm font-medium">View on GitHub</span>
        </a>
      </div>
    </footer>
  );
}
