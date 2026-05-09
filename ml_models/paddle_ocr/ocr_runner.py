import cv2
import numpy as np
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
import logging
import re
import os

logger = logging.getLogger(__name__)


"""
OCRRunner - Singleton class
"""
class OCRRunner:
    """
    Wraps PP-OCRv5 (text detection + recognition) in a Singleton — heavy models
    are loaded once per process, and only when image OCR is actually needed.
    Digital PDFs are handled via PyMuPDF direct extraction with zero OCR cost.
    """

    # Class-level variable — shared across ALL instances.
    # Holds the one and only OCRRunner object once created.
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
        if self._initialized:
            return

        # Loaded on first image/scanned-PDF OCR call — never loaded for digital PDFs
        self._ocr_engine = None
        self.structure_engine = None

        self._initialized = True
        logger.info("OCRRunner initialised (PaddleOCR will load only if image OCR is needed)")

    def _get_ocr_engine(self):
        """Load PaddleOCR models on first call. Skipped entirely for digital PDFs."""
        if self._ocr_engine is None:
            try:
                from paddleocr import PaddleOCR
            except ImportError:
                raise RuntimeError(
                    "PaddleOCR is not installed. Run: pip install paddlepaddle paddleocr"
                )
            logger.info("Loading PaddleOCR models into memory...")
            try:
                self._ocr_engine = PaddleOCR(
                    lang="en",
                    use_doc_orientation_classify=False,
                    use_doc_unwarping=False,
                    use_textline_orientation=False,
                )
                logger.info("PaddleOCR models loaded successfully")
            except Exception as e:
                logger.warning(f"PaddleOCR init failed ({e}), retrying with minimal params")
                from paddleocr import PaddleOCR
                self._ocr_engine = PaddleOCR(lang="en")
                logger.info("PaddleOCR models loaded (minimal params)")
        return self._ocr_engine

    """
    Image Preprocessing
    Steps:
    1. Grayscale Conversion
    2. Denoise
    3. CLAHE (Contrast Limited Adaptive Histogram Equalisation)
    """
    def preprocess_image(self, image_path: str) -> np.ndarray:
        """Preprocess image for better OCR accuracy."""
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Cannot load image: {image_path}")

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(denoised)

        return enhanced

    def _pdf_to_temp_images(self, pdf_path: str) -> List[str]:
        """
        Convert each page of a PDF to a temporary JPEG file.
        Returns a list of temp file paths (caller must delete them).
        Uses PyMuPDF (fitz) at 2x resolution for good OCR quality.
        """
        try:
            import fitz  # PyMuPDF
        except ImportError:
            raise RuntimeError(
                "PyMuPDF is required for PDF processing.\n"
                "Run: pip install PyMuPDF"
            )

        temp_paths = []
        doc = fitz.open(pdf_path)
        try:
            mat = fitz.Matrix(2.0, 2.0)  # 2x scale → ~144 dpi, better OCR accuracy
            for page_num in range(len(doc)):
                page = doc[page_num]
                pix = page.get_pixmap(matrix=mat, alpha=False)
                temp_file = f"{pdf_path}_page{page_num}.jpg"
                pix.save(temp_file)
                temp_paths.append(temp_file)
        finally:
            doc.close()

        return temp_paths

    def _extract_pdf_text_direct(self, pdf_path: str) -> List[Dict]:
        """
        Extract text directly from a digital PDF using PyMuPDF — no OCR needed.
        Returns items in the same format as extract_text():
            { 'text': str, 'confidence': float, 'bbox': [[x,y],...] }
        Returns an empty list if the PDF appears to be scanned (no embedded text).
        """
        try:
            import fitz
        except ImportError:
            return []

        items: List[Dict] = []
        doc = fitz.open(pdf_path)
        try:
            for page in doc:
                blocks = page.get_text("dict")["blocks"]
                for block in blocks:
                    if block.get("type") != 0:  # 0 = text block
                        continue
                    for line in block.get("lines", []):
                        line_text = " ".join(
                            span["text"] for span in line.get("spans", [])
                        ).strip()
                        if not line_text:
                            continue
                        bbox_rect = line["bbox"]  # (x0, y0, x1, y1)
                        bbox = [
                            [bbox_rect[0], bbox_rect[1]],
                            [bbox_rect[2], bbox_rect[1]],
                            [bbox_rect[2], bbox_rect[3]],
                            [bbox_rect[0], bbox_rect[3]],
                        ]
                        items.append({
                            "text": line_text,
                            "confidence": 1.0,  # digital text is perfect
                            "bbox": bbox,
                        })
        finally:
            doc.close()

        return items

    """
    Public extraction methods
    """
    def extract_text(self, image_path: str, preprocess: bool = True) -> List[Dict]:
        """
        Run OCR on an image or PDF and return all detected text in reading order.
        For digital PDFs: uses PyMuPDF direct extraction (no OCR models loaded).
        For images or scanned PDFs: loads PaddleOCR lazily and runs OCR.
        Uses PaddleOCR 3.4 .predict() API (replaces deprecated .ocr()).
        Each item in the returned list is:
            { 'text': str, 'confidence': float, 'bbox': [[x,y],...] }
        PDFs are converted page-by-page to temp images before OCR.
        """
        is_pdf = image_path.lower().endswith('.pdf')
        temp_files: List[str] = []

        try:
            if is_pdf:
                # Try zero-OCR direct extraction first (works for digital PDFs)
                direct_items = self._extract_pdf_text_direct(image_path)
                if len(direct_items) >= 5:
                    logger.info(f"[extract_text] direct PDF extraction: {len(direct_items)} lines, no OCR needed")
                    return sorted(
                        direct_items,
                        key=lambda x: (
                            self._get_center(x['bbox'])[1],
                            self._get_center(x['bbox'])[0],
                        ),
                    )
                # Scanned/image PDF — fall back to PaddleOCR
                logger.info("[extract_text] PDF has little/no embedded text, falling back to OCR")
                temp_files = self._pdf_to_temp_images(image_path)
                if not temp_files:
                    logger.warning(f"PDF produced no pages: {image_path}")
                    return []
                input_paths = temp_files
            elif preprocess:
                temp_path = f"{image_path}_temp.jpg"
                processed = self.preprocess_image(image_path)
                cv2.imwrite(temp_path, processed)
                temp_files = [temp_path]
                input_paths = temp_files
            else:
                input_paths = [image_path]

            ocr = self._get_ocr_engine()
            extracted: List[Dict] = []
            for input_path in input_paths:
                # PaddleOCR 3.4: use predict() — ocr() is deprecated
                results = ocr.predict(input_path)
                extracted.extend(self._parse_paddle_results(results))

        except Exception as e:
            logger.error(f"Text extraction failed: {e}", exc_info=True)
            raise

        finally:
            for tmp in temp_files:
                if os.path.exists(tmp):
                    os.remove(tmp)

        # Sort by reading order (top-to-bottom, left-to-right)
        extracted.sort(
            key=lambda x: (
                self._get_center(x['bbox'])[1],
                self._get_center(x['bbox'])[0]
            ))

        return extracted

    def _parse_paddle_results(self, results) -> List[Dict]:
        """Parse raw PaddleOCR predict() output into a list of text/confidence/bbox dicts."""
        extracted: List[Dict] = []
        # PaddleOCR 3.4 returns a list of result dicts, one per image.
        # Each dict has: rec_texts (list[str]), rec_scores (list[float]),
        # rec_polys (list of polygon arrays).
        for page_result in (results or []):
            if not page_result:
                continue
            texts  = page_result.get('rec_texts', [])
            scores = page_result.get('rec_scores', [])
            polys  = page_result.get('rec_polys', [])

            for text, score, poly in zip(texts, scores, polys):
                if not text.strip():
                    continue
                # Convert numpy polygon to list-of-[x,y] for JSON serialisability
                bbox = poly.tolist() if hasattr(poly, 'tolist') else list(poly)
                extracted.append({
                    'text': text,
                    'confidence': float(score),
                    'bbox': bbox
                })
        return extracted

    def extract_tables(self, image_path: str) -> List[Dict]:
        """
        Extract tables using PP-StructureV3.
        Returns an empty list if the engine is unavailable.
        PDFs are converted page-by-page to temp images before table extraction.
        """
        if self.structure_engine is None:
            return []

        is_pdf = image_path.lower().endswith('.pdf')
        temp_files: List[str] = []

        try:
            if is_pdf:
                temp_files = self._pdf_to_temp_images(image_path)
                input_paths = temp_files
            else:
                input_paths = [image_path]

            tables: List[Dict] = []
            for input_path in input_paths:
                result = self.structure_engine.predict(input=input_path)
                for res in result:
                    item_type = res.get('type', '') if isinstance(res, dict) else getattr(res, 'type', '')
                    if item_type == 'table':
                        item_res = res.get('res', {}) if isinstance(res, dict) else getattr(res, 'res', {})
                        tables.append({
                            'html': item_res.get('html', '') if isinstance(item_res, dict) else '',
                            'data': item_res.get('data', []) if isinstance(item_res, dict) else [],
                            'bbox': res.get('bbox', []) if isinstance(res, dict) else []
                        })

            return tables

        except Exception as e:
            logger.error(f"Table extraction failed: {e}", exc_info=True)
            return []

        finally:
            for tmp in temp_files:
                if os.path.exists(tmp):
                    os.remove(tmp)

    """
    Complete processing pipeline for medical reports.
    Main entry point — orchestrates the full OCR pipeline.
    """
    def process_report(self, image_path: str, report_type: str) -> Dict[str, Any]:
        """
        Complete processing pipeline for medical reports.
        Returns a dict with:
            raw_text            - full concatenated text from the image
            structured_metrics  - parsed key/value pairs for the report type
            tables              - table data extracted by PPStructureV3
            average_confidence  - mean OCR confidence score (image quality indicator)
            text_items          - number of text fragments detected
        """
        logger.info(f"Processing {report_type} report: {image_path}")

        # Step 1: extract raw text
        text_data = self.extract_text(image_path)
        full_text = '\n'.join([item['text'] for item in text_data])

        # Step 2: extract tables
        tables = self.extract_tables(image_path)

        # Step 3: parse into structured metrics
        parsers = {
            'blood':    self._parse_blood_report,
            'lipid':    self._parse_lipid_profile,
            'vitamin_d': self._parse_vitamin_d,
            'hormone':  self._parse_hormone_report,
            'kidney':   self._parse_kidney_function_report,
            'liver':    self._parse_liver_function_report
        }

        parse_fn = parsers.get(report_type, lambda t, _: self._parse_general(t))
        metrics = parse_fn(text_data, tables)

        # Step 4: compute average OCR confidence
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
    Private parsers — one per report type
    '''

    def _parse_blood_report(self, text_data: List[Dict], tables: List[Dict]) -> Dict[str, Any]:
        """Parse blood test (CBC / Blood Panel) metrics."""
        text = ' '.join([item['text'] for item in text_data])

        patterns = {
            'wbc':          r'(?:WBC|White\s+Blood\s+Cell)[\s:)]+([0-9.]+)',
            'rbc':          r'(?:RBC|Red\s+Blood\s+Cell)[\s:)]+([0-9.]+)',
            'hemoglobin':   r'(?:Hemoglobin|HGB|Hb)[\s:)]+([0-9.]+)',
            'hematocrit':   r'(?:Hematocrit|HCT)[\s:)]+([0-9.]+)',
            'platelets':    r'(?:Platelets|PLT)[\s:)]+([0-9.]+)',
            'glucose':      r'(?:Glucose|Fasting\s+Glucose)[\s:)]+([0-9.]+)',
            'creatinine':   r'(?:Creatinine)[\s:)]+([0-9.]+)',
            'bun':          r'(?:BUN)[\s:)]+([0-9.]+)',
        }

        metrics: Dict[str, Any] = {}
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

        if tables and not metrics:
            metrics = self._extract_from_tables(tables)

        return metrics

    def _parse_lipid_profile(self, text_data: List[Dict], tables: List[Dict]) -> Dict[str, Any]:
        """Parse lipid profile metrics."""
        text = ' '.join([item['text'] for item in text_data])

        patterns = {
            'total_cholesterol': r'(?:Total\s+Cholesterol|T\.?\s*Chol)[\s:)]+([0-9.]+)',
            'hdl':               r'(?:HDL)[\s:)]+([0-9.]+)',
            'ldl':               r'(?:LDL)[\s:)]+([0-9.]+)',
            'triglycerides':     r'(?:Triglycerides|TG)[\s:)]+([0-9.]+)',
            'vldl':              r'(?:VLDL)[\s:)]+([0-9.]+)',
        }

        metrics: Dict[str, Any] = {}
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

        if tables and not metrics:
            metrics = self._extract_from_tables(tables)

        return metrics

    def _parse_vitamin_d(self, text_data: List[Dict], tables: List[Dict]) -> Dict[str, Any]:
        """Parse Vitamin-D report metrics."""
        text = ' '.join(item["text"] for item in text_data)

        patterns = {
            'vitamin_d': r'(?:25[\s\-]?(?:OH|Hydroxy)?\s*Vitamin\s*D|Vitamin\s*D|Vit\s*D)[\s:)]+([0-9.]+)'
        }

        metrics: Dict[str, Any] = {}
        for key, pattern in patterns.items():
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                try:
                    metrics[key] = {
                        'value': float(matches[0]),
                        'unit': 'ng/mL',
                        'source': 'text'
                    }
                except ValueError:
                    continue

        if tables and not metrics:
            metrics = self._extract_from_tables(tables)

        return metrics

    def _parse_hormone_report(self, text_data: List[Dict], tables: List[Dict]) -> Dict[str, Any]:
        """Parse Hormone/Thyroid report metrics."""
        text = ' '.join(item["text"] for item in text_data)

        patterns = {
            'tsh':          r'(?:TSH|T\.?\s*S\.?\s*H)[\s:)]+([0-9.]+)',
            't3':           r'(?:T3|Free\s*T3|Triiodothyronine)[\s:)]+([0-9.]+)',
            't4':           r'(?:T4|Free\s*T4|Thyroxine)[\s:)]+([0-9.]+)',
            'testosterone': r'(?:Testosterone|Total\s*Testosterone)[\s:)]+([0-9.]+)',
            'estradiol':    r'(?:Estradiol|Estrogen|E2)[\s:)]+([0-9.]+)',
            'progesterone': r'(?:Progesterone)[\s:)]+([0-9.]+)',
            'prolactin':    r'(?:Prolactin)[\s:)]+([0-9.]+)',
            'lh':           r'(?:LH|Luteinizing\s*Hormone)[\s:)]+([0-9.]+)',
            'fsh':          r'(?:FSH|Follicle\s*Stimulating\s*Hormone)[\s:)]+([0-9.]+)',
            'cortisol':     r'(?:Cortisol)[\s:)]+([0-9.]+)',
        }

        metrics: Dict[str, Any] = {}
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

        if tables and not metrics:
            metrics = self._extract_from_tables(tables)

        return metrics

    def _parse_kidney_function_report(self, text_data: List[Dict], tables: List[Dict]) -> Dict[str, Any]:
        """Parse Kidney Function report metrics."""
        text = ' '.join(item["text"] for item in text_data)

        patterns = {
            'creatinine': r'(?:Creatinine)[\s:)]+([0-9.]+)',
            'bun':        r'(?:BUN|Blood\s+Urea\s+Nitrogen)[\s:)]+([0-9.]+)',
            'urea':       r'(?:Urea)[\s:)]+([0-9.]+)',
            'uric_acid':  r'(?:Uric\s+Acid)[\s:)]+([0-9.]+)',
            'egfr':       r'(?:eGFR|GFR)[\s:)]+([0-9.]+)',
        }

        metrics: Dict[str, Any] = {}
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

        if tables and not metrics:
            metrics = self._extract_from_tables(tables)

        return metrics

    def _parse_liver_function_report(self, text_data: List[Dict], tables: List[Dict]) -> Dict[str, Any]:
        """Parse Liver Function report metrics."""
        text = ' '.join(item["text"] for item in text_data)

        patterns = {
            'bilirubin_total':    r'(?:Total\s+Bilirubin|Bilirubin\s+Total)[\s:)]+([0-9.]+)',
            'bilirubin_direct':   r'(?:Direct\s+Bilirubin)[\s:)]+([0-9.]+)',
            'bilirubin_indirect': r'(?:Indirect\s+Bilirubin)[\s:)]+([0-9.]+)',
            'alt':                r'(?:ALT|SGPT)[\s:)]+([0-9.]+)',
            'ast':                r'(?:AST|SGOT)[\s:)]+([0-9.]+)',
            'alp':                r'(?:ALP|Alkaline\s+Phosphatase)[\s:)]+([0-9.]+)',
            'albumin':            r'(?:Albumin)[\s:)]+([0-9.]+)',
            'total_protein':      r'(?:Total\s+Protein)[\s:)]+([0-9.]+)',
        }

        metrics: Dict[str, Any] = {}
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

        if tables and not metrics:
            metrics = self._extract_from_tables(tables)

        return metrics

    """
    General Parser
    """
    def _parse_general(self, text_data: List[Dict]) -> Dict[str, Any]:
        """General health report parsing — returns raw text lines."""
        return {
            'extracted_lines': [item['text'] for item in text_data],
            'line_count': len(text_data)
        }

    """
    Fallback table parser
    """
    def _extract_from_tables(self, tables: List[Dict]) -> Dict[str, Any]:
        """Extract metrics from table data when regex parsing yields nothing."""
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

    """
    Utility helpers
    """
    def _infer_unit(self, metric_name: str) -> str:
        """Infer measurement unit for common metrics."""
        units = {
            'wbc':            '10^3/uL',
            'rbc':            '10^6/uL',
            'hemoglobin':     'g/dL',
            'hematocrit':     '%',
            'platelets':      '10^3/uL',
            'glucose':        'mg/dL',
            'creatinine':     'mg/dL',
            'bun':            'mg/dL',
            'urea':           'mg/dL',
            'uric_acid':      'mg/dL',
            'egfr':           'mL/min/1.73m²',
            'tsh':            'mIU/L',
            't3':             'pg/mL',
            't4':             'ng/dL',
            'testosterone':   'ng/dL',
            'estradiol':      'pg/mL',
            'progesterone':   'ng/mL',
            'prolactin':      'ng/mL',
            'lh':             'mIU/mL',
            'fsh':            'mIU/mL',
            'cortisol':       'µg/dL',
            'bilirubin_total':    'mg/dL',
            'bilirubin_direct':   'mg/dL',
            'bilirubin_indirect': 'mg/dL',
            'alt':            'U/L',
            'ast':            'U/L',
            'alp':            'U/L',
            'albumin':        'g/dL',
            'total_protein':  'g/dL',
        }
        return units.get(metric_name, 'unknown')

    def _get_center(self, bbox: List[List[float]]) -> tuple:
        """
        Calculate center of bounding box.
        The centre is the average of all 4 x-coordinates and all 4
        y-coordinates. Used by extract_text() to sort detected text
        fragments into reading order (top-to-bottom, left-to-right).
        """
        x = sum(p[0] for p in bbox) / len(bbox)
        y = sum(p[1] for p in bbox) / len(bbox)
        return (x, y)


"""
Module-level singleton accessor
"""
# Global instance — only one OCRRunner ever exists in a worker process
_ocr_runner: Optional[OCRRunner] = None


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
