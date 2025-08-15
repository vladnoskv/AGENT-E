import React from 'react';
import { Box, Typography, Grid, Paper, Button, Card, CardContent, CardActions, Divider, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { 
  Code as CodeIcon, 
  SmartToy as AgentIcon, 
  ModelTraining as ModelIcon, 
  Workflow as WorkflowIcon,
  PlayArrow as StartIcon,
  Add as AddIcon
} from '@mui/icons-material';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.2s, box-shadow 0.2s',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  },
}));

const FeatureCard = ({ icon, title, description, actionText, onClick }) => {
  return (
    <StyledCard>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {React.cloneElement(icon, { fontSize: 'large', color: 'primary' })}
          <Typography variant="h6" component="h3" sx={{ ml: 1.5 }}>
            {title}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button size="small" onClick={onClick} startIcon={<StartIcon />}>
          {actionText}
        </Button>
      </CardActions>
    </StyledCard>
  );
};\n
const QuickActionButton = ({ icon, label, onClick, color = 'primary' }) => {
  return (
    <Button
      variant="outlined"
      startIcon={icon}
      onClick={onClick}
      sx={{
        height: '100px',
        flexDirection: 'column',
        padding: 2,
        textTransform: 'none',
        color: 'text.primary',
        borderColor: 'divider',
        '&:hover': {
          borderColor: 'primary.main',
          backgroundColor: 'action.hover',
        },
      }}
    >
      {icon}
      <Typography variant="body2" sx={{ mt: 1 }}>{label}</Typography>
    </Button>
  );
};

const Dashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const quickActions = [
    {
      icon: <AddIcon fontSize="large" color="primary" />,
      label: 'New Chat',
      onClick: () => navigate('/chat')
    },
    {
      icon: <AgentIcon fontSize="large" color="secondary" />,
      label: 'Create Agent',
      onClick: () => navigate('/agents/new')
    },
    {
      icon: <ModelIcon fontSize="large" color="success" />,
      label: 'Add Model',
      onClick: () => navigate('/models')
    },
    {
      icon: <WorkflowIcon fontSize="large" color="warning" />,
      label: 'New Workflow',
      onClick: () => navigate('/workflows/new')
    }
  ];

  const features = [
    {
      icon: <CodeIcon />,
      title: 'Code Generation',
      description: 'Generate code snippets, functions, or entire applications with natural language prompts.',
      actionText: 'Try Code Generation',
      path: '/chat?mode=code'
    },
    {
      icon: <AgentIcon />,
      title: 'Agent System',
      description: 'Create and manage autonomous agents that can perform complex tasks and workflows.',
      actionText: 'Explore Agents',
      path: '/agents'
    },
    {
      icon: <ModelIcon />,
      title: 'Model Management',
      description: 'Configure and manage different AI models and their parameters for optimal performance.',
      actionText: 'View Models',
      path: '/models'
    },
    {
      icon: <WorkflowIcon />,
      title: 'Workflow Automation',
      description: 'Design and execute complex workflows combining multiple agents and tools.',
      actionText: 'Create Workflow',
      path: '/workflows'
    }
  ];

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome to AgentX
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Your AI-powered development assistant. Get started with one of the quick actions below.
        </Typography>
      </Box>

      {/* Quick Actions */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Quick Actions
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={2}>
          {quickActions.map((action, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <QuickActionButton
                icon={action.icon}
                label={action.label}
                onClick={action.onClick}
              />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Features */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Key Features
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={6} key={index}>
              <FeatureCard
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                actionText={feature.actionText}
                onClick={() => navigate(feature.path)}
              />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Recent Activity */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Recent Activity
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Paper sx={{ p: 3, minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography color="text.secondary">
            Your recent activities will appear here
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
};

export default Dashboard;
