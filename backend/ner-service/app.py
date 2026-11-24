from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import spacy
import os

app = FastAPI(title="CustomsGuardian NER Service")

# Load model if it exists, otherwise use a blank model (or just return empty fields for the stub)
MODEL_DIR = "./model"
if os.path.exists(MODEL_DIR):
    try:
        nlp = spacy.load(MODEL_DIR)
    except Exception as e:
        print(f"Error loading model: {e}")
        nlp = None
else:
    print("Model not found. Run train.py to train the custom NER model on Kaggle data.")
    nlp = None

class ExtractRequest(BaseModel):
    text: str
    documentType: str

class ExtractResponse(BaseModel):
    data: dict

@app.post("/extract", response_model=ExtractResponse)
async def extract_entities(req: ExtractRequest):
    if not nlp:
        # Stub response if model isn't trained yet
        return ExtractResponse(data={})

    doc = nlp(req.text)
    
    extracted_data = {}
    for ent in doc.ents:
        # ent.label_ should match our schema (e.g., 'invoice_number', 'exporter_name')
        label = ent.label_
        
        # Simple merging (in reality, you'd want better conflict resolution)
        if label not in extracted_data:
            extracted_data[label] = ent.text
        else:
            extracted_data[label] += " " + ent.text

    return ExtractResponse(data=extracted_data)

@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": nlp is not None}
