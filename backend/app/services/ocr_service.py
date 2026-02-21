from ml_models.paddle_ocr.ocr_runner import extract_text_from_report

def extract_text(image_path: str):
    return extract_text_from_report(image_path)