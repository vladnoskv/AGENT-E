import React from 'react';
import Editor from '@monaco-editor/react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const CodeEditor = ({
  value = '',
  onChange = () => {},
  language = 'javascript',
  readOnly = false,
  height = '300px',
  width = '100%',
  options = {},
  ...props
}) => {
  const theme = useTheme();
  
  const defaultOptions = {
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 14,
    wordWrap: 'on',
    automaticLayout: true,
    ...options
  };

  const editorTheme = theme.palette.mode === 'dark' ? 'vs-dark' : 'light';

  return (
    <Box 
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1,
        overflow: 'hidden',
        '&:hover': {
          boxShadow: theme.shadows[1],
        },
      }}
    >
      <Box 
        sx={{
          bgcolor: theme.palette.mode === 'dark' ? '#1E1E1E' : '#F3F3F3',
          py: 0.5,
          px: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          {language.toUpperCase()}
        </Typography>
      </Box>
      <Box sx={{ height, width }}>
        <Editor
          height={height}
          width={width}
          language={language}
          theme={editorTheme}
          value={value}
          onChange={onChange}
          options={{
            ...defaultOptions,
            readOnly,
          }}
          loading={
            <Box 
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
                bgcolor: 'background.paper',
              }}
            >
              <CircularProgress size={24} />
            </Box>
          }
          {...props}
        />
      </Box>
    </Box>
  );
};

export default CodeEditor;
