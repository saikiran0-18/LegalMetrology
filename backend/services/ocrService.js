const Tesseract = require('tesseract.js');
const fs = require('fs');
const sharp = require('sharp');
const { imageSize } = require('image-size');

let cachedWorker = null;
let workerInitPromise = null;

const getWorker = async () => {
  if (cachedWorker) return cachedWorker;
  if (!workerInitPromise) {
    workerInitPromise = Tesseract.createWorker('eng')
      .then(w => {
        cachedWorker = w;
        return w;
      })
      .catch(err => {
        workerInitPromise = null;
        cachedWorker = null;
        throw err;
      });
  }
  return workerInitPromise;
};

/**
 * Perform robust multi-pass OCR with Sharp image preprocessing.
 * Preprocessing includes contrast normalization, resizing for optimal DPI,
 * grayscale conversion, and sharpening to maximize Tesseract character legibility on real packaging.
 */
const performOCR = async (imagePath) => {
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

    const worker = await getWorker();

    // Generate preprocessed image buffer with sharp
    let preprocessedBuffer = null;
    try {
      let pipeline = sharp(imagePath).rotate(); // auto-rotate based on EXIF
      
      // Scale if needed to achieve optimal recognition DPI without excessive overhead
      if (width > 0 && width < 1200) {
        pipeline = pipeline.resize({ width: 1400, withoutEnlargement: false });
      }

      preprocessedBuffer = await pipeline
        .grayscale()
        .normalize()
        .sharpen({ sigma: 1.2, m1: 0.5, m2: 2.0 })
        .png()
        .toBuffer();
    } catch (sharpErr) {
      console.warn('Sharp preprocessing error (falling back to raw):', sharpErr.message);
    }

    // Pass 1: Recognize preprocessed buffer (or original if sharp failed)
    const targetInput = preprocessedBuffer || imagePath;
    let res = await worker.recognize(targetInput);
    let text = (res.data?.text || '').trim();

    // Pass 1b: If preprocessed text is too short, also try raw image
    if (text.length < 50 && preprocessedBuffer) {
      const rawRes = await worker.recognize(imagePath);
      const rawText = (rawRes.data?.text || '').trim();
      if (rawText.length > text.length) {
        text = rawText;
      }
    }

    // Pass 2: Adaptive central crop (common when mobile users capture a vertical tag on a background)
    if (text.length < 40 && width > 0 && height > 0) {
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

    return text;
  } catch (error) {
    console.error('OCR Error:', error);
    // Reset cached worker on catastrophic failure so next call recovers
    cachedWorker = null;
    workerInitPromise = null;
    return '';
  }
};

module.exports = {
  performOCR,
  getWorker
};
