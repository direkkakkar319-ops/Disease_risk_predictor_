from paddleocr import PaddleOCR, PPStructureV3
from PIL import Image
import cv2
import numpy as np
from pathlib import Path
from typing import Dict, List, Any, Optional
import logging
import re
import os

logger = logging.getLogger(__name__)

class OCRRunner:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(OCRRunner, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
            
        self.use_gpu = os.getenv('PADDLE_USE_GPU', 'false').lower() == 'true'
        self.lang = os.getenv('PADDLE_OCR_LANG', 'en')
        
        logger.info(f"Initializing PaddleOCR (GPU: {self.use_gpu}, Lang: {self.lang})")
        
        # Initialize OCR engine
        self.ocr_engine = PaddleOCR(
            use_angle_cls=True,
            lang=self.lang,
            use_gpu=self.use_gpu,
            show_log=False,
            enable_mkldnn=not self.use_gpu,
            limit_side_len=960,
            det_db_thresh=0.3,
            det_db_box_thresh=0.5,
            rec_batch_num=6,
            drop_score=0.5,
            ocr_version='PP-OCRv5'
        )
        
        # Initialize StructureV3 for tables
        self.structure_engine = PPStructureV3(
            use_doc_orientation_classify=True,
            use_doc_unwarping=True,
            lang=self.lang
        )
        
        self._initialized = True
        logger.info("PaddleOCR initialized successfully")
    
    def preprocess_image(self, image_path: str) -> np.ndarray:
        """Preprocess image for better OCR accuracy."""
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Cannot load image: {image_path}")
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Denoise
        denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
        
        # Contrast enhancement
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        enhanced = clahe.apply(denoised)
        
        return enhanced
    
    def extract_text(self, image_path: str, preprocess: bool = True) -> List[Dict]:
        """Extract text from image."""
        try:
            if preprocess:
                temp_path = f"{image_path}_temp.jpg"
                processed = self.preprocess_image(image_path)
                cv2.imwrite(temp_path, processed)
                input_path = temp_path
            else:
                input_path = image_path
            
            result = self.ocr_engine.ocr(input_path, cls=True)
            
            if preprocess and os.path.exists(temp_path):
                os.remove(temp_path)
            
            extracted = []
            if result and result[0]:
                for line in result[0]:
                    bbox = line[0]
                    text, confidence = line[1]
                    extracted.append({
                        'text': text,
                        'confidence': float(confidence),
                        'bbox': bbox
                    })
            
            # Sort by reading order
            extracted.sort(key=lambda x: (self._get_center(x['bbox'])[1], self._get_center(x['bbox'])[0]))
            
            return extracted
            
        except Exception as e:
            logger.error(f"Text extraction failed: {e}")
            raise
    
    def extract_tables(self, image_path: str) -> List[Dict]:
        """Extract tables using PP-StructureV3."""
        try:
            result = self.structure_engine.predict(input=image_path)
            tables = []
            
            for res in result:
                if res.get('type') == 'table':
                    tables.append({
                        'html': res.get('res', {}).get('html', ''),
                        'data': res.get('res', {}).get('data', []),
                        'bbox': res.get('bbox', [])
                    })
            
            return tables
            
        except Exception as e:
            logger.error(f"Table extraction failed: {e}")
            return []
    
    def process_report(self, image_path: str, report_type: str) -> Dict[str, Any]:
        """Complete processing pipeline for medical reports."""
        logger.info(f"Processing {report_type} report: {image_path}")
        
        # Extract text
        text_data = self.extract_text(image_path)
        full_text = '\n'.join([item['text'] for item in text_data])
        
        # Extract tables
        tables = self.extract_tables(image_path)
        
        # Parse metrics based on report type
        if report_type == 'blood':
            metrics = self._parse_blood_report(text_data, tables)
        elif report_type == 'lipid':
            metrics = self._parse_lipid_profile(text_data, tables)
        else:
            metrics = self._parse_general(text_data)
        
        avg_confidence = sum(item['confidence'] for item in text_data) / len(text_data) if text_data else 0
        
        return {
            'raw_text': full_text,
            'structured_metrics': metrics,
            'tables': tables,
            'average_confidence': round(avg_confidence, 3),
            'text_items': len(text_data)
        }
    
    def _parse_blood_report(self, text_data: List[Dict], tables: List[Dict]) -> Dict[str, Any]:
        """Parse blood test metrics."""
        metrics = {}
        text = ' '.join([item['text'] for item in text_data])
        
        patterns = {
            'wbc': r'(?:WBC|White\s+Blood\s+Cell)[\s:]+([\d.]+)',
            'rbc': r'(?:RBC|Red\s+Blood\s+Cell)[\s:]+([\d.]+)',
            'hemoglobin': r'(?:Hemoglobin|HGB|Hb)[\s:]+([\d.]+)',
            'hematocrit': r'(?:Hematocrit|HCT)[\s:]+([\d.]+)',
            'platelets': r'(?:Platelets|PLT)[\s:]+([\d.]+)',
            'glucose': r'(?:Glucose|Fasting\s+Glucose)[\s:]+([\d.]+)',
            'creatinine': r'(?:Creatinine)[\s:]+([\d.]+)',
            'bun': r'(?:BUN)[\s:]+([\d.]+)',
        }
        
        for key, pattern in patterns.items():
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                try:
                    metrics[key] = {
                        'value': float(matches[0]),
                        'unit': self._infer_unit(key),
                        'source': 'text'
                    }
                except ValueError:
                    continue
        
        # Extract from tables if available
        if tables and not metrics:
            metrics = self._extract_from_tables(tables)
        
        return metrics
    
    def _parse_lipid_profile(self, text_data: List[Dict], tables: List[Dict]) -> Dict[str, Any]:
        """Parse lipid profile metrics."""
        metrics = {}
        text = ' '.join([item['text'] for item in text_data])
        
        patterns = {
            'total_cholesterol': r'(?:Total\s+Cholesterol|T\.?\s*Chol)[\s:]+([\d.]+)',
            'hdl': r'(?:HDL)[\s:]+([\d.]+)',
            'ldl': r'(?:LDL)[\s:]+([\d.]+)',
            'triglycerides': r'(?:Triglycerides|TG)[\s:]+([\d.]+)',
            'vldl': r'(?:VLDL)[\s:]+([\d.]+)',
        }
        
        for key, pattern in patterns.items():
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                try:
                    metrics[key] = {
                        'value': float(matches[0]),
                        'unit': 'mg/dL',
                        'source': 'text'
                    }
                except ValueError:
                    continue
        
        return metrics
    
    def _parse_general(self, text_data: List[Dict]) -> Dict[str, Any]:
        """General health report parsing."""
        return {
            'extracted_lines': [item['text'] for item in text_data],
            'line_count': len(text_data)
        }
    
    def _extract_from_tables(self, tables: List[Dict]) -> Dict[str, Any]:
        """Extract metrics from table data."""
        metrics = {}
        for table in tables:
            for row in table.get('data', []):
                if len(row) >= 2:
                    name = str(row[0]).lower().replace(' ', '_').replace('.', '')
                    try:
                        value = float(row[1])
                        metrics[name] = {
                            'value': value,
                            'unit': row[2] if len(row) > 2 else 'unknown',
                            'source': 'table'
                        }
                    except (ValueError, IndexError):
                        continue
        return metrics
    
    def _infer_unit(self, metric_name: str) -> str:
        """Infer unit for common metrics."""
        units = {
            'wbc': '10^3/uL',
            'rbc': '10^6/uL',
            'hemoglobin': 'g/dL',
            'hematocrit': '%',
            'platelets': '10^3/uL',
            'glucose': 'mg/dL',
            'creatinine': 'mg/dL',
            'bun': 'mg/dL',
        }
        return units.get(metric_name, 'unknown')
    
    def _get_center(self, bbox: List[List[float]]) -> tuple:
        """Calculate center of bounding box."""
        x = sum(p[0] for p in bbox) / len(bbox)
        y = sum(p[1] for p in bbox) / len(bbox)
        
        return (x, y)

# Global instance
_ocr_runner = None

def get_ocr_runner() -> OCRRunner:
    """Get or create OCR runner singleton."""
    global _ocr_runner
    if _ocr_runner is None:
        _ocr_runner = OCRRunner()
    return _ocr_runner