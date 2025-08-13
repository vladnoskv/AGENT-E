import React from 'react';
import { render, Box, Text, Newline } from 'ink';
import chalk from 'chalk';

// ASCII Art Header for AGENT-X - Agent Everything
const AGENTE_ASCII = `
    ╔═════════════════════════════════════════════════════════════════════╗
    ║                                                                     ║
    ║   █████╗   ██████╗  ███████╗ ███╗   ██╗ ████████╗       ███████╗    ║
    ║  ██╔══██╗ ██╔═════╗ ██╔════╝ ████╗  ██║ ╚══██╔══╝       ██╔════╝    ║
    ║  ███████║ ██║ ████║ █████╗   ██╔██╗ ██║    ██║   ████   █████╗      ║
    ║  ██╔══██║ ██║   ██║ ██╔══╝   ██║╚██╗██║    ██║          ██╔══╝      ║
    ║  ██║  ██║ ╚██████╔╝ ███████╗ ██║ ╚████║    ██║          ███████╗    ║
    ║  ╚═╝  ╚═╝  ╚═════╝  ╚══════╝ ╚═╝  ╚═══╝    ╚═╝          ╚══════╝    ║
    ║                                                                     ║
    ╚═════════════════════════════════════════════════════════════════════╝
`;

// Version and system info
const SYSTEM_INFO = {
    version: '0.0.1',
    build: 'alpha',
    poweredBy: 'NVIDIA GPT-OSS-20B',
    environment: 'CLI Tool'
};

// Header Component
const Header = ({ showSystemInfo = true }) => {
    return (
        <Box flexDirection="column" alignItems="center" marginBottom={1}>
            <Text color="#00ff88">
                {AGENTE_ASCII}
            </Text>
            
            {showSystemInfo && (
                <Box flexDirection="column" alignItems="center" marginTop={1}>
                    <Text color="#ffaa00" bold>
                        🚀 AGENT-X v{SYSTEM_INFO.version} ({SYSTEM_INFO.build})
                    </Text>
                    <Text color="#888888">
                        Powered by {SYSTEM_INFO.poweredBy}
                    </Text>
                    <Text color="#666666">
                        {SYSTEM_INFO.environment}
                    </Text>
                </Box>
            )}
            
            <Newline />
            <Text color="#444444">
                ════════════════════════════════════════════════════════════════
            </Text>
            <Newline />
        </Box>
    );
};

// Simple header for non-Ink environments
const SimpleHeader = () => {
    console.log('\x1b[38;5;46m' + AGENTE_ASCII + '\x1b[0m');
    console.log('\x1b[38;5;208m\x1b[1m🚀 AGENT-X v' + SYSTEM_INFO.version + ' (' + SYSTEM_INFO.build + ')\x1b[0m');
    console.log('\x1b[38;5;244mPowered by ' + SYSTEM_INFO.poweredBy + '\x1b[0m');
    console.log('\x1b[38;5;238m════════════════════════════════════════════════════════════════\x1b[0m');
};

// Export both for different use cases
export { Header, SimpleHeader };

// Default export for direct usage
export default Header;