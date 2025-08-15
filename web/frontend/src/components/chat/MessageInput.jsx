import React, { forwardRef, useState, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import { 
  TextField, 
  IconButton, 
  Box, 
  InputAdornment,
  Tooltip,
  CircularProgress
} from '@mui/material';
import { 
  Send as SendIcon, 
  AttachFile as AttachFileIcon, 
  Code as CodeIcon,
  Mic as MicIcon,
  Image as ImageIcon,
  SmartToy as AgentIcon,
  History as HistoryIcon
} from '@mui/icons-material';

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: theme.shape.borderRadius * 2,
    backgroundColor: theme.palette.background.paper,
    transition: theme.transitions.create(['box-shadow', 'border-color']),
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
    '&.Mui-focused': {
      boxShadow: `0 0 0 2px ${theme.palette.primary.main}33`,
    },
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: theme.palette.divider,
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: theme.palette.text.secondary,
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: theme.palette.primary.main,
      borderWidth: '1px',
    },
  },
  '& .MuiInputBase-input': {
    padding: theme.spacing(1.5, 2),
    fontSize: '0.9375rem',
    lineHeight: 1.5,
    '&::placeholder': {
      color: theme.palette.text.secondary,
      opacity: 1,
    },
  },
  '& .MuiInputBase-multiline': {
    padding: 0,
  },
}));

const ActionButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.text.secondary,
  '&:hover': {
    color: theme.palette.primary.main,
    backgroundColor: theme.palette.action.hover,
  },
  '&.Mui-disabled': {
    color: theme.palette.action.disabled,
  },
}));

const MessageInput = forwardRef(({
  value = '',
  onChange,
  onKeyDown,
  onSend,
  placeholder = 'Type a message...',
  disabled = false,
  isTyping = false,
  maxRows = 6,
  minRows = 1,
  startAdornment,
  endAdornment,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = React.useRef(null);

  const handleFocus = (e) => {
    setIsFocused(true);
    if (props.onFocus) props.onFocus(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    if (props.onBlur) props.onBlur(e);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (onSend && value.trim()) {
        onSend();
      }
    }
    if (onKeyDown) onKeyDown(e);
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const newAttachments = files.map(file => ({
        id: URL.createObjectURL(file),
        name: file.name,
        type: file.type,
        size: file.size,
        file,
      }));
      setAttachments(prev => [...prev, ...newAttachments]);
    }
  };

  const removeAttachment = (id) => {
    setAttachments(prev => prev.filter(attachment => attachment.id !== id));
  };

  const toggleRecording = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      // Here you would handle the recorded audio
    } else {
      // Start recording
      setIsRecording(true);
      // Here you would initialize the audio recording
    }
  };

  const handleAttachClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        style={{ display: 'none' }}
        multiple
      />
      
      {/* Attachments preview */}
      {attachments.length > 0 && (
        <Box 
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            mb: 1,
            maxHeight: 120,
            overflowY: 'auto',
            p: 1,
            bgcolor: 'background.paper',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          {attachments.map((attachment) => (
            <Box
              key={attachment.id}
              sx={{
                position: 'relative',
                width: 80,
                height: 80,
                borderRadius: 1,
                overflow: 'hidden',
                bgcolor: 'action.hover',
                '&:hover .attachment-actions': {
                  opacity: 1,
                },
              }}
            >
              {attachment.type.startsWith('image/') ? (
                <img
                  src={attachment.id}
                  alt={attachment.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    p: 1,
                    overflow: 'hidden',
                  }}
                >
                  <Typography 
                    variant="caption" 
                    noWrap 
                    sx={{ 
                      width: '100%', 
                      textAlign: 'center',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {attachment.name}
                  </Typography>
                </Box>
              )}
              <Box
                className="attachment-actions"
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  bgcolor: 'rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                }}
              >
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAttachment(attachment.id);
                  }}
                  sx={{ color: 'common.white' }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          ))}
        </Box>
      )}
      
      <StyledTextField
        inputRef={ref}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyPress}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        fullWidth
        multiline
        maxRows={maxRows}
        minRows={minRows}
        variant="outlined"
        InputProps={{
          startAdornment: startAdornment || (
            <InputAdornment position="start" sx={{ ml: 1 }}>
              <Tooltip title="Attach file">
                <span>
                  <ActionButton 
                    size="small" 
                    onClick={handleAttachClick}
                    disabled={disabled}
                  >
                    <AttachFileIcon fontSize="small" />
                  </ActionButton>
                </span>
              </Tooltip>
              <Tooltip title="Code block">
                <span>
                  <ActionButton size="small" disabled={disabled}>
                    <CodeIcon fontSize="small" />
                  </ActionButton>
                </span>
              </Tooltip>
            </InputAdornment>
          ),
          endAdornment: endAdornment || (
            <InputAdornment position="end" sx={{ mr: 1 }}>
              <Tooltip title="Record voice message">
                <span>
                  <ActionButton 
                    size="small" 
                    onClick={toggleRecording}
                    disabled={disabled}
                    color={isRecording ? 'error' : 'default'}
                  >
                    <MicIcon 
                      fontSize="small" 
                      color={isRecording ? 'error' : 'inherit'} 
                    />
                  </ActionButton>
                </span>
              </Tooltip>
              <Tooltip title="Send message">
                <span>
                  <ActionButton
                    color="primary"
                    disabled={disabled || !value.trim()}
                    onClick={onSend}
                    sx={{
                      color: 'primary.main',
                      '&:hover': {
                        backgroundColor: 'primary.light',
                        color: 'primary.contrastText',
                      },
                    }}
                  >
                    {isTyping ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <SendIcon fontSize="small" />
                    )}
                  </ActionButton>
                </span>
              </Tooltip>
            </InputAdornment>
          ),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            pr: 0.5,
            pl: 0.5,
            ...(isFocused && {
              boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.main}33`,
            }),
          },
        }}
        {...props}
      />
    </Box>
  );
});

MessageInput.displayName = 'MessageInput';

export default MessageInput;
