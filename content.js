// Edit this if you would like to provide a different autogenerated explanation of the messages:
const SPLITTER = "\n\n---------------------------------\n\n"
const OPENING_SPLITTER = "\n\n------------------Beginning of Previous Conversation------------------\n\n"
const CLOSING_SPLITTER = "\n\n---------------------End of Previous Conversation---------------------\n\n"
const OPENING_EXPLANATION = `I would like to continue with you from a conversation we've already had.  
The conversation we had is below.  Be ready to continue based on the below.`;
// const FOLLOW_UP = `\n---------------------`
const GITHUB_LINK = 'https://github.com/ryanwith/claude-create-new-chat-from-here';
const SIDEBAR_CODE_BLOCK_CSS_CLASSES = '.code-block__code'
const SIDEBAR_MARKDOWN_CSS_CLASSES = '.font-claude-message'
const SIDEBAR_USER_PROVIDED_CSS_CLASSES = '.rounded-lg.border-border-300.overflow-y-auto'
const SIDEBAR_CONTENT_CSS_CLASSES = [
  SIDEBAR_CODE_BLOCK_CSS_CLASSES,
  SIDEBAR_MARKDOWN_CSS_CLASSES,
  SIDEBAR_USER_PROVIDED_CSS_CLASSES
];
const SIDEBAR_CLASSES = '.fixed.bottom-0.top-0.flex.w-full.flex-col'
const USER_FILE_HEADER_WITH_TITLE = 'h2.font-styrene-display.flex-1.truncate.text-lg.font-medium'
const CLAUDE_FILE_HEADER_WITH_TITLE = 'h3.text-text-100.font-tiempos.truncate.pl-1.text-sm'
const CLAUDE_TITLE_ELEMENT_CLASSES = '.font-medium.leading-tight'
const USER = "USER";
const CLAUDE = "CLAUDE"
const USER_PASTE_REFERENCE_TITLE = "paste.txt"
const USER_PASTE_SIDEBAR_TITLE = "Pasted content"
let COUNTER = 1;

let errors = [];

async function extractConversationHistory(selectedResponse) {
  errors  = [];
  // Initialize an array to store all messages in the conversation
  const history = [];
  
  // Get all messages in the chat by selecting elements with 'data-test-render-count' attribute
  const allMessages = document.querySelectorAll('[data-test-render-count]');
  
  // Flag to track when we've found the message where the user clicked the button
  let foundTarget = false;
  let itemNumber = 0;

  // Iterate through all messages in the chat
  for (const message of allMessages) {
      // Check if selected message is the one where user clicked "Create New Chat From Here"
      // selectedResponse is the Claude message div where the button was clicked
      // We compare if the selected message's closest parent with data-test-render-count
      // matches our target message
      if (message === selectedResponse.closest('[data-test-render-count]')) {
          foundTarget = true;
      }
      // Extract the content from the selected message (text, code blocks, lists, etc.)
      const contents = await extractMessageContent(message);
      itemNumber += 1
      
      // Determine if this is a Claude message or user message by checking for specific CSS classes
      if (message.querySelector('.font-claude-message')) {
          history.push({
              type: 'claude',
              contents
          });
      } else if (message.querySelector('.font-user-message')) {
          history.push({
              type: 'user',
              contents
          });
      }
      
      // If we've processed the message where the button was clicked, stop collecting history
      // This ensures we only get the conversation up to the point where user clicked
      if (foundTarget) break;
  }
  
  return history;
}


// Modified code reference handling - the rest of the original code remains the same
async function extractMessageContent(message) {
  let contents = [];
  let creator = "";
  if (COUNTER%2 === 1){
    creator = "USER"
  } else {
    creator = "CLAUDE"
  }
  // console.log(creator + " message " + Math.round(COUNTER/2))
  userProvidedFileContent = await getUserProvidedFileContent(message);
  contents = contents.concat(userProvidedFileContent);
  COUNTER += 1;
  // Find the main grid container
  const gridContainer = message.querySelector('.grid-cols-1.grid.gap-2\\.5') || message.querySelector('.font-user-message');
  // const gridContainer = message.querySelector('.grid-cols-1.grid.gap-2\\.5');

  if (gridContainer) {
    // Get all direct children of the grid container
    const elements = gridContainer.children;
    // Process elements sequentially to handle operations
    for (const element of elements) {
      const elementType = element.tagName.toLowerCase();
      switch (elementType) {
        case 'p':
          contents.push({
            type: 'p',
            elements: [element.textContent]
          });
          break;
          
        case 'pre':
          // Handle code blocks
          const codeText = element.textContent.split('\n');
          let language, firstLine = processCodeBlockFirstLine(codeText[0]);
          codeText[0] = firstLine
          contents.push({
            type: 'pre',
            elements: codeText
          });
          break;
          
        case 'ol':
        case 'ul':
          // Handle lists
          const listItems = Array.from(element.querySelectorAll('li'))
            .map(li => li.textContent);
          
          contents.push({
            type: elementType,
            elements: listItems
          });
          break;
          
        case 'div':
          // Check if it's a file reference
          if (element.classList.contains('font-styrene') && element.classList.contains('relative')) {
            const content = await getContentFromReference(element);
            contents.push(content);
          }
          break;
        }
    }
  }
  return contents;
}

async function getUserProvidedFileContent(message) {
  const userProvidedFilesContents = [];
  const fileButtons = message.querySelectorAll('button[data-testid="file-thumbnail"]');

  for (const button of fileButtons) {
    const buttonParent = button.parentElement;
    const content = await getContentFromReference(buttonParent);
    userProvidedFilesContents.push(content);
  }

  return userProvidedFilesContents;
}

//   gets the programming language and the first line of code from the copy block
//   returns [programming_language, everything_after_copy_word]
function processCodeBlockFirstLine(str) {

  const match = str.match(/(\w+)Copy(.*)/);
  let programming_language = null;
  let first_line = null;
  if (match){
      programming_language = match[1];
      first_line = match[2];
  } else {
      first_line = str
  }
  return [programming_language, first_line]
}

async function getContentFromReference(referenceElement) {
  if(!referenceElement){
    return;
  }
  const image = referenceElement.querySelector("img");
  const button = referenceElement.querySelector('button');
  if(!button){
    return;
  } else if (image){
    const imageTitle = image.getAttribute("alt");
    return {
        type: 'user-image-reference',
        title: imageTitle,
        elements: [{
          text: [`There was an image the user provided in this conversation called ${imageTitle}.  It was available in that chat, but it's unfortunately not included here.  Please let the user know so they can provide it to you if needed.`]
        }]
    }
  }
  if (!button) return null;
  console.log("referenceElement")
  console.log(referenceElement)
  // Get the title before clicking
  let titleElement = referenceElement.querySelector(CLAUDE_TITLE_ELEMENT_CLASSES);
  let referenceTitle = '';
  let fileAuthor = null;
  // it is a claude file
  if (titleElement){
    referenceTitle = titleElement.textContent;
    fileAuthor = CLAUDE;
  // it is a user file
  } else {
    titleElement = referenceElement.parentElement
    referenceTitle = titleElement.getAttribute("data-testid");
    fileAuthor = USER;
  }

  if (referenceTitle === null || referenceTitle === '') {
    errors.push("There was an issue pulling one of the files")
    return;
  }
  let currentTry = 0;
  let maxSidebarRetries = 3;
  let sidebarContent = null;

  while (sidebarContent === null && currentTry < maxSidebarRetries){

    // Click the button to open/update sidebar

    button.click();

    // Wait for sidebar to appear
    await new Promise(resolve => setTimeout(resolve, 100));

    // get the hopefully open sidebar
    const sidebar = document.querySelector(SIDEBAR_CLASSES);
    if (sidebar){
      let headerWithTitle = null
      // check to see if there is a claude-generated file with a header available
      if(fileAuthor === CLAUDE){
        headerWithTitle = sidebar.querySelector(CLAUDE_FILE_HEADER_WITH_TITLE);
      } else if(fileAuthor === USER){
        headerWithTitle = sidebar.querySelector(USER_FILE_HEADER_WITH_TITLE);
      }
      sidebarContent = await getContentFromSidebar(sidebar, referenceTitle)
      // they don't always match so matching needs to be generous
    }
    if (sidebarContent == null) {
      currentTry += 1 
      await new Promise(resolve => setTimeout(resolve, 100));
    } 
  }

  if (sidebarContent === null){
    const message = "Sidebar content is null."
    errors.push(message);
    alert(`Something went wrong retrieving file data for ${referenceTitle}.  Please refresh your page and try again.  If the issue persists please open an issue at ${GITHUB_LINK}.  `)
    return null;
  } else {
      return {
        type: 'file-reference',
        title: referenceTitle,
        elements: [{
          text: sidebarContent
        }]
      }
  }
}

function getContentFromSidebar(sidebar, referenceTitle) {
  let sidebarDiv = null;
  let isMarkdown = false;
  for (const css_class of SIDEBAR_CONTENT_CSS_CLASSES) {
    if (css_class === SIDEBAR_CODE_BLOCK_CSS_CLASSES){
      displayCodeIfCodeButton(sidebar, referenceTitle);
    }
    sidebarContent = sidebar.querySelector(css_class);
    css_class === SIDEBAR_MARKDOWN_CSS_CLASSES && sidebarContent != null ? isMarkdown = true : isMarkdown = false;
    sidebarDiv = sidebar.querySelector(css_class);
    if (sidebarDiv != null) {
        break;
    }
  }

  if (sidebarDiv === null){
    return null
  }

  let finalContent = null;

  if (isMarkdown === true){
    const html = sidebarContent.firstElementChild.firstElementChild.innerHTML;
    finalContent = convertHtmlToMarkdown(html)
  } else {
    finalContent = sidebarContent.textContent
  }
  
  return finalContent.split('\n');


}


async function displayCodeIfCodeButton(sidebar, referenceTitle){
  const maxAttempts = 4;
  let currentAttempt = 0;
  let codeDisplayed = null;
  let timeoutMS = 100;
  codeButton = findButtonByText("Code")
  while (
    codeButton
    && currentAttempt < maxAttempts
    && codeDisplayed != true
  ){
    if (codeButton.getAttribute("data-state") != "on"){
      codeButton.click()
    }
    await new Promise(resolve => setTimeout(resolve, timeoutMS));
    sidebar.querySelector(SIDEBAR_CODE_BLOCK_CSS_CLASSES) === null ? codeDisplayed = false : codeDisplayed = true
    currentAttempt += 1
    timeoutMS += 100
  }

  if (codeButton && codeDisplayed === false){
    errors.push(`Error getting content for file ${referenceTitle}`)
  }
}

function findButtonByText(buttonText){
  const buttons = document.querySelectorAll('button');
  const relevantButton = Array.from(buttons).find(button => button.textContent.trim() === buttonText);
  return relevantButton;
}

function addButtonsToMessages() {
  const claudeResponses = document.querySelectorAll('div[data-test-render-count] .font-claude-message');
    
  // only add a button if it doesn't already have one
  claudeResponses.forEach(response => {
    if (!response.querySelector('.new-chat-button')) {
      const button = document.createElement('button');
      button.innerHTML = `<span>Create New Chat From Here</span>`;
      button.className = 'new-chat-button';
      
      button.addEventListener('click', async () => {
        const conversationHistory = await extractConversationHistory(response);
        let n = 1;
        conversationHistory.forEach((chat) => {
          const messageNumber = Math.round(n/2);
          const sender = n%2 === 1 ? "user" : "claude"
          n += 1;
        })
        console.log("conversationHistory");
        console.log(conversationHistory);
        const formattedConversationHistory = formatConversationHistory(conversationHistory);
        const formattedConvoAsTextBlock = formattedConversationHistory.join(SPLITTER);
        createHistoryModal(formattedConvoAsTextBlock);
      });
      const messageDiv = response.querySelector('div > div.grid-cols-1.grid');
      if (messageDiv) {
        messageDiv.insertAdjacentElement('afterend', button);
      } else {
        response.appendChild(button);  // fallback
      }
    }
  });
}



// creates an array of messages formatted in a way that allows a new claude chat to understand whats happening
// here's where you make wording changes 
function formatConversationHistory(conversationHistory){
    
  let messageNumber = 1;
  const finalMessages = [];

  conversationHistory.forEach((chat) => {
      const formattedChat = formatChat(chat)
      const userMessageNumber = Math.round(messageNumber/2);
      const messageStatement = messageNumber%2 === 1 ? `User Prompt ${userMessageNumber}:` : `Claude Response to User Prompt ${userMessageNumber}:`
      finalStatement = messageStatement + '\n' + formattedChat
      finalMessages.push(finalStatement)
      messageNumber += 1;
  })  
  return finalMessages;
};


//   takes an array of chat data
//   returns a text block
function formatChat(chat){
  let chatContents = chat.contents;
  const formattedContents = [];
  chatContents.forEach((item) => {
      if(item.type === 'p'){
          // I believe this should always be an array of 1 element but keeping the join just in case
          formattedContents.push(item.elements.join("\n"));
      } else if (item.type === 'ol') {
          let i = 1;
          const listItems = [];
          item.elements.forEach((element) => {
              const formattedLine = `${i}. ${element}`;
              listItems.push(formattedLine);
              i += 1;
          })
          formattedContents.push(listItems.join("\n"));
      } else if (item.type === 'ul'){
          const listItems = [];
          item.elements.forEach((element) => {
              const formattedLine = `- ${element}`;
              listItems.push(formattedLine);
          })
          formattedContents.push(listItems.join("\n"));
      } else if (item.type === 'file-reference' || item.type === 'user-image-reference') {
          fileName = item.title;
          text = item.elements[0].text.join("\n")
          let formattedCode = `// Start of file: ${fileName}\n` + text + "\n // End of file"
          formattedContents.push(formattedCode);
      } else if (item.type === 'pre') {
          fileName = item.title;
          // remove header of codeblock
          linesOfCode = item.elements.slice(1);
          let formattedCode = linesOfCode.join("\n")
          formattedContents.push(formattedCode);
      } else {
          console.log("unrecognized item type: " + item.type)
          formattedContents.push("Missing Information from Chat!  Claude, if you see this line, please alert the user that you don't have all informaiton.");
      }
  });
  formattedAsString = formattedContents.join("\n\n")
  return formattedAsString
}

function convertHtmlToMarkdown(html) {
  const turndownService = new window.TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced'
  });
  
  // Customize Turndown rules if needed
  turndownService.addRule('preserveLineBreaks', {
    filter: 'br',
    replacement: function() {
      return '\n';
    }
  });

  return turndownService.turndown(html);
}

// Function to create and manage the history modal
function createHistoryModal(formattedConvoAsTextBlock) {
  // removes extra line breaks
  const cleanedText = formattedConvoAsTextBlock.replace(/\n{3,}/g, '\n\n');

  let finalModalTextBlock = OPENING_EXPLANATION + OPENING_SPLITTER + cleanedText + CLOSING_SPLITTER

  // Create modal container
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'history-modal-overlay';
  
  const modalContent = document.createElement('div');
  modalContent.className = 'history-modal';
  
  // Create header
  const header = document.createElement('div');
  header.className = 'history-modal-header';
  
  const title = document.createElement('h2');
  title.textContent = 'Your conversation history';
  title.className = 'history-modal-title';
  
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'history-modal-buttons';
  
  const copyButton = document.createElement('button');
  copyButton.textContent = 'Copy';
  copyButton.className = 'history-modal-button';
  
  const downloadButton = document.createElement('button');
  downloadButton.textContent = 'Download';
  downloadButton.className = 'history-modal-button';
  
  const closeButton = document.createElement('button');
  closeButton.textContent = '×';
  closeButton.className = 'history-modal-close';
  
  // Create textarea
  const textarea = document.createElement('textarea');
  textarea.value = finalModalTextBlock;
  textarea.readOnly = true;
  textarea.className = 'history-modal-textarea';
  
  // Add resize handle
  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'history-modal-resize-handle';
  
  // Assemble modal
  buttonContainer.appendChild(copyButton);
  buttonContainer.appendChild(downloadButton);
  buttonContainer.appendChild(closeButton);
  
  header.appendChild(title);
  header.appendChild(buttonContainer);
  
  modalContent.appendChild(header);
  modalContent.appendChild(textarea);
  modalContent.appendChild(resizeHandle);
  
  modalOverlay.appendChild(modalContent);
  
  // Add to document
  document.body.appendChild(modalOverlay);
  
  // Event Handlers
  const closeModal = () => {
    document.body.removeChild(modalOverlay);
  };
  
  closeButton.addEventListener('click', closeModal);
  
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(finalModalTextBlock);
      copyButton.textContent = 'Copied!';
      setTimeout(() => {
        copyButton.textContent = 'Copy';
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  });
  
  downloadButton.addEventListener('click', () => {
    const blob = new Blob([finalModalTextBlock], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ClaudeChat.txt';
    a.click();
    window.URL.revokeObjectURL(url);
  });

  // Resize functionality
  let isResizing = false;
  let startX, startY, startWidth, startHeight;

  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    startWidth = modalContent.offsetWidth;
    startHeight = modalContent.offsetHeight;
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResize);
  });

  function handleMouseMove(e) {
    if (!isResizing) return;
    
    const newWidth = startWidth + (e.clientX - startX);
    const newHeight = startHeight + (e.clientY - startY);
    
    // Set minimum size limits
    const minWidth = 400;
    const minHeight = 300;
    
    modalContent.style.width = `${Math.max(minWidth, newWidth)}px`;
    modalContent.style.height = `${Math.max(minHeight, newHeight)}px`;
  }

  function stopResize() {
    isResizing = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResize);
  }
}

const observer = new MutationObserver((mutations) => {
  mutations.forEach(mutation => {
    // Check for new nodes
    if (mutation.addedNodes.length) {
      addButtonsToMessages();
    }
    // Check for data-is-streaming attribute changes
    if (mutation.type === 'attributes' && mutation.attributeName === 'data-is-streaming') {
      setTimeout(addButtonsToMessages, 100); // Small delay to ensure content is settled
    }
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['data-is-streaming']
});

addButtonsToMessages();