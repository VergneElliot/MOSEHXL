const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Serve static files from the build directory
app.use(express.static(path.join(__dirname, 'build')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 MOSEHXL Frontend Server running on port ${PORT}`);
  console.log(`🔧 Environment: Production`);
  console.log(`🌐 Server accessible on:`);
  console.log(`   - Local: http://localhost:${PORT}`);
  console.log(`   - Network: http://192.168.0.152:${PORT}`);
  console.log(`📱 Accessible from phones/tablets on your network`);
});
