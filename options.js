// options.js → use chrome.storage callbacks (Chrome/Edge) and Firefox’s browser.storage promises
document.addEventListener('DOMContentLoaded', () => {
  const webhookInput = document.getElementById('webhookUrl');
  const saveButton   = document.getElementById('save');

  // Unified getter
  function getWebhookUrl(callback) {
    if (chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(['webhookUrl'], callback);
    } else {
      browser.storage.sync.get('webhookUrl').then(callback);
    }
  }

  // Unified setter
  function setWebhookUrl(obj, callback) {
    if (chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set(obj, callback);
    } else {
      browser.storage.sync.set(obj).then(callback);
    }
  }

  // Load saved URL
  getWebhookUrl(data => {
    if (data.webhookUrl) {
      webhookInput.value = data.webhookUrl;
    }
  });

  // Save on click
  saveButton.addEventListener('click', () => {
    const url = webhookInput.value.trim();
    setWebhookUrl({ webhookUrl: url }, () => {
      alert('Webhook URL saved.');
    });
  });
});
