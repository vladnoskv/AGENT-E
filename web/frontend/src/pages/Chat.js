import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Box, 
  TextField, 
  IconButton, 
  Paper, 
  Typography, 
  Avatar, 
  List, 
  ListItem, 
  ListItemAvatar, 
  ListItemText,
  CircularProgress,
  Divider,
  Tooltip,
  Chip
} from '@mui/material';
import { Send as SendIcon, Code as CodeIcon, SmartToy as BotIcon, Person as UserIcon } from '@mui/icons-material';
import { addMessage, setLoading } from '../store/slices/chatSlice';
import { executeCode } from '../api/chat';

const Chat = ({ socket }) => {
  const dispatch = useDispatch();
  const { messages, loading } = useSelector((state) => state.chat);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message to chat
    const userMessage = {
      id: Date.now(),
      content: input,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };
    
    dispatch(addMessage(userMessage));
    setInput('');
    dispatch(setLoading(true));

    try {
      // Send message to WebSocket
      if (socket) {
        socket.emit('message', {
          type: 'user_message',
          content: input,
          timestamp: new Date().toISOString(),
        });
      }

      // Here you would typically call your API
      // const response = await chatAPI.sendMessage(input);
      // dispatch(addMessage({
      //   id: Date.now() + 1,
      //   content: response.reply,
      //   sender: 'assistant',
      //   timestamp: new Date().toISOString(),
      //   metadata: response.metadata
      // }));

    } catch (error) {
      console.error('Error sending message:', error);
      dispatch(addMessage({
        id: Date.now() + 1,
        content: 'Sorry, there was an error processing your message.',
        sender: 'system',
        timestamp: new Date().toISOString(),
        isError: true
      }));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const renderMessageContent = (message) => {
    if (message.contentType === 'code') {
      return (
        <Box sx={{ mt: 1, mb: 1 }}>
          <pre style={{
            backgroundColor: '#2d2d2d',
            padding: '12px',
            borderRadius: '4px',
            overflowX: 'auto',
            margin: 0
          }}>
            <code>{message.content}</code>
          </pre>
          {message.language && (
            <Chip 
              size="small" 
              label={message.language} 
              sx={{ mt: 0.5, mr: 1 }}
              icon={<CodeIcon fontSize="small" />}
            />
          )}
        </Box>
      );
    }
    return message.content.split('\n').map((line, i) => (
      <Typography key={i} variant="body1" sx={{ mb: 0.5 }}>
        {line || <br />}
      </Typography>
    ));
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: 'calc(100vh - 64px)',
      maxWidth: '1200px',
      margin: '0 auto',
      width: '100%',
      p: 2,
      boxSizing: 'border-box'
    }}>
      <Paper 
        elevation={0} 
        sx={{ 
          flex: 1, 
          overflow: 'auto', 
          mb: 2, 
          p: 2,
          borderRadius: 2,
          backgroundColor: 'background.paper',
        }}
      >
        <List sx={{ width: '100%' }}>
          {messages.length === 0 ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '60vh',
              color: 'text.secondary'
            }}>
              <BotIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" color="textSecondary">How can I help you today?</Typography>
              <Typography variant="body2" sx={{ mt: 1, textAlign: 'center', maxWidth: '500px' }}>
                Ask me anything about your project, request code examples, or get help with debugging.
              </Typography>
            </Box>
          ) : (
            messages.map((message, index) => (
              <React.Fragment key={message.id}>
                <ListItem 
                  alignItems="flex-start"
                  sx={{
                    flexDirection: message.sender === 'user' ? 'row-reverse' : 'row',
                    alignItems: 'flex-start',
                    mb: 1,
                  }}
                >
                  <ListItemAvatar>
                    <Avatar 
                      sx={{
                        bgcolor: message.sender === 'user' ? 'primary.main' : 'secondary.main',
                        width: 32,
                        height: 32,
                      }}
                    >
                      {message.sender === 'user' ? <UserIcon /> : <BotIcon />}
                    </Avatar>
                  </ListItemAvatar>
                  <Box 
                    sx={{
                      maxWidth: '80%',
                      ml: message.sender === 'user' ? 0 : 1,
                      mr: message.sender === 'user' ? 1 : 0,
                      p: 2,
                      borderRadius: 2,
                      backgroundColor: message.sender === 'user' 
                        ? 'primary.light' 
                        : 'background.default',
                      color: message.sender === 'user' 
                        ? 'primary.contrastText' 
                        : 'text.primary',
                      boxShadow: 1,
                    }}
                  >
                    {renderMessageContent(message)}
                    <Typography 
                      variant="caption" 
                      display="block" 
                      sx={{ 
                        mt: 0.5, 
                        textAlign: 'right',
                        opacity: 0.7,
                        color: message.sender === 'user' 
                          ? 'primary.contrastText' 
                          : 'text.secondary',
                      }}
                    >
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Box>
                </ListItem>
                {index < messages.length - 1 && <Divider variant="inset" component="li" />}
              </React.Fragment>
            ))
          )}
          <div ref={messagesEndRef} />
        </List>
      </Paper>
      
      <Box 
        component="form" 
        onSubmit={handleSubmit}
        sx={{ 
          display: 'flex', 
          alignItems: 'center',
          gap: 1,
          width: '100%',
          maxWidth: '1000px',
          margin: '0 auto',
        }}
      >
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          multiline
          maxRows={4}
          disabled={loading}
          InputProps={{
            sx: {
              borderRadius: 4,
              backgroundColor: 'background.paper',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            },
          }}
        />
        <Tooltip title="Send message">
          <span>
            <IconButton 
              color="primary" 
              type="submit" 
              disabled={!input.trim() || loading}
              sx={{
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                },
                '&.Mui-disabled': {
                  backgroundColor: 'action.disabledBackground',
                  color: 'action.disabled',
                },
                width: 48,
                height: 48,
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                <SendIcon />
              )}
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default Chat;
