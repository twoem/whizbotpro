// Utility functions for command parsing, validation, etc.

function formatUptime(startTime) {
  const ms = new Date() - startTime;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  let uptimeString = "";
  if (hours > 0) uptimeString += `${hours}h `;
  if (minutes > 0) uptimeString += `${minutes}m `;
  uptimeString += `${seconds}s`;
  return uptimeString.trim() === "0s" ? "just now" : uptimeString.trim();
}


// Example: A function to check if a user is an admin in a group (requires groupMetadata)
// async function isUserAdmin(sock, groupId, userId) {
//   try {
//     const metadata = await sock.groupMetadata(groupId);
//     const participant = metadata.participants.find(p => p.id === userId);
//     return participant && (participant.admin === 'admin' || participant.admin === 'superadmin');
//   } catch (error) {
//     console.error("Error checking admin status:", error);
//     return false;
//   }
// }

module.exports = {
  formatUptime,
  // isUserAdmin (example)
};
