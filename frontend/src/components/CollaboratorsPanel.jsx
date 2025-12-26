import { useEffect, useState } from "react";
import { FiPlus, FiUsers, FiXCircle } from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../api/axios";
import { socket } from "../socket";

export default function CollaboratorsPanel({
  roomId,
  accessToken,
  onMembersChange,
  onKickCollaborator,
  currentUserEmail,
}) {
  const [members, setMembers] = useState([]);
  const [email, setEmail] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [isOwner, setIsOwner] = useState(false);

  const fetchMembers = async () => {
    try {
      const res = await api.get(`/workspace/${roomId}/members`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const { owner, collaborators } = res.data;

      setOwnerEmail(owner.email);

      const formatted = [
        {
          email: owner.email,
          role: "Owner",
          username: owner.username,
          displayName: owner.username || owner.email
        },
        ...(collaborators || []).map((collab) => {
          if (typeof collab === "object") {
            return {
              email: collab.email,
              username: collab.username,
              role: "Collaborator",
              displayName: collab.username || collab.email
            };
          }
          return {
            email: collab,
            role: "Collaborator",
            displayName: collab
          };
        }),
      ];

      setMembers(formatted);

      if (currentUserEmail) {
        setIsOwner(owner.email === currentUserEmail);
      }

      if (onMembersChange) {
        onMembersChange(formatted);
      }
    } catch (err) {
      console.error("❌ Failed loading members:", err);
      toast.error("Error loading members");
    }
  };

  useEffect(() => {
    if (roomId && accessToken) {
      fetchMembers();
    }
  }, [roomId, accessToken, currentUserEmail]);

  const addMember = async () => {
    if (!email.trim()) return toast.error("Enter email");

    if (!isOwner) {
      return toast.error("Only the owner can add collaborators");
    }

    try {
      await api.post(
        `/workspace/${roomId}/add`,
        { email },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );


      toast.success("Collaborator added");
      setEmail("");
      fetchMembers();
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to add collaborator";
      toast.error(errorMsg);
    }
  };

  const removeMember = async (userEmail) => {
    if (!isOwner) {
      return toast.error("Only the owner can remove collaborators");
    }

    if (userEmail === ownerEmail) {
      return toast.error("Owner cannot be removed");
    }

    try {
      await api.post(
        `/workspace/${roomId}/remove`,
        { email: userEmail },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (onKickCollaborator) {
        onKickCollaborator(userEmail);
      } else {
        socket.emit("kick-collaborator", {
          roomId,
          email: userEmail,
        });
      }

      const updated = members.filter((u) => u.email !== userEmail);
      setMembers(updated);

      if (onMembersChange) {
        onMembersChange(updated);
      }

      toast.success("Collaborator removed");
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed removing collaborator";
      toast.error(errorMsg);
    }
  };

  return (
    <div className="w-64 h-full bg-gray-900 p-4 border-r border-gray-800 flex flex-col">
      <div className="flex items-center gap-2 mb-4 text-lg text-indigo-400">
        <FiUsers /> Members ({members.length})
      </div>

      {isOwner && (
        <div className="flex gap-2 mb-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 px-2 py-2 bg-gray-800 text-sm rounded"
            placeholder="Add email..."
            onKeyPress={(e) => {
              if (e.key === "Enter") addMember();
            }}
          />
          <button
            onClick={addMember}
            className="bg-indigo-600 px-3 rounded hover:bg-indigo-500 transition"
          >
            <FiPlus />
          </button>
        </div>
      )}

      {!isOwner && (
        <div className="mb-3 p-2 bg-gray-800 rounded text-xs text-gray-400 text-center">
          Only the owner can manage members
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2">
        {members.map((user, i) => (
          <div key={i} className="flex justify-between items-center p-2 bg-gray-800 rounded">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate flex items-center gap-2">
                <span>{user.displayName}</span>
                {user.email === currentUserEmail && (
                  <span className="text-sm font-semibold text-indigo-400">(You)</span>
                )}
              </p>
              {user.username && (
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              )}
              <p className="text-xs text-indigo-400 mt-0.5">{user.role}</p>
            </div>
            
            {isOwner && user.role !== "Owner" && (
              <FiXCircle
                onClick={() => removeMember(user.email)}
                className="cursor-pointer text-red-400 hover:text-red-500 transition flex-shrink-0 ml-2"
                title="Remove collaborator"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}