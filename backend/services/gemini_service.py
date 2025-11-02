import os
import google.generativeai as genai
from PIL import Image
import io

class GeminiService:
    def __init__(self):
        api_key = os.getenv('GEMINI_API_KEY')
        self.model = None
        
        if api_key:
            try:
                genai.configure(api_key=api_key)
                # Try to use the latest model, fallback to gemini-pro-vision
                try:
                    self.model = genai.GenerativeModel('gemini-1.5-flash')
                except:
                    try:
                        self.model = genai.GenerativeModel('gemini-pro-vision')
                    except:
                        print("Warning: Could not initialize Gemini model")
                        self.model = None
            except Exception as e:
                print(f"Warning: Gemini API initialization failed: {str(e)}")
                self.model = None
        else:
            print("Warning: GEMINI_API_KEY not found. Using fallback descriptions.")
    
    def get_insights(self, disease: str, confidence: float, image: Image.Image) -> tuple[str, str]:
        """
        Get disease description and recommendations from Gemini API.
        Returns (description, recommendation)
        """
        if self.model is None:
            raise Exception("Gemini model not available")
            
        try:
            # Prepare prompt
            prompt = f"""
            Analyze this maize leaf image that has been classified as: {disease} (confidence: {confidence:.2%}).
            
            Provide:
            1. A detailed description of this disease condition (2-3 sentences)
            2. Specific treatment recommendations for farmers (3-4 bullet points)
            
            Format your response as:
            DESCRIPTION: [your description here]
            RECOMMENDATIONS: [your recommendations here]
            """
            
            # Convert PIL Image to bytes for Gemini
            img_bytes = io.BytesIO()
            image.save(img_bytes, format='JPEG')
            img_bytes.seek(0)
            img_pil = Image.open(img_bytes)
            
            # Call Gemini API
            response = self.model.generate_content([prompt, img_pil])
            text = response.text if hasattr(response, 'text') else str(response)
            
            # Parse response
            if 'DESCRIPTION:' in text and 'RECOMMENDATIONS:' in text:
                parts = text.split('RECOMMENDATIONS:')
                description = parts[0].replace('DESCRIPTION:', '').strip()
                recommendation = parts[1].strip()
            else:
                # Fallback parsing
                lines = text.split('\n')
                description = lines[0] if lines else f"This maize leaf shows signs of {disease}."
                recommendation = '\n'.join(lines[1:]) if len(lines) > 1 else "Consult with an agricultural expert for specific treatment."
            
            return description, recommendation
            
        except Exception as e:
            print(f"Gemini API error: {str(e)}")
            # Return fallback descriptions
            fallback_description = f"This maize leaf has been identified as {disease} with {confidence:.1%} confidence. The image shows visible symptoms that may indicate this condition."
            fallback_recommendation = f"For {disease}, consider: 1) Remove affected leaves to prevent spread, 2) Apply appropriate fungicides or pesticides as recommended by agricultural experts, 3) Ensure proper crop rotation and field sanitation, 4) Monitor other plants for early signs."
            return fallback_description, fallback_recommendation

