export const collaboratorAddedTemplate = ({ projectName, roomLink }) => `
  <div style="font-family: Arial, sans-serif;">
    <h2>You've been added to a workspace</h2>
    <p>You now have access to <b>${projectName}</b>.</p>
    <a href="${roomLink}"
       style="display:inline-block;padding:10px 16px;
       background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;">
       Open Workspace
    </a>
    <p style="margin-top:20px;font-size:12px;color:#666">
      If you didn't expect this email, you can ignore it.
    </p>
  </div>
`;

export const inviteUserTemplate = ({ projectName, signupLink }) => `
  <div style="font-family: Arial, sans-serif;">
    <h2>You're invited to join CodeMate</h2>
    <p>You were invited to collaborate on <b>${projectName}</b>.</p>
    <a href="${signupLink}"
       style="display:inline-block;padding:10px 16px;
       background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;">
       Create Account & Join
    </a>
  </div>
`;
