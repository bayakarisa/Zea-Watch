"""
Confidence Normalization Service
Handles normalization of model outputs to ensure confidence is always in [0, 1]
"""
import numpy as np
from typing import Dict, List, Union


class ConfidenceService:
    """Service for normalizing and calibrating model confidence scores"""
    
    @staticmethod
    def normalize_confidence(logits: Union[List[float], np.ndarray], 
                            model_type: str = 'softmax') -> float:
        """
        Normalize model output to confidence in [0, 1]
        
        Args:
            logits: Raw model output (logits or probabilities)
            model_type: 'softmax' for multi-class, 'sigmoid' for multi-label
        
        Returns:
            Normalized confidence value in [0, 1]
        """
        if isinstance(logits, list):
            logits = np.array(logits)
        elif not isinstance(logits, np.ndarray):
            logits = np.array([float(logits)])
        
        if model_type == 'softmax':
            # Apply softmax to logits
            exp_logits = np.exp(logits - np.max(logits))  # Numerical stability
            probabilities = exp_logits / np.sum(exp_logits)
            confidence = float(np.max(probabilities))
        elif model_type == 'sigmoid':
            # Apply sigmoid to each logit
            probabilities = 1 / (1 + np.exp(-logits))
            confidence = float(np.max(probabilities))
        else:
            # Assume already probabilities, just take max
            confidence = float(np.max(logits))
        
        # Clamp to [0, 1]
        confidence = max(0.0, min(1.0, confidence))
        return confidence
    
    @staticmethod
    def get_raw_scores(logits: Union[List[float], np.ndarray]) -> Dict:
        """
        Convert raw logits to dictionary format for storage
        
        Returns:
            Dictionary with raw scores and metadata
        """
        if isinstance(logits, list):
            logits = np.array(logits)
        elif not isinstance(logits, np.ndarray):
            logits = np.array([float(logits)])
        
        return {
            'raw_logits': logits.tolist(),
            'max_logit': float(np.max(logits)),
            'min_logit': float(np.min(logits)),
            'mean_logit': float(np.mean(logits))
        }
    
    @staticmethod
    def validate_confidence(confidence: float) -> float:
        """
        Validate and clamp confidence to [0, 1]
        
        Args:
            confidence: Confidence value to validate
        
        Returns:
            Clamped confidence value
        """
        if not isinstance(confidence, (int, float)):
            try:
                confidence = float(confidence)
            except (ValueError, TypeError):
                return 0.0
        
        return max(0.0, min(1.0, float(confidence)))
    
    @staticmethod
    def format_confidence_for_display(confidence: float) -> str:
        """
        Format confidence for display as percentage
        
        Args:
            confidence: Confidence value in [0, 1]
        
        Returns:
            Formatted string like "87.5%"
        """
        validated = ConfidenceService.validate_confidence(confidence)
        percentage = validated * 100
        return f"{percentage:.1f}%"


