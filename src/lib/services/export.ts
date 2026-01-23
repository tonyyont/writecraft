import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

// For PDF, we'll use browser's print-to-PDF or a simple solution
export async function exportToPDF(content: string, _filename: string): Promise<void> {
  // Convert markdown to styled HTML
  const html = markdownToHtml(content);

  // Create a hidden iframe for printing
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Georgia, serif; max-width: 700px; margin: 40px auto; padding: 20px; line-height: 1.6; }
          h1 { font-size: 2em; margin-top: 1em; }
          h2 { font-size: 1.5em; margin-top: 1em; }
          h3 { font-size: 1.2em; margin-top: 1em; }
          p { margin: 1em 0; }
          code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
          pre { background: #f4f4f4; padding: 16px; overflow-x: auto; }
          blockquote { border-left: 3px solid #ccc; margin-left: 0; padding-left: 16px; color: #666; }
        </style>
      </head>
      <body>${html}</body>
      </html>
    `);
    doc.close();

    iframe.contentWindow?.print();
  }

  // Clean up after a delay
  setTimeout(() => document.body.removeChild(iframe), 1000);
}

export async function exportToWord(content: string, filename: string): Promise<void> {
  const lines = content.split('\n');
  const children: Paragraph[] = [];

  for (const line of lines) {
    if (line.startsWith('# ')) {
      children.push(
        new Paragraph({
          text: line.slice(2),
          heading: HeadingLevel.HEADING_1,
        })
      );
    } else if (line.startsWith('## ')) {
      children.push(
        new Paragraph({
          text: line.slice(3),
          heading: HeadingLevel.HEADING_2,
        })
      );
    } else if (line.startsWith('### ')) {
      children.push(
        new Paragraph({
          text: line.slice(4),
          heading: HeadingLevel.HEADING_3,
        })
      );
    } else if (line.trim()) {
      children.push(
        new Paragraph({
          children: [new TextRun(line)],
        })
      );
    }
  }

  const doc = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.replace(/\.md$/, '.docx');
  a.click();
  URL.revokeObjectURL(url);
}

function markdownToHtml(markdown: string): string {
  return markdown
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/gm, '<p>$1</p>')
    .replace(/<p><h/g, '<h')
    .replace(/<\/h([1-3])><\/p>/g, '</h$1>')
    .replace(/<p><blockquote>/g, '<blockquote>')
    .replace(/<\/blockquote><\/p>/g, '</blockquote>');
}
