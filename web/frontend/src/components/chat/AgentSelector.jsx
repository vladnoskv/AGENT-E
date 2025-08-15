import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Box, 
  Button, 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  ListItemText, 
  Typography,
  Avatar,
  Divider,
  TextField,
  InputAdornment,
  Tooltip,
  IconButton,
  Chip,
  Paper,
  alpha
} from '@mui/material';
import { 
  Add as AddIcon, 
  Search as SearchIcon, 
  SmartToy as AgentIcon,
  Code as CodeIcon,
  Psychology as BrainIcon,
  Science as ScienceIcon,
  Brush as CreativeIcon,
  Settings as SettingsIcon,
  MoreVert as MoreIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { fetchAgents, selectAllAgents } from '../../store/slices/agentSlice';

const agentIcons = {
  'coder': <CodeIcon fontSize="small" />,
  'researcher': <ScienceIcon fontSize="small" />,
  'analyst': <Psychology fontSize="small" />,
  'creative': <CreativeIcon fontSize="small" />,
  'default': <AgentIcon fontSize="small" />
};

const getAgentIcon = (type) => {
  return agentIcons[type?.toLowerCase()] || agentIcons.default;
};

const AgentSelector = ({ selectedAgent, onSelectAgent, sx = {} }) => {
  const dispatch = useDispatch();
  const agents = useSelector(selectAllAgents);
  const [anchorEl, setAnchorEl] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recentAgents, setRecentAgents] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Load agents on mount
  useEffect(() => {
    const loadAgents = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await dispatch(fetchAgents()).unwrap();
        // Load recent agents from localStorage
        const savedRecents = localStorage.getItem('recentAgents');
        if (savedRecents) {
          setRecentAgents(JSON.parse(savedRecents));
        }
      } catch (err) {
        console.error('Failed to load agents:', err);
        setError('Failed to load agents. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadAgents();
  }, [dispatch]);

  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
    setIsMenuOpen(true);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setIsMenuOpen(false);
    setSearchQuery('');
  };

  const handleSelectAgent = (agent) => {
    // Add to recent agents
    const newRecentAgents = [
      agent,
      ...recentAgents.filter(a => a.id !== agent.id).slice(0, 4)
    ];
    setRecentAgents(newRecentAgents);
    localStorage.setItem('recentAgents', JSON.stringify(newRecentAgents));
    
    onSelectAgent(agent);
    handleCloseMenu();
  };

  const handleCreateNewAgent = () => {
    // Navigate to agent creation page or open dialog
    console.log('Create new agent');
    handleCloseMenu();
  };

  const handleRefreshAgents = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await dispatch(fetchAgents()).unwrap();
    } catch (err) {
      console.error('Failed to refresh agents:', err);
      setError('Failed to refresh agents. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderAgentItem = (agent) => (
    <MenuItem 
      key={agent.id} 
      onClick={() => handleSelectAgent(agent)}
      selected={selectedAgent?.id === agent.id}
      sx={{
        py: 1.5,
        px: 2,
        borderRadius: 1,
        mb: 0.5,
        '&:hover': {
          backgroundColor: 'action.hover',
        },
        '&.Mui-selected': {
          backgroundColor: 'primary.light',
          '&:hover': {
            backgroundColor: 'primary.light',
          },
        },
      }}
    >
      <ListItemIcon sx={{ minWidth: 40 }}>
        <Avatar 
          sx={{ 
            width: 32, 
            height: 32, 
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
          }}
        >
          {getAgentIcon(agent.type)}
        </Avatar>
      </ListItemIcon>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography 
          variant="subtitle2" 
          noWrap
          sx={{
            fontWeight: 500,
            color: selectedAgent?.id === agent.id ? 'primary.contrastText' : 'text.primary',
          }}
        >
          {agent.name}
        </Typography>
        <Typography 
          variant="caption" 
          noWrap
          sx={{
            display: 'block',
            color: selectedAgent?.id === agent.id ? 'primary.contrastText' : 'text.secondary',
          }}
        >
          {agent.description || 'No description'}
        </Typography>
      </Box>
      {agent.tags?.length > 0 && (
        <Box sx={{ ml: 1, display: 'flex', gap: 0.5 }}>
          {agent.tags.slice(0, 2).map(tag => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.65rem',
                bgcolor: selectedAgent?.id === agent.id ? 'rgba(255,255,255,0.2)' : 'action.selected',
                color: selectedAgent?.id === agent.id ? 'primary.contrastText' : 'text.secondary',
              }}
            />
          ))}
        </Box>
      )}
    </MenuItem>
  );

  return (
    <Box sx={{ ...sx }}>
      <Tooltip title={selectedAgent ? `Change agent (${selectedAgent.name})` : 'Select an agent'}>
        <Button
          variant="outlined"
          color="inherit"
          onClick={handleOpenMenu}
          startIcon={
            <Avatar 
              sx={{ 
                width: 24, 
                height: 24, 
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                fontSize: '0.75rem',
              }}
            >
              {selectedAgent ? 
                selectedAgent.name.charAt(0).toUpperCase() : 
                <AgentIcon fontSize="small" />
              }
            </Avatar>
          }
          endIcon={<MoreIcon />}
          sx={{
            textTransform: 'none',
            borderRadius: 4,
            px: 2,
            py: 0.75,
            minWidth: 'auto',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            '&:hover': {
              bgcolor: 'action.hover',
              borderColor: 'text.secondary',
            },
          }}
        >
          <Typography 
            variant="subtitle2" 
            noWrap 
            sx={{ 
              maxWidth: 150,
              fontWeight: 500,
            }}
          >
            {selectedAgent ? selectedAgent.name : 'Select Agent'}
          </Typography>
        </Button>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={isMenuOpen}
        onClose={handleCloseMenu}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            width: 320,
            maxWidth: '90vw',
            maxHeight: '70vh',
            mt: 1,
            borderRadius: 2,
            boxShadow: (theme) => theme.shadows[10],
            overflow: 'hidden',
          },
        }}
        MenuListProps={{
          sx: { p: 1 },
        }}
      >
        {/* Search Bar */}
        <Box sx={{ px: 2, py: 1 }}>
          <TextField
            autoFocus
            fullWidth
            variant="outlined"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton 
                    size="small" 
                    onClick={() => setSearchQuery('')}
                    edge="end"
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
              sx: {
                borderRadius: 4,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'divider',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'text.secondary',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                  borderWidth: '1px',
                },
              },
            }}
          />
        </Box>

        <Divider sx={{ my: 1 }} />

        {/* Recent Agents */}
        {recentAgents.length > 0 && !searchQuery && (
          <>
            <Box sx={{ px: 2, py: 0.5 }}>
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ 
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                  fontSize: '0.65rem',
                }}
              >
                Recent
              </Typography>
            </Box>
            {recentAgents.map(agent => renderAgentItem(agent))}
            <Divider sx={{ my: 1 }} />
          </>
        )}

        {/* Available Agents */}
        <Box sx={{ px: 2, py: 0.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ 
              textTransform: 'uppercase',
              fontWeight: 600,
              letterSpacing: '0.5px',
              fontSize: '0.65rem',
            }}
          >
            Available Agents
          </Typography>
          <Tooltip title="Refresh agents">
            <IconButton 
              size="small" 
              onClick={handleRefreshAgents}
              disabled={isLoading}
              sx={{
                '&:hover': {
                  color: 'primary.main',
                },
              }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {isLoading ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          </Box>
        ) : filteredAgents.length > 0 ? (
          <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
            {filteredAgents.map(agent => renderAgentItem(agent))}
          </Box>
        ) : (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No agents found
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 1 }} />

        {/* Create New Agent */}
        <MenuItem 
          onClick={handleCreateNewAgent}
          sx={{
            borderRadius: 1,
            color: 'primary.main',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          <ListItemIcon>
            <AddIcon color="primary" />
          </ListItemIcon>
          <ListItemText 
            primary="Create New Agent" 
            primaryTypographyProps={{
              variant: 'subtitle2',
              color: 'primary',
              fontWeight: 500,
            }}
          />
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default AgentSelector;
