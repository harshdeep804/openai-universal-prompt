import Head from "next/head";
import { useState } from "react";
import styles from "./index.module.css";

export const getBase64 = () => {
  const img = document.getElementById("img");
  const canvas = document.getElementById("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const context = canvas.getContext("2d");
  if (context && img) {
    img.onload = () => {
      context.drawImage(img, 0, 0);
    };
  }
  const dataURL = canvas.toDataURL("image/png");
  return dataURL;
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState();
  const [image, setImage] = useState();

  async function onSubmit(event) {
    event.preventDefault();
    try {
      setResult('');
      
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, image, mask: image && await getBase64() }),
      });

      const data = await response.json();
      if (response.status !== 200) {
        setResult();
        throw data.error || new Error(`Request failed with status ${response.status}`);
      }

      setResult(data);
      setQuery("");
    } catch(error) {
      console.error(error);
      setResult();
      alert(error.message);
    }
  }

  const readFile = (e) => {
    if(e.target.files && e.target.files[0]){
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImage(ev.target.result); 
      }
      reader.readAsDataURL(e.target.files[0]);
    }
  }

  return (
    <div>
      <Head>
        <title>OpenAPI All-in-one Prompt</title>
      </Head>

      <main className={styles.main}>
        <form onSubmit={onSubmit}>
          <textarea
            name="query"
            placeholder="Enter your query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div>
            <label htmlFor="image">
              Upload Image
            </label>
            <input id="image" type="file" onChange={readFile} style={{ display: 'none' }} />            
          </div>
          <input type="submit" value="Generate Response" />
        </form>
        {image && <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <p>Preview:</p>
          <img id="img" src={image} alt="Preview" style={{ maxHeight: '300px', maxWidth: '90%' }} />
          <canvas id="canvas" style={{ display: 'none' }}></canvas>
        </div>}
        {result && (
          result === '' ? <div className={styles.query}>Loading...</div> : 
          (<>
            <div className={styles.query}>{result?.query}</div>
              {result?.type === 'Image' 
                ? <div style={{ textAlign: 'center', marginTop: '40px' }}>
                    <p>Generated:</p>
                    <img src={result?.result} alt="Response image" style={{ maxHeight: '300px', maxWidth: '90%' }} />
                  </div> 
                : <pre className={styles.result}>
                  {result?.result}
                  </pre>
              }
          </>)
        )}
      </main>
    </div>
  );
}
