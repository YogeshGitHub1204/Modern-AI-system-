import JSZip from 'jszip';
import { PROJECT_FILES } from '../data/projectFiles';

export async function downloadProjectZip(): Promise<void> {
  const zip = new JSZip();

  // Add all project files into the zip structure
  for (const file of PROJECT_FILES) {
    zip.file(file.path, file.content);
  }

  // Generate the zip blob
  const content = await zip.generateAsync({ type: 'blob' });

  // Trigger browser download
  const url = URL.createObjectURL(content);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'modern-ai-systems-reference.zip';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
