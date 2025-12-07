import { useEffect, useState } from "react";
import { FiPlus, FiUsers, FiXCircle } from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../api/axios";

export default function CollaboratorsPanel({ roomId, accessToken }) {
  const [collaborators, setCollaborators] = useState([]);
  const [email, setEmail] = useState("");

  const fetchMembers = async () => {
    try {
      const res = await api.get(`/workspace/${roomId}/members`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = res.data?.workspace || res.data;

      const owner = data?.owner ? [{ ...data.owner, role: "Owner" }] : [];
      const collabs = Array.isArray(data?.collaborators)
        ? data.collaborators.map((u) => ({ ...u, role: "Collaborator" }))
        : [];

      setCollaborators([...owner, ...collabs]);
    } catch (error) {
      console.log("❌ Failed loading members:", error);
      toast.error("Error loading members");
    }
  };

  useEffect(() => {
    if (roomId && accessToken) fetchMembers();
  }, [roomId, accessToken]);

  const addMember = async () => {
    if (!email.trim()) return toast.error("Enter email");

    try {
      await api.post(
        `/workspace/${roomId}/add`,
        { email },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      toast.success("Collaborator added");
      setEmail("");
      fetchMembers();
    } catch {
      toast.error("Failed to add collaborator");
    }
  };

  const removeMember = async (userEmail) => {
    try {
      await api.post(
        `/workspace/${roomId}/remove`,
        { email: userEmail },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      toast.success("Collaborator removed");
      fetchMembers();
    } catch {
      toast.error("Failed removing collaborator");
    }
  };

  return (
    <div className="w-64 h-full bg-gray-900 p-4 border-r border-gray-800 flex flex-col">
      <div className="flex items-center gap-2 mb-4 text-lg text-indigo-400">
        <FiUsers /> Members ({collaborators.length})
      </div>

      <div className="flex gap-2 mb-3">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 px-2 py-2 bg-gray-800 text-sm rounded"
          placeholder="Add email..."
        />
        <button
          onClick={addMember}
          className="bg-indigo-600 px-3 rounded hover:bg-indigo-500 transition"
        >
          <FiPlus />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {collaborators.map((user, i) => (
          <div key={i} className="flex justify-between p-2 bg-gray-800 rounded">
            <div>
              <p className="text-sm">{user.username || user.email}</p>
              <p className="text-xs text-gray-400">{user.role}</p>
            </div>

            {user.role !== "Owner" && (
              <FiXCircle
                onClick={() => removeMember(user.email)}
                className="cursor-pointer text-red-400 hover:text-red-500"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
