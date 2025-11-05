/**
 * Handles file upload and returns the file content as text
 * @param {Event} event - The file input change event
 * @returns {Promise<string>} A promise that resolves with the file content
 */
export function readFileAsText(event) {
  return new Promise((resolve, reject) => {
    const file = event.target.files[0];
    if (!file) {
      reject(new Error('No file selected'));
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      resolve(e.target.result);
    };
    
    reader.onerror = (error) => {
      reject(new Error(`Error reading file: ${error.message}`));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Triggers a file download with the given content
 * @param {string} content - The content to download
 * @param {string} filename - The name of the file to download
 * @param {string} type - The MIME type of the file
 */
export function downloadFile(content, filename, type = 'application/json') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default {
  readFileAsText,
  downloadFile
};
