import React, { useEffect, useRef } from 'react';
import { Box, Typography, Avatar, Paper, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';
import CodeBlock from '../common/CodeBlock';

const MessageContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isUser' && prop !== 'isStreaming',
})(({ theme, isUser, isStreaming }) => ({
  display: 'flex',
  flexDirection: 'row',
  justifyContent: isUser ? 'flex-end' : 'flex-start',
  marginBottom: theme.spacing(2),
  '&:last-child': {
    marginBottom: 0,
  },
  opacity: isStreaming ? 0.8 : 1,
  transition: 'opacity 0.3s ease',
}));

const MessageBubble = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isUser' && prop !== 'isError',
})(({ theme, isUser, isError }) => ({
  maxWidth: '80%',
  padding: theme.spacing(1.5, 2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: isUser 
    ? theme.palette.primary.main 
    : isError 
      ? theme.palette.error.dark 
      : theme.palette.background.paper,
  color: isUser || isError ? theme.palette.primary.contrastText : theme.palette.text.primary,
  boxShadow: theme.shadows[1],
  overflow: 'hidden',
  '& pre, & code': {
    backgroundColor: isUser || isError 
      ? 'rgba(0, 0, 0, 0.2)' 
      : theme.palette.mode === 'dark' 
        ? 'rgba(0, 0, 0, 0.3)' 
        : 'rgba(0, 0, 0, 0.05)',
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(1),
    overflowX: 'auto',
  },
  '& pre': {
    margin: 0,
    padding: theme.spacing(1.5),
  },
  '& code': {
    fontFamily: 'monospace',
    fontSize: '0.9em',
  },
  '& p': {
    margin: 0,
    lineHeight: 1.6,
  },
  '& p + p': {
    marginTop: theme.spacing(1),
  },
  '& a': {
    color: isUser || isError 
      ? theme.palette.primary.light 
      : theme.palette.primary.main,
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  '& ul, & ol': {
    margin: 0,
    paddingLeft: theme.spacing(4),
  },
  '& li': {
    marginBottom: theme.spacing(0.5),
  },
  '& blockquote': {
    borderLeft: `4px solid ${theme.palette.divider}`,
    margin: theme.spacing(1, 0),
    paddingLeft: theme.spacing(2),
    color: theme.palette.text.secondary,
    fontStyle: 'italic',
  },
}));

const SenderAvatar = styled(Avatar)(({ theme }) => ({
  width: 32,
  height: 32,
  marginRight: theme.spacing(1.5),
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
}));

const MessageTime = styled(Typography)(({ theme }) => ({
  fontSize: '0.7rem',
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(0.5),
  textAlign: 'right',
}));

const MessageContent = ({ content, isUser, isError }) => {
  const theme = useTheme();
  
  // Simple markdown parsing for basic formatting
  const renderContent = (text) => {
    if (!text) return null;
    
    // Split by code blocks first
    const parts = [];
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)\n```/g;
    let lastIndex = 0;
    let match;
    
    while ((match = codeBlockRegex.exec(text)) !== null) {
      // Add text before the code block
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index)
        });
      }
      
      // Add the code block
      const [_, language, code] = match;
      parts.push({
        type: 'code',
        language: language || 'plaintext',
        content: code.trim()
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex)
      });
    }
    
    return parts.map((part, index) => {
      if (part.type === 'code') {
        return (
          <Box key={index} my={1}>
            <CodeBlock 
              language={part.language} 
              value={part.content} 
              showLineNumbers={part.content.split('\n').length > 2}
              style={{
                borderRadius: theme.shape.borderRadius,
                backgroundColor: isUser || isError 
                  ? 'rgba(0, 0, 0, 0.2)' 
                  : theme.palette.mode === 'dark' 
                    ? 'rgba(0, 0, 0, 0.3)' 
                    : 'rgba(0, 0, 0, 0.05)',
              }}
            />
          </Box>
        );
      }
      
      // Simple markdown for bold, italic, and links
      const html = part.content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
      
      return (
        <Box 
          key={index} 
          dangerouslySetInnerHTML={{ __html: html.replace(/\n/g, '<br />') }}
          sx={{
            '& code': {
              fontFamily: 'monospace',
              backgroundColor: isUser || isError 
                ? 'rgba(0, 0, 0, 0.2)' 
                : theme.palette.mode === 'dark' 
                  ? 'rgba(0, 0, 0, 0.3)' 
                  : 'rgba(0, 0, 0, 0.05)',
              padding: '0.2em 0.4em',
              borderRadius: '3px',
              fontSize: '0.9em',
            },
            '& pre': {
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            },
            '& a': {
              color: isUser || isError 
                ? theme.palette.primary.light 
                : theme.palette.primary.main,
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline',
              },
            },
          }}
        />
      );
    });
  };

  return <>{renderContent(content)}</>;
};

const Message = React.memo(({ message }) => {
  const theme = useTheme();
  const isUser = message.sender === 'user';
  const isSystem = message.sender === 'system';
  const isError = message.isError || false;
  const isStreaming = message.isStreaming || false;
  
  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isSystem) {
    return (
      <Box display="flex" justifyContent="center" my={1}>
        <Typography 
          variant="caption" 
          color="textSecondary"
          sx={{
            backgroundColor: theme.palette.action.hover,
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
          }}
        >
          {message.content}
        </Typography>
      </Box>
    );
  }

  return (
    <MessageContainer isUser={isUser} isStreaming={isStreaming}>
      {!isUser && (
        <SenderAvatar>
          {message.sender === 'assistant' ? 'AI' : message.sender.charAt(0).toUpperCase()}
        </SenderAvatar>
      )}
      <Box display="flex" flexDirection="column" alignItems={isUser ? 'flex-end' : 'flex-start'}>
        <MessageBubble 
          elevation={1} 
          isUser={isUser}
          isError={isError}
        >
          <MessageContent 
            content={message.content} 
            isUser={isUser}
            isError={isError}
          />
          <MessageTime>{formatTime(message.timestamp)}</MessageTime>
        </MessageBubble>
      </Box>
      {isUser && (
        <SenderAvatar sx={{ ml: 1.5, mr: 0 }}>
          You
        </SenderAvatar>
      )}
    </MessageContainer>
  );
});

Message.displayName = 'Message';

const MessageList = ({ messages = [], loading = false }) => {
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Handle loading state
  if (loading) {
    return (
      <Box 
        ref={containerRef}
        flex={1} 
        p={2} 
        overflow="auto"
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
      >
        <Typography color="textSecondary">Loading messages...</Typography>
      </Box>
    );
  }
  
  // Handle empty state
  if (messages.length === 0) {
    return (
      <Box 
        ref={containerRef}
        flex={1} 
        p={2} 
        overflow="auto"
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        textAlign="center"
      >
        <Typography variant="h6" color="textSecondary" gutterBottom>
          Start a conversation
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Select an agent and send a message to get started.
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box 
      ref={containerRef}
      flex={1} 
      p={2} 
      overflow="auto"
      display="flex"
      flexDirection="column"
    >
      {messages.map((message, index) => (
        <Message 
          key={message.id || index} 
          message={message} 
        />
      ))}
      <div ref={messagesEndRef} />
    </Box>
  );
};

export default React.memo(MessageList);
