import spacy
from spacy.training import Example
from spacy.util import minibatch, compounding
import pandas as pd
import json
import os
import random

DATA_FILE = r"c:\Users\PRAJWAL\Downloads\pro\converted_invoice_dataset.xlsx"
MODEL_OUTPUT_DIR = "./model"

# Map dataset keys to our application's expected schema keys
KEY_MAPPING = {
    "INVOICE_NUMBER": "invoice_number",
    "DATE": "invoice_date",
    "TOTAL_AMOUNT": "total_invoice_value",
    "BILL_TO": "importer_name",
    "BILLED_TO": "importer_name",
    "TAX": "tax_amount",
    "SUBTOTAL": "subtotal_amount"
}

def prepare_training_data():
    """
    Read Kaggle Excel dataset and yield (text, {"entities": [(start, end, label)]})
    """
    print(f"Loading dataset from {DATA_FILE}...")
    if not os.path.exists(DATA_FILE):
        print(f"Dataset not found at {DATA_FILE}. Please ensure it exists.")
        return []
    
    try:
        df = pd.read_excel(DATA_FILE)
    except Exception as e:
        print(f"Error reading Excel: {e}")
        return []
        
    train_data = []
    
    for idx, row in df.iterrows():
        text = str(row['Input'])
        try:
            output_json = json.loads(str(row['Final_Output']))
        except:
            continue
            
        entities = []
        for key, val in output_json.items():
            val_str = str(val).strip()
            if not val_str:
                continue
                
            # Find all occurrences of the value string in the text
            start = text.find(val_str)
            if start != -1:
                end = start + len(val_str)
                # Map label if it exists in KEY_MAPPING, else lowercase the key
                label = KEY_MAPPING.get(key, key.lower())
                entities.append((start, end, label))
                
        # Filter overlapping entities (spaCy doesn't allow overlaps)
        # Sort by start index, then by length (longest first)
        entities.sort(key=lambda x: (x[0], -(x[1] - x[0])))
        filtered_entities = []
        last_end = -1
        for start, end, label in entities:
            if start >= last_end: # No overlap
                filtered_entities.append((start, end, label))
                last_end = end
                
        if filtered_entities:
            train_data.append((text, {"entities": filtered_entities}))
            
    print(f"Successfully processed {len(train_data)} training examples.")
    return train_data

def train_model():
    train_data = prepare_training_data()
    
    if not train_data:
        print("No valid training data found. Exiting.")
        return

    print("Initializing blank English model...")
    nlp = spacy.blank("en")
    
    if "ner" not in nlp.pipe_names:
        ner = nlp.add_pipe("ner", last=True)
    else:
        ner = nlp.get_pipe("ner")

    # Add labels to the NER component
    labels_added = set()
    for _, annotations in train_data:
        for ent in annotations.get("entities"):
            label = ent[2]
            if label not in labels_added:
                ner.add_label(label)
                labels_added.add(label)
                
    print(f"Added {len(labels_added)} unique labels: {labels_added}")
    print("Starting training loop...")
    
    optimizer = nlp.begin_training()
    
    # Disable other pipes during training if they existed (not needed for blank model, but good practice)
    other_pipes = [pipe for pipe in nlp.pipe_names if pipe != "ner"]
    with nlp.disable_pipes(*other_pipes):
        epochs = 15
        for itn in range(epochs):
            random.shuffle(train_data)
            losses = {}
            # Batch the examples using spaCy's minibatch
            batches = minibatch(train_data, size=compounding(4.0, 32.0, 1.001))
            
            for batch in batches:
                examples = []
                for text, annotations in batch:
                    doc = nlp.make_doc(text)
                    example = Example.from_dict(doc, annotations)
                    examples.append(example)
                nlp.update(examples, drop=0.35, sgd=optimizer, losses=losses)
                
            print(f"Epoch {itn+1}/{epochs} - Loss: {losses.get('ner', 0):.4f}")

    if not os.path.exists(MODEL_OUTPUT_DIR):
        os.makedirs(MODEL_OUTPUT_DIR)
    
    nlp.to_disk(MODEL_OUTPUT_DIR)
    print(f"Model successfully saved to {os.path.abspath(MODEL_OUTPUT_DIR)}")

if __name__ == "__main__":
    train_model()
