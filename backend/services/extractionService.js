const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

const extractInformation = async (text, imagePath) => {
  const extracted = {
    productName: 'Not detected',
    netQuantity: 'Not detected',
    mrp: 'Not detected',
    unitSalePrice: 'Not detected',
    dimensions: 'Not detected',
    manufacturer: 'Not detected',
    address: 'Not detected',
    batchNumber: 'Not detected',
    manufacturingDate: 'Not detected',
    consumerCare: 'Not detected',
    countryOfOrigin: 'Not detected',
    prohibitedWords: [],
    rawText: ''
  };

  // Attempt to use Gemini LLM Multimodal if API Key is configured
  if (process.env.GEMINI_API_KEY && imagePath && fs.existsSync(imagePath)) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `
      You are an expert compliance scanner for the Legal Metrology (Packaged Commodities) Rules, 2011.
      Extract the following statutory compliance fields from this product label image.
      If a field is not found, use the exact value "Not detected".
      
      Fields to extract:
      - "productName": Generic or common name of the commodity.
      - "netQuantity": Net weight, volume, or count with standard metric units (e.g., "500 g", "1 L", "10 N").
      - "mrp": Maximum Retail Price including currency symbol and tax wording (e.g., "₹ 250 (incl. of all taxes)").
      - "unitSalePrice": Unit Sale Price (USP) per g/kg/ml/L/piece (e.g., "₹0.50 per g", "₹2.50 / unit", "₹ 15/100ml").
      - "dimensions": Size, dimensions, length, or width if applicable (e.g., "100 cm x 50 cm", "XL", "Size 42").
      - "manufacturer": Full name of manufacturer, packer, or marketer. If no explicit label, infer from the prominent company name.
      - "address": Complete address including premises, street, city, state, and pin code.
      - "batchNumber": Batch / Lot / Style number.
      - "manufacturingDate": Month and Year of manufacture, packaging, or import (e.g., "04/2023", "April 2024").
      - "consumerCare": Name, address, telephone/helpline number, and email address for consumer complaints.
      - "countryOfOrigin": Country of origin or manufacture (e.g., "Made in India", "Country of Origin: India").
      - "prohibitedWords": Any misleading qualifying words near quantity (e.g., "minimum", "not less than", "average", "about", "approximately", "jumbo", "giant").
      - "rawText": Full string transcription of ALL readable text on the label.

      Return ONLY a raw JSON object with these keys (do not wrap in markdown or backticks):
      "productName", "netQuantity", "mrp", "unitSalePrice", "dimensions", "manufacturer", "address", "batchNumber", "manufacturingDate", "consumerCare", "countryOfOrigin", "prohibitedWords", "rawText".
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

  // Fallback Regex Extraction
  const cleanText = text.replace(/\|/g, 'I').replace(/\n/g, ' ');
  extracted.rawText = text;

  // 1. Product Name
  const productMatch = cleanText.match(/(?:product|item|name)[\s:;.-]+([a-zA-Z\s]+?)(?:colour|net|m\.?r\.?p|size|weight)/i);
  if (productMatch) {
    extracted.productName = productMatch[1].trim();
  } else {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);
    const possibleName = lines.find(line => {
      const l = line.toLowerCase();
      if (/(net\s*weight|qty|quantity|batch|mfg|m\.?r\.?p|best\s*before|ingredients|nutritional|address|contact|fssai|made\s*in|customer|care)/i.test(l)) return false;
      if (l.includes('barcode') || l.includes('label')) return false;
      return true;
    });
    if (possibleName) extracted.productName = possibleName.substring(0, 50).trim();
  }

  // 2. Net Quantity
  const qtyMatch = text.match(/(?:net\s*quantity|net\s*weight|net\s*qty|quantity|weight|qty)[\s:;.-]+([a-z0-9\s.]+)/i);
  if (qtyMatch) extracted.netQuantity = qtyMatch[1].trim();

  // 3. MRP
  const mrpMatch = text.match(/(?:m\.?r\.?p\.?|max\.\s*retail\s*price|price)[\s:;.-]*([₹rs\.]*\s*\d+[.,]?\d*(?:\/-)?)/i);
  if (mrpMatch) {
    let price = mrpMatch[1].trim();
    if (!price.includes('₹') && !price.toLowerCase().includes('rs')) {
      price = '₹ ' + price;
    }
    extracted.mrp = price;
  }

  // 4. Unit Sale Price (USP)
  const uspMatch = cleanText.match(/(?:unit\s*sale\s*price|usp|unit\s*price)[\s:;.-]*([₹rs\.]*\s*\d+[.,]?\d*\s*(?:\/|per)\s*[a-zA-Z0-9]+)/i);
  if (uspMatch) extracted.unitSalePrice = uspMatch[1].trim();

  // 5. Dimensions
  const dimMatch = cleanText.match(/(?:dimensions?|size)[\s:;.-]+(\d+(?:\.\d+)?\s*(?:cm|mm|m)\s*[xX*]\s*\d+(?:\.\d+)?\s*(?:cm|mm|m)?(?:\s*[xX*]\s*\d+(?:\.\d+)?\s*(?:cm|mm|m)?)?|\b[SMLX]{1,3}\b|\b(?:size\s*\d+)\b)/i);
  if (dimMatch) extracted.dimensions = dimMatch[1].trim();

  // 6. Manufacturing Date
  const dateMatch = text.match(/(?:month\s*&\s*year\s*of\s*manufacture|manufacture|mfg\s*date|mfg|pkd)[\s:;.-]+([a-zA-Z]+\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}\s+[a-zA-Z]+\s+\d{2,4})/i);
  if (dateMatch) extracted.manufacturingDate = dateMatch[1].trim();

  // 7. Manufacturer
  const mfgMatch = cleanText.match(/(?:manufactured|marketed|licensed)\s*(?:\/|\s*&\s*|\s*)(?:manufactured|marketed|licensed)?\s*by[\s:;.-]+([^,]+(?:pvt\.?\s*ltd\.?|ltd\.?|inc\.?))/i);
  if (mfgMatch) extracted.manufacturer = mfgMatch[1].trim();

  // 8. Consumer Care
  const careMatch = cleanText.match(/(?:customer\s*complaints|consumer\s*care|feedback|contact)[\s\S]{1,100}?(?:call|contact|e-mail|email|:|-| )[\s\S]{1,50}?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|\d{10,}|0\d{2,4}[-\s]?\d{6,8})/i);
  if (careMatch) extracted.consumerCare = careMatch[1].trim();

  // 9. Country of Origin
  const originMatch = cleanText.match(/(?:made\s*in|country\s*of\s*origin|product\s*of)[\s:;.-]+([a-zA-Z\s]+?)(?:,|\.|\n|$)/i);
  if (originMatch) extracted.countryOfOrigin = originMatch[1].trim();

  // 10. Batch Number
  const batchMatch = cleanText.match(/(?:style|batch|lot)[\s:;.-]+([a-zA-Z0-9-]+)/i);
  if (batchMatch) extracted.batchNumber = batchMatch[1].trim();

  return extracted;
};

module.exports = {
  extractInformation
};
