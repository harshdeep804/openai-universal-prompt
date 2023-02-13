import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export const dataType64toFile = (b64Data, filename) => {
  const mime = "image/png";
  const bstr = atob(b64Data);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  const newFile = new File([u8arr], filename, {
    type: mime,
  });
  return newFile;
};

export default async function (req, res) {
  if (!configuration.apiKey) {
    res.status(500).json({
      error: {
        message: "OpenAI API key not configured, please follow instructions in README.md",
      }
    });
    return;
  }

  const query = req.body.query || '';
  
  if (!req.body.image && query.trim().length === 0) {
    res.status(400).json({
      error: {
        message: "Please enter a valid query string",
      }
    });
    return;
  }

  try {
    const completion = req.body.image ? {
      data: {
        choices: [
          {
            text: 'Image'
          }
        ]
      }
    } : await openai.createCompletion({
      model: "text-davinci-003",
      prompt: 
        `
        Deduce if the following string is requesting an image, code or text-based answer? Answer should be [Image, Code, Text].
        
        ${query}
        `,
      temperature: 0.25,
      max_tokens: 5,
    });

    if (completion.data.choices[0].text?.includes('Text')) {
      const temperature = 0.75;
      const max_tokens = 2000;

      const completion = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: query,
        temperature,
        max_tokens,
      });
      res.status(200).json({ query, result: completion.data.choices[0].text, type: 'Text' });
    } else if (completion.data.choices[0].text?.includes('Image')) {
      if (req.body.image) {
        const buffer = Buffer.from(req.body.image.replace(/^data:image\/(png);base64,/, ""), 'base64');
        buffer.name = 'file.png';
          
        if (query.trim().length === 0) {
          const response = await openai.createImageVariation(buffer);
          const image_url = response.data.data[0].url;
          res.status(200).json({ query, result: image_url, type: 'Image' });
        } else {          
          const mask = Buffer.from(req.body.mask.replace(/^data:image\/(png);base64,/, ""), 'base64');
          buffer.name = 'mask.png';

          const response = await openai.createImageEdit(
            buffer,
            mask,
            query,
          );
          const image_url = response.data.data[0].url;
          res.status(200).json({ query, result: image_url, type: 'Image' });
        }
      } else {        
          const response = await openai.createImage({
            prompt: query,
          });
          const image_url = response.data.data[0].url;
          res.status(200).json({ query, result: image_url, type: 'Image' });        
      }
    } else if (completion.data.choices[0].text?.includes('Code')) {
      const temperature = 0.2;
      const max_tokens = 2000;

      const completion = await openai.createCompletion({
        model: "code-davinci-002",
        prompt: query,
        temperature,
        max_tokens,
      });
      res.status(200).json({ query, result: completion.data.choices[0].text, type: 'Code' });
    }
    
  } catch(error) {
    // Consider adjusting the error handling logic for your use case
    if (error.response) {
      console.error(error.response.status, error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else {
      console.error(`Error with OpenAI API request: ${error.message}`);
      res.status(500).json({
        error: {
          message: 'An error occurred during your request.',
        }
      });
    }
  }
}
