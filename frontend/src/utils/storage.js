export const saveWorkspace = (roomId, files, openTabs, activeFile) => {
  localStorage.setItem(`files_${roomId}`, JSON.stringify(files));
  localStorage.setItem(`tabs_${roomId}`, JSON.stringify(openTabs));
  localStorage.setItem(`active_${roomId}`, activeFile?.name || "");
};

export const loadWorkspace = (roomId) => {
  try {
    const files = JSON.parse(localStorage.getItem(`files_${roomId}`)) || [];
    const openTabs = JSON.parse(localStorage.getItem(`tabs_${roomId}`)) || [];
    const activeFileName = localStorage.getItem(`active_${roomId}`);
    return { files, openTabs, activeFileName };
  } catch {
    return { files: [], openTabs: [], activeFileName: null };
  }
};
