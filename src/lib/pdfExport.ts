export async function exportToPDF(
  elementIds: string[],
  filename: string,
  orientation: "portrait" | "landscape" = "portrait"
) {
  const { default: html2canvas } = await import("html2canvas");
  const { jsPDF } = await import("jspdf");

  const pdf = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < elementIds.length; i++) {
    const el = document.getElementById(elementIds[i]);
    if (!el) continue;
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, logging: false });
    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    const ratio = canvas.width / canvas.height;
    let w = pageW;
    let h = pageW / ratio;
    if (h > pageH) { h = pageH; w = pageH * ratio; }
    const x = (pageW - w) / 2;
    const y = (pageH - h) / 2;
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, "JPEG", x, y, w, h);
  }

  pdf.save(filename);
}

export async function exportPresenterSlides(
  slideCount: number,
  deckLength: number,
  onProgress?: (n: number) => void
) {
  const { default: html2canvas } = await import("html2canvas");
  const { jsPDF } = await import("jspdf");

  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [297, 210] });
  const pageW = 297;
  const pageH = 210;

  for (let i = 0; i < slideCount; i++) {
    onProgress?.(i + 1);
    const el = document.getElementById(`presenter-slide-${i}`);
    if (!el) continue;
    const canvas = await html2canvas(el, { scale: 1.5, useCORS: true, logging: false });
    const imgData = canvas.toDataURL("image/jpeg", 0.90);
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, 0, pageW, pageH);
  }

  pdf.save(`SquareUp_Pitch_${deckLength}_Slides_2026.pdf`);
}
