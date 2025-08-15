import React, { useState, useEffect, useRef } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Container, Box, Typography, Button, AppBar, Toolbar, IconButton, Drawer, List, ListItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import { Menu as MenuIcon, Code as CodeIcon, Chat as ChatIcon, Settings as SettingsIcon, PlayArrow as RunIcon } from '@mui/icons-material';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import './App.css';
import { setDarkMode } from './store/slices/uiSlice';

// Layout Components
import Layout from './components/Layout';

// Pages
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Agents from './pages/Agents';
import Settings from './pages/Settings';
import Models from './pages/Models';
import Workflows from './pages/Workflows';

// Theme
import { darkTheme, lightTheme } from './theme';

// API
import { getAgents } from './api/agents';

// WebSocket connection
const socket = io('ws://localhost:8000', {
  path: '/ws',
  transports: ['websocket'],
  autoConnect: false,
});

function App() {
  const dispatch = useDispatch();
  const darkMode = useSelector((state) => state.ui.darkMode);
  const [loading, setLoading] = useState(true);

  // Initialize WebSocket connection
  useEffect(() => {
    // Connect to WebSocket
    socket.connect();

    // Connection opened
    socket.on('connect', () => {
      console.log('Connected to WebSocket');
      dispatch(setConnected(true));
    });

    // Connection closed
    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
      dispatch(setConnected(false));
    });

    // Message received
    socket.on('message', (data) => {
      dispatch(addMessage(JSON.parse(data)));
    });

    // Clean up
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('message');
      socket.disconnect();
    };
  }, [dispatch]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load agents
        const agentsData = await getAgents();
        dispatch(setAgents(agentsData.agents || []));
        
        // Load user preferences
        const savedTheme = localStorage.getItem('darkMode');
        if (savedTheme !== null) {
          dispatch(setDarkMode(savedTheme === 'true'));
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [dispatch]);

  // Apply theme
  const theme = React.useMemo(
    () => createTheme(darkMode ? darkTheme : lightTheme),
    [darkMode]
  );

  if (loading) {
    return <div>Loading...</div>; // Add a proper loading component
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/chat" element={<Chat socket={socket} />} />
              <Route path="/agents" element={<Agents />} />
              <Route path="/models" element={<Models />} />
              <Route path="/workflows" element={<Workflows />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;
