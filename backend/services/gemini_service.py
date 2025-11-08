import os
import google.generativeai as genai  # type: ignore
from PIL import Image  # type: ignore
import io

class GeminiService:
    def __init__(self):
        api_key = os.getenv('GEMINI_API_KEY')
        self.model = None
        
        if api_key:
            try:
                genai.configure(api_key=api_key)
                
                # First, list available models to find the correct one
                available_model_name = None
                try:
                    print("Listing available Gemini models...")
                    models = genai.list_models()
                    available_models = []
                    
                    for m in models:
                        if 'generateContent' in m.supported_generation_methods:
                            # Extract just the model name (remove 'models/' prefix if present)
                            model_name = m.name.replace('models/', '').strip()
                            # Also handle if it's already just the name
                            available_models.append(model_name)
                            print(f"  Found model: {m.name} -> using as: {model_name}")
                    
                    print(f"Available models with generateContent: {available_models[:10]}")
                    
                    # Prioritize vision-capable models
                    preferred_models = [
                        'gemini-1.5-flash',
                        'gemini-1.5-pro',
                        'gemini-pro-vision',
                        'gemini-1.0-pro-vision',
                        'gemini-pro',
                    ]
                    
                    # Find the first available preferred model
                    for preferred in preferred_models:
                        if preferred in available_models:
                            available_model_name = preferred
                            print(f"✅ Found preferred model: {preferred}")
                            break
                    
                    # If no preferred model found, use first available
                    if not available_model_name and available_models:
                        available_model_name = available_models[0]
                        print(f"Using first available model: {available_model_name}")
                        
                except Exception as e:
                    print(f"Could not list models: {str(e)}")
                    print("Will try default model names...")
                
                # Try to initialize with available model, or fallback to defaults
                model_names_to_try = []
                if available_model_name:
                    model_names_to_try = [available_model_name]
                
                # Add fallback options
                model_names_to_try.extend([
                    'gemini-pro-vision',    # Most common vision model
                    'gemini-1.5-flash',
                    'gemini-1.5-pro',
                    'gemini-pro',
                ])
                
                for model_name in model_names_to_try:
                    try:
                        print(f"Attempting to initialize Gemini model: {model_name}")
                        self.model = genai.GenerativeModel(model_name)
                        print(f"✅ Successfully initialized Gemini model: {model_name}")
                        break
                    except Exception as e:
                        error_msg = str(e)
                        print(f"❌ Failed to initialize {model_name}: {error_msg}")
                        # Continue to next model
                        continue
                
                if self.model is None:
                    print("❌ Could not initialize any Gemini model")
                    print("Please check:")
                    print("  1. Your Gemini API key is correct")
                    print("  2. You have access to Gemini API")
                    print("  3. Check backend console for available models list above")
                    
            except Exception as e:
                print(f"Warning: Gemini API initialization failed: {str(e)}")
                self.model = None
        else:
            print("Warning: GEMINI_API_KEY not found. Using fallback descriptions.")
    
    def validate_maize_leaf(self, image: Image.Image) -> tuple[bool, str]:
        """
        Validate if the image is a maize leaf.
        Returns (is_valid_maize_leaf, message)
        """
        if self.model is None:
            # Without Gemini, we can't validate properly
            # Be strict - reject if we can't validate
            print("WARNING: Gemini model not available - rejecting validation")
            return False, "Image validation service is currently unavailable. Please ensure your API key is configured correctly."
        
        try:
            # Prepare validation prompt - very explicit about response format
            prompt = """You are a strict image validator for a maize leaf disease detection system.

TASK: Look at this image and determine if it shows a MAIZE (CORN) LEAF.

FOLLOW THIS EXACT DECISION PROCESS:

Step 1: Is there a plant LEAF visible in this image?
- If NO (person, animal, object, text, background, whole plant, fruit, flower, etc.) → Answer: NOT_A_LEAF
- If YES → Go to Step 2

Step 2: Is this leaf from a MAIZE/CORN plant (Zea mays)?
- If NO (tomato, rice, wheat, soybean, sunflower, any other plant leaf) → Answer: NOT_MAIZE_LEAF
- If YES (it's clearly a maize/corn leaf) → Answer: VALID_MAIZE_LEAF

CRITICAL: You MUST respond with EXACTLY one of these three phrases (copy exactly, no variations):
- VALID_MAIZE_LEAF
- NOT_A_LEAF
- NOT_MAIZE_LEAF

DO NOT add any explanation, punctuation, or other text. Just the phrase.

BE VERY STRICT. Only say VALID_MAIZE_LEAF if you are absolutely certain it's a maize leaf.

Your answer:"""
            
            # Convert PIL Image for Gemini
            img_bytes = io.BytesIO()
            image.save(img_bytes, format='JPEG')
            img_bytes.seek(0)
            img_pil = Image.open(img_bytes)
            
            # Call Gemini API with stricter generation config
            try:
                # Try with generation config first
                generation_config = genai.GenerationConfig(
                    temperature=0.1,  # Lower temperature for more deterministic responses
                    top_p=0.8,
                    top_k=1,  # Only consider top 1 option to get exact match
                )
                
                response = self.model.generate_content(
                    [prompt, img_pil],
                    generation_config=generation_config
                )
            except Exception as e:
                # Fallback: try without generation config
                print(f"Warning: Generation config failed, trying without: {str(e)}")
                response = self.model.generate_content([prompt, img_pil])
            text = response.text if hasattr(response, 'text') else str(response)
            
            # Debug logging
            print(f"=== VALIDATION DEBUG ===")
            print(f"Gemini validation response (raw): {repr(text)}")
            print(f"Gemini validation response (text): {text}")
            
            # Normalize the response text - remove all whitespace and special chars for comparison
            text_upper = "".join(c for c in text.strip().upper() if c.isalnum() or c in ["_", " "])
            text_upper = text_upper.replace(" ", "_")
            
            print(f"Normalized text: {text_upper}")
            
            # Check for valid maize leaf (must contain this exact phrase)
            if "VALID_MAIZE_LEAF" in text_upper:
                print("✅ Validation: Valid maize leaf detected")
                return True, ""
            
            # Check for not a leaf at all
            elif "NOT_A_LEAF" in text_upper or "NOTALEAF" in text_upper:
                print("❌ Validation: Not a leaf detected")
                return False, "This image does not appear to be a leaf. Please upload an image of a maize leaf."
            
            # Check for different leaf (not maize)
            elif "NOT_MAIZE_LEAF" in text_upper or "NOTMAIZELEAF" in text_upper:
                print("❌ Validation: Different leaf detected")
                return False, "This does not appear to be a maize leaf. ZeaWatch only analyzes maize (corn) leaves. Please upload an image of a maize leaf."
            
            # Additional checks for common variations - check individual words
            elif any(phrase in text_upper for phrase in ["NOT_A_MAIZE", "NOTMAIZE", "NOT_MAIZE", "DIFFERENT_PLANT", "NOT_CORN", "OTHER_PLANT"]):
                print("❌ Validation: Different plant/leaf detected")
                return False, "This does not appear to be a maize leaf. ZeaWatch only analyzes maize (corn) leaves. Please upload an image of a maize leaf."
            
            elif any(phrase in text_upper for phrase in ["NOT_A_LEAF", "NOTALEAF", "NO_LEAF", "NOT_LEAF", "NOT_LEAVES"]):
                print("❌ Validation: Not a leaf detected")
                return False, "This image does not appear to be a leaf. Please upload an image of a maize leaf."
            
            # If response is unclear or doesn't match, be conservative and reject
            else:
                print(f"⚠️ Validation: Unclear response, REJECTING. Response: {text}")
                print(f"   This means Gemini didn't respond with expected format")
                return False, "Unable to confirm this is a maize leaf. Please upload a clear image of a maize leaf."
            
        except Exception as e:
            print(f"❌ Gemini validation error: {str(e)}")
            import traceback
            print(traceback.format_exc())
            # On error, REJECT for safety - don't allow invalid images through
            return False, f"Validation service error: {str(e)}. Please try again or contact support."
    
    def get_insights(self, disease: str, confidence: float, image: Image.Image) -> tuple[str, str]:

        if self.model is None:
            # Return fallback descriptions if Gemini is not available
            fallback_description = f"This maize leaf has been identified as {disease} with {confidence:.1%} confidence. The image shows visible symptoms that may indicate this condition."
            fallback_recommendation = f"For {disease}, consider: 1) Remove affected leaves to prevent spread, 2) Apply appropriate fungicides or pesticides as recommended by agricultural experts, 3) Ensure proper crop rotation and field sanitation, 4) Monitor other plants for early signs."
            return fallback_description, fallback_recommendation
            
        try:
            # --- CHANGED: Use different prompts for Healthy vs. Disease ---
            if "healthy" in disease.lower():
                # --- This is the new prompt for HEALTHY plants ---
                prompt = f"""
                This image of a maize leaf has been classified as HEALTHY with {confidence:.2%} confidence.
                
                Please provide:
                1. A brief description (2-3 sentences) confirming the leaf appears healthy and what a farmer should look for to KEEP it healthy (e.g., good color, no spots).
                2. General recommendations for preventative care and maintaining a healthy maize crop (3-4 bullet points).
                
                Format your response as:
                DESCRIPTION: [your description here]
                RECOMMENDATIONS: [your recommendations here]
                """
            else:
                # --- This is your original prompt for DISEASES ---
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
            fallback_description = f"This maize leaf has been identified as {disease} with {confidence:.1%} confidence."
            fallback_recommendation = f"For {disease}, consult with an agricultural expert for specific treatment."
            return fallback_description, fallback_recommendation