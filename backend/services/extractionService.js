const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

/**
 * Categorize product based on product name and keywords with strict word boundaries
 */
const detectProductCategory = (productName, text) => {
  const pName = (productName || '').toLowerCase();
  const raw = (text || '').toLowerCase();

  // 1. Apparel, Textiles & Footwear (Check product name first for highest precision)
  if (/\b(t-?shirt|shirts?|pants?|trousers?|jeans|saree|garment|jacket|hoodie|socks?|footwear|shoes?|sandals?|towels?|bedsheets?|fabric|apparel|textiles?|kurti|kurta|shorts?)\b/i.test(pName) ||
      /\b(t-?shirt|shirts?|pants?|trousers?|jeans|saree|garment|hoodie|footwear|sandals?|towels?|bedsheets?|textiles?|kurti|kurta)\b/i.test(raw)) {
    return 'Apparel & Textiles';
  }

  // 2. Food & Beverages
  if (/\b(rice|flour|atta|wheat|dal|pulses?|oil|ghee|butter|milk|biscuit|cookies?|snack|chips?|namkeen|spices?|masala|tea|coffee|juice|water|sauce|jam|noodles?|pasta|chocolates?|candies?|candy|sweets?|sugar|salt|fssai|edible|bhujiya|aloo)\b/i.test(pName) ||
      /\b(rice|atta|wheat|dal|ghee|biscuit|namkeen|masala|fssai|edible oil|nutritional facts?|best before)\b/i.test(raw)) {
    return 'Food & Beverages';
  }

  // 3. Cosmetics & Personal Care
  if (/\b(shampoo|soap|creams?|lotions?|serum|perfume|deodorant|toothpaste|face\s*wash|sunscreen|conditioner|hair\s*oil|cosmetics?|makeup|lipstick|powder)\b/i.test(pName) ||
      /\b(shampoo|toothpaste|face\s*wash|sunscreen|conditioner|hair\s*oil|cosmetic)\b/i.test(raw)) {
    return 'Cosmetics & Personal Care';
  }

  // 4. Electronics & Appliances
  if (/\b(mobile|phone|laptop|cables?|chargers?|adapters?|batteries?|battery|earphones?|headphones?|led|bulb|socket|appliance|electronics?)\b/i.test(pName) ||
      /\b(watt|voltage|\bmah\b|charger|earphone|headphone)\b/i.test(raw)) {
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
    rawText: text || ''
  };

  // Attempt to use Gemini LLM Multimodal if API Key is configured
  if (process.env.GEMINI_API_KEY && imagePath && fs.existsSync(imagePath)) {
    const CANDIDATE_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
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
       - "productName": Generic or common name of the commodity (e.g. "T-SHIRT XXL", "Aloo Bhujiya").
       - "productCategory": One of the 5 categories above.
       - "netQuantity": Net weight, volume, or count with standard metric units (e.g., "500 g", "1 L", "1 N").
       - "mrp": Maximum Retail Price with currency and taxes (e.g., "₹ 999.00 (incl. of all taxes)").
       - "unitSalePrice": Unit Sale Price per g/kg/ml/L/piece (e.g., "₹0.50 per g").
       - "dimensions": Size or dimensions (e.g., "58.3 cm", "Size M", "Size 42").
       - "manufacturer": Full name of manufacturer, packer, or marketer.
       - "address": Complete address with street, city, state, and pin code.
       - "batchNumber": Batch / Lot / Style number.
       - "manufacturingDate": Month and Year of manufacture or packing (e.g., "February 2022", "04/2023").
       - "consumerCare": Contact details (phone, email, address) for consumer complaints.
       - "countryOfOrigin": Country of origin or manufacture (e.g. "India").
       - "prohibitedWords": Any misleading words near quantity (e.g. "jumbo", "extra", "average").
       - "rawText": Full string transcription of ALL readable text on the label.

    Return ONLY a raw JSON object with these keys (do not wrap in markdown or backticks):
    "productName", "productCategory", "netQuantity", "mrp", "unitSalePrice", "dimensions", "manufacturer", "address", "batchNumber", "manufacturingDate", "consumerCare", "countryOfOrigin", "prohibitedWords", "rawText".
    `;

    for (const model of CANDIDATE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [imagePart, prompt],
        });
        
        let jsonText = (response.text || '').trim();
        if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        }
        
        const parsed = JSON.parse(jsonText);

        if (!parsed.productCategory || parsed.productCategory === 'Not detected') {
          parsed.productCategory = detectProductCategory(parsed.productName, parsed.rawText || text);
        }

        return { ...extracted, ...parsed };
      } catch (err) {
        console.warn(`Gemini model ${model} extraction attempt failed:`, err.message);
      }
    }
  }

  // Fallback Regex Extraction Engine
  if (!text) return extracted;

  const cleanText = text.replace(/\|/g, 'I');
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  extracted.rawText = text;

  // 1. Product Name
  const pMatch = cleanText.match(/(?:product|item|commodity|name)\s*[:;.-]+\s*([^\n\r,]+)/i);
  if (pMatch) {
    extracted.productName = pMatch[1].replace(/(?:colour|color|net|qty|m\.?r\.?p|size|weight|style)[\s:;.-].*$/i, '').trim();
  } else {
    const prominentMatch = lines.find(l => {
      const lower = l.toLowerCase();
      if (/(net|qty|weight|batch|mfg|pkd|date|mrp|m\.r\.p|best|expir|nutrition|address|contact|email|care|fssai|barcode|line\s*\d)/i.test(lower)) return false;
      return l.length >= 3 && l.length <= 40;
    });
    if (prominentMatch) {
      extracted.productName = prominentMatch.replace(/^[^\w]+|[^\w]+$/g, '').trim();
    }
  }

  // 2. Product Category
  extracted.productCategory = detectProductCategory(extracted.productName, text);

  // 3. Net Quantity
  const qtyMatch = text.match(/(?:net\s*(?:quantity|weight|qty|volume|vol|count)|quantity|weight)\s*[:;.-]*\s*([0-9]+(?:\.[0-9]+)?\s*(?:kg|g|gm|gms|mg|l|ltr|litres?|ml|piece|pieces|pcs|pc|units?|u|n|items?)\b)/i);
  if (qtyMatch) {
    extracted.netQuantity = qtyMatch[1].trim();
  } else {
    const simpleQty = text.match(/\b([0-9]+(?:\.[0-9]+)?\s*(?:kg|g|gm|ml|ltr|l|pcs|piece|n))\b/i);
    if (simpleQty) extracted.netQuantity = simpleQty[1].trim();
  }

  // 4. MRP
  const mrpMatch = text.match(/(?:m\.?r\.?p\.?|max(?:imum)?\s*retail\s*price|retail\s*price|price)[\s\S]{0,40}?(?:₹|rs\.?|inr)?\s*([0-9]+(?:[.,][0-9]{2})?)/i);
  if (mrpMatch) {
    let amt = mrpMatch[1].replace(',', '.');
    extracted.mrp = `₹ ${amt} (incl. of all taxes)`;
  }

  // 5. Unit Sale Price (USP)
  const uspMatch = text.match(/(?:unit\s*(?:sale\s*)?price|usp)\s*[:;.-]*\s*([₹rs\.]*\s*[0-9]+(?:[.,][0-9]{2})?\s*(?:\/|per)\s*[a-z0-9]+)/i);
  if (uspMatch) {
    extracted.unitSalePrice = uspMatch[1].trim();
  }

  // 6. Dimensions / Size
  const dimMatch = text.match(/(?:size|dimensions?|dim)\s*[:;.-]*\s*([0-9]+(?:\.[0-9]+)?\s*(?:cm|mm|m|inch(?:es)?)\s*(?:[xX*]\s*[0-9]+(?:\.[0-9]+)?\s*(?:cm|mm|m|inch(?:es)?)?)*|[0-9]+(?:\.[0-9]+)?\s*(?:cm|mm|m)\b|\b(?:XXS|XS|S|M|L|XL|XXL|XXXL|[2-5]XL)\b)/i);
  if (dimMatch) {
    extracted.dimensions = dimMatch[1].trim();
  }

  // 7. Manufacturing Date
  const dateMatch = text.match(/(?:month\s*&\s*year\s*of\s*(?:manufacture|import|packing|mfg)|mfg\s*date|pkd\s*date|date\s*of\s*(?:mfg|packing)|mfg|pkd)\s*[:;.-]*\s*([a-zA-Z]+\s+[0-9]{4}|[0-9]{1,2}[\/\-.][0-9]{2,4}|[0-9]{2,4}[\/\-.][0-9]{1,2})/i);
  if (dateMatch) {
    extracted.manufacturingDate = dateMatch[1].trim();
  }

  // 8. Manufacturer & Address
  const mfgBlock = text.match(/(?:manufactured|packed|marketed|licensed|imported)(?:\s*(?:\/|&|and)\s*(?:manufactured|packed|marketed|licensed|imported))*\s*by\s*[:;.-]*\s*([^\n\r]+(?:\n[^\n\r]+)?)/i);
  if (mfgBlock) {
    const rawMfg = mfgBlock[1].trim();
    const addrPin = rawMfg.match(/(?:(?:pvt\.?\s*ltd\.?|limited|llp|inc\.?|corporation|industries)[\s,]+)([\s\S]+)/i);
    if (addrPin) {
      extracted.manufacturer = rawMfg.substring(0, rawMfg.indexOf(addrPin[1])).replace(/,$/, '').trim();
      extracted.address = addrPin[1].trim();
    } else {
      extracted.manufacturer = rawMfg.split('\n')[0].trim();
    }
  } else {
    const brandCandidate = lines.find(l => /(?:pvt\.?\s*ltd|limited|corporation|industries|guru|enterprises)/i.test(l));
    if (brandCandidate) {
      extracted.manufacturer = brandCandidate.replace(/^[^\w]+|[^\w]+$/g, '').trim();
    }
  }

  // Standalone address check if not detected yet
  if (extracted.address === 'Not detected') {
    const addrMatch = text.match(/(?:address\s*(?:line\s*\d+)?[:;.-]*\s*|\b(?:at|plot\s*no|sector|road|centra|nagar|industrial\s*area)\b[\s\S]{0,10}?)([^.\n]+(?:,\s*[^.\n]+){1,3}(?:[0-9]{6}|india)?)/i);
    if (addrMatch) {
      extracted.address = addrMatch[0].trim();
    } else {
      const addrLine = lines.filter(l => /address\s*line|vadodara|gujarat|mumbai|delhi|bangalore|gurgaon|haryana/i.test(l));
      if (addrLine.length > 0) {
        extracted.address = addrLine.join(', ');
      }
    }
  }

  // 9. Consumer Care
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
  const phoneMatch = text.match(/(?:(?:call|contact|ph|tel|phone|helpline)[\s:;.-]*)?(\b(?:0[0-9]{2,4}[-\s]?[0-9]{6,8}|1800[-\s]?[0-9]{3}[-\s]?[0-9]{3,4}|[6-9][0-9]{9})\b)/i);
  if (emailMatch && phoneMatch) {
    extracted.consumerCare = `${phoneMatch[1]}, ${emailMatch[0]}`;
  } else if (emailMatch) {
    extracted.consumerCare = emailMatch[0];
  } else if (phoneMatch) {
    extracted.consumerCare = phoneMatch[1];
  }

  // 10. Country of Origin
  const originMatch = text.match(/(?:made\s*in|country\s*of\s*origin|origin|product\s*of)\s*[:;.-]*\s*([a-zA-Z\s]+?)(?:[\n\r,.]|$)/i);
  if (originMatch) {
    extracted.countryOfOrigin = originMatch[1].trim();
  }

  // 11. Batch / Style Number
  const batchMatch = text.match(/(?:style|batch\s*(?:no\.?|number)?|lot\s*(?:no\.?|number)?)\s*[:;.-]*\s*([a-zA-Z0-9-]+)/i);
  if (batchMatch) {
    extracted.batchNumber = batchMatch[1].trim();
  }

  return extracted;
};

module.exports = {
  extractInformation,
  detectProductCategory
};
