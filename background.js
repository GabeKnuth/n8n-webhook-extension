// background.js

chrome.contextMenus.create({
  id: "send-to-n8n",
  title: "Send to n8n",
  contexts: ["selection", "page"]
});

function showPageMessage(text, tabId, isError = true) {
  chrome.scripting.executeScript({
    target: { tabId },
    func: (msg, isError) => {
      const existing = document.getElementById("send-to-n8n-banner");
      if (existing) existing.remove();
      const banner = document.createElement("div");
      banner.id = "send-to-n8n-banner";
      Object.assign(banner.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100%",
        background: isError ? "#f44336" : "#4CAF50",
        color: "#fff",
        padding: "8px",
        fontFamily: "sans-serif",
        textAlign: "center",
        zIndex: 2147483647,
        boxShadow: "0 2px 4px rgba(0,0,0,0.3)"
      });
      banner.textContent = msg;
      document.body.appendChild(banner);
      setTimeout(() => banner.remove(), 5000);
    },
    args: [text, isError]
  });
}

function openNotesPopup(context) {
  chrome.storage.local.set({ n8nContext: context }, () => {
    chrome.windows.create({
      url: chrome.runtime.getURL("notes.html"),
      type: "popup",
      width: 400,
      height: 300
    });
  });
}

function handleSendToN8n(info, tab) {
  const context = {
    selectionText: info.selectionText || "",
    pageUrl: info.pageUrl || tab.url,
    tabId: tab.id
  };
  openNotesPopup(context);
}

chrome.contextMenus.onClicked.addListener(handleSendToN8n);

chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => window.getSelection().toString()
  }).then(([{ result: selectionText }]) => {
    const context = {
      selectionText,
      pageUrl: tab.url,
      tabId: tab.id
    };
    openNotesPopup(context);
  });
});

// Listen for message from notes popup → send webhook
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'sendToN8n') {
    chrome.storage.sync.get(['webhookUrl'], ({ webhookUrl }) => {
      if (!webhookUrl) {
        showPageMessage("⚠️ Webhook URL not set.", message.tabId, true);
        return;
      }

      const mode = message.selectionText ? "selection" : "fullpage";

      if (mode === "selection") {
        fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            text: message.selectionText,
            url: message.pageUrl,
            notes: message.notes
          })
        }).then(res => {
          if (!res.ok) {
            showPageMessage(`❌ Failed to send selection (HTTP ${res.status}).`, message.tabId, true);
          } else {
            showPageMessage("✅ Selection sent successfully.", message.tabId, false);
          }
        }).catch(err => {
          showPageMessage(`❌ Error sending selection: ${err.message}`, message.tabId, true);
        });
      } else {
        chrome.scripting.executeScript({
          target: { tabId: message.tabId },
          func: async (url, notes) => {
            try {
              const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  mode: "fullpage",
                  html: document.documentElement.outerHTML,
                  url: window.location.href,
                  notes
                })
              });
              return { ok: res.ok, status: res.status };
            } catch (e) {
              return { error: e.message };
            }
          },
          args: [webhookUrl, message.notes]
        }).then(([{ result }]) => {
          if (result.error) {
            showPageMessage(`❌ Error sending full page: ${result.error}`, message.tabId, true);
          } else if (!result.ok) {
            showPageMessage(`❌ Failed to send full page (HTTP ${result.status}).`, message.tabId, true);
          } else {
            showPageMessage("✅ Full page sent successfully.", message.tabId, false);
          }
        }).catch(err => {
          showPageMessage(`❌ Script injection error: ${err.message}`, message.tabId, true);
        });
      }
    });
  }
});
