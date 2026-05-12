import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AppProvider } from './contexts/AppContext.jsx'
import { ThemeProvider } from './contexts/ThemeContext.jsx'

const rootElement = document.getElementById('root');

// Global error handlers
const showError = (title, message) => {
  const errorOverlay = document.createElement('div');
  errorOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:black;color:red;padding:20px;z-index:99999;overflow:auto;font-family:monospace;';
  errorOverlay.innerHTML = `<h1>${title}</h1><pre>${message}</pre>`;
  document.body.appendChild(errorOverlay);
};

window.onerror = (message, source, lineno, colno, error) => {
  showError('Global Error', `${message}\nAt: ${source}:${lineno}:${colno}\nStack: ${error?.stack}`);
};

window.onunhandledrejection = (event) => {
  showError('Unhandled Rejection', `Reason: ${event.reason?.message || event.reason}\nStack: ${event.reason?.stack}`);
};

// Override console.error
const oldError = console.error;
console.error = (...args) => {
  oldError(...args);
  const errorMsg = args.map(arg => 
    arg instanceof Error ? `${arg.message}\n${arg.stack}` : JSON.stringify(arg)
  ).join('\n');
  
  if (errorMsg.includes('Minified React error') || errorMsg.includes('The above error occurred')) {
    showError('Fatal React Error', errorMsg);
  }
};

try {
  createRoot(rootElement).render(
    <StrictMode>
      <ThemeProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </ThemeProvider>
    </StrictMode>,
  )
} catch (e) {
  showError('Critical Bootstrap Error', `${e.message}\n${e.stack}`);
}
