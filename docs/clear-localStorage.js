// Clear localStorage script
// Run this in your browser's developer console to reset the app state

localStorage.removeItem('hackathon_user');
localStorage.removeItem('hackathon_project');
localStorage.removeItem('hackathon_github_repo');

console.log('✅ localStorage cleared! Refresh the page to start fresh.');

// Check if everything was cleared
console.log('Current localStorage items:');
console.log('User:', localStorage.getItem('hackathon_user'));
console.log('Project:', localStorage.getItem('hackathon_project'));
console.log('GitHub Repo:', localStorage.getItem('hackathon_github_repo'));
