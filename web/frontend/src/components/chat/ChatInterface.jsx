import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Paper, IconButton, Tooltip, useTheme } from '@mui/material';
import { Send as SendIcon, Code as CodeIcon, Settings as SettingsIcon } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { addMessage, setTyping, selectAllMessages } from '../../store/slices/chatSlice';
import { streamMessage } from '../../api/chat';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import AgentSelector from './AgentSelector';
import CodeBlock from '../common/CodeBlock';

const ChatContainer = styled(Paper)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
  backgroundColor: theme.palette.background.paper,
}));

const ChatHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.default,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}));

const ChatMessages = styled(Box)({
  flex: 1,
  overflowY: 'auto',
  padding: '16px',
  '& > * + *': {
    marginTop: '16px',
  },
});

const ChatInputContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.default,
}));

const ChatInterface = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const messages = useSelector(selectAllMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    
    // Add user message to chat
    dispatch(addMessage({
      content: userMessage,
      sender: 'user',
      timestamp: new Date().toISOString(),
    }));

    // Set typing indicator
    dispatch(setTyping(true));
    setIsTyping(true);

    try {
      // Prepare context from previous messages
      const context = {
        conversation: messages.slice(-5).map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content,
        })),
        agent: selectedAgent,
      };

      // Add a placeholder for the assistant's response
      const assistantMessageId = Date.now();
      dispatch(addMessage({
        id: assistantMessageId,
        content: '',
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        isStreaming: true,
      }));

      // Stream the response
      let fullResponse = '';
      await streamMessage(
        userMessage,
        context,
        (data) => {
          if (data.content) {
            fullResponse += data.content;
            // Update the message with the latest content
            dispatch(addMessage({
              id: assistantMessageId,
              content: fullResponse,
              sender: 'assistant',
              timestamp: new Date().toISOString(),
              isStreaming: true,
            }));
          }
        }
      );

      // Mark the message as no longer streaming
      dispatch(addMessage({
        id: assistantMessageId,
        content: fullResponse,
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        isStreaming: false,
      }));

    } catch (error) {
      console.error('Error sending message:', error);
      dispatch(addMessage({
        content: 'Sorry, there was an error processing your message. Please try again.',
        sender: 'system',
        timestamp: new Date().toISOString(),
        isError: true,
      }));
    } finally {
      dispatch(setTyping(false));
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <ChatContainer elevation={3}>
      <ChatHeader>
        <AgentSelector
          selectedAgent={selectedAgent}
          onSelectAgent={setSelectedAgent}
        />
        <Box>
          <Tooltip title="Code Mode">
            <IconButton size="small" sx={{ mr: 1 }}>
              <CodeIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Settings">
            <IconButton size="small">
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </ChatHeader>

      <ChatMessages>
        <MessageList messages={messages} />
        <div ref={messagesEndRef} />
      </ChatMessages>

      <ChatInputContainer>
        <MessageInput
          inputRef={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={selectedAgent 
            ? `Message ${selectedAgent.name}...` 
            : 'Select an agent to start chatting...'}
          disabled={!selectedAgent || isTyping}
          endAdornment={
            <IconButton 
              onClick={handleSendMessage} 
              disabled={!inputValue.trim() || isTyping || !selectedAgent}
              color="primary"
            >
              <SendIcon />
            </IconButton>
          }
        />
      </ChatInputContainer>
    </ChatContainer>
  );
};

export default ChatInterface;
