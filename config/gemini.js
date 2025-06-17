const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class GeminiService {
  constructor() {
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    this.visionModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  async generateMemeTags(imageBase64) {
    try {
      const prompt = `Analyze this meme image and generate relevant tags for categorization and search. 
      Focus on: meme format, subject matter, emotions, visual elements, popular culture references, and trends.
      Return only a javascript array of tags (maximum 10 tags). 
      Tags must be single worded only.
      Tags should be lowercase, single words.
      Should strictly return a json array.
      Example json format: [funny, reaction, drake, pointing, choice, decision, meme, viral]`;

      const imageParts = [{
        inlineData: {
          data: imageBase64,
          mimeType: 'image/jpeg'
        }
      }];

      const result = await this.visionModel.generateContent([prompt, ...imageParts]);
      const response = await result.response;
      const text = response.text();
      const jsonStringClean = text
      .replace(/^```json\n/, '') // Remove leading ```json\n
      .replace(/\n```$/, ''); 
      console.log("response : ",jsonStringClean)
      
      // Parse tags from response
      const tags = JSON.parse(jsonStringClean)

      return tags;
    } catch (error) {
      console.error('Error generating tags with Gemini:', error);
      // Fallback tags
      return ['meme', 'funny', 'viral', 'internet', 'humor'];
    }
  }

  async getTrendingTag(allTags) {
    try {
      const prompt = `Given this list of meme tags: ${allTags.join(', ')}
      
      Analyze which tag represents the most trending or viral meme concept right now based on:
      - Current internet culture
      - Recent viral trends
      - Popular meme formats
      - Social media buzz
      
      Return array of 10 most trending tags from the list, if list size is smaller than 10 return array of tags sorted in most trending to least trending.
      example format: ["funny", "drake", "reaction", "meme", "viral", "internet", "humor"]`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const trendingTag = response.text().trim().toLowerCase();

      // Verify the returned tag exists in our list
      return allTags.includes(trendingTag) ? trendingTag : allTags[0];
    } catch (error) {
      console.error('Error getting trending tag:', error);
      return allTags[0] || 'meme';
    }
  }

  async traceMemeEvolution(imageBase64) {
    try {
      const prompt = `Analyze this meme image and provide a comprehensive evolution analysis with detailed timeline and impact data.

      Provide information in the following detailed structure:

      1. Origin details (date, platform, description)
      2. Detailed timeline of key events with dates, platforms, and impact levels
      3. Popularity metrics and platform breakdown
      4. Popular variations with descriptions and popularity scores
      5. Cultural impact analysis

      Format your response as a JSON object with the following EXACT structure:
      {
        "origin": {
          "date": "YYYY-MM-DD",
          "platform": "Platform name",
          "description": "Description of first appearance"
        },
        "timeline": [
          {
            "date": "YYYY-MM-DD",
            "event": "Description of event",
            "platform": "Platform name",
            "impact": "low/medium/high"
          }
        ],
        "popularity": {
          "peak_date": "YYYY-MM-DD",
          "total_shares": 1000000,
          "platforms": [
            { "name": "Platform", "shares": 500000 }
          ]
        },
        "variations": [
          {
            "name": "Variation name",
            "description": "Description of variation",
            "popularity": 85
          }
        ],
        "cultural_impact": "Detailed description of cultural significance and impact"
      }

      Make the data realistic and plausible based on the meme format you identify. Include at least 4-6 timeline events, 3-5 platform breakdowns, and 3-4 variations.`;

      const imageParts = [{
        inlineData: {
          data: imageBase64,
          mimeType: 'image/jpeg'
        }
      }];

      const result = await this.visionModel.generateContent([prompt, ...imageParts]);
      const response = await result.response;
      const text = response.text();
      const jsonStringClean = text
        .replace(/^```json\n/, '') // Remove leading ```json\n
        .replace(/\n```$/, '');    // Remove trailing \n```
      
      try {
        const evolutionData = JSON.parse(jsonStringClean);
        
        // Validate the structure and add defaults if needed
        const validatedData = {
          origin: evolutionData.origin || {
            date: '2020-01-01',
            platform: 'Unknown',
            description: 'Origin details not available for this meme format.'
          },
          timeline: Array.isArray(evolutionData.timeline) ? evolutionData.timeline : [
            {
              date: '2020-01-01',
              event: 'Initial appearance online',
              platform: 'Social Media',
              impact: 'low'
            }
          ],
          popularity: evolutionData.popularity || {
            peak_date: '2020-06-01',
            total_shares: 100000,
            platforms: [
              { name: 'Twitter', shares: 50000 },
              { name: 'Instagram', shares: 30000 },
              { name: 'Facebook', shares: 20000 }
            ]
          },
          variations: Array.isArray(evolutionData.variations) ? evolutionData.variations : [
            {
              name: 'Classic Version',
              description: 'The original format as it first appeared',
              popularity: 90
            }
          ],
          cultural_impact: evolutionData.cultural_impact || 'This meme reflects contemporary internet culture and humor patterns.'
        };

        return validatedData;
      } catch (parseError) {
        console.warn('JSON parsing failed, using fallback structure:', parseError.message);
        // Comprehensive fallback structure
        return {
          origin: {
            date: '2020-03-15',
            platform: 'Reddit',
            description: 'First appeared as a reaction meme capturing relatable everyday situations.'
          },
          timeline: [
            {
              date: '2020-03-15',
              event: 'Original meme posted',
              platform: 'Reddit',
              impact: 'low'
            },
            {
              date: '2020-03-18',
              event: 'Gained traction across social media',
              platform: 'Twitter',
              impact: 'medium'
            },
            {
              date: '2020-03-22',
              event: 'Viral spread on visual platforms',
              platform: 'Instagram',
              impact: 'high'
            },
            {
              date: '2020-03-25',
              event: 'Mainstream recognition',
              platform: 'Multiple',
              impact: 'high'
            }
          ],
          popularity: {
            peak_date: '2020-04-01',
            total_shares: 1500000,
            platforms: [
              { name: 'Twitter', shares: 600000 },
              { name: 'Instagram', shares: 450000 },
              { name: 'Facebook', shares: 300000 },
              { name: 'TikTok', shares: 150000 }
            ]
          },
          variations: [
            {
              name: 'Original Format',
              description: 'The classic version as it first appeared',
              popularity: 95
            },
            {
              name: 'Text Variations',
              description: 'Different captions and text overlays',
              popularity: 80
            },
            {
              name: 'Contextual Adaptations',
              description: 'Adapted for different situations and communities',
              popularity: 75
            }
          ],
          cultural_impact: 'This meme format became a versatile tool for expressing relatable situations and emotions, demonstrating the power of visual communication in digital culture.'
        };
      }
    } catch (error) {
      console.error('Error tracing meme evolution:', error);
      throw new Error('Failed to trace meme evolution');
    }
  }

  async generateMemeStorm(ideas) {
    try {
      const prompt = `Based on these ideas: "${ideas}"

Generate creative meme concepts that could be turned into viral memes.
For each concept, provide:
1. A detailed image description for the meme
2. A catchy caption

Generate 5-8 different meme concepts.

Return a JSON array, and nothing else. The structure must be strictly as follows:
[
  {
    "image-description": "detailed description of the meme image",
    "caption": "funny caption for the meme"
  }
]  
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response.candidates[0].content.parts[0].text;
      const jsonStringClean = response
      .replace(/^```json\n/, '') // Remove leading ```json\n
      .replace(/\n```$/, '');    // Remove trailing \n```
      
      try {
        return JSON.parse(jsonStringClean);
      } catch (parseError) {
        // Fallback response
        return [
          {
            "image-description": "A confused looking person pointing at a complex diagram",
            "caption": "Me trying to understand the assignment"
          },
          {
            "image-description": "Drake pointing away from something vs pointing approvingly at something else",
            "caption": "Old trends vs new viral content"
          }
        ];
      }    } catch (error) {
      console.error('Error generating meme storm:', error);
      throw new Error('Failed to generate meme concepts');
    }
  }

  async generateCaptions(imageBase64) {
    try {
      const prompt = `Analyze this image and generate creative, funny, and engaging captions for it.
      
      Generate 8-12 different captions that could work for this image as a meme or social media post.
      
      Consider:
      1. The visual elements and context of the image
      2. Potential meme formats it could fit
      3. Popular internet humor styles
      4. Relatable situations or emotions
      5. Current trends and cultural references
      
      Make the captions:
      - Funny and engaging
      - Varied in style (some short, some longer)
      - Suitable for different contexts
      - Internet culture aware
      
      Return only a JSON array of caption strings:
      ["caption 1", "caption 2", "caption 3", ...]`;

      const imageParts = [{
        inlineData: {
          data: imageBase64,
          mimeType: 'image/jpeg'
        }
      }];

      const result = await this.visionModel.generateContent([prompt, ...imageParts]);
      const response = await result.response;
      const text = response.text();
      const jsonStringClean = text
      .replace(/^```json\n/, '') // Remove leading ```json\n
      .replace(/\n```$/, '');

      try {
        // Try to parse as JSON
        const captions = JSON.parse(jsonStringClean);
        if (Array.isArray(captions)) {
          return captions.slice(0, 12); // Limit to 12 captions max
        }
        throw new Error('Response is not an array');
      } catch (parseError) {
        // Fallback: extract captions from text if JSON parsing fails
        const lines = text.split('\n').filter(line => line.trim());
        const captions = lines
          .map(line => line.replace(/^\d+\.?\s*/, '').replace(/^[-*]\s*/, '').replace(/^["']|["']$/g, '').trim())
          .filter(caption => caption.length > 0 && caption.length <= 200)
          .slice(0, 12);
        
        return captions.length > 0 ? captions : [
          "When life gives you lemons...",
          "That moment when...",
          "Me trying to understand this",
          "It's giving main character energy",
          "POV: You're living your best life"
        ];
      }
    } catch (error) {
      console.error('Error generating captions:', error);
      // Fallback captions
      return [
        "When life gives you lemons...",
        "That moment when everything makes sense",
        "Me trying to understand the assignment", 
        "It's giving main character energy",
        "POV: You're living your best life",
        "This hits different",
        "The accuracy is unmatched",
        "Tell me you relate without telling me you relate"
      ];
    }
  }

  async generateMemeDescription(imageBase64) {
    try {
      const prompt = `Analyze this meme image and generate a concise, engaging description that captures its essence and humor.

    Requirements:
    - Keep it between 20-100 characters
    - Make it engaging and descriptive
    - Capture the main theme or joke
    - Use casual, internet-friendly language
    - Don't include quotes around the description
    - Focus on what makes this meme funny or relatable

    Examples of good descriptions:
    - "Cat staring judgmentally while owner works from home"
    - "When you realize it's Monday but feel like Sunday"
    - "That awkward moment when you wave back at someone waving behind you"
    - "Student pretending to understand advanced calculus"

    Generate a single description only, no additional text:`;

      const imageParts = [{
        inlineData: {
          data: imageBase64,
          mimeType: 'image/jpeg'
        }
      }];

      const result = await this.visionModel.generateContent([prompt, ...imageParts]);
      const response = await result.response;
      let description = response.text().trim();

      // Clean up the response
      description = description
        .replace(/^["']|["']$/g, '') // Remove quotes at start/end
        .replace(/\n/g, ' ') // Replace newlines with spaces
        .trim();

      // Ensure it's not too long
      if (description.length > 100) {
        description = description.substring(0, 97) + '...';
      }

      // Ensure it's not too short
      if (description.length < 10) {
        description = "A humorous meme image";
      }

      return description;

    } catch (error) {
      console.error('Error generating meme description:', error);
      throw new Error('Failed to generate meme description');
    }
  }
}

module.exports = new GeminiService();
