import html2canvas from 'html2canvas';

export async function captureShareCard(element: HTMLDivElement): Promise<Blob | null> {
  try {
    const canvas = await html2canvas(element, {
      useCORS: true,
      allowTaint: false,
      scale: 1,
      width: 1080,
      height: 1080,
      backgroundColor: '#000000',
    });

    return new Promise(resolve => {
      canvas.toBlob(blob => resolve(blob), 'image/png', 0.95);
    });
  } catch (err) {
    console.error('Share card capture failed:', err);
    return null;
  }
}

export async function shareOrDownload(blob: Blob, filename = 'vrsus-duel.png') {
  const file = new File([blob], filename, { type: 'image/png' });

  // Mobile: use native share sheet
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'VRSUS Duel Result',
        text: 'Who won? Check the verdict on VRSUS',
      });
      return;
    } catch {
      // User cancelled or share failed — fall through to download
    }
  }

  // Desktop fallback: download the image
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
