export default function AccessDenied() {
  return (
    <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="text-center">
        <h1 className="text-3xl font-semibold mb-4">Access Denied</h1>
        <p className="text-gray-400 mb-6">
          You do not have permission to join this workspace.
        </p>
        <a
          href="/"
          className="px-4 py-2 bg-indigo-600 rounded hover:bg-indigo-500"
        >
          Go Home
        </a>
      </div>
    </div>
  );
}
