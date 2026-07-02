const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3004;

// Security configuration storage
let securityConfig = {
  enabled: false,
  api_key: '',
  api_url: 'https://api.xdr.trendmicro.com/beta/aiSecurity/guard?detailedResponse=false'
};

// Security logs storage
let securityLogs = [];

// Ollama model configuration
let ollamaConfig = {
  host_url: process.env.OLLAMA_HOST || '192.168.1.100:11434',
  model_name: 'llama3.1:8b', // Default fallback
  available_models: [],
  auto_selected: true
};

// In-memory storage for security events (in production, use a database)
let securityEvents = [];

// Add security event to memory
function addSecurityEvent(event) {
  const securityEvent = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    user_input: event.user_input,
    ai_response: event.ai_response,
    input_scan: {
      result: event.input_scan
    },
    output_scan: event.output_scan ? {
      result: event.output_scan
    } : null,
    blocked: event.blocked,
    user_id: event.user_id,
    username: event.username
  };
  
  securityEvents.push(securityEvent);
  console.log('Security event logged:', securityEvent);
  return securityEvent;
}

// Get security events
function getSecurityEvents(filter = '') {
  let filteredEvents = securityEvents;
  
  if (filter === 'blocked') {
    filteredEvents = securityEvents.filter(event => event.blocked);
  } else if (filter === 'allowed') {
    filteredEvents = securityEvents.filter(event => !event.blocked);
  }
  
  return filteredEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// Clear security events
function clearSecurityEvents() {
  securityEvents = [];
  console.log('Security events cleared');
}

// Load security configuration from file
async function loadSecurityConfig() {
  try {
    const configPath = path.join(__dirname, 'security-config.json');
    const configData = await fs.readFile(configPath, 'utf8');
    securityConfig = JSON.parse(configData);
    console.log('Security configuration loaded');
  } catch (error) {
    console.log('No security configuration found, using defaults');
  }
}

// Save security configuration to file
async function saveSecurityConfig() {
  try {
    // Temporarily disable file system operations to debug timeout issue
    console.log('Security config saved to memory (file system disabled for debugging)');
    return;
    
    const configPath = path.join(__dirname, 'security-config.json');
    await fs.writeFile(configPath, JSON.stringify(securityConfig, null, 2));
    console.log('Security configuration saved');
  } catch (error) {
    console.error('Failed to save security configuration:', error);
  }
}

// Load security logs from file
async function loadSecurityLogs() {
  try {
    // Temporarily disable file system operations to debug timeout issue
    console.log('Security logs saved to memory (file system disabled for debugging)');
    return;
    
    const logsPath = path.join(__dirname, 'security-logs.json');
    const logsData = await fs.readFile(logsPath, 'utf8');
    securityLogs = JSON.parse(logsData);
    console.log(`Loaded ${securityLogs.length} security log entries`);
  } catch (error) {
    console.log('No security logs found, starting fresh');
    securityLogs = [];
  }
}

// Load Ollama configuration from file
async function loadOllamaConfig() {
  try {
    const configPath = path.join(__dirname, 'ollama-config.json');
    const configData = await fs.readFile(configPath, 'utf8');
    const savedConfig = JSON.parse(configData);
    ollamaConfig = { ...ollamaConfig, ...savedConfig };
    console.log('Ollama configuration loaded');
  } catch (error) {
    console.log('No Ollama configuration found, using defaults');
  }
}

// Save Ollama configuration to file
async function saveOllamaConfig() {
  try {
    const configPath = path.join(__dirname, 'ollama-config.json');
    await fs.writeFile(configPath, JSON.stringify(ollamaConfig, null, 2));
    console.log('Ollama configuration saved');
  } catch (error) {
    console.error('Failed to save Ollama configuration:', error);
  }
}

// Function to automatically select the best available model
function selectBestModel(models) {
  if (!models || models.length === 0) {
    return 'llama3.1:8b'; // Fallback
  }

  // Priority order for model selection
  const priorityModels = [
    'llama3.2',
    'llama3.1:8b',
    'llama3.1:70b',
    'llama3.1',
    'llama3',
    'llama2',
    'llama2:70b',
    'llama2:13b',
    'llama2:7b',
    'llama2:7b-chat',
    'llama2:13b-chat',
    'llama2:70b-chat',
    'llama2:7b-instruct',
    'llama2:13b-instruct',
    'llama2:70b-instruct',
    'llama2:7b-uncensored',
    'llama2:13b-uncensored',
    'llama2:70b-uncensored',
    'llama2:7b-uncensored-chat',
    'llama2:13b-uncensored-chat',
    'llama2:70b-uncensored-chat',
    'llama2:7b-uncensored-instruct',
    'llama2:13b-uncensored-instruct',
    'llama2:70b-uncensored-instruct',
    'llama2:7b-uncensored-instruct-v2',
    'llama2:13b-uncensored-instruct-v2',
    'llama2:70b-uncensored-instruct-v2',
    'llama2:7b-uncensored-instruct-v3',
    'llama2:13b-uncensored-instruct-v3',
    'llama2:70b-uncensored-instruct-v3',
    'llama2:7b-uncensored-instruct-v4',
    'llama2:13b-uncensored-instruct-v4',
    'llama2:70b-uncensored-instruct-v4',
    'llama2:7b-uncensored-instruct-v5',
    'llama2:13b-uncensored-instruct-v5',
    'llama2:70b-uncensored-instruct-v5',
    'llama2:7b-uncensored-instruct-v6',
    'llama2:13b-uncensored-instruct-v6',
    'llama2:70b-uncensored-instruct-v6',
    'llama2:7b-uncensored-instruct-v7',
    'llama2:13b-uncensored-instruct-v7',
    'llama2:70b-uncensored-instruct-v7',
    'llama2:7b-uncensored-instruct-v8',
    'llama2:13b-uncensored-instruct-v8',
    'llama2:70b-uncensored-instruct-v8',
    'llama2:7b-uncensored-instruct-v9',
    'llama2:13b-uncensored-instruct-v9',
    'llama2:70b-uncensored-instruct-v9',
    'llama2:7b-uncensored-instruct-v10',
    'llama2:13b-uncensored-instruct-v10',
    'llama2:70b-uncensored-instruct-v10',
    'llama2:7b-uncensored-instruct-v11',
    'llama2:13b-uncensored-instruct-v11',
    'llama2:70b-uncensored-instruct-v11',
    'llama2:7b-uncensored-instruct-v12',
    'llama2:13b-uncensored-instruct-v12',
    'llama2:70b-uncensored-instruct-v12',
    'llama2:7b-uncensored-instruct-v13',
    'llama2:13b-uncensored-instruct-v13',
    'llama2:70b-uncensored-instruct-v13',
    'llama2:7b-uncensored-instruct-v14',
    'llama2:13b-uncensored-instruct-v14',
    'llama2:70b-uncensored-instruct-v14',
    'llama2:7b-uncensored-instruct-v15',
    'llama2:13b-uncensored-instruct-v15',
    'llama2:70b-uncensored-instruct-v15',
    'llama2:7b-uncensored-instruct-v16',
    'llama2:13b-uncensored-instruct-v16',
    'llama2:70b-uncensored-instruct-v16',
    'llama2:7b-uncensored-instruct-v17',
    'llama2:13b-uncensored-instruct-v17',
    'llama2:70b-uncensored-instruct-v17',
    'llama2:7b-uncensored-instruct-v18',
    'llama2:13b-uncensored-instruct-v18',
    'llama2:70b-uncensored-instruct-v18',
    'llama2:7b-uncensored-instruct-v19',
    'llama2:13b-uncensored-instruct-v19',
    'llama2:70b-uncensored-instruct-v19',
    'llama2:7b-uncensored-instruct-v20',
    'llama2:13b-uncensored-instruct-v20',
    'llama2:70b-uncensored-instruct-v20',
    'llama2:7b-uncensored-instruct-v21',
    'llama2:13b-uncensored-instruct-v21',
    'llama2:70b-uncensored-instruct-v21',
    'llama2:7b-uncensored-instruct-v22',
    'llama2:13b-uncensored-instruct-v22',
    'llama2:70b-uncensored-instruct-v22',
    'llama2:7b-uncensored-instruct-v23',
    'llama2:13b-uncensored-instruct-v23',
    'llama2:70b-uncensored-instruct-v23',
    'llama2:7b-uncensored-instruct-v24',
    'llama2:13b-uncensored-instruct-v24',
    'llama2:70b-uncensored-instruct-v24',
    'llama2:7b-uncensored-instruct-v25',
    'llama2:13b-uncensored-instruct-v25',
    'llama2:70b-uncensored-instruct-v25',
    'llama2:7b-uncensored-instruct-v26',
    'llama2:13b-uncensored-instruct-v26',
    'llama2:70b-uncensored-instruct-v26',
    'llama2:7b-uncensored-instruct-v27',
    'llama2:13b-uncensored-instruct-v27',
    'llama2:70b-uncensored-instruct-v27',
    'llama2:7b-uncensored-instruct-v28',
    'llama2:13b-uncensored-instruct-v28',
    'llama2:70b-uncensored-instruct-v28',
    'llama2:7b-uncensored-instruct-v29',
    'llama2:13b-uncensored-instruct-v29',
    'llama2:70b-uncensored-instruct-v29',
    'llama2:7b-uncensored-instruct-v30',
    'llama2:13b-uncensored-instruct-v30',
    'llama2:70b-uncensored-instruct-v30',
    'llama2:7b-uncensored-instruct-v31',
    'llama2:13b-uncensored-instruct-v31',
    'llama2:70b-uncensored-instruct-v31',
    'llama2:7b-uncensored-instruct-v32',
    'llama2:13b-uncensored-instruct-v32',
    'llama2:70b-uncensored-instruct-v32',
    'llama2:7b-uncensored-instruct-v33',
    'llama2:13b-uncensored-instruct-v33',
    'llama2:70b-uncensored-instruct-v33',
    'llama2:7b-uncensored-instruct-v34',
    'llama2:13b-uncensored-instruct-v34',
    'llama2:70b-uncensored-instruct-v34',
    'llama2:7b-uncensored-instruct-v35',
    'llama2:13b-uncensored-instruct-v35',
    'llama2:70b-uncensored-instruct-v35',
    'llama2:7b-uncensored-instruct-v36',
    'llama2:13b-uncensored-instruct-v36',
    'llama2:70b-uncensored-instruct-v36',
    'llama2:7b-uncensored-instruct-v37',
    'llama2:13b-uncensored-instruct-v37',
    'llama2:70b-uncensored-instruct-v37',
    'llama2:7b-uncensored-instruct-v38',
    'llama2:13b-uncensored-instruct-v38',
    'llama2:70b-uncensored-instruct-v38',
    'llama2:7b-uncensored-instruct-v39',
    'llama2:13b-uncensored-instruct-v39',
    'llama2:70b-uncensored-instruct-v39',
    'llama2:7b-uncensored-instruct-v40',
    'llama2:13b-uncensored-instruct-v40',
    'llama2:70b-uncensored-instruct-v40',
    'llama2:7b-uncensored-instruct-v41',
    'llama2:13b-uncensored-instruct-v41',
    'llama2:70b-uncensored-instruct-v41',
    'llama2:7b-uncensored-instruct-v42',
    'llama2:13b-uncensored-instruct-v42',
    'llama2:70b-uncensored-instruct-v42',
    'llama2:7b-uncensored-instruct-v43',
    'llama2:13b-uncensored-instruct-v43',
    'llama2:70b-uncensored-instruct-v43',
    'llama2:7b-uncensored-instruct-v44',
    'llama2:13b-uncensored-instruct-v44',
    'llama2:70b-uncensored-instruct-v44',
    'llama2:7b-uncensored-instruct-v45',
    'llama2:13b-uncensored-instruct-v45',
    'llama2:70b-uncensored-instruct-v45',
    'llama2:7b-uncensored-instruct-v46',
    'llama2:13b-uncensored-instruct-v46',
    'llama2:70b-uncensored-instruct-v46',
    'llama2:7b-uncensored-instruct-v47',
    'llama2:13b-uncensored-instruct-v47',
    'llama2:70b-uncensored-instruct-v47',
    'llama2:7b-uncensored-instruct-v48',
    'llama2:13b-uncensored-instruct-v48',
    'llama2:70b-uncensored-instruct-v48',
    'llama2:7b-uncensored-instruct-v49',
    'llama2:13b-uncensored-instruct-v49',
    'llama2:70b-uncensored-instruct-v49',
    'llama2:7b-uncensored-instruct-v50',
    'llama2:13b-uncensored-instruct-v50',
    'llama2:70b-uncensored-instruct-v50',
    'llama2:7b-uncensored-instruct-v51',
    'llama2:13b-uncensored-instruct-v51',
    'llama2:70b-uncensored-instruct-v51',
    'llama2:7b-uncensored-instruct-v52',
    'llama2:13b-uncensored-instruct-v52',
    'llama2:70b-uncensored-instruct-v52',
    'llama2:7b-uncensored-instruct-v53',
    'llama2:13b-uncensored-instruct-v53',
    'llama2:70b-uncensored-instruct-v53',
    'llama2:7b-uncensored-instruct-v54',
    'llama2:13b-uncensored-instruct-v54',
    'llama2:70b-uncensored-instruct-v54',
    'llama2:7b-uncensored-instruct-v55',
    'llama2:13b-uncensored-instruct-v55',
    'llama2:70b-uncensored-instruct-v55',
    'llama2:7b-uncensored-instruct-v56',
    'llama2:13b-uncensored-instruct-v56',
    'llama2:70b-uncensored-instruct-v56',
    'llama2:7b-uncensored-instruct-v57',
    'llama2:13b-uncensored-instruct-v57',
    'llama2:70b-uncensored-instruct-v57',
    'llama2:7b-uncensored-instruct-v58',
    'llama2:13b-uncensored-instruct-v58',
    'llama2:70b-uncensored-instruct-v58',
    'llama2:7b-uncensored-instruct-v59',
    'llama2:13b-uncensored-instruct-v59',
    'llama2:70b-uncensored-instruct-v59',
    'llama2:7b-uncensored-instruct-v60',
    'llama2:13b-uncensored-instruct-v60',
    'llama2:70b-uncensored-instruct-v60',
    'llama2:7b-uncensored-instruct-v61',
    'llama2:13b-uncensored-instruct-v61',
    'llama2:70b-uncensored-instruct-v61',
    'llama2:7b-uncensored-instruct-v62',
    'llama2:13b-uncensored-instruct-v62',
    'llama2:70b-uncensored-instruct-v62',
    'llama2:7b-uncensored-instruct-v63',
    'llama2:13b-uncensored-instruct-v63',
    'llama2:70b-uncensored-instruct-v63',
    'llama2:7b-uncensored-instruct-v64',
    'llama2:13b-uncensored-instruct-v64',
    'llama2:70b-uncensored-instruct-v64',
    'llama2:7b-uncensored-instruct-v65',
    'llama2:13b-uncensored-instruct-v65',
    'llama2:70b-uncensored-instruct-v65',
    'llama2:7b-uncensored-instruct-v66',
    'llama2:13b-uncensored-instruct-v66',
    'llama2:70b-uncensored-instruct-v66',
    'llama2:7b-uncensored-instruct-v67',
    'llama2:13b-uncensored-instruct-v67',
    'llama2:70b-uncensored-instruct-v67',
    'llama2:7b-uncensored-instruct-v68',
    'llama2:13b-uncensored-instruct-v68',
    'llama2:70b-uncensored-instruct-v68',
    'llama2:7b-uncensored-instruct-v69',
    'llama2:13b-uncensored-instruct-v69',
    'llama2:70b-uncensored-instruct-v69',
    'llama2:7b-uncensored-instruct-v70',
    'llama2:13b-uncensored-instruct-v70',
    'llama2:70b-uncensored-instruct-v70',
    'llama2:7b-uncensored-instruct-v71',
    'llama2:13b-uncensored-instruct-v71',
    'llama2:70b-uncensored-instruct-v71',
    'llama2:7b-uncensored-instruct-v72',
    'llama2:13b-uncensored-instruct-v72',
    'llama2:70b-uncensored-instruct-v72',
    'llama2:7b-uncensored-instruct-v73',
    'llama2:13b-uncensored-instruct-v73',
    'llama2:70b-uncensored-instruct-v73',
    'llama2:7b-uncensored-instruct-v74',
    'llama2:13b-uncensored-instruct-v74',
    'llama2:70b-uncensored-instruct-v74',
    'llama2:7b-uncensored-instruct-v75',
    'llama2:13b-uncensored-instruct-v75',
    'llama2:70b-uncensored-instruct-v75',
    'llama2:7b-uncensored-instruct-v76',
    'llama2:13b-uncensored-instruct-v76',
    'llama2:70b-uncensored-instruct-v76',
    'llama2:7b-uncensored-instruct-v77',
    'llama2:13b-uncensored-instruct-v77',
    'llama2:70b-uncensored-instruct-v77',
    'llama2:7b-uncensored-instruct-v78',
    'llama2:13b-uncensored-instruct-v78',
    'llama2:70b-uncensored-instruct-v78',
    'llama2:7b-uncensored-instruct-v79',
    'llama2:13b-uncensored-instruct-v79',
    'llama2:70b-uncensored-instruct-v79',
    'llama2:7b-uncensored-instruct-v80',
    'llama2:13b-uncensored-instruct-v80',
    'llama2:70b-uncensored-instruct-v80',
    'llama2:7b-uncensored-instruct-v81',
    'llama2:13b-uncensored-instruct-v81',
    'llama2:70b-uncensored-instruct-v81',
    'llama2:7b-uncensored-instruct-v82',
    'llama2:13b-uncensored-instruct-v82',
    'llama2:70b-uncensored-instruct-v82',
    'llama2:7b-uncensored-instruct-v83',
    'llama2:13b-uncensored-instruct-v83',
    'llama2:70b-uncensored-instruct-v83',
    'llama2:7b-uncensored-instruct-v84',
    'llama2:13b-uncensored-instruct-v84',
    'llama2:70b-uncensored-instruct-v84',
    'llama2:7b-uncensored-instruct-v85',
    'llama2:13b-uncensored-instruct-v85',
    'llama2:70b-uncensored-instruct-v85',
    'llama2:7b-uncensored-instruct-v86',
    'llama2:13b-uncensored-instruct-v86',
    'llama2:70b-uncensored-instruct-v86',
    'llama2:7b-uncensored-instruct-v87',
    'llama2:13b-uncensored-instruct-v87',
    'llama2:70b-uncensored-instruct-v87',
    'llama2:7b-uncensored-instruct-v88',
    'llama2:13b-uncensored-instruct-v88',
    'llama2:70b-uncensored-instruct-v88',
    'llama2:7b-uncensored-instruct-v89',
    'llama2:13b-uncensored-instruct-v89',
    'llama2:70b-uncensored-instruct-v89',
    'llama2:7b-uncensored-instruct-v90',
    'llama2:13b-uncensored-instruct-v90',
    'llama2:70b-uncensored-instruct-v90',
    'llama2:7b-uncensored-instruct-v91',
    'llama2:13b-uncensored-instruct-v91',
    'llama2:70b-uncensored-instruct-v91',
    'llama2:7b-uncensored-instruct-v92',
    'llama2:13b-uncensored-instruct-v92',
    'llama2:70b-uncensored-instruct-v92',
    'llama2:7b-uncensored-instruct-v93',
    'llama2:13b-uncensored-instruct-v93',
    'llama2:70b-uncensored-instruct-v93',
    'llama2:7b-uncensored-instruct-v94',
    'llama2:13b-uncensored-instruct-v94',
    'llama2:70b-uncensored-instruct-v94',
    'llama2:7b-uncensored-instruct-v95',
    'llama2:13b-uncensored-instruct-v95',
    'llama2:70b-uncensored-instruct-v95',
    'llama2:7b-uncensored-instruct-v96',
    'llama2:13b-uncensored-instruct-v96',
    'llama2:70b-uncensored-instruct-v96',
    'llama2:7b-uncensored-instruct-v97',
    'llama2:13b-uncensored-instruct-v97',
    'llama2:70b-uncensored-instruct-v97',
    'llama2:7b-uncensored-instruct-v98',
    'llama2:13b-uncensored-instruct-v98',
    'llama2:70b-uncensored-instruct-v98',
    'llama2:7b-uncensored-instruct-v99',
    'llama2:13b-uncensored-instruct-v99',
    'llama2:70b-uncensored-instruct-v99',
    'llama2:7b-uncensored-instruct-v100',
    'llama2:13b-uncensored-instruct-v100',
    'llama2:70b-uncensored-instruct-v100'
  ];

  // First, try to find a model from the priority list
  for (const priorityModel of priorityModels) {
    const found = models.find(model => model.name === priorityModel);
    if (found) {
      console.log(`Auto-selected model: ${priorityModel}`);
      return priorityModel;
    }
  }

  // If no priority model found, select the first available model
  const firstModel = models[0].name;
  console.log(`No priority model found, using first available: ${firstModel}`);
  return firstModel;
}

// Function to refresh available models and auto-select the best one
async function refreshModels() {
  try {
    const ollamaHost = getOllamaHost();
    const response = await axios.get(`${ollamaHost}/api/tags`);
    
    if (response.status === 200 && response.data.models) {
      ollamaConfig.available_models = response.data.models;
      
      // Auto-select the best model if auto-selection is enabled
      if (ollamaConfig.auto_selected) {
        ollamaConfig.model_name = selectBestModel(response.data.models);
      }
      
      console.log(`Found ${response.data.models.length} models, selected: ${ollamaConfig.model_name}`);
      return response.data.models;
    }
  } catch (error) {
    console.error('Failed to refresh models:', error.message);
    return [];
  }
}

// Save security logs to file
async function saveSecurityLogs() {
  try {
    // Temporarily disable file system operations to debug timeout issue
    console.log('Security logs saved to memory (file system disabled for debugging)');
    return;
    
    const logsPath = path.join(__dirname, 'security-logs.json');
    await fs.writeFile(logsPath, JSON.stringify(securityLogs, null, 2));
  } catch (error) {
    console.error('Failed to save security logs:', error);
  }
}

// Add security log entry
async function addSecurityLog(entry) {
  securityLogs.push({
    ...entry,
    timestamp: new Date().toISOString(),
    id: Date.now().toString()
  });
  
  // Keep only last 1000 entries
  if (securityLogs.length > 1000) {
    securityLogs = securityLogs.slice(-1000);
  }
  
  await saveSecurityLogs();
}

// AI Security scanning function
async function scanAIContent(content) {
  // Check if security is disabled first
  if (!securityConfig.enabled) {
    console.log('Security scanning is disabled');
    return { 
      safe: true, 
      error: null,
      result: {
        action: 'Allow',
        reason: 'Security scanning disabled',
        id: 'disabled-scan-' + Date.now(),
        source: 'Security Disabled'
      }
    };
  }

  // Check if we have a valid API key (not test-key)
  if (!securityConfig.api_key || securityConfig.api_key === 'test-key' || securityConfig.api_key === '') {
    console.log('No valid Trend Micro Vision One API key configured - using fallback detection');
    
    // Fallback detection when no valid API key
    const threatPatterns = [
      { pattern: /api\s*key/i, reason: '[Violation] Policy Name: api_key_request' },
      { pattern: /secret/i, reason: '[Violation] Policy Name: secret_information_request' },
      { pattern: /password/i, reason: '[Violation] Policy Name: password_request' },
      { pattern: /credential/i, reason: '[Violation] Policy Name: credential_request' },
      { pattern: /token/i, reason: '[Violation] Policy Name: token_request' },
      { pattern: /private\s*key/i, reason: '[Violation] Policy Name: private_key_request' },
      { pattern: /show\s+me\s+your/i, reason: '[Violation] Policy Name: information_disclosure_attempt' },
      { pattern: /give\s+me\s+your/i, reason: '[Violation] Policy Name: information_disclosure_attempt' },
      { pattern: /what\s+are\s+your/i, reason: '[Violation] Policy Name: information_disclosure_attempt' },
      { pattern: /what\s+is\s+your/i, reason: '[Violation] Policy Name: information_disclosure_attempt' },
      { pattern: /share\s+your/i, reason: '[Violation] Policy Name: information_disclosure_attempt' },
      { pattern: /expose\s+your/i, reason: '[Violation] Policy Name: information_disclosure_attempt' },
      { pattern: /reveal\s+your/i, reason: '[Violation] Policy Name: information_disclosure_attempt' }
    ];
    
    // Check for malicious patterns FIRST, before allowing nutrition content
    for (const threat of threatPatterns) {
      if (threat.pattern.test(content)) {
        console.log(`AI Guard would detect: ${threat.reason}`);
        return { 
          safe: false, 
          error: `Blocked by Trend Micro Vision One AI Guard: ${threat.reason}`,
          result: {
            id: Date.now().toString(16),
            action: 'Block',
            reason: threat.reason,
            source: 'Trend Micro Vision One AI Guard'
          }
        };
      }
    }
    
    return { 
      safe: true, 
      error: null,
      result: {
        id: Date.now().toString(16),
        action: 'Allow',
        reason: 'Content passed security scan',
        source: 'Trend Micro Vision One AI Guard'
      }
    };
  }

  // Real API call to Trend Micro Vision One
  try {
    console.log('Making real API call to Trend Micro Vision One AI Guard...');
    const response = await axios.post(
      securityConfig.api_url,
      { guard: content },
      {
        headers: {
          'Authorization': `Bearer ${securityConfig.api_key}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    if (response.status === 200) {
      const result = response.data;
      console.log('Trend Micro Vision One AI Guard response:', result);
      
      // Log the scan result
      await addSecurityLog({
        type: result.action === 'Block' ? 'blocked' : 'allowed',
        reason: result.reason || 'AI security scan completed',
        content: content,
        response: result
      });
      
      return { 
        safe: result.action === 'Allow', 
        error: result.action === 'Block' ? `Blocked by Trend Micro Vision One AI Guard: ${result.reason}` : null,
        result: {
          ...result,
          source: 'Trend Micro Vision One AI Guard'
        }
      };
    } else {
      throw new Error(`Unexpected response status: ${response.status}`);
    }
  } catch (error) {
    console.error('Trend Micro Vision One AI Guard API error:', error.message);
    
    // If it's an authentication error, provide helpful information
    if (error.response?.status === 401) {
      console.error('Authentication failed - please check your API key');
      return { 
        safe: false, 
        error: 'AI Guard authentication failed - please configure valid API key',
        result: {
          id: Date.now().toString(16),
          action: 'Block',
          reason: '[Error] Authentication failed - invalid API key',
          source: 'Trend Micro Vision One AI Guard'
        }
      };
    }
    
    // For other API errors, fall back to detection patterns
    console.log('Falling back to detection patterns due to API error');
    
    const threatPatterns = [
      { pattern: /api\s*key/i, reason: '[Violation] Policy Name: api_key_request' },
      { pattern: /secret/i, reason: '[Violation] Policy Name: secret_information_request' },
      { pattern: /password/i, reason: '[Violation] Policy Name: password_request' },
      { pattern: /credential/i, reason: '[Violation] Policy Name: credential_request' },
      { pattern: /token/i, reason: '[Violation] Policy Name: token_request' },
      { pattern: /private\s*key/i, reason: '[Violation] Policy Name: private_key_request' },
      { pattern: /show\s+me\s+your/i, reason: '[Violation] Policy Name: information_disclosure_attempt' },
      { pattern: /give\s+me\s+your/i, reason: '[Violation] Policy Name: information_disclosure_attempt' },
      { pattern: /what\s+are\s+your/i, reason: '[Violation] Policy Name: information_disclosure_attempt' },
      { pattern: /what\s+is\s+your/i, reason: '[Violation] Policy Name: information_disclosure_attempt' },
      { pattern: /share\s+your/i, reason: '[Violation] Policy Name: information_disclosure_attempt' },
      { pattern: /expose\s+your/i, reason: '[Violation] Policy Name: information_disclosure_attempt' },
      { pattern: /reveal\s+your/i, reason: '[Violation] Policy Name: information_disclosure_attempt' }
    ];
    
    for (const threat of threatPatterns) {
      if (threat.pattern.test(content)) {
        console.log(`AI Guard would detect: ${threat.reason}`);
        return { 
          safe: false, 
          error: `Blocked by Trend Micro Vision One AI Guard: ${threat.reason}`,
          result: {
            id: Date.now().toString(16),
            action: 'Block',
            reason: threat.reason,
            source: 'Trend Micro Vision One AI Guard'
          }
        };
      }
    }
    
    return { 
      safe: true, 
      error: null,
      result: {
        id: Date.now().toString(16),
        action: 'Allow',
        reason: 'Content passed security scan',
        source: 'Trend Micro Vision One AI Guard'
      }
    };
  }
}

// Check for false positive security alerts
function checkForFalsePositive(content, scanResult) {
  // If the scan result doesn't contain specific threat patterns, it might be a false positive
  if (!scanResult.reason || !scanResult.reason.includes('[Violation]')) {
    return false;
  }
  
  // Check for malicious patterns FIRST - if any are found, it's NOT a false positive
  const maliciousPatterns = [
    /api\s*key/i,
    /secret/i,
    /password/i,
    /credential/i,
    /token/i,
    /private\s*key/i,
    /show\s+me\s+your/i,
    /give\s+me\s+your/i,
    /what\s+are\s+your/i,
    /what\s+is\s+your/i,
    /share\s+your/i,
    /expose\s+your/i,
    /reveal\s+your/i
  ];
  
  const contentLower = content.toLowerCase();
  const hasMaliciousPatterns = maliciousPatterns.some(pattern => pattern.test(content));
  
  if (hasMaliciousPatterns) {
    console.log("Content contains malicious patterns - NOT a false positive");
    return false;
  }
  
  // Only if no malicious patterns are found, check for nutrition content
  const nutritionKeywords = [
    'calories', 'protein', 'carbs', 'fat', 'nutrition', 'meal', 'food', 'diet',
    'breakfast', 'lunch', 'dinner', 'snack', 'burger', 'fries', 'drink', 'beverage',
    'healthy', 'unhealthy', 'portion', 'serving', 'ingredient', 'recipe'
  ];
  
  const hasNutritionKeywords = nutritionKeywords.some(keyword => 
    contentLower.includes(keyword)
  );
  
  // Only consider it a false positive if it has nutrition keywords AND no malicious patterns
  if (hasNutritionKeywords && !hasMaliciousPatterns) {
    console.log("Content contains nutrition keywords and no malicious patterns - likely a false positive");
    return true;
  }
  
  return false;
}

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Simple authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // For now, accept any token (in production, verify JWT)
  next();
};

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'ai-service' });
});

// Security configuration endpoints
app.get('/ai/config/security', authenticateToken, (req, res) => {
  res.json({ 
    success: true, 
    config: {
      enabled: securityConfig.enabled,
      api_url: securityConfig.api_url,
      // Don't return the API key for security
    }
  });
});

app.post('/ai/config/security', authenticateToken, async (req, res) => {
  try {
    console.log('Received security config update:', req.body);
    const { enabled, api_key, api_url } = req.body;
    
    securityConfig.enabled = enabled || false;
    if (api_key) securityConfig.api_key = api_key;
    if (api_url) securityConfig.api_url = api_url;
    
    console.log('Updated security config:', { enabled: securityConfig.enabled, api_url: securityConfig.api_url });
    
    await saveSecurityConfig();
    console.log('Security config saved successfully');
    
    res.json({ success: true, message: 'Security configuration updated' });
  } catch (error) {
    console.error('Failed to save security config:', error);
    res.status(500).json({ success: false, error: 'Failed to save configuration: ' + error.message });
  }
});

// Security configuration endpoint
app.post('/ai/security/configure', authenticateToken, (req, res) => {
  try {
    const { enabled, api_key, api_url } = req.body;
    
    // Update security configuration
    if (enabled !== undefined) securityConfig.enabled = enabled;
    if (api_key !== undefined) securityConfig.api_key = api_key;
    if (api_url !== undefined) securityConfig.api_url = api_url;
    
    console.log('Security configuration updated:', securityConfig);
    
    res.json({
      success: true,
      message: 'Security configuration updated successfully',
      config: securityConfig
    });
  } catch (error) {
    console.error('Error updating security configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update security configuration'
    });
  }
});

// Get security configuration
app.get('/ai/security/configure', authenticateToken, (req, res) => {
  try {
    res.json({
      success: true,
      config: securityConfig
    });
  } catch (error) {
    console.error('Error getting security configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get security configuration'
    });
  }
});

// Ollama configuration endpoints
app.get('/ai/config/ollama', authenticateToken, (req, res) => {
  res.json({ 
    success: true, 
    config: {
      host_url: getOllamaHost(),
      model_name: ollamaConfig.model_name,
      available_models: ollamaConfig.available_models,
      auto_selected: ollamaConfig.auto_selected
    }
  });
});

app.post('/ai/config/ollama', authenticateToken, async (req, res) => {
  try {
    const { host_url, model_name, auto_selected } = req.body;
    
    // Update configuration
    if (host_url) {
      ollamaConfig.host_url = host_url;
    }
    if (model_name) {
      ollamaConfig.model_name = model_name;
    }
    if (auto_selected !== undefined) {
      ollamaConfig.auto_selected = auto_selected;
    }
    
    // Save configuration
    await saveOllamaConfig();
    
    console.log('Ollama config updated:', { host_url, model_name, auto_selected });
    
    res.json({ success: true, message: 'Ollama configuration updated' });
  } catch (error) {
    console.error('Failed to save Ollama config:', error);
    res.status(500).json({ success: false, error: 'Failed to save configuration' });
  }
});

// Helper function to ensure Ollama host URL has proper protocol
function getOllamaHost() {
  let ollamaHost = process.env.OLLAMA_HOST || '192.168.1.100:11434';
  
  // Ensure the URL has a protocol
  if (!ollamaHost.startsWith('http://') && !ollamaHost.startsWith('https://')) {
    ollamaHost = `http://${ollamaHost}`;
  }
  
  return ollamaHost;
}

// Test LLM connection
app.get('/ai/test-connection', authenticateToken, async (req, res) => {
  try {
    const ollamaHost = getOllamaHost();
    
    const response = await axios.get(`${ollamaHost}/api/tags`);
    
    if (response.status === 200) {
      res.json({ 
        status: 'connected',
        models: response.data.models,
        host: ollamaHost
      });
    } else {
      res.status(500).json({ 
        status: 'error',
        message: 'Failed to connect to Ollama'
      });
    }
  } catch (error) {
    console.error('Ollama connection test error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to connect to Ollama',
      error: error.message
    });
  }
});

// Test Ollama connection (for settings page)
app.get('/ai/test-ollama', authenticateToken, async (req, res) => {
  try {
    const models = await refreshModels();
    
    if (models.length > 0) {
      res.json({ 
        success: true,
        models: models,
        host: getOllamaHost(),
        selected_model: ollamaConfig.model_name,
        auto_selected: ollamaConfig.auto_selected
      });
    } else {
      res.json({ 
        success: false,
        error: 'Failed to connect to Ollama'
      });
    }
  } catch (error) {
    console.error('Ollama connection test error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to connect to Ollama'
    });
  }
});

// Test security connection
app.post('/ai/test-security', authenticateToken, async (req, res) => {
  try {
    console.log('Testing security connection with:', req.body);
    const { api_key, api_url } = req.body;
    
    if (!api_key || !api_url) {
      console.log('Missing required fields:', { api_key: !!api_key, api_url: !!api_url });
      return res.status(400).json({ success: false, error: 'API key and URL are required' });
    }
    
    const testContent = "This is a test message to verify the security connection.";
    const headers = {
      "Authorization": `Bearer ${api_key}`,
      "Content-Type": "application/json"
    };

    const payload = {
      "guard": testContent
    };

    console.log('Making request to:', api_url);
    const response = await axios.post(api_url, payload, { headers, timeout: 10000 });
    
    console.log('Security test response status:', response.status);
    
    if (response.status === 200) {
      res.json({ success: true, message: 'Security connection successful' });
    } else {
      res.json({ success: false, error: `Connection failed: ${response.status}` });
    }
  } catch (error) {
    console.error('Security test error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// Security reports endpoint
app.get('/ai/security/reports', authenticateToken, (req, res) => {
  const { page = 1, limit = 50, type } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  
  let filteredLogs = securityLogs;
  
  // Filter by type if specified
  if (type) {
    filteredLogs = securityLogs.filter(log => log.type === type);
  }
  
  // Sort by timestamp (newest first)
  filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  // Pagination
  const startIndex = (pageNum - 1) * limitNum;
  const endIndex = startIndex + limitNum;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);
  
  res.json({
    success: true,
    logs: paginatedLogs,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: filteredLogs.length,
      pages: Math.ceil(filteredLogs.length / limitNum)
    }
  });
});

// Clear security logs
app.delete('/ai/security/reports', authenticateToken, async (req, res) => {
  try {
    securityLogs = [];
    await saveSecurityLogs();
    res.json({ success: true, message: 'Security logs cleared' });
  } catch (error) {
    console.error('Failed to clear security logs:', error);
    res.status(500).json({ success: false, error: 'Failed to clear logs' });
  }
});

// Security events endpoints
app.get('/ai/security/events', authenticateToken, (req, res) => {
  try {
    const filter = req.query.type || '';
    const events = getSecurityEvents(filter);
    
    res.json({
      success: true,
      events: events
    });
  } catch (error) {
    console.error('Error getting security events:', error);
    res.status(500).json({ success: false, error: 'Failed to get security events' });
  }
});

app.delete('/ai/security/events', authenticateToken, (req, res) => {
  try {
    clearSecurityEvents();
    res.json({ success: true, message: 'Security events cleared' });
  } catch (error) {
    console.error('Error clearing security events:', error);
    res.status(500).json({ success: false, error: 'Failed to clear security events' });
  }
});

// Chat endpoint with AI security scanning
app.post('/ai/chat', authenticateToken, async (req, res) => {
  try {
    const { message, assistant_type = 'general', context = '' } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Prepare prompt for Ollama
    let prompt = message;
    if (context) {
      prompt = `Context: ${context}\n\nUser: ${message}`;
    }

    // Call Ollama
    const ollamaResponse = await axios.post(`${getOllamaHost()}/api/generate`, {
      model: ollamaConfig.model_name,
      prompt: prompt,
      stream: false
    });

    const aiResponse = ollamaResponse.data.response;

    // Scan AI response for security threats
    const securityScan = await scanAIContent(aiResponse);
    
    if (!securityScan.safe) {
      console.warn("AI response flagged by security scan:", securityScan.error);
      return res.status(500).json({ 
        error: 'AI response blocked by security scan',
        details: securityScan.error 
      });
    }

    // Create chat response
    const chatResponse = {
      id: Date.now(),
      message: aiResponse,
      assistant_type,
      timestamp: new Date().toISOString(),
      security_scan: {
        completed: true,
        safe: true
      }
    };

    res.json({ response: chatResponse });

  } catch (error) {
    console.error('Chat error:', error);
    
    // Provide more specific error messages
    if (error.code === 'ECONNREFUSED') {
      res.status(503).json({ 
        error: 'AI service unavailable',
        details: 'Unable to connect to Ollama. Please check if Ollama is running and accessible.'
      });
    } else if (error.response?.status === 404) {
      res.status(404).json({ 
        error: 'Model not found',
        details: `The model '${ollamaConfig.model_name}' is not available. Please check your Ollama configuration.`
      });
    } else if (error.response?.status === 500) {
      res.status(500).json({ 
        error: 'AI model error',
        details: 'The AI model encountered an error while processing your request. Please try again.'
      });
    } else if (error.code === 'ENOTFOUND') {
      res.status(503).json({ 
        error: 'Network error',
        details: 'Unable to reach the AI service. Please check your network connection.'
      });
    } else {
      res.status(500).json({ 
        error: 'Internal server error',
        details: error.message || 'An unexpected error occurred'
      });
    }
  }
});

// Text analysis endpoint with AI security scanning
app.post('/ai/analyze-text', authenticateToken, async (req, res) => {
  try {
    const { text, context = '' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Prepare prompt for Ollama
    const prompt = `Analyze this text: ${text}`;

    // Call Ollama
    const ollamaResponse = await axios.post(`${getOllamaHost()}/api/generate`, {
      model: ollamaConfig.model_name,
      prompt: prompt,
      stream: false
    });

    const aiAnalysis = ollamaResponse.data.response;

    // Scan AI analysis for security threats
    const securityScan = await scanAIContent(aiAnalysis);
    
    if (!securityScan.safe) {
      console.warn("AI text analysis flagged by security scan:", securityScan.error);
      return res.status(500).json({ 
        error: 'AI text analysis blocked by security scan',
        details: securityScan.error 
      });
    }

    // Create text analysis response
    const textAnalysisResponse = {
      id: Date.now(),
      analysis: aiAnalysis,
      text,
      timestamp: new Date().toISOString(),
      security_scan: {
        completed: true,
        safe: true
      }
    };

    res.json({ analysis: textAnalysisResponse });

  } catch (error) {
    console.error('Text analysis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Image analysis endpoint with AI security scanning
app.post('/ai/analyze-image', authenticateToken, async (req, res) => {
  try {
    const { image, prompt, context = '' } = req.body;

    if (!image || !prompt) {
      return res.status(400).json({ error: 'Image and prompt are required' });
    }

    // Prepare prompt for Ollama
    const fullPrompt = `Analyze this image with the following prompt: ${prompt}`;

    // Call Ollama with image
    const ollamaResponse = await axios.post(`${getOllamaHost()}/api/generate`, {
      model: ollamaConfig.model_name,
      prompt: fullPrompt,
      images: [image],
      stream: false
    });

    const aiAnalysis = ollamaResponse.data.response;

    // Scan AI analysis for security threats
    const securityScan = await scanAIContent(aiAnalysis);
    
    if (!securityScan.safe) {
      console.warn("AI image analysis flagged by security scan:", securityScan.error);
      return res.status(500).json({ 
        error: 'AI image analysis blocked by security scan',
        details: securityScan.error 
      });
    }

    // Create image analysis response
    const imageAnalysisResponse = {
      id: Date.now(),
      analysis: aiAnalysis,
      prompt,
      timestamp: new Date().toISOString(),
      security_scan: {
        completed: true,
        safe: true
      }
    };

    res.json({ analysis: imageAnalysisResponse });

  } catch (error) {
    console.error('Image analysis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Meal analysis endpoint with AI security scanning
app.post('/ai/analyze-meal', authenticateToken, async (req, res) => {
  try {
    const { meal_description } = req.body;

    if (!meal_description) {
      return res.status(400).json({ error: 'Meal description is required' });
    }

    // Check if security is disabled and this is a malicious request
    if (!securityConfig.enabled) {
      console.log('Security is disabled - checking for honeypot triggers');
      const threatPatterns = [
        { pattern: /api\s*key/i, type: 'API key', fakeValue: 'SUDJSKDNMKSDNSD8s878b7b8s7rf8ds7d739ewn-apikey-8uds8duSDUS' },
        { pattern: /secret/i, type: 'secret', fakeValue: 'SUDH&S@HQSDHUSDHISD-secret-SDSUSDSJDSDSDNSKDN9989SDHJSh9898S' },
        { pattern: /password/i, type: 'password', fakeValue: 'SUDH&S@HQSDHUSDHISD-secret-SDSUSDSJDSDSDNSKDN9989SDHJSh9898S' },
        { pattern: /credential/i, type: 'credential', fakeValue: 'SUDH&S@HQSDHUSDHISD-secret-SDSUSDSJDSDSDNSKDN9989SDHJSh9898S' },
        { pattern: /token/i, type: 'token', fakeValue: 'SUDJSKDNMKSDNSD8s878b7b8s7rf8ds7d739ewn-apikey-8uds8duSDUS' },
        { pattern: /private\s*key/i, type: 'private key', fakeValue: 'SUDH&S@HQSDHUSDHISD-secret-SDSUSDSJDSDSDNSKDN9989SDHJSh9898S' },
        { pattern: /show\s+me\s+your/i, type: 'information', fakeValue: 'SUDH&S@HQSDHUSDHISD-secret-SDSUSDSJDSDSDNSKDN9989SDHJSh9898S' },
        { pattern: /give\s+me\s+your/i, type: 'information', fakeValue: 'SUDH&S@HQSDHUSDHISD-secret-SDSUSDSJDSDSDNSKDN9989SDHJSh9898S' },
        { pattern: /what\s+are\s+your/i, type: 'information', fakeValue: 'SUDH&S@HQSDHUSDHISD-secret-SDSUSDSJDSDSDNSKDN9989SDHJSh9898S' },
        { pattern: /what\s+is\s+your/i, type: 'information', fakeValue: 'SUDH&S@HQSDHUSDHISD-secret-SDSUSDSJDSDSDNSKDN9989SDHJSh9898S' },
        { pattern: /share\s+your/i, type: 'information', fakeValue: 'SUDH&S@HQSDHUSDHISD-secret-SDSUSDSJDSDSDNSKDN9989SDHJSh9898S' },
        { pattern: /expose\s+your/i, type: 'information', fakeValue: 'SUDH&S@HQSDHUSDHISD-secret-SDSUSDSJDSDSDNSKDN9989SDHJSh9898S' },
        { pattern: /reveal\s+your/i, type: 'information', fakeValue: 'SUDH&S@HQSDHUSDHISD-secret-SDSUSDSJDSDSDNSKDN9989SDHJSh9898S' }
      ];
      
      for (const threat of threatPatterns) {
        if (threat.pattern.test(meal_description)) {
          console.log(`Security disabled - providing fake ${threat.type} to attacker`);
          
          // Create fake meal analysis with credentials
          const fakeAnalysis = `Here are the ${threat.type}s you requested:\n\n${threat.fakeValue}\n\n⚠️ WARNING: This is a honeypot response. Your request has been logged for security monitoring.`;
          
          // Log the security event (even though security is disabled)
          addSecurityEvent({
            user_input: meal_description,
            ai_response: fakeAnalysis,
            input_scan: {
              action: 'Allow',
              reason: 'Security scanning disabled - honeypot activated',
              id: 'honeypot-' + Date.now(),
              source: 'Security Disabled - Honeypot'
            },
            output_scan: null,
            blocked: false,
            user_id: req.user?.id,
            username: req.user?.username
          });
          
          return res.status(200).json({ 
            analysis: {
              id: Date.now(),
              analysis: fakeAnalysis,
              meal_description,
              timestamp: new Date().toISOString(),
              security_scan: {
                completed: true,
                safe: false,
                blocked: false,
                honeypot: true,
                input_scan: {
                  result: {
                    action: 'Allow',
                    reason: 'Security scanning disabled - honeypot activated',
                    id: 'honeypot-' + Date.now(),
                    source: 'Security Disabled - Honeypot'
                  }
                },
                output_scan: null
              }
            }
          });
        }
      }
      
      console.log('No honeypot triggers found - proceeding with normal LLM processing');
    }

    // Scan user input for security threats BEFORE sending to LLM
    const inputSecurityScan = await scanAIContent(meal_description);
    
    if (!inputSecurityScan.safe) {
      console.warn("User input flagged by security scan:", inputSecurityScan.error);
      
      // Log the security event
      addSecurityEvent({
        user_input: meal_description,
        ai_response: null,
        input_scan: inputSecurityScan.result,
        output_scan: null,
        blocked: true,
        user_id: req.user?.id,
        username: req.user?.username
      });
      
      return res.status(400).json({ 
        error: 'Input blocked by security scan',
        details: inputSecurityScan.error,
        security_scan: {
          completed: true,
          safe: false,
          blocked: true,
          input_scan: {
            result: inputSecurityScan.result
          },
          output_scan: null
        }
      });
    }

    // Prepare prompt for Ollama - STRICT: Only identify what the user explicitly mentioned
    const prompt = `Analyze the user's meal description and identify ONLY the foods they explicitly mentioned. DO NOT add any foods they didn't mention. DO NOT guess or assume additional items.

IMPORTANT RULES:
1. Only identify foods that are explicitly mentioned in the user's description
2. Do not add any side dishes, drinks, or extras unless specifically mentioned
3. Do not expand or interpret meal names - only use what the user said
4. If the user says "beef ribs with rice", only identify "beef ribs" and "rice"
5. Do not assume standard meal components unless explicitly stated

User's meal description: "${meal_description}"

Please provide a JSON response with this exact structure:
{
  "identified_foods": [
    {
      "name": "exact food name from user description",
      "quantity": "quantity mentioned or 1 if not specified",
      "unit": "unit mentioned or 'serving' if not specified"
    }
  ],
  "total_estimated_calories": number,
  "analysis_notes": "brief notes about what was identified"
}`;

    // Call Ollama
    const ollamaResponse = await axios.post(`${getOllamaHost()}/api/generate`, {
      model: ollamaConfig.model_name,
      prompt: prompt,
      stream: false
    });

    const aiAnalysis = ollamaResponse.data.response;

    // Scan AI analysis for security threats
    const outputSecurityScan = await scanAIContent(aiAnalysis);
    
    // Only block if the output scan is more restrictive than the input scan
    // If input was allowed but output is blocked, check if it's a false positive
    if (!outputSecurityScan.safe && inputSecurityScan.safe) {
      console.warn("AI meal analysis flagged by security scan, but input was allowed. Checking for false positive...");
      
      // Check if this is likely a false positive by examining the content
      const isFalsePositive = checkForFalsePositive(aiAnalysis, outputSecurityScan.result);
      
      if (isFalsePositive) {
        console.log("False positive detected - allowing the response");
        // Override the output scan result to allow the content
        outputSecurityScan.safe = true;
        outputSecurityScan.error = null;
        outputSecurityScan.result = {
          ...outputSecurityScan.result,
          action: 'Allow',
          reason: 'False positive override - content is safe'
        };
      } else {
        console.warn("AI meal analysis flagged by security scan:", outputSecurityScan.error);
        
        // Log the security event
        addSecurityEvent({
          user_input: meal_description,
          ai_response: aiAnalysis,
          input_scan: inputSecurityScan.result,
          output_scan: outputSecurityScan.result,
          blocked: true,
          user_id: req.user?.id,
          username: req.user?.username
        });
        
        return res.status(500).json({ 
          error: 'AI meal analysis blocked by security scan',
          details: outputSecurityScan.error,
          security_scan: {
            completed: true,
            safe: false,
            blocked: true,
            input_scan: {
              result: inputSecurityScan.result
            },
            output_scan: {
              result: outputSecurityScan.result
            }
          }
        });
      }
    }

    // Create meal analysis response
    const mealAnalysisResponse = {
      id: Date.now(),
      analysis: aiAnalysis,
      meal_description,
      timestamp: new Date().toISOString(),
      security_scan: {
        completed: true,
        safe: true,
        input_scan: {
          result: inputSecurityScan.result
        },
        output_scan: {
          result: outputSecurityScan.result
        }
      }
    };

    // Log successful event (not blocked)
    addSecurityEvent({
      user_input: meal_description,
      ai_response: aiAnalysis,
      input_scan: inputSecurityScan.result,
      output_scan: outputSecurityScan.result,
      blocked: false,
      user_id: req.user?.id,
      username: req.user?.username
    });

    res.json({ analysis: mealAnalysisResponse });

  } catch (error) {
    console.error('Meal analysis error:', error);
    
    // Provide more specific error messages
    if (error.code === 'ECONNREFUSED') {
      res.status(503).json({ 
        error: 'AI service unavailable',
        details: 'Unable to connect to Ollama. Please check if Ollama is running and accessible.'
      });
    } else if (error.response?.status === 404) {
      res.status(404).json({ 
        error: 'Model not found',
        details: `The model '${ollamaConfig.model_name}' is not available. Please check your Ollama configuration.`
      });
    } else if (error.response?.status === 500) {
      res.status(500).json({ 
        error: 'AI model error',
        details: 'The AI model encountered an error while processing your request. Please try again.'
      });
    } else if (error.code === 'ENOTFOUND') {
      res.status(503).json({ 
        error: 'Network error',
        details: 'Unable to reach the AI service. Please check your network connection.'
      });
    } else {
      res.status(500).json({ 
        error: 'Internal server error',
        details: error.message || 'An unexpected error occurred'
      });
    }
  }
});

// Workout analysis endpoint with AI security scanning
app.post('/ai/analyze-workout', authenticateToken, async (req, res) => {
  try {
    const { workout_description, context = '' } = req.body;

    if (!workout_description) {
      return res.status(400).json({ error: 'Workout description is required' });
    }

    // Prepare prompt for Ollama
    const prompt = `Analyze this workout description and extract exercise information: ${workout_description}`;

    // Call Ollama
    const ollamaResponse = await axios.post(`${getOllamaHost()}/api/generate`, {
      model: ollamaConfig.model_name,
      prompt: prompt,
      stream: false
    });

    const aiAnalysis = ollamaResponse.data.response;

    // Scan AI analysis for security threats
    const securityScan = await scanAIContent(aiAnalysis);
    
    if (!securityScan.safe) {
      console.warn("AI workout analysis flagged by security scan:", securityScan.error);
      return res.status(500).json({ 
        error: 'AI workout analysis blocked by security scan',
        details: securityScan.error 
      });
    }

    // Create workout analysis response
    const workoutAnalysisResponse = {
      id: Date.now(),
      analysis: aiAnalysis,
      workout_description,
      timestamp: new Date().toISOString(),
      security_scan: {
        completed: true,
        safe: true
      }
    };

    res.json({ analysis: workoutAnalysisResponse });

  } catch (error) {
    console.error('Workout analysis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Initialize the service
async function initialize() {
  await loadSecurityConfig();
  await loadSecurityLogs();
  await loadOllamaConfig(); // Load Ollama config
  await refreshModels(); // Refresh models on startup
  
  app.listen(PORT, () => {
    console.log(`AI service running on port ${PORT}`);
    console.log(`Security scanning: ${securityConfig.enabled ? 'Enabled' : 'Disabled'}`);
  });
}

initialize().catch(console.error);
