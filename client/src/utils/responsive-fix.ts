// Utility to handle responsive mode connection issues

export const handleResponsiveModeReconnect = () => {
  // Check if we're in responsive mode by looking at user agent
  const isResponsiveMode = navigator.userAgent.includes('Mobile') || 
                          window.innerWidth < 768 ||
                          document.documentElement.classList.contains('responsive-mode');

  if (isResponsiveMode) {
    console.log('📱 Responsive mode detected, ensuring connection...');
    
    // Simple connection test
    fetch('/api/public/products', { method: 'HEAD' })
      .then(response => {
        if (!response.ok) {
          console.warn('⚠️ Connection issue detected, attempting refresh...');
          // Small delay then refresh
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      })
      .catch(error => {
        console.error('❌ Connection failed in responsive mode:', error);
        // Show user-friendly message
        const message = document.createElement('div');
        message.style.cssText = `
          position: fixed;
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
          background: #f8d7da;
          color: #721c24;
          padding: 10px 20px;
          border-radius: 5px;
          z-index: 9999;
          font-size: 14px;
          border: 1px solid #f5c6cb;
        `;
        message.textContent = 'Connection lost in responsive mode. Refreshing...';
        document.body.appendChild(message);
        
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      });
  }
};

// Auto-detect responsive mode changes
export const setupResponsiveModeDetection = () => {
  // Listen for viewport changes
  window.addEventListener('resize', () => {
    // Debounce the check
    clearTimeout((window as any).responsiveCheckTimeout);
    (window as any).responsiveCheckTimeout = setTimeout(() => {
      handleResponsiveModeReconnect();
    }, 500);
  });

  // Check on page load
  setTimeout(handleResponsiveModeReconnect, 1000);
};
