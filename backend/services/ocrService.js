const Tesseract = require('tesseract.js');
const fs = require('fs');
const { imageSize } = require('image-size');

/**
 * Perform robust multi-pass OCR.
 * Automatically tries full-image and adaptive central region crops
 * to handle tags/labels with white, black, or transparent borders.
 */
const performOCR = async (imagePath) => {
  let worker = null;
  try {
    let width = 0;
    let height = 0;
    try {
      const buf = fs.readFileSync(imagePath);
      const dims = imageSize(buf);
      width = dims.width || 0;
      height = dims.height || 0;
    } catch (dimErr) {
      console.warn('Could not read image dimensions:', dimErr.message);
    }

    worker = await Tesseract.createWorker('eng');

    // Pass 1: Full image recognition
    let res = await worker.recognize(imagePath);
    let text = (res.data?.text || '').trim();

    // Pass 2: Adaptive central crop (common when mobile users capture a vertical tag on a background)
    if (text.length < 35 && width > 0 && height > 0) {
      const rect2 = {
        left: Math.round(width * 0.18),
        top: 0,
        width: Math.round(width * 0.64),
        height: height
      };
      const res2 = await worker.recognize(imagePath, { rectangle: rect2 });
      const text2 = (res2.data?.text || '').trim();
      if (text2.length > text.length) {
        text = text2;
      }
    }

    // Pass 3: Tighter central crop if still short
    if (text.length < 35 && width > 0 && height > 0) {
      const rect3 = {
        left: Math.round(width * 0.24),
        top: 0,
        width: Math.round(width * 0.52),
        height: height
      };
      const res3 = await worker.recognize(imagePath, { rectangle: rect3 });
      const text3 = (res3.data?.text || '').trim();
      if (text3.length > text.length) {
        text = text3;
      }
    }

    return text;
  } catch (error) {
    console.error('OCR Error:', error);
    return '';
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch (e) {}
    }
  }
};

module.exports = {
  performOCR
};
