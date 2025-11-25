// Save full workspace state
export const saveWorkspace = (roomId, data) => {
  localStorage.setItem(`workspace_${roomId}`, JSON.stringify(data));
};

// Load workspace state
export const loadWorkspace = (roomId) => {
  try {
    const data = JSON.parse(localStorage.getItem(`workspace_${roomId}`));
    return data || { files: [], openTabs: [], activeFileId: null };
  } catch {
    return { files: [], openTabs: [], activeFileId: null };
  }
};
