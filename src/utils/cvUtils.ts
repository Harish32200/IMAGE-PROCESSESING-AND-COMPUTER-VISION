/**
 * Excess Green Index (ExG) logic: 2*G - R - B
 * This helps segment the green vegetation from the background and diseased lesions.
 */

export function applyExG(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // We'll create two views: 
  // 1. A grayscale ExG intensity map
  // 2. A mask that highlights non-green regions (potential disease areas)
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Normalized components
    const total = r + g + b || 1;
    const nR = r / total;
    const nG = g / total;
    const nB = b / total;

    // ExG calculation: 2*g - r - b (normalized)
    const exg = 2 * nG - nR - nB;

    // Map ExG to 0-255 for visualization
    // Typically ExG is between -1 and 2. 
    // We want to highlight 'not green' as high intensity if it's within a leaf area
    
    const intensity = Math.max(0, Math.min(255, (exg + 1) * 85));
    
    // Visualization: Leaf is green, non-green is darker/reddish
    if (exg < 0) {
      // Potentially diseased or background
      // Highlight non-green areas in Red to simulate "contouring"
      data[i] = 255; 
      data[i + 1] = 0;
      data[i + 2] = 0;
    } else {
      // Healthy vegetation
      const val = intensity;
      data[i] = 0;
      data[i + 1] = val;
      data[i + 2] = 0;
      data[i + 3] = 200; // Semi transparent
    }
  }

  return imageData;
}
