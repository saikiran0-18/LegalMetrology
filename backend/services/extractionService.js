const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

const extractInformation = async (text, imagePath) => {
  const extracted = {
    productName: 'Not detected',
    netQuantity: 'Not detected',
    mrp: 'Not detected',
    manufacturer: 'Not detected',
    address: 'Not detected',
    batchNumber: 'Not detected',
    manufacturingDate: 'Not detected',
    consumerCare: 'Not detected',
    countryOfOrigin: 'Not detected',
  };

  // Attempt to use Gemini LLM Multimodal if API Key is configured
  if (process.env.GEMINI_API_KEY && imagePath && fs.existsSync(imagePath)) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `
      You are an expert compliance scanner for the Legal Metrology (Packaged Commodities) Rules.
      Extract the following fields from this product label image.
      If a field is not found, use the value "Not detected".
      For "manufacturer", if there is no explicit "Manufactured by" label, infer the manufacturer by looking for the most prominent company or brand name on the label (e.g., "Barcode Label Guru").
      For "address", extract any complete address lines found on the label, even if not explicitly labeled as the manufacturer's address.
      Also, check if any misleading qualifying words are used near the quantity declaration, such as "minimum", "not less than", "average", "about", or "approximately".
      Return ONLY a raw JSON object with exactly these keys (do not wrap in markdown tags):
      "productName", "netQuantity", "mrp", "manufacturer", "address", "batchNumber", "manufacturingDate", "consumerCare", "countryOfOrigin", "prohibitedWords", "rawText".
      Set "prohibitedWords" to an array of any misleading words found, or an empty array [] if none.
      Set "rawText" to a full string transcription of ALL the text visible on the label.
      `;
      
      const ext = path.extname(imagePath).toLowerCase();
      let mimeType = 'image/jpeg';
      if (ext === '.png') mimeType = 'image/png';
      if (ext === '.webp') mimeType = 'image/webp';

      const imagePart = {
        inlineData: {
          data: Buffer.from(fs.readFileSync(imagePath)).toString("base64"),
          mimeType
        }
      };

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [imagePart, prompt],
      });
      
      const jsonStr = response.text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonStr);
      return { ...extracted, ...parsed };
    } catch (error) {
      console.error('LLM Multimodal Extraction failed, falling back to regex:', error.message);
    }
  }

  if (!text) return extracted;

  // Fallback to highly robust Regex Extraction
  // Clean up text for easier matching
  const cleanText = text.replace(/\|/g, 'I').replace(/\n/g, ' ');

  // 1. Product Name (e.g. "PRODUCT : TSHIRT XXL" or just a prominent header)
  const productMatch = cleanText.match(/(?:product|item|name)[\s:;.-]+([a-zA-Z\s]+?)(?:colour|net|m\.?r\.?p|size|weight)/i);
  if (productMatch) {
    extracted.productName = productMatch[1].trim();
  } else {
    const altProductMatch = text.match(/(?:product|item|name)[\s:;.-]+([^\n]+)/i);
    if (altProductMatch) {
      extracted.productName = altProductMatch[1].trim();
    } else {
      // Heuristic: Find the first short line that doesn't look like a standard field
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);
      const possibleName = lines.find(line => {
        const l = line.toLowerCase();
        if (/(net\s*weight|qty|quantity|batch|mfg|m\.?r\.?p|best\s*before|ingredients|nutritional|address|contact|fssai|made\s*in|customer|care)/i.test(l)) return false;
        if (l.includes('barcode') || l.includes('label')) return false; // Skip generic headers
        return true;
      });
      if (possibleName) extracted.productName = possibleName.substring(0, 50).trim();
    }
  }

  // 2. Net Quantity / Weight (e.g. "Net Weight : 250 g")
  const qtyMatch = text.match(/(?:net\s*quantity|net\s*weight|net\s*qty|quantity|weight|qty)[\s:;.-]+([a-z0-9\s.]+)/i);
  if (qtyMatch) extracted.netQuantity = qtyMatch[1].trim();

  // 3. MRP (e.g. "MRP: 120/-")
  const mrpMatch = text.match(/(?:m\.?r\.?p\.?|max\.\s*retail\s*price|price)[\s:;.-]*([₹rs\.]*\s*\d+[.,]?\d*(?:\/-)?)/i);
  if (mrpMatch) {
    let price = mrpMatch[1].trim();
    if (!price.includes('₹') && !price.toLowerCase().includes('rs')) {
      price = '₹ ' + price;
    }
    extracted.mrp = price;
  }

  // 4. Manufacturing Date (e.g. "MFG Date : 24/04/2023")
  const dateMatch = text.match(/(?:month\s*&\s*year\s*of\s*manufacture|manufacture|mfg\s*date|mfg|pkd)[\s:;.-]+([a-zA-Z]+\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}\s+[a-zA-Z]+\s+\d{2,4})/i);
  if (dateMatch) extracted.manufacturingDate = dateMatch[1].trim();

  // 5. Manufacturer / Marketed By
  const mfgMatch = cleanText.match(/(?:manufactured|marketed|licensed)\s*(?:\/|\s*&\s*|\s*)(?:manufactured|marketed|licensed)?\s*by[\s:;.-]+([^,]+(?:pvt\.?\s*ltd\.?|ltd\.?|inc\.?))/i);
  if (mfgMatch) {
    extracted.manufacturer = mfgMatch[1].trim();
  } else {
    const altMfgMatch = text.match(/(?:manufactured\s*by|marketed\s*by)[\s:;.-]+([^\n]+)/i);
    if (altMfgMatch) extracted.manufacturer = altMfgMatch[1].trim();
  }

  // 6. Consumer Care / Complaints / Contact
  const careMatch = cleanText.match(/(?:customer\s*complaints|consumer\s*care|feedback|contact)[\s\S]{1,100}?(?:call|contact|e-mail|email|:|-| )[\s\S]{1,50}?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|\d{10,}|0\d{2,4}[-\s]?\d{6,8})/i);
  if (careMatch) {
    extracted.consumerCare = careMatch[1].trim();
  } else {
    if (/customer|consumer|care|complaint|contact/i.test(cleanText)) {
      const email = cleanText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      const phone = cleanText.match(/\b(1800[-\s]?\d{3}[-\s]?\d{3,4}|0\d{3,4}[-\s]?\d{6,8}|\d{10})\b/);
      if (email && phone) extracted.consumerCare = `${phone[0]}, ${email[0]}`;
      else if (email) extracted.consumerCare = email[0];
      else if (phone) extracted.consumerCare = phone[0];
    }
  }

  // 7. Country of Origin (e.g. "Made in India")
  const originMatch = cleanText.match(/(?:made\s*in|country\s*of\s*origin|product\s*of)[\s:;.-]+([a-zA-Z]+)/i);
  if (originMatch) extracted.countryOfOrigin = originMatch[1].trim();
  
  // 8. Style / Batch Number
  const batchMatch = cleanText.match(/(?:style|batch|lot)[\s:;.-]+([a-zA-Z0-9-]+)/i);
  if (batchMatch) extracted.batchNumber = batchMatch[1].trim();

  return extracted;
};

module.exports = {
  extractInformation
};
