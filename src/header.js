import React from 'react';
import { Box, Text, Newline } from 'ink';

export const Header = () => (
  <Box flexDirection="column">
    <Text color="#00ff88">
      {String.raw` █████╗   ██████╗ ███████╗███╗   ██╗████████╗██╗  ██╗`}
    </Text>
    <Text color="#00ff88">
      {String.raw`██╔══██╗ ██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝██║  ██║`}
    </Text>
    <Text color="#00ff88">
      {String.raw`███████║ ██║  ███╗█████╗  ██╔██╗ ██║   ██║   ███████║`}
    </Text>
    <Text color="#00ff88">
      {String.raw`██╔══██║ ██║   ██║██╔══╝  ██║╚██╗██║   ██║   ██╔══██║`}
    </Text>
    <Text color="#00ff88">
      {String.raw`██║  ██║ ╚██████╔╝███████╗██║ ╚████║   ██║   ██║  ██║`}
    </Text>
    <Text color="#ffaa00">🚀 AGENT-E v0.0.1 (alpha)</Text>
    <Text color="#888888">Powered by NVIDIA GPT-OSS-20B</Text>
    <Text color="#444444">──────────────────────────────────────────────────────────────</Text>
    <Newline />
  </Box>
);
