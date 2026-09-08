const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

/**
 * Categorize product based on product name and keywords
 */
const detectProductCategory = (productName, text) => {
  const combined = `${productName || ''} ${text || ''}`.toLowerCase();

  // 1. Apparel, Textiles & Footwear
  if (/(t-?shirt|shirt|pant|trouser|jeans|dress|saree|garment|jacket|hoodie|sock|footwear|shoe|sandal|towel|bedsheet|fabric|linen|cloth|curtain|blanket|apparel|textile|kurti|suit|kurta)/i.test(combined)) {
    return 'Apparel & Textiles';
  }

  // 2. Food & Beverages
  if (/(rice|flour|atta|wheat|dal|pulse|oil|ghee|butter|milk|biscuit|cookie|snack|chip|namkeen|spice|masala|tea|coffee|juice|water|sauce|jam|noodle|pasta|chocolate|candy|sweet|sugar|salt|fssai|edible)/i.test(combined)) {
    return 'Food & Beverages';
  }

  // 3. Cosmetics & Personal Care
  if (/(shampoo|soap|cream|lotion|serum|perfume|deodorant|toothpaste|face\s*wash|sunscreen|conditioner|hair\s*oil|cosmetic|makeup|lipstick|powder)/i.test(combined)) {
    return 'Cosmetics & Personal Care';
  }

  // 4. Electronics & Hardware
  if (/(mobile|phone|laptop|cable|charger|adapter|battery|earphone|headphone|bulb|led|plug|socket|wire|hardware|tool|fan|iron|appliance|electronic)/i.test(combined)) {
    return 'Electronics & Appliances';
  }

  return 'General Packaged Commodity';
};

const extractInformation = async (text, imagePath) => {
  const extracted = {
    productName: 'Not detected',
    productCategory: 'General Packaged Commodity',
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
      Analyze this product label image.
      
      1. Categorize the product into ONE of these exact categories:
         - "Apparel & Textiles" (clothing, fabrics, bedsheets, shoes, towels)
         - "Food & Beverages" (edible commodities, groceries, snacks, drinks, spices)
         - "Cosmetics & Personal Care" (beauty, grooming, soap, shampoo, lotions)
         - "Electronics & Appliances" (devices, cables, bulbs, hardware)
         - "General Packaged Commodity" (household, chemicals, stationary, etc.)

      2. Extract statutory compliance fields (use "Not detected" if missing):
         - "productName": Generic or common name of the commodity.
         - "productCategory": One of the 5 categories above.
         - "netQuantity": Net weight, volume, or count with standard metric units (e.g., "500 g", "1 L", "1 N").
         - "mrp": Maximum Retail Price with currency and taxes (e.g., "₹ 250 (incl. of all taxes)").
         - "unitSalePrice": Unit Sale Price per g/kg/ml/L/piece (e.g., "₹0.50 per g").
         - "dimensions": Size or dimensions (e.g., "100 cm x 50 cm", "Size M", "Size 42").
         - "manufacturer": Full name of manufacturer, packer, or marketer.
         - "address": Complete address with street, city, state, and pin code.
         - "batchNumber": Batch / Lot / Style number.
         - "manufacturingDate": Month and Year of manufacture or packing (e.g., "04/2023").
         - "consumerCare": Contact details (phone, email, address) for consumer complaints.
         - "countryOfOrigin": Country of origin or manufacture.
         - "prohibitedWords": Any misleading words near quantity (e.g. "jumbo", "extra", "average").
         - "rawText": Full string transcription of ALL readable text on the label.

      Return ONLY a raw JSON object with these keys (do not wrap in markdown or backticks):
      "productName", "productCategory", "netQuantity", "mrp", "unitSalePrice", "dimensions", "manufacturer", "address", "batchNumber", "manufacturingDate", "consumerCare", "countryOfOrigin", "prohibitedWords", "rawText".
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

      // Ensure fallback categorization if Gemini returned empty
      if (!parsed.productCategory || parsed.productCategory === 'Not detected') {
        parsed.productCategory = detectProductCategory(parsed.productName, parsed.rawText || text);
      }

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

  // 2. Detect Product Category
  extracted.productCategory = detectProductCategory(extracted.productName, cleanText);

  // 3. Net Quantity
  const qtyMatch = text.match(/(?:net\s*quantity|net\s*weight|net\s*qty|quantity|weight|qty)[\s:;.-]+([a-z0-9\s.]+)/i);
  if (qtyMatch) extracted.netQuantity = qtyMatch[1].trim();

  // 4. MRP
  const mrpMatch = text.match(/(?:m\.?r\.?p\.?|max\.\s*retail\s*price|price)[\s:;.-]*([₹rs\.]*\s*\d+[.,]?\d*(?:\/-)?)/i);
  if (mrpMatch) {
    let price = mrpMatch[1].trim();
    if (!price.includes('₹') && !price.toLowerCase().includes('rs')) {
      price = '₹ ' + price;
    }
    extracted.mrp = price;
  }

  // 5. Unit Sale Price (USP)
  const uspMatch = cleanText.match(/(?:unit\s*sale\s*price|usp|unit\s*price)[\s:;.-]*([₹rs\.]*\s*\d+[.,]?\d*\s*(?:\/|per)\s*[a-zA-Z0-9]+)/i);
  if (uspMatch) extracted.unitSalePrice = uspMatch[1].trim();

  // 6. Dimensions
  const dimMatch = cleanText.match(/(?:dimensions?|size)[\s:;.-]+(\d+(?:\.\d+)?\s*(?:cm|mm|m)\s*[xX*]\s*\d+(?:\.\d+)?\s*(?:cm|mm|m)?(?:\s*[xX*]\s*\d+(?:\.\d+)?\s*(?:cm|mm|m)?)?|\b[SMLX]{1,3}\b|\b(?:size\s*\d+)\b)/i);
  if (dimMatch) extracted.dimensions = dimMatch[1].trim();

  // 7. Manufacturing Date
  const dateMatch = text.match(/(?:month\s*&\s*year\s*of\s*manufacture|manufacture|mfg\s*date|mfg|pkd)[\s:;.-]+([a-zA-Z]+\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}\s+[a-zA-Z]+\s+\d{2,4})/i);
  if (dateMatch) extracted.manufacturingDate = dateMatch[1].trim();

  // 8. Manufacturer
  const mfgMatch = cleanText.match(/(?:manufactured|marketed|licensed)\s*(?:\/|\s*&\s*|\s*)(?:manufactured|marketed|licensed)?\s*by[\s:;.-]+([^,]+(?:pvt\.?\s*ltd\.?|ltd\.?|inc\.?))/i);
  if (mfgMatch) extracted.manufacturer = mfgMatch[1].trim();

  // 9. Consumer Care
  const careMatch = cleanText.match(/(?:customer\s*complaints|consumer\s*care|feedback|contact)[\s\S]{1,100}?(?:call|contact|e-mail|email|:|-| )[\s\S]{1,50}?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|\d{10,}|0\d{2,4}[-\s]?\d{6,8})/i);
  if (careMatch) extracted.consumerCare = careMatch[1].trim();

  // 10. Country of Origin
  const originMatch = cleanText.match(/(?:made\s*in|country\s*of\s*origin|product\s*of)[\s:;.-]+([a-zA-Z\s]+?)(?:,|\.|\n|$)/i);
  if (originMatch) extracted.countryOfOrigin = originMatch[1].trim();

  // 11. Batch Number
  const batchMatch = cleanText.match(/(?:style|batch|lot)[\s:;.-]+([a-zA-Z0-9-]+)/i);
  if (batchMatch) extracted.batchNumber = batchMatch[1].trim();

  return extracted;
};

module.exports = {
  extractInformation,
  detectProductCategory
};
