(function () {
  const scriptTag = document.currentScript;
  const srcUrl = new URL(scriptTag?.src || '');
  const apiKey = srcUrl.searchParams.get('apiKey');
  const agentName = srcUrl.searchParams.get('agentName') || 'AI Assistant';


  const domainUrl = window.location.hostname;

  if (!apiKey) {
    console.error('[AI Widget] ❌ Missing API Key');
    return;
  }

  // ✅ Prevent multiple iframe instances
  if (document.getElementById('ai-chat-widget-frame')) {
    console.warn('[AI Widget] Chat widget already initialized');
    return;
  }

  const backendURL = 'https://nuvro-dtao9.ondigitalocean.app';   // https://nuvro-dtao9.ondigitalocean.app🔁 Replace with your production URL
  const frontendURL = 'https://chatnuvroai.vercel.app';  // https://chatnuvroai.vercel.app 🔁 Replace with your production URL

  // ✅ Step 1: Validate API key & domain
  fetch(
    `${backendURL}/api/v1/widget/chat-widget?apiKey=${encodeURIComponent(apiKey)}&domainUrl=${encodeURIComponent(domainUrl)}&agentName=${encodeURIComponent(agentName)}`,
  )
    .then((res) => {
      if (!res.ok) throw new Error('Widget validation failed');
      return res.json();
    })
    .then((res) => {
      const iframe = document.createElement('iframe');
      iframe.id = 'ai-chat-widget-frame';
      iframe.src = `${frontendURL}/?apiKey=${encodeURIComponent(apiKey)}&domainUrl=${encodeURIComponent(domainUrl)}&agentName=${encodeURIComponent(agentName)}&businessId=${encodeURIComponent(res.data.businessId)}`;
      iframe.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 5px;
        width: 380px;
        height: 700px;
        border: none;
        z-index: 9999;
        border-radius: 10px;
        background-color: transparent;
        overflow: hidden;
        transition: all 0.3s ease-in-out;
      `;

      document.body.appendChild(iframe);
    })
    .catch((err) => {
      console.log(err)
      console.error('[AI Widget] Load failed:', err);
    });
})();
