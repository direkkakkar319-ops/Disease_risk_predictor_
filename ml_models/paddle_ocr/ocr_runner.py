import os
from paddleocr import PaddleOCR
from pdf2image import convert_from_path
import tempfile

ocr  = PaddleOCR(use_angle_cls = True, lang = 'en')

def extract_text_from_report(path:str)->str:#here will put the image path
    if not os.path.exists(path):
        raise FileNotFoundError(f"The file at {path} does not exist.")

    if path.lower().endswith(".pdf"):
        images = convert_from_path(path)
        all_text = []
        for img in images:
            with tempfile.NamedTemporaryFile(siffix=".jpg", delete=False) as tmp:
                img.save(tmp.name)
                all_text.append(_run_ocr(tmp.name))
                os.unlink(tmp.name)
        return "\n".join(all_text)
    else:
        results = _run_ocr(path)

def _run_ocr(image_path: str)->str:
    results = ocr.ocr(image_path, cls=True)
    if not results or results==[None]:
        return ""
    return "\n".join(
        word_info[-1][0]
        for line in results
        for word_info in line
    )