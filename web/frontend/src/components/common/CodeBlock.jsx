import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  IconButton, 
  Tooltip, 
  Typography, 
  useTheme,
  Paper,
  Fade
} from '@mui/material';
import { 
  ContentCopy as CopyIcon, 
  Check as CheckIcon,
  Code as CodeIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { styled } from '@mui/material/styles';

// Custom syntax highlighting theme overrides
const customDarkTheme = {
  ...oneDark,
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    margin: 0,
    padding: '1em',
    borderRadius: '4px',
    fontSize: '0.9em',
    lineHeight: 1.5,
    overflow: 'auto',
    maxHeight: '500px',
  },
  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    fontFamily: '"Fira Code", "Fira Mono", "Roboto Mono", monospace',
  },
};

const customLightTheme = {
  ...oneLight,
  'pre[class*="language-"]': {
    ...oneLight['pre[class*="language-"]'],
    margin: 0,
    padding: '1em',
    borderRadius: '4px',
    fontSize: '0.9em',
    lineHeight: 1.5,
    overflow: 'auto',
    maxHeight: '500px',
  },
  'code[class*="language-"]': {
    ...oneLight['code[class*="language-"]'],
    fontFamily: '"Fira Code", "Fira Mono", "Roboto Mono", monospace',
  },
};

const CodeContainer = styled(Paper)(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
  margin: theme.spacing(1, 0),
  boxShadow: theme.shadows[1],
  '&:hover $codeActions': {
    opacity: 1,
  },
}));

const CodeHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(0.5, 1),
  backgroundColor: theme.palette.mode === 'dark' 
    ? 'rgba(255, 255, 255, 0.05)' 
    : 'rgba(0, 0, 0, 0.02)',
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const LanguageTag = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  padding: theme.spacing(0.25, 1),
  borderRadius: 4,
  backgroundColor: theme.palette.action.selected,
  color: theme.palette.text.secondary,
  fontSize: '0.7rem',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}));

const CodeActions = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  opacity: 0,
  transition: 'opacity 0.2s ease',
  '&:hover': {
    opacity: 1,
  },
}));

const CodeBlock = ({
  language = 'javascript',
  value = '',
  showLineNumbers = true,
  wrapLines = false,
  maxHeight = '500px',
  style = {},
  showHeader = true,
  showCopyButton = true,
  showExpandButton = true,
  showLanguage = true,
  ...props
}) => {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const codeRef = useRef(null);
  const preRef = useRef(null);
  const syntaxTheme = theme.palette.mode === 'dark' ? customDarkTheme : customLightTheme;
  
  // Check if content overflows
  useEffect(() => {
    if (preRef.current) {
      const { scrollHeight, clientHeight } = preRef.current;
      setIsOverflowing(scrollHeight > clientHeight);
    }
  }, [value, maxHeight]);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  const handleOpenInNewTab = () => {
    const blob = new Blob([value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    URL.revokeObjectURL(url);
  };

  // Format language for display
  const formatLanguage = (lang) => {
    const langMap = {
      'js': 'JavaScript',
      'jsx': 'JSX',
      'ts': 'TypeScript',
      'tsx': 'TSX',
      'py': 'Python',
      'rb': 'Ruby',
      'java': 'Java',
      'c': 'C',
      'cpp': 'C++',
      'cs': 'C#',
      'go': 'Go',
      'php': 'PHP',
      'swift': 'Swift',
      'kt': 'Kotlin',
      'scala': 'Scala',
      'rs': 'Rust',
      'sh': 'Shell',
      'bash': 'Bash',
      'json': 'JSON',
      'yaml': 'YAML',
      'yml': 'YAML',
      'xml': 'XML',
      'html': 'HTML',
      'css': 'CSS',
      'scss': 'SCSS',
      'sass': 'Sass',
      'sql': 'SQL',
      'graphql': 'GraphQL',
      'md': 'Markdown',
      'diff': 'Diff',
      'dockerfile': 'Dockerfile',
      'git': 'Git',
    };
    return langMap[lang.toLowerCase()] || lang;
  };

  // Get language for syntax highlighting
  const getSyntaxLanguage = (lang) => {
    // Handle common language aliases
    const langMap = {
      'py': 'python',
      'js': 'javascript',
      'ts': 'typescript',
      'rb': 'ruby',
      'csharp': 'csharp',
      'c#': 'csharp',
      'c++': 'cpp',
      'sh': 'bash',
      'shell': 'bash',
      'yml': 'yaml',
      'docker': 'dockerfile',
      'gitignore': 'git',
    };
    return langMap[lang.toLowerCase()] || lang.toLowerCase();
  };

  const syntaxLang = getSyntaxLanguage(language);
  const displayLang = formatLanguage(language);
  const canExpand = isOverflowing || expanded;
  const showExpand = showExpandButton && canExpand;

  return (
    <CodeContainer 
      elevation={0}
      sx={{
        ...style,
        '&:hover $codeActions': {
          opacity: 1,
        },
      }}
    >
      {showHeader && (
        <CodeHeader>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CodeIcon fontSize="small" color="action" />
            {showLanguage && (
              <LanguageTag>
                {displayLang}
              </LanguageTag>
            )}
          </Box>
          <CodeActions className="code-actions">
            {showCopyButton && (
              <Tooltip 
                title={copied ? 'Copied!' : 'Copy to clipboard'} 
                placement="top"
                arrow
                TransitionComponent={Fade}
                TransitionProps={{ timeout: 200 }}
              >
                <IconButton 
                  size="small" 
                  onClick={handleCopy}
                  sx={{
                    '&:hover': {
                      color: 'primary.main',
                    },
                  }}
                >
                  {copied ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Open in new tab" placement="top" arrow>
              <IconButton 
                size="small" 
                onClick={handleOpenInNewTab}
                sx={{
                  '&:hover': {
                    color: 'primary.main',
                  },
                }}
              >
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {showExpand && (
              <Tooltip 
                title={expanded ? 'Collapse' : 'Expand'} 
                placement="top" 
                arrow
              >
                <IconButton 
                  size="small" 
                  onClick={toggleExpand}
                  sx={{
                    '&:hover': {
                      color: 'primary.main',
                    },
                  }}
                >
                  {expanded ? (
                    <ExpandLessIcon fontSize="small" />
                  ) : (
                    <ExpandMoreIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            )}
          </CodeActions>
        </CodeHeader>
      )}
      <Box 
        ref={codeRef}
        sx={{
          position: 'relative',
          maxHeight: expanded ? 'none' : maxHeight,
          overflow: 'auto',
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme.palette.action.hover,
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: theme.palette.action.selected,
            },
          },
        }}
      >
        <Box 
          ref={preRef}
          component={SyntaxHighlighter}
          language={syntaxLang}
          style={syntaxTheme}
          showLineNumbers={showLineNumbers}
          wrapLines={wrapLines}
          customStyle={{
            margin: 0,
            padding: showHeader ? '0.5em 1em' : '1em',
            fontSize: '0.9em',
            backgroundColor: 'transparent',
            maxHeight: expanded ? 'none' : maxHeight,
            overflow: 'visible',
          }}
          lineNumberStyle={{
            minWidth: '2.25em',
            color: theme.palette.text.disabled,
            userSelect: 'none',
          }}
          {...props}
        >
          {value}
        </Box>
      </Box>
      {!expanded && isOverflowing && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '40px',
            background: `linear-gradient(to bottom, transparent, ${theme.palette.background.paper}CC)`,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            pb: 0.5,
          }}
        >
          <Tooltip title="Show more" placement="top" arrow>
            <IconButton
              size="small"
              onClick={toggleExpand}
              sx={{
                backgroundColor: theme.palette.background.paper,
                '&:hover': {
                  backgroundColor: theme.palette.background.paper,
                },
              }}
            >
              <ExpandMoreIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </CodeContainer>
  );
};

export default CodeBlock;
