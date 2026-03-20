from paddleocr import PaddleOCR, PPStructureV3
import cv2
import numpy as np
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
import logging
import re
import os


try:
    _PADDLE_AVAILABLE = True
except ImportError:
    _PADDLE_AVAILABLE = False

logger = logging.getLogger(__name__)

"""
OCRRunner - Singleton class
"""
class OCRRunner:
    """
    Wraps PP-OCRv5 (text detection + recognition) and PP-StructureV3
    (layout analysis + table extraction) in a Singleton-heavy models are
    loaded Once per process
    """

    # Class-level variable — shared across ALL instances,
    # holds the one and only OCRRunner object once created.
    _instance = None
    
    """
    __new__ is Python's object ALLOCATOR — it runs BEFORE __init__
    every single time you write OCRRunner() or get_ocr_runner().
    """
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(OCRRunner, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        """
        Gaurd 1 - prevetns re-run of PaddleOCR
        """
        if self._initialized:
            return
        
        """
        Gaurd 2 - checks if PaddleOCR is installed
        """
        if not _PADDLE_AVAILABLE:
            raise RuntimeError(
                "PaddleOCR is not installed.\n"
                "Run: pip install paddlepaddle paddleocr"   
            )
            
        """These are set in .env and injected by docker-compose"""
        self.use_gpu = os.getenv('PADDLE_USE_GPU', 'false').lower() == 'true'
        self.lang = os.getenv('PADDLE_OCR_LANG', 'en')
        
        logger.info(f"Initializing PaddleOCR (GPU: {self.use_gpu}, Lang: {self.lang})")
        
        """
        Initialize Core OCR engine
        It does two jobs in sequence :-
        1. Detection
        2. Recognition
        """
        self.ocr_engine = PaddleOCR(
            # Behaviour flags
            use_angle_cls=True,
            lang=self.lang,
            use_gpu=self.use_gpu,
            show_log=False,
            enable_mkldnn=not self.use_gpu,
            ocr_version='PP-OCRv5',
            # Inference parameters
            limit_side_len=960,
            det_db_thresh=0.3,
            det_db_box_thresh=0.5,
            rec_batch_num=6,
            drop_score=0.5
        )
        
        """
        Initialize StructureV3 for tables
        Sits on top of OCR
        Understands the structure of the page
        """
        self.structure_engine = PPStructureV3(
            use_doc_orientation_classify=True,
            use_doc_unwarping=True,
            lang=self.lang
        )
        
        """Making Gaurd 1 skip the job"""
        self._initialized = True
        logger.info("PaddleOCR initialized successfully")

    """
    Image Preprocessing
    It does the following jobs:-
    1. Grascale Conversion
    2. Denoise 
    3. CLAHE(Contrasted Limited Adaptive Histogram Equalisation)
    """
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
    

    """
    Public extraction methods
    """
    def extract_text(self, image_path: str, preprocess: bool = True) -> List[Dict]:
        """
        Run OCR on an image and return all detected text in reading order
        """
        try:
            if preprocess:
                temp_path = f"{image_path}_temp.jpg"
                processed = self.preprocess_image(image_path)
                cv2.imwrite(temp_path, processed)
                input_path = temp_path
            else:
                input_path = image_path
            
            result = self.ocr_engine.ocr(input_path, cls=True)
            
        except Exception as e:
            logger.error(f"Text extraction failed: {e}")
            raise

        finally:
            if preprocess and os.path.exists(temp_path):
                os.remove(temp_path)
        
        extracted:List[Dict]=[]
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
        extracted.sort(
            key=lambda x: (
                self._get_center(x['bbox'])[1],
                self._get_center(x['bbox'])[0]
            ))
        
        return extracted

    def extract_tables(self, image_path: str) -> List[Dict]:
        """
        Extract tables using PP-StructureV3.
        PP-StructureV3 understands the table layout returns cell-level data
        """
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
    
    """
    Complete processing pipeline for medical reports.
    Main entry point - rechestrates the full OCR pipeline
    """    
    def process_report(self, image_path: str, report_type: str) -> Dict[str, Any]:
        """
        Complete processing pipeline for medical reports.
        Main entry point - rechestrates the full OCR pipeline
        """
        logger.info(f"Processing {report_type} report: {image_path}")
        
        # Extracting data
        text_data = self.extract_text(image_path)
        full_text = '\n'.join([item['text'] for item in text_data])
        tables = self.extract_tables(image_path)
        
        parsers = {
            'blood':self._parse_blood_report,
            'lipid':self._parse_lipid_profile
        }

        parse_fn = parsers.get(report_type, lambda t, _:self._parse_general(t))
        metrics = parse_fn(text_data, tables)

        # Indicates image quality
        avg_confidence = (
            sum(item['confidence'] for item in text_data) / len(text_data) 
            if text_data else 0
        )
        
        return {
            'raw_text': full_text,
            'structured_metrics': metrics,
            'tables': tables,
            'average_confidence': round(avg_confidence, 3),
            'text_items': len(text_data)
        }
    
    '''
    Private parsers
    '''

    def _parse_blood_report(self, text_data: List[Dict], tables: List[Dict]) -> Dict[str, Any]:
        """
        Parse blood test metrics.
        """

        # Flattning the OCR fragments
        text = ' '.join([item['text'] for item in text_data])

        patterns = {
            #Regex anatomy
            'wbc': r'(?:WBC|White\s+Blood\s+Cell)[\s:]+([\d.]+)',
            'rbc': r'(?:RBC|Red\s+Blood\s+Cell)[\s:]+([\d.]+)',
            'hemoglobin': r'(?:Hemoglobin|HGB|Hb)[\s:]+([\d.]+)',
            'hematocrit': r'(?:Hematocrit|HCT)[\s:]+([\d.]+)',
            'platelets': r'(?:Platelets|PLT)[\s:]+([\d.]+)',
            'glucose': r'(?:Glucose|Fasting\s+Glucose)[\s:]+([\d.]+)',
            'creatinine': r'(?:Creatinine)[\s:]+([\d.]+)',
            'bun': r'(?:BUN)[\s:]+([\d.]+)',
        }
        
        metrics:Dict[str, Any]={}
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
        text = ' '.join([item['text'] for item in text_data])
        
        patterns = {
            'total_cholesterol': r'(?:Total\s+Cholesterol|T\.?\s*Chol)[\s:]+([\d.]+)',
            'hdl': r'(?:HDL)[\s:]+([\d.]+)',
            'ldl': r'(?:LDL)[\s:]+([\d.]+)',
            'triglycerides': r'(?:Triglycerides|TG)[\s:]+([\d.]+)',
            'vldl': r'(?:VLDL)[\s:]+([\d.]+)',
        }

        metrics:Dict[str, Any]={}
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
    
    def _parse_vitamin_d(self, text_data:List[Dict], tables:List[Dict])->Dict[str, Any]:
        """
        Parse Vitamin-D report metrics.
        """
        text = ' '.join(item["text"] for item in text_data)
        
        patterns = {
        'vitamin_d': r'(?:25[\s\-]?(?:OH|Hydroxy)?\s*Vitamin\s*D|Vitamin\s*D|Vit\s*D)[\s:]+([\d.]+)'
        }

        metrics:Dict[str, Any]={}
        for key, pattren in patterns.items():
            matches = re.findall(pattren, text, re.IGNORECASE)
            if matches:
                try:
                    metrics[key] = {
                        'value': float(matches[0]),
                        'unit': 'ng/ml',
                        'source': 'text'
                    }
                except ValueError:
                    continue
        
        if tables and not metrics:
            metrics = self._extract_from_tables(tables)
        
        return metrics

    def _parse_hormone_report(self, text_data:List[Dict], tables:List[Dict])->Dict[str, Any]:
        """
        Parse Hormone report metrics
        """
        text = ' '.join(item["text"] for item in text_data)

        pattrens={
            'tsh': r'(?:TSH|T\.?\s*S\.?\s*H)[\s:]+([\d.]+)',
            't3': r'(?:T3|Free\s*T3|Triiodothyronine)[\s:]+([\d.]+)',
            't4': r'(?:T4|Free\s*T4|Thyroxine)[\s:]+([\d.]+)',

            'testosterone': r'(?:Testosterone|Total\s*Testosterone)[\s:]+([\d.]+)',
            'estradiol': r'(?:Estradiol|Estrogen|E2)[\s:]+([\d.]+)',
            'progesterone': r'(?:Progesterone)[\s:]+([\d.]+)',

            'prolactin': r'(?:Prolactin)[\s:]+([\d.]+)',
            'lh': r'(?:LH|Luteinizing\s*Hormone)[\s:]+([\d.]+)',
            'fsh': r'(?:FSH|Follicle\s*Stimulating\s*Hormone)[\s:]+([\d.]+)',
            'cortisol': r'(?:Cortisol)[\s:]+([\d.]+)',            
        }

        metrics:Dict[str, Any]={}

        for key, pattren in pattrens.items():
            matches = re.findall(pattren, text, re.IGNORECASE)

            if matches:
                try:
                    metrics[key]={
                        'value':float(matches[0]),
                        'unit':self._infer_unit(key),
                        'source':'text'
                    }
                except ValueError:
                    continue
        if tables and not metrics:
            metrics = self._extract_from_tables(tables)
        
        return metrics

    def _parse_kidney_function_report(self, text_data:List[Dict], tables:List[Dict])->Dict[str, Any]:
        """
        Parse Kidney Function report
        """

        text = ' '.join(item["text"] for item in text_data)

        pattrens={
            'creatinine': r'(?:Creatinine)[\s:]+([\d.]+)',
            'bun': r'(?:BUN|Blood\s+Urea\s+Nitrogen)[\s:]+([\d.]+)',
            'urea': r'(?:Urea)[\s:]+([\d.]+)',
            'uric_acid': r'(?:Uric\s+Acid)[\s:]+([\d.]+)',
            'egfr': r'(?:eGFR|GFR)[\s:]+([\d.]+)',
        }

        metrics:Dict[str, Any]={}
        
        for key, pattren in pattrens.items():
            matches = re.findall(pattren, text, re.IGNORECASE)

            if matches:
                try:
                    metrics={
                        'value':float(matches[0]),
                        'unit':self._infer_unit(key),
                        'source':"text"
                    }
                except ValueError:
                    continue

        if not metrics and tables:
            metrics = self._extract_from_tables(tables)

    def _parse_liver_function_report(self, text_data:List[Dict], tables:List[Dict])->Dict[str, Any]:
        """
        Parse Liver Function report
        """

        text = ' '.join(item["text"] for item in text_data)

        metrics:Dict[str, Any]={}

        pattrens={
            'bilirubin_total': r'(?:Total\s+Bilirubin|Bilirubin\s+Total)[\s:]+([\d.]+)',
            'bilirubin_direct': r'(?:Direct\s+Bilirubin)[\s:]+([\d.]+)',
            'bilirubin_indirect': r'(?:Indirect\s+Bilirubin)[\s:]+([\d.]+)',

            'alt': r'(?:ALT|SGPT)[\s:]+([\d.]+)',
            'ast': r'(?:AST|SGOT)[\s:]+([\d.]+)',
            'alp': r'(?:ALP|Alkaline\s+Phosphatase)[\s:]+([\d.]+)',

            'albumin': r'(?:Albumin)[\s:]+([\d.]+)',
            'total_protein': r'(?:Total\s+Protein)[\s:]+([\d.]+)',
        }

        for key, pattren in pattrens.items():
            matches = re.findall(pattren,text,re.IGNORECASE)

            if matches:
                try:
                    metrics={
                        'value':float(matches[0]),
                        'unit':self._infer_unit(key),
                        'source':text
                    }
                except ValueError:
                    continue
                
    """
    General Parser
    """
    def _parse_general(self, text_data: List[Dict]) -> Dict[str, Any]:
        """General health report parsing."""
        return {
            'extracted_lines': [item['text'] for item in text_data],
            'line_count': len(text_data)
        }

    """
    Fallback parser
    """   
    def _extract_from_tables(self, tables: List[Dict]) -> Dict[str, Any]:
        """Extract metrics from table data."""
        metrics = {}
        for table in tables:
            for row in table.get('data', []):
                # if name and value not there then then skipped
                if len(row) >= 2:
                    # Normalization
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
    
    """
    Utility helpers
    """
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

    """        
    The centre is the average of all 4 x-coordinates and all 4
    y-coordinates. Used by extract_text() to sort detected text
    fragments into reading order (top-to-bottom, left-to-right).
    """
    def _get_center(self, bbox: List[List[float]]) -> tuple:
        """Calculate center of bounding box."""
        x = sum(p[0] for p in bbox) / len(bbox)
        y = sum(p[1] for p in bbox) / len(bbox)
        
        return (x, y)

"""
Module-level singleton accessor
"""
# Global instance
_ocr_runner:Optional[OCRRunner]=None

"""
Two layers of protection against accidental double-init:
    1. This function checks _ocr_runner before calling OCRRunner().
    2. OCRRunner.__new__ + __init__ guard against it at the class level.
"""
def get_ocr_runner() -> OCRRunner:
    """Get or create OCR runner singleton."""
    global _ocr_runner
    if _ocr_runner is None:
        _ocr_runner = OCRRunner()
    return _ocr_runner