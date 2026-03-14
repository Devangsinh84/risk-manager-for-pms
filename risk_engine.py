import logging
import PyPDF2
from typing import Optional
import json
import re
import requests

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ---> PASTE YOUR FINE-GRAINED HF TOKEN HERE <---
HF_TOKEN = "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" 

class RiskAnalyzerEngine:
    def __init__(self):
        logger.info("Initializing Hugging Face Router API...")
        
        # Updated to the brand new router URL the error message asked for!
        self.api_url = "https://router.huggingface.co/v1/chat/completions"
        
        self.headers = {
            "Authorization": f"Bearer {HF_TOKEN}", # Keep your fine-grained token here!
            "Content-Type": "application/json"
        }
        self.model_id = "Qwen/Qwen2.5-7B-Instruct"

    def extract_text(self, pdf_file) -> Optional[str]:
        try:
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            document_text = "".join(
                [page.extract_text() + "\n" for page in pdf_reader.pages if page.extract_text()]
            )
            return document_text[:1500].strip() if document_text else None
        except Exception as e:
            logger.error(f"Error extracting text: {repr(e)}")
            return None

    def analyze(self, document_text: str) -> dict:
        # The Enterprise Prompt: Forces deep analysis and strict, massive JSON
        prompt_content = f"""You are a Senior Enterprise Risk Analyst. Perform a deep, comprehensive risk analysis on the provided project report.
        
You MUST respond ONLY with a valid JSON object. Do not add markdown, greetings, or extra text.

Format your response EXACTLY like this strict JSON schema:
{{
    "ExecutiveSummary": "A 2-sentence high-level summary of the overall project health and primary threats.",
    "OverallRiskScore": <An integer from 1 to 100 representing total project risk>,
    "IdentifiedRisks": [
        {{
            "RiskName": "...",
            "Category": "...", 
            "Probability": <Integer 1-10>,
            "Impact": <Integer 1-10>,
            "Description": "Detailed explanation of the risk...",
            "AffectedDepartments": ["...", "..."],
            "RecommendedAction": "Specific, actionable mitigation step..."
        }}
    ]
}}

Ensure you extract at least 3 to 5 distinct risks. If the text is short, extrapolate logical risks.

Document Text:
{document_text}"""
        
        payload = {
            "model": self.model_id,
            "messages": [
                {"role": "system", "content": "You are an expert AI data extractor. You only output valid, strictly formatted JSON."},
                {"role": "user", "content": prompt_content}
            ],
            "max_tokens": 1500, # Increased massively to allow for the larger deep-dive response
            "temperature": 0.2
        }
        
        try:
            response = requests.post(self.api_url, headers=self.headers, json=payload, timeout=120)
            
            if not response.ok:
                error_msg = response.text
                logger.error(f"HF API Rejected: {error_msg}")
                return {"API Error": {"Description": error_msg[:150], "Severity": 10, "Mitigation": "Check logs."}}
                
            raw_response = response.json()['choices'][0]['message']['content']
            logger.info(f"Raw AI Output: \n{raw_response}") 
            
            match = re.search(r'\{[\s\S]*\}', raw_response)
            
            if match:
                clean_json_str = match.group(0)
                return json.loads(clean_json_str)
            else:
                return {"Error": {"Description": "AI failed to format JSON.", "Severity": 0, "Mitigation": "Try again."}}
                
        except Exception as e:
            logger.error(f"HTTP Connection Error: {repr(e)}")
            return {
                "Cloud API Connection Error": {
                    "Description": str(e)[:150], 
                    "Severity": 10, 
                    "Mitigation": "Network failure. Try again."
                }
            }
            
    def ask_question(self, document_text: str, question: str) -> str:
        payload = {
            "model": self.model_id,
            "messages": [
                {"role": "system", "content": "Answer the user's question concisely using only the provided document text. If the answer is not in the text, say 'I cannot find this in the document.'"},
                {"role": "user", "content": f"Document Text:\n{document_text[:1500]}\n\nQuestion: {question}"}
            ],
            "max_tokens": 200,
            "temperature": 0.3
        }
        
        try:
            response = requests.post(self.api_url, headers=self.headers, json=payload, timeout=120)
            if not response.ok:
                return f"API Error: {response.text}"
            return response.json()['choices'][0]['message']['content'].strip()
        except Exception as e:
            return "Error connecting to the chat model."