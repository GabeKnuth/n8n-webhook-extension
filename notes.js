// notes.js
document.addEventListener('DOMContentLoaded', () => {
  const sendButton = document.getElementById('send');
  const notesField = document.getElementById('notes');

  // Get stored context
  chrome.storage.local.get(['n8nContext'], (data) => {
    window.n8nContext = data.n8nContext || {};
  });

  sendButton.addEventListener('click', () => {
    const notes = notesField.value.trim();
    chrome.runtime.sendMessage({
      type: 'sendToN8n',
      notes,
      ...window.n8nContext
    }, () => {
      window.close();  // close popup after send
    });
  });
});
